
package backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.dto.CreateExpenseRequest;
import backend.dto.ExpenseResponse;
import backend.dto.ExpenseSplitRequest;
import backend.dto.ExpenseSplitResponse;
import backend.dto.UpdateExpenseRequest;

import backend.entity.BudgetHistory;
import backend.entity.Expense;
import backend.entity.ExpenseSplit;
import backend.entity.GroupMember;
import backend.entity.GroupTrip;
import backend.entity.Settlement;
import backend.entity.SettlementStatus;
import backend.entity.SplitType;
import backend.entity.Trip;
import backend.entity.TripBudget;
import backend.entity.User;

import backend.repository.BudgetHistoryRepository;
import backend.repository.ExpenseRepository;
import backend.repository.ExpenseSplitRepository;
import backend.repository.GroupMemberRepository;
import backend.repository.GroupTripRepository;
import backend.repository.SettlementRepository;
import backend.repository.TripBudgetRepository;
import backend.repository.TripRepository;
import backend.repository.UserRepository;

@Service
@Transactional
public class ExpenseService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final TripRepository tripRepository;
    private final TripBudgetRepository tripBudgetRepository;
    private final GroupTripRepository groupTripRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final BudgetHistoryRepository budgetHistoryRepository;
    private final SettlementRepository settlementRepository;

    public ExpenseService(
            ExpenseRepository expenseRepository,
            ExpenseSplitRepository expenseSplitRepository,
            TripRepository tripRepository,
            TripBudgetRepository tripBudgetRepository,
            GroupTripRepository groupTripRepository,
            GroupMemberRepository groupMemberRepository,
            UserRepository userRepository,
            BudgetHistoryRepository budgetHistoryRepository,
            SettlementRepository settlementRepository) {

        this.expenseRepository = expenseRepository;
        this.expenseSplitRepository = expenseSplitRepository;
        this.tripRepository = tripRepository;
        this.tripBudgetRepository = tripBudgetRepository;
        this.groupTripRepository = groupTripRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.userRepository = userRepository;
        this.budgetHistoryRepository = budgetHistoryRepository;
        this.settlementRepository = settlementRepository;
    }

    // ==========================================
    // CREATE EXPENSE
    // ==========================================

    public ExpenseResponse createExpense(
            CreateExpenseRequest request,
            Integer userId) {

        validateCreateRequest(request);

        Trip trip = tripRepository
                .findByTripIdAndUser_UserId(request.tripId(), userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Trip not found or access denied"));

        TripBudget budget = tripBudgetRepository
                .findByTrip_TripIdAndTrip_User_UserId(
                        request.tripId(), userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Budget not found for this trip"));

        User payer = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        SplitType splitType = request.splitType() == null
                ? SplitType.EQUAL
                : request.splitType();

        Expense expense = new Expense();

        expense.setTrip(trip);
        expense.setBudget(budget);
        expense.setCategory(request.category());
        expense.setDescription(request.description().trim());
        expense.setAmount(request.amount());
        expense.setPaidBy(payer);
        expense.setExpenseDate(
                request.expenseDate() == null
                        ? LocalDate.now()
                        : request.expenseDate());
        expense.setSplitType(splitType);
        expense.setPaymentMethod(request.paymentMethod());

        GroupTrip group = null;

        if (request.groupId() != null) {

            group = getAuthorizedGroup(
                    request.groupId(),
                    request.tripId(),
                    userId);

            expense.setGroup(group);

        } else if (request.splits() != null
                && !request.splits().isEmpty()) {

            throw new IllegalArgumentException(
                    "Expense splits require a group trip");
        }

        expense = expenseRepository.save(expense);

        if (group != null) {

            createExpenseSplits(
                    expense,
                    group,
                    payer,
                    splitType,
                    request.splits());

            recalculateGroupBalances(group);
        }

        recordHistory(
                budget,
                userId,
                "EXPENSE_ADDED",
                "Expense added: " + expense.getDescription());

        return buildExpenseResponse(expense);
    }

    // ==========================================
    // GET ALL EXPENSES FOR A GROUP
    // ==========================================

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getGroupExpenses(
            Integer groupId,
            Integer userId) {

        if (groupId == null || userId == null) {
            throw new IllegalArgumentException(
                    "Group ID and user ID are required");
        }

        GroupTrip group = groupTripRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Group not found"));

        boolean isCreator = group.getCreatedBy()
                .getUserId().equals(userId);

        boolean isMember = groupMemberRepository
                .existsByGroup_GroupIdAndUser_UserId(groupId, userId);

        if (!isCreator && !isMember) {
            throw new IllegalArgumentException(
                    "You do not have permission to access this group");
        }

        return expenseRepository.findByGroup_GroupId(groupId)
                .stream()
                .map(this::buildExpenseResponse)
                .toList();
    }

    // ==========================================
    // GET ALL EXPENSES FOR A TRIP
    // ==========================================

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getExpenses(
            Integer tripId,
            Integer userId) {

        TripBudget budget = getOwnedBudget(tripId, userId);

        List<Expense> expenses =
                expenseRepository.findByBudget_BudgetId(
                        budget.getBudgetId());

        return expenses.stream()
                .map(this::buildExpenseResponse)
                .toList();
    }

    // ==========================================
    // GET SINGLE EXPENSE
    // ==========================================

    @Transactional(readOnly = true)
    public ExpenseResponse getExpense(
            Integer tripId,
            Integer expenseId,
            Integer userId) {

        getOwnedBudget(tripId, userId);

        Expense expense = expenseRepository
                .findByExpenseIdAndTrip_TripId(
                        expenseId, tripId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Expense not found"));

        return buildExpenseResponse(expense);
    }

    // ==========================================
    // UPDATE EXPENSE
    // ==========================================

    public ExpenseResponse updateExpense(
            Integer tripId,
            Integer expenseId,
            UpdateExpenseRequest request,
            Integer userId) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Expense update request is required");
        }

        TripBudget budget = getOwnedBudget(tripId, userId);

        Expense expense = expenseRepository
                .findByExpenseIdAndTrip_TripId(
                        expenseId, tripId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Expense not found"));

        BigDecimal oldAmount = expense.getAmount();
        SplitType oldSplitType = expense.getSplitType();

        GroupTrip group = expense.getGroup();

        if (group != null
                && request.splitType() != null
                && request.splitType() != oldSplitType) {

            throw new IllegalArgumentException(
                    "Changing the split type of a group expense "
                    + "requires new split details. "
                    + "The existing split type has been preserved.");
        }

        if (request.category() != null) {
            expense.setCategory(request.category());
        }

        if (request.description() != null) {

            if (request.description().isBlank()) {
                throw new IllegalArgumentException(
                        "Expense description cannot be empty");
            }

            expense.setDescription(
                    request.description().trim());
        }

        if (request.amount() != null) {
            validateAmount(request.amount());
            expense.setAmount(request.amount());
        }

        if (request.expenseDate() != null) {
            expense.setExpenseDate(request.expenseDate());
        }

        if (request.splitType() != null) {
            expense.setSplitType(request.splitType());
        }

        if (request.paymentMethod() != null) {
            expense.setPaymentMethod(request.paymentMethod());
        }

        boolean amountChanged =
                oldAmount.compareTo(expense.getAmount()) != 0;

        expense = expenseRepository.save(expense);

        if (group != null) {

            if (amountChanged) {
                updateExistingSplits(expense);
            }

            recalculateGroupBalances(group);
        }

        recordHistory(
                budget,
                userId,
                "EXPENSE_UPDATED",
                "Expense updated: " + expense.getDescription());

        return buildExpenseResponse(expense);
    }

    // ==========================================
    // DELETE EXPENSE
    // ==========================================

    public void deleteExpense(
            Integer tripId,
            Integer expenseId,
            Integer userId) {

        TripBudget budget = getOwnedBudget(tripId, userId);

        Expense expense = expenseRepository
                .findByExpenseIdAndTrip_TripId(
                        expenseId, tripId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Expense not found"));

        String description = expense.getDescription();
        GroupTrip group = expense.getGroup();

        expenseSplitRepository.deleteByExpense_ExpenseId(
                expenseId);

        expenseRepository.delete(expense);

        if (group != null) {
            recalculateGroupBalances(group);
        }

        recordHistory(
                budget,
                userId,
                "EXPENSE_DELETED",
                "Expense deleted: " + description);
    }

    // ==========================================
    // CREATE GROUP EXPENSE SPLITS
    // ==========================================

    private void createExpenseSplits(
            Expense expense,
            GroupTrip group,
            User payer,
            SplitType splitType,
            List<ExpenseSplitRequest> requestedSplits) {

        List<GroupMember> members =
                groupMemberRepository.findByGroup_GroupId(
                        group.getGroupId());

        if (members.isEmpty()) {
            throw new IllegalArgumentException(
                    "Group has no members");
        }

        Map<Integer, GroupMember> memberMap = new HashMap<>();

        for (GroupMember member : members) {
            memberMap.put(
                    member.getUser().getUserId(),
                    member);
        }

        Map<Integer, BigDecimal> shares =
                calculateShares(
                        expense.getAmount(),
                        members,
                        memberMap,
                        splitType,
                        requestedSplits);

        BigDecimal totalShares = shares.values().stream()
                .reduce(ZERO, BigDecimal::add);

        if (totalShares.compareTo(expense.getAmount()) != 0) {
            throw new IllegalArgumentException(
                    "Expense split amounts must equal the expense amount");
        }

        for (GroupMember member : members) {

            Integer memberUserId =
                    member.getUser().getUserId();

            BigDecimal share =
                    shares.getOrDefault(memberUserId, ZERO);

            BigDecimal paid = memberUserId.equals(
                    payer.getUserId())
                    ? expense.getAmount()
                    : ZERO;

            ExpenseSplit split = new ExpenseSplit();

            split.setExpense(expense);
            split.setMember(member);
            split.setShareAmount(share);
            split.setAmountPaid(paid);
            split.setBalance(paid.subtract(share));

            expenseSplitRepository.save(split);
        }
    }

    // ==========================================
    // CALCULATE SPLIT SHARES
    // ==========================================

    private Map<Integer, BigDecimal> calculateShares(
            BigDecimal amount,
            List<GroupMember> members,
            Map<Integer, GroupMember> memberMap,
            SplitType splitType,
            List<ExpenseSplitRequest> requestedSplits) {

        Map<Integer, BigDecimal> shares = new HashMap<>();

        for (GroupMember member : members) {
            shares.put(
                    member.getUser().getUserId(),
                    ZERO);
        }

        List<ExpenseSplitRequest> requests =
                requestedSplits == null
                        ? new ArrayList<>()
                        : requestedSplits;

        Set<Integer> selectedUsers = new HashSet<>();

        if (splitType == SplitType.EQUAL) {

            List<Integer> selectedMembers = new ArrayList<>();

            if (requests.isEmpty()) {

                for (GroupMember member : members) {
                    selectedMembers.add(
                            member.getUser().getUserId());
                }

            } else {

                for (ExpenseSplitRequest request : requests) {

                    validateGroupMember(
                            request.memberUserId(),
                            memberMap);

                    if (!selectedUsers.add(
                            request.memberUserId())) {

                        throw new IllegalArgumentException(
                                "Duplicate member in expense splits");
                    }

                    selectedMembers.add(
                            request.memberUserId());
                }
            }

            if (selectedMembers.isEmpty()) {
                throw new IllegalArgumentException(
                        "At least one member is required for splitting");
            }

            BigDecimal each = amount.divide(
                    BigDecimal.valueOf(selectedMembers.size()),
                    2,
                    RoundingMode.DOWN);

            BigDecimal allocated = ZERO;

            for (int i = 0; i < selectedMembers.size(); i++) {

                BigDecimal share =
                        i == selectedMembers.size() - 1
                                ? amount.subtract(allocated)
                                : each;

                shares.put(selectedMembers.get(i), share);
                allocated = allocated.add(share);
            }

        } else if (splitType == SplitType.CUSTOM) {

            if (requests.isEmpty()) {
                throw new IllegalArgumentException(
                        "Custom split details are required");
            }

            for (ExpenseSplitRequest request : requests) {

                validateGroupMember(
                        request.memberUserId(),
                        memberMap);

                if (!selectedUsers.add(request.memberUserId())) {
                    throw new IllegalArgumentException(
                            "Duplicate member in expense splits");
                }

                validateNonNegativeAmount(
                        request.shareAmount(),
                        "Share amount");

                shares.put(
                        request.memberUserId(),
                        request.shareAmount());
            }

        } else if (splitType == SplitType.PERCENTAGE) {

            if (requests.isEmpty()) {
                throw new IllegalArgumentException(
                        "Percentage split details are required");
            }

            BigDecimal totalPercentage = ZERO;
            BigDecimal allocated = ZERO;

            for (int i = 0; i < requests.size(); i++) {

                ExpenseSplitRequest request = requests.get(i);

                validateGroupMember(
                        request.memberUserId(),
                        memberMap);

                if (!selectedUsers.add(request.memberUserId())) {
                    throw new IllegalArgumentException(
                            "Duplicate member in expense splits");
                }

                if (request.percentage() == null
                        || request.percentage().compareTo(ZERO) < 0) {

                    throw new IllegalArgumentException(
                            "Split percentage cannot be negative");
                }

                totalPercentage =
                        totalPercentage.add(request.percentage());

                BigDecimal share;

                if (i == requests.size() - 1) {

                    share = amount.subtract(allocated);

                } else {

                    share = amount
                            .multiply(request.percentage())
                            .divide(HUNDRED, 2, RoundingMode.DOWN);

                    allocated = allocated.add(share);
                }

                shares.put(request.memberUserId(), share);
            }

            if (totalPercentage.compareTo(HUNDRED) != 0) {
                throw new IllegalArgumentException(
                        "Percentage shares must total exactly 100");
            }

        } else {
            throw new IllegalArgumentException(
                    "Invalid expense split type");
        }

        return shares;
    }

    // ==========================================
    // UPDATE EXISTING SPLITS
    // ==========================================

    private void updateExistingSplits(Expense expense) {

        if (expense.getGroup() == null) {
            return;
        }

        List<ExpenseSplit> splits =
                expenseSplitRepository.findByExpense_ExpenseId(
                        expense.getExpenseId());

        if (splits.isEmpty()) {
            throw new IllegalArgumentException(
                    "Existing expense splits could not be found");
        }

        if (expense.getSplitType() == SplitType.EQUAL) {

            updateEqualSplits(expense, splits);

        } else {

            updateProportionalSplits(expense, splits);
        }

        expenseSplitRepository.saveAll(splits);
    }

    // ==========================================
    // UPDATE EQUAL SPLITS
    // ==========================================

    private void updateEqualSplits(
            Expense expense,
            List<ExpenseSplit> splits) {

        BigDecimal amount = expense.getAmount();

        BigDecimal each = amount.divide(
                BigDecimal.valueOf(splits.size()),
                2,
                RoundingMode.DOWN);

        BigDecimal allocated = ZERO;

        for (int i = 0; i < splits.size(); i++) {

            ExpenseSplit split = splits.get(i);

            BigDecimal newShare;

            if (i == splits.size() - 1) {

                newShare = amount.subtract(allocated);

            } else {

                newShare = each;
                allocated = allocated.add(newShare);
            }

            updateSplitAmounts(expense, split, newShare);
        }
    }

    // ==========================================
    // UPDATE CUSTOM / PERCENTAGE SPLITS
    // ==========================================

    private void updateProportionalSplits(
            Expense expense,
            List<ExpenseSplit> splits) {

        BigDecimal oldTotal = splits.stream()
                .map(ExpenseSplit::getShareAmount)
                .reduce(ZERO, BigDecimal::add);

        if (oldTotal.compareTo(ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Existing split amounts cannot be recalculated");
        }

        BigDecimal allocated = ZERO;

        for (int i = 0; i < splits.size(); i++) {

            ExpenseSplit split = splits.get(i);

            BigDecimal newShare;

            if (i == splits.size() - 1) {

                newShare = expense.getAmount()
                        .subtract(allocated);

            } else {

                newShare = split.getShareAmount()
                        .multiply(expense.getAmount())
                        .divide(oldTotal, 2, RoundingMode.DOWN);

                allocated = allocated.add(newShare);
            }

            updateSplitAmounts(expense, split, newShare);
        }
    }

    // ==========================================
    // UPDATE ONE EXISTING SPLIT
    // ==========================================

    private void updateSplitAmounts(
            Expense expense,
            ExpenseSplit split,
            BigDecimal newShare) {

        Integer memberUserId = split.getMember()
                .getUser()
                .getUserId();

        BigDecimal paid = memberUserId.equals(
                expense.getPaidBy().getUserId())
                ? expense.getAmount()
                : ZERO;

        split.setShareAmount(newShare);
        split.setAmountPaid(paid);
        split.setBalance(paid.subtract(newShare));
    }

    // ==========================================
    // RECALCULATE GROUP MEMBER BALANCES
    // INCLUDING COMPLETED SETTLEMENTS
    // ==========================================

    private void recalculateGroupBalances(GroupTrip group) {

        Integer groupId = group.getGroupId();

        List<GroupMember> members =
                groupMemberRepository.findByGroup_GroupId(groupId);

        List<Expense> expenses =
                expenseRepository.findByGroup_GroupId(groupId);

        Map<Integer, BigDecimal> totalShares = new HashMap<>();
        Map<Integer, BigDecimal> totalPaid = new HashMap<>();

        Map<Integer, BigDecimal> outstandingOwed = new HashMap<>();
        Map<Integer, BigDecimal> outstandingReceivable = new HashMap<>();

        // Initialize totals for every group member.
        for (GroupMember member : members) {

            Integer memberId = member.getMemberId();

            totalShares.put(memberId, ZERO);
            totalPaid.put(memberId, ZERO);
            outstandingOwed.put(memberId, ZERO);
            outstandingReceivable.put(memberId, ZERO);
        }

        // Calculate totals from all group expenses.
        for (Expense expense : expenses) {

            List<ExpenseSplit> splits =
                    expenseSplitRepository.findByExpense_ExpenseId(
                            expense.getExpenseId());

            for (ExpenseSplit split : splits) {

                Integer memberId =
                        split.getMember().getMemberId();

                totalShares.merge(
                        memberId,
                        split.getShareAmount(),
                        BigDecimal::add);

                totalPaid.merge(
                        memberId,
                        split.getAmountPaid(),
                        BigDecimal::add);
            }
        }

        // Calculate the original outstanding balances.
        for (GroupMember member : members) {

            Integer memberId = member.getMemberId();

            BigDecimal share =
                    totalShares.getOrDefault(memberId, ZERO);

            BigDecimal paid =
                    totalPaid.getOrDefault(memberId, ZERO);

            BigDecimal netBalance = paid.subtract(share);

            BigDecimal owed = netBalance.compareTo(ZERO) < 0
                    ? netBalance.abs()
                    : ZERO;

            BigDecimal receivable = netBalance.compareTo(ZERO) > 0
                    ? netBalance
                    : ZERO;

            outstandingOwed.put(memberId, owed);
            outstandingReceivable.put(memberId, receivable);
        }

        // Retrieve completed settlements only.
        List<Settlement> completedSettlements =
                settlementRepository.findByGroup_GroupIdAndStatus(
                        groupId,
                        SettlementStatus.COMPLETED);

        // Deduct completed settlement amounts from both sides.
        for (Settlement settlement : completedSettlements) {

            Integer payerMemberId =
                    settlement.getPayer().getMemberId();

            Integer receiverMemberId =
                    settlement.getReceiver().getMemberId();

            BigDecimal settlementAmount = settlement.getAmount();

            BigDecimal payerOwed =
                    outstandingOwed.getOrDefault(
                            payerMemberId, ZERO);

            BigDecimal receiverReceivable =
                    outstandingReceivable.getOrDefault(
                            receiverMemberId, ZERO);

            BigDecimal updatedOwed =
                    payerOwed.subtract(settlementAmount);

            BigDecimal updatedReceivable =
                    receiverReceivable.subtract(settlementAmount);

            // Prevent negative outstanding balances.
            outstandingOwed.put(
                    payerMemberId,
                    updatedOwed.compareTo(ZERO) < 0
                            ? ZERO
                            : updatedOwed);

            outstandingReceivable.put(
                    receiverMemberId,
                    updatedReceivable.compareTo(ZERO) < 0
                            ? ZERO
                            : updatedReceivable);
        }

        // Save updated member balances.
        for (GroupMember member : members) {

            Integer memberId = member.getMemberId();

            member.setTotalShare(
                    totalShares.getOrDefault(memberId, ZERO));

            member.setAmountPaid(
                    totalPaid.getOrDefault(memberId, ZERO));

            member.setAmountOwed(
                    outstandingOwed.getOrDefault(memberId, ZERO));

            member.setAmountReceivable(
                    outstandingReceivable.getOrDefault(
                            memberId, ZERO));
        }

        groupMemberRepository.saveAll(members);
    }

    // ==========================================
    // AUTHORIZE GROUP
    // ==========================================

    private GroupTrip getAuthorizedGroup(
            Integer groupId,
            Integer tripId,
            Integer userId) {

        GroupTrip group = groupTripRepository.findById(groupId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Group not found"));

        if (!group.getTrip().getTripId().equals(tripId)) {
            throw new IllegalArgumentException(
                    "Group does not belong to this trip");
        }

        boolean isMember =
                groupMemberRepository.findByGroup_GroupId(groupId)
                        .stream()
                        .anyMatch(member ->
                                member.getUser().getUserId()
                                        .equals(userId));

        if (!isMember) {
            throw new IllegalArgumentException(
                    "You are not a member of this group");
        }

        return group;
    }

    // ==========================================
    // VALIDATE GROUP MEMBER
    // ==========================================

    private void validateGroupMember(
            Integer userId,
            Map<Integer, GroupMember> memberMap) {

        if (userId == null || !memberMap.containsKey(userId)) {
            throw new IllegalArgumentException(
                    "Selected user is not a member of this group");
        }
    }

    // ==========================================
    // BUILD EXPENSE RESPONSE
    // ==========================================

    private ExpenseResponse buildExpenseResponse(
            Expense expense) {

        List<ExpenseSplitResponse> splitResponses =
                new ArrayList<>();

        List<ExpenseSplit> splits =
                expenseSplitRepository.findByExpense_ExpenseId(
                        expense.getExpenseId());

        for (ExpenseSplit split : splits) {

            GroupMember member = split.getMember();

            splitResponses.add(
                    new ExpenseSplitResponse(
                            member.getUser().getUserId(),
                            member.getUser().getFullName(),
                            split.getShareAmount(),
                            split.getAmountPaid(),
                            split.getBalance()
                    ));
        }

        return new ExpenseResponse(
                expense.getExpenseId(),
                expense.getTrip().getTripId(),
                expense.getGroup() == null
                        ? null
                        : expense.getGroup().getGroupId(),
                expense.getCategory().name(),
                expense.getDescription(),
                expense.getAmount(),
                expense.getPaidBy().getUserId(),
                expense.getExpenseDate(),
                expense.getSplitType().name(),
                expense.getPaymentMethod(),
                expense.getCreatedAt(),
                splitResponses
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
                        tripId, userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Budget not found for this trip or access denied"));
    }

    // ==========================================
    // RECORD HISTORY
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

        budgetHistoryRepository.save(history);
    }

    // ==========================================
    // VALIDATION
    // ==========================================

    private void validateCreateRequest(
            CreateExpenseRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Expense request is required");
        }

        if (request.tripId() == null) {
            throw new IllegalArgumentException(
                    "Trip ID is required");
        }

        if (request.category() == null) {
            throw new IllegalArgumentException(
                    "Expense category is required");
        }

        if (request.description() == null
                || request.description().isBlank()) {

            throw new IllegalArgumentException(
                    "Expense description is required");
        }

        validateAmount(request.amount());
    }

    private void validateAmount(BigDecimal amount) {

        if (amount == null || amount.compareTo(ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Expense amount must be greater than zero");
        }
    }

    private void validateNonNegativeAmount(
            BigDecimal amount,
            String fieldName) {

        if (amount == null || amount.compareTo(ZERO) < 0) {
            throw new IllegalArgumentException(
                    fieldName + " cannot be negative");
        }
    }
}
