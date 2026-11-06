
package backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.entity.BudgetHistory;
import backend.entity.TripBudget;
import backend.entity.User;
import backend.repository.BudgetHistoryRepository;
import backend.repository.TripBudgetRepository;
import backend.repository.UserRepository;

@Service
public class BudgetHistoryService {

    private final BudgetHistoryRepository budgetHistoryRepository;
    private final TripBudgetRepository tripBudgetRepository;
    private final UserRepository userRepository;

    public BudgetHistoryService(
            BudgetHistoryRepository budgetHistoryRepository,
            TripBudgetRepository tripBudgetRepository,
            UserRepository userRepository) {

        this.budgetHistoryRepository = budgetHistoryRepository;
        this.tripBudgetRepository = tripBudgetRepository;
        this.userRepository = userRepository;
    }

    // GET BUDGET HISTORY FOR A TRIP
    @Transactional(readOnly = true)
    public List<BudgetHistory> getBudgetHistory(
            Integer tripId,
            Integer userId) {

        TripBudget budget = getOwnedBudget(tripId, userId);

        return budgetHistoryRepository
                .findByBudget_BudgetIdOrderByCreatedAtDesc(
                        budget.getBudgetId());
    }

    // GET HISTORY FOR A BUDGET
    @Transactional(readOnly = true)
    public List<BudgetHistory> getHistoryByBudgetId(
            Integer budgetId,
            Integer userId) {

        if (budgetId == null || userId == null) {
            throw new IllegalArgumentException(
                    "Budget ID and user ID are required");
        }

        TripBudget budget = tripBudgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Budget not found"));

        if (!budget.getTrip().getUser().getUserId().equals(userId)) {
            throw new IllegalArgumentException(
                    "You do not have permission to view this budget history");
        }

        return budgetHistoryRepository
                .findByBudget_BudgetIdOrderByCreatedAtDesc(budgetId);
    }

    // RECORD A BUDGET EVENT
    @Transactional
    public BudgetHistory recordHistory(
            Integer tripId,
            Integer userId,
            String eventType,
            String description) {

        if (eventType == null || eventType.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Event type is required");
        }

        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "History description is required");
        }

        TripBudget budget = getOwnedBudget(tripId, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User not found"));

        BudgetHistory history = new BudgetHistory();
        history.setBudget(budget);
        history.setUser(user);
        history.setEventType(eventType.trim());
        history.setDescription(description.trim());

        return budgetHistoryRepository.save(history);
    }

    // VALIDATE BUDGET OWNERSHIP
    private TripBudget getOwnedBudget(
            Integer tripId,
            Integer userId) {

        if (tripId == null || userId == null) {
            throw new IllegalArgumentException(
                    "Trip ID and user ID are required");
        }

        return tripBudgetRepository
                .findByTrip_TripIdAndTrip_User_UserId(
                        tripId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Budget not found or you do not have permission"));
    }
}
