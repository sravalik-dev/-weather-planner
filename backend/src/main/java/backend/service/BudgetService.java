
package backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.dto.BudgetOverviewResponse;
import backend.dto.CategoryBudgetRequest;
import backend.dto.CategoryBudgetResponse;
import backend.dto.CreateBudgetRequest;
import backend.dto.DailyBudgetRequest;
import backend.dto.DailyBudgetResponse;
import backend.dto.UpdateBudgetRequest;

import backend.entity.BudgetHistory;
import backend.entity.CategoryBudget;
import backend.entity.DailyBudget;
import backend.entity.Expense;
import backend.entity.Trip;
import backend.entity.TripBudget;
import backend.entity.User;

import backend.repository.BudgetHistoryRepository;
import backend.repository.CategoryBudgetRepository;
import backend.repository.DailyBudgetRepository;
import backend.repository.ExpenseRepository;
import backend.repository.TripBudgetRepository;
import backend.repository.TripRepository;
import backend.repository.UserRepository;

@Service
@Transactional
public class BudgetService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal DEFAULT_WARNING_THRESHOLD =
            new BigDecimal("80.00");

    private final TripBudgetRepository tripBudgetRepository;
    private final CategoryBudgetRepository categoryBudgetRepository;
    private final DailyBudgetRepository dailyBudgetRepository;
    private final ExpenseRepository expenseRepository;
    private final BudgetHistoryRepository budgetHistoryRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;

    public BudgetService(
            TripBudgetRepository tripBudgetRepository,
            CategoryBudgetRepository categoryBudgetRepository,
            DailyBudgetRepository dailyBudgetRepository,
            ExpenseRepository expenseRepository,
            BudgetHistoryRepository budgetHistoryRepository,
            TripRepository tripRepository,
            UserRepository userRepository) {

        this.tripBudgetRepository = tripBudgetRepository;
        this.categoryBudgetRepository = categoryBudgetRepository;
        this.dailyBudgetRepository = dailyBudgetRepository;
        this.expenseRepository = expenseRepository;
        this.budgetHistoryRepository = budgetHistoryRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
    }

    // ==========================================
    // CREATE BUDGET
    // ==========================================

    public BudgetOverviewResponse createBudget(
            CreateBudgetRequest request,
            Integer userId) {

        if (request == null || request.tripId() == null) {
            throw new IllegalArgumentException("Trip ID is required");
        }

        validatePositiveAmount(request.totalBudget(), "Total budget");

        Trip trip = tripRepository
                .findByTripIdAndUser_UserId(request.tripId(), userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Trip not found or access denied"));

        if (tripBudgetRepository.existsByTrip_TripId(request.tripId())) {
            throw new IllegalArgumentException(
                    "A budget already exists for this trip");
        }

        BigDecimal threshold = request.warningThreshold() == null
                ? DEFAULT_WARNING_THRESHOLD
                : request.warningThreshold();

        validateThreshold(threshold);

        TripBudget budget = new TripBudget();

        budget.setTrip(trip);
        budget.setTotalBudget(request.totalBudget());
        budget.setTotalSpent(ZERO);

        // TripBudget currently uses Integer for warningThreshold.
        budget.setWarningThreshold(threshold.intValueExact());

        budget = tripBudgetRepository.save(budget);

        recordHistory(
                budget,
                userId,
                "BUDGET_CREATED",
                "Budget created for trip: " + trip.getTripName());

        return buildOverview(budget);
    }

    // ==========================================
    // UPDATE BUDGET
    // ==========================================

    public BudgetOverviewResponse updateBudget(
            Integer tripId,
            UpdateBudgetRequest request,
            Integer userId) {

        TripBudget budget = getOwnedBudget(tripId, userId);

        if (request.totalBudget() != null) {

            validatePositiveAmount(
                    request.totalBudget(),
                    "Total budget");

            budget.setTotalBudget(request.totalBudget());
        }

        if (request.warningThreshold() != null) {

            validateThreshold(request.warningThreshold());

            budget.setWarningThreshold(
                    request.warningThreshold().intValueExact());
        }

        budget = tripBudgetRepository.save(budget);

        recordHistory(
                budget,
                userId,
                "BUDGET_UPDATED",
                "Budget details updated");

        return buildOverview(budget);
    }

    // ==========================================
    // GET BUDGET OVERVIEW
    // ==========================================

    @Transactional(readOnly = true)
    public BudgetOverviewResponse getBudgetOverview(
            Integer tripId,
            Integer userId) {

        TripBudget budget = getOwnedBudget(tripId, userId);

        return buildOverview(budget);
    }

    // ==========================================
    // ADD OR UPDATE CATEGORY BUDGET
    // ==========================================

    public CategoryBudgetResponse saveCategoryBudget(
            Integer tripId,
            CategoryBudgetRequest request,
            Integer userId) {

        TripBudget budget = getOwnedBudget(tripId, userId);

        if (request.category() == null) {
            throw new IllegalArgumentException(
                    "Expense category is required");
        }

        validatePositiveAmount(
                request.allocatedAmount(),
                "Category allocation");

        CategoryBudget categoryBudget =
                categoryBudgetRepository
                        .findByBudget_BudgetIdAndCategory(
                                budget.getBudgetId(),
                                request.category())
                        .orElseGet(CategoryBudget::new);

        categoryBudget.setBudget(budget);
        categoryBudget.setCategory(request.category());
        categoryBudget.setAllocatedAmount(request.allocatedAmount());

        categoryBudget =
                categoryBudgetRepository.save(categoryBudget);

        recordHistory(
                budget,
                userId,
                "CATEGORY_BUDGET_UPDATED",
                "Allocation updated for " + request.category());

        return buildCategoryResponse(
                categoryBudget,
                getExpenses(budget));
    }

    // ==========================================
    // ADD OR UPDATE DAILY BUDGET
    // ==========================================

    public DailyBudgetResponse saveDailyBudget(
            Integer tripId,
            DailyBudgetRequest request,
            Integer userId) {

        TripBudget budget = getOwnedBudget(tripId, userId);

        if (request.budgetDate() == null) {
            throw new IllegalArgumentException(
                    "Budget date is required");
        }

        validatePositiveAmount(
                request.dailyLimit(),
                "Daily budget limit");

        DailyBudget dailyBudget =
                dailyBudgetRepository
                        .findByBudget_BudgetIdAndBudgetDate(
                                budget.getBudgetId(),
                                request.budgetDate())
                        .orElseGet(DailyBudget::new);

        dailyBudget.setBudget(budget);
        dailyBudget.setBudgetDate(request.budgetDate());
        dailyBudget.setDailyLimit(request.dailyLimit());

        dailyBudget = dailyBudgetRepository.save(dailyBudget);

        recordHistory(
                budget,
                userId,
                "DAILY_BUDGET_UPDATED",
                "Daily budget updated for " + request.budgetDate());

        return buildDailyResponse(
                dailyBudget,
                getExpenses(budget));
    }

    // ==========================================
    // GET EXPENSES FOR A BUDGET
    // ==========================================

    private List<Expense> getExpenses(TripBudget budget) {

        return expenseRepository.findByBudget_BudgetId(
                budget.getBudgetId());
    }

    // ==========================================
    // BUILD BUDGET OVERVIEW
    // ==========================================

    private BudgetOverviewResponse buildOverview(
            TripBudget budget) {

        List<Expense> expenses = getExpenses(budget);

        BigDecimal totalSpent = expenses.stream()
                .map(Expense::getAmount)
                .filter(amount -> amount != null)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal remaining = budget.getTotalBudget()
                .subtract(totalSpent);

        BigDecimal spentPercentage = calculatePercentage(
                totalSpent,
                budget.getTotalBudget());

        List<CategoryBudgetResponse> categoryResponses =
                new ArrayList<>();

        List<CategoryBudget> categoryBudgets =
                categoryBudgetRepository.findByBudget_BudgetId(
                        budget.getBudgetId());

        for (CategoryBudget categoryBudget : categoryBudgets) {

            categoryResponses.add(
                    buildCategoryResponse(
                            categoryBudget,
                            expenses));
        }

        List<DailyBudgetResponse> dailyResponses =
                new ArrayList<>();

        List<DailyBudget> dailyBudgets =
                dailyBudgetRepository
                        .findByBudget_BudgetIdOrderByBudgetDateAsc(
                                budget.getBudgetId());

        for (DailyBudget dailyBudget : dailyBudgets) {

            dailyResponses.add(
                    buildDailyResponse(
                            dailyBudget,
                            expenses));
        }

        return new BudgetOverviewResponse(
                budget.getBudgetId(),
                budget.getTrip().getTripId(),
                budget.getTotalBudget(),
                totalSpent,
                remaining,
                spentPercentage,
                BigDecimal.valueOf(budget.getWarningThreshold()),
                totalSpent.compareTo(budget.getTotalBudget()) > 0,
                categoryResponses,
                dailyResponses
        );
    }

    // ==========================================
    // BUILD CATEGORY RESPONSE
    // ==========================================

    private CategoryBudgetResponse buildCategoryResponse(
            CategoryBudget categoryBudget,
            List<Expense> expenses) {

        BigDecimal spent = expenses.stream()
                .filter(expense ->
                        expense.getCategory() ==
                                categoryBudget.getCategory())
                .map(Expense::getAmount)
                .filter(amount -> amount != null)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal allocated =
                categoryBudget.getAllocatedAmount();

        BigDecimal remaining = allocated.subtract(spent);

        return new CategoryBudgetResponse(
                categoryBudget.getCategoryBudgetId(),
                categoryBudget.getCategory().name(),
                allocated,
                spent,
                remaining,
                calculatePercentage(spent, allocated)
        );
    }

    // ==========================================
    // BUILD DAILY RESPONSE
    // ==========================================

    private DailyBudgetResponse buildDailyResponse(
            DailyBudget dailyBudget,
            List<Expense> expenses) {

        BigDecimal spent = expenses.stream()
                .filter(expense ->
                        dailyBudget.getBudgetDate().equals(
                                expense.getExpenseDate()))
                .map(Expense::getAmount)
                .filter(amount -> amount != null)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal remaining =
                dailyBudget.getDailyLimit().subtract(spent);

        return new DailyBudgetResponse(
                dailyBudget.getDailyBudgetId(),
                dailyBudget.getBudgetDate(),
                dailyBudget.getDailyLimit(),
                spent,
                remaining
        );
    }

    // ==========================================
    // GET OWNED BUDGET
    // ==========================================

    private TripBudget getOwnedBudget(
            Integer tripId,
            Integer userId) {

        return tripBudgetRepository
                .findByTrip_TripIdAndTrip_User_UserId(
                        tripId,
                        userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Budget not found for this trip or access denied"));
    }

    // ==========================================
    // RECORD BUDGET HISTORY
    // ==========================================

    private void recordHistory(
            TripBudget budget,
            Integer userId,
            String eventType,
            String description) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found"));

        BudgetHistory history = new BudgetHistory();

        history.setBudget(budget);
        history.setUser(user);
        history.setEventType(eventType);
        history.setDescription(description);

        // createdAt is managed by the entity's @PrePersist callback.
        budgetHistoryRepository.save(history);
    }

    // ==========================================
    // VALIDATION
    // ==========================================

    private void validatePositiveAmount(
            BigDecimal amount,
            String fieldName) {

        if (amount == null || amount.compareTo(ZERO) <= 0) {

            throw new IllegalArgumentException(
                    fieldName + " must be greater than zero");
        }
    }

    private void validateThreshold(BigDecimal threshold) {

        if (threshold == null
                || threshold.compareTo(ZERO) <= 0
                || threshold.compareTo(new BigDecimal("100")) > 0) {

            throw new IllegalArgumentException(
                    "Warning threshold must be greater than 0 and at most 100");
        }

        try {
            threshold.intValueExact();
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException(
                    "Warning threshold must be a whole number");
        }
    }

    // ==========================================
    // CALCULATE PERCENTAGE
    // ==========================================

    private BigDecimal calculatePercentage(
            BigDecimal amount,
            BigDecimal total) {

        if (total == null || total.compareTo(ZERO) <= 0) {

            return ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return amount.multiply(new BigDecimal("100"))
                .divide(total, 2, RoundingMode.HALF_UP);
    }
}
