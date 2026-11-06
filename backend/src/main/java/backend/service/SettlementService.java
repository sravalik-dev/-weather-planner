package backend.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.entity.Expense;
import backend.entity.ExpenseSplit;
import backend.entity.GroupMember;
import backend.entity.GroupTrip;
import backend.entity.Settlement;
import backend.entity.SettlementStatus;
import backend.repository.ExpenseRepository;
import backend.repository.ExpenseSplitRepository;
import backend.repository.GroupMemberRepository;
import backend.repository.GroupTripRepository;
import backend.repository.SettlementRepository;

@Service
@Transactional
public class SettlementService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final SettlementRepository settlementRepository;
    private final GroupTripRepository groupTripRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;

    public SettlementService(
            SettlementRepository settlementRepository,
            GroupTripRepository groupTripRepository,
            GroupMemberRepository groupMemberRepository,
            ExpenseRepository expenseRepository,
            ExpenseSplitRepository expenseSplitRepository) {

        this.settlementRepository = settlementRepository;
        this.groupTripRepository = groupTripRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.expenseRepository = expenseRepository;
        this.expenseSplitRepository = expenseSplitRepository;
    }

    // CREATE A SETTLEMENT ONLY WHEN THE EXPENSES SUPPORT IT.
    public Settlement createSettlement(
            Integer groupId,
            Integer payerMemberId,
            Integer receiverMemberId,
            BigDecimal amount,
            Integer requesterId) {

        validateAmount(amount);

        if (payerMemberId == null || receiverMemberId == null) {
            throw new IllegalArgumentException("Payer and receiver are required");
        }
        if (payerMemberId.equals(receiverMemberId)) {
            throw new IllegalArgumentException("Payer and receiver cannot be the same member");
        }

        GroupTrip group = getAuthorizedGroup(groupId, requesterId);
        recalculateOutstandingBalances(groupId);

        GroupMember payer = getGroupMember(payerMemberId, groupId, "Payer");
        GroupMember receiver = getGroupMember(receiverMemberId, groupId, "Receiver");

        BigDecimal pendingFromPayer = ZERO;
        BigDecimal pendingToReceiver = ZERO;
        for (Settlement pending : settlementRepository.findByGroup_GroupIdAndStatus(
                groupId, SettlementStatus.PENDING)) {
            if (pending.getPayer().getMemberId().equals(payerMemberId)) {
                pendingFromPayer = pendingFromPayer.add(pending.getAmount());
            }
            if (pending.getReceiver().getMemberId().equals(receiverMemberId)) {
                pendingToReceiver = pendingToReceiver.add(pending.getAmount());
            }
        }

        BigDecimal availableDebt = payer.getAmountOwed().subtract(pendingFromPayer);
        BigDecimal availableReceivable = receiver.getAmountReceivable().subtract(pendingToReceiver);

        if (availableDebt.compareTo(amount) < 0) {
            throw new IllegalArgumentException(
                    "Settlement amount exceeds the payer's available outstanding debt. Available debt: "
                    + availableDebt.max(ZERO));
        }
        if (availableReceivable.compareTo(amount) < 0) {
            throw new IllegalArgumentException(
                    "Settlement amount exceeds the receiver's available receivable. Available receivable: "
                    + availableReceivable.max(ZERO));
        }

        Settlement settlement = new Settlement();
        settlement.setGroup(group);
        settlement.setPayer(payer);
        settlement.setReceiver(receiver);
        settlement.setAmount(amount);
        settlement.setStatus(SettlementStatus.PENDING);
        return settlementRepository.save(settlement);
    }

    @Transactional(readOnly = true)
    public List<Settlement> getSettlements(Integer groupId, Integer requesterId) {
        getAuthorizedGroup(groupId, requesterId);
        return settlementRepository.findByGroup_GroupIdOrderByCreatedAtDesc(groupId);
    }

    @Transactional(readOnly = true)
    public List<Settlement> getPendingSettlements(Integer groupId, Integer requesterId) {
        getAuthorizedGroup(groupId, requesterId);
        return settlementRepository.findByGroup_GroupIdAndStatus(groupId, SettlementStatus.PENDING);
    }

    public Settlement completeSettlement(
            Integer settlementId,
            Integer groupId,
            Integer requesterId) {

        getAuthorizedGroup(groupId, requesterId);
        Settlement settlement = settlementRepository
                .findBySettlementIdAndGroup_GroupId(settlementId, groupId)
                .orElseThrow(() -> new IllegalArgumentException("Settlement not found"));

        if (settlement.getStatus() == SettlementStatus.COMPLETED) {
            throw new IllegalArgumentException("This settlement is already completed");
        }

        // Rebuild balances from the expense split rows, not cached member totals.
        recalculateOutstandingBalances(groupId);

        GroupMember payer = getGroupMember(
                settlement.getPayer().getMemberId(), groupId, "Payer");
        GroupMember receiver = getGroupMember(
                settlement.getReceiver().getMemberId(), groupId, "Receiver");
        BigDecimal amount = settlement.getAmount();

        if (payer.getAmountOwed().compareTo(amount) < 0) {
            throw new IllegalArgumentException(
                    "Settlement amount exceeds the payer's outstanding debt. Outstanding debt: "
                    + payer.getAmountOwed());
        }
        if (receiver.getAmountReceivable().compareTo(amount) < 0) {
            throw new IllegalArgumentException(
                    "Settlement amount exceeds the receiver's outstanding receivable. Outstanding receivable: "
                    + receiver.getAmountReceivable());
        }

        settlement.setStatus(SettlementStatus.COMPLETED);
        settlement.setSettledAt(LocalDateTime.now());
        Settlement saved = settlementRepository.save(settlement);
        recalculateOutstandingBalances(groupId);
        return saved;
    }

    // Recalculate original totals from ExpenseSplit rows, then apply completed payments.
    private void recalculateOutstandingBalances(Integer groupId) {
        List<GroupMember> members = groupMemberRepository.findByGroup_GroupId(groupId);
        List<Expense> expenses = expenseRepository.findByGroup_GroupId(groupId);

        Map<Integer, BigDecimal> shares = new HashMap<>();
        Map<Integer, BigDecimal> paid = new HashMap<>();
        Map<Integer, BigDecimal> owed = new HashMap<>();
        Map<Integer, BigDecimal> receivable = new HashMap<>();

        for (GroupMember member : members) {
            Integer id = member.getMemberId();
            shares.put(id, ZERO);
            paid.put(id, ZERO);
            owed.put(id, ZERO);
            receivable.put(id, ZERO);
        }

        for (Expense expense : expenses) {
            List<ExpenseSplit> splits = expenseSplitRepository
                    .findByExpense_ExpenseId(expense.getExpenseId());
            for (ExpenseSplit split : splits) {
                Integer memberId = split.getMember().getMemberId();
                shares.merge(memberId, split.getShareAmount(), BigDecimal::add);
                paid.merge(memberId, split.getAmountPaid(), BigDecimal::add);
            }
        }

        for (GroupMember member : members) {
            Integer id = member.getMemberId();
            BigDecimal net = paid.getOrDefault(id, ZERO)
                    .subtract(shares.getOrDefault(id, ZERO));
            owed.put(id, net.compareTo(ZERO) < 0 ? net.abs() : ZERO);
            receivable.put(id, net.compareTo(ZERO) > 0 ? net : ZERO);
        }

        List<Settlement> completed = settlementRepository
                .findByGroup_GroupIdAndStatus(groupId, SettlementStatus.COMPLETED);
        for (Settlement settlement : completed) {
            Integer payerId = settlement.getPayer().getMemberId();
            Integer receiverId = settlement.getReceiver().getMemberId();
            BigDecimal amount = settlement.getAmount();
            owed.computeIfPresent(payerId, (id, value) -> value.subtract(amount).max(ZERO));
            receivable.computeIfPresent(receiverId,
                    (id, value) -> value.subtract(amount).max(ZERO));
        }

        for (GroupMember member : members) {
            Integer id = member.getMemberId();
            member.setTotalShare(shares.getOrDefault(id, ZERO));
            member.setAmountPaid(paid.getOrDefault(id, ZERO));
            member.setAmountOwed(owed.getOrDefault(id, ZERO));
            member.setAmountReceivable(receivable.getOrDefault(id, ZERO));
        }
        groupMemberRepository.saveAll(members);
    }

    private GroupMember getGroupMember(Integer memberId, Integer groupId, String label) {
        return groupMemberRepository.findByMemberIdAndGroup_GroupId(memberId, groupId)
                .orElseThrow(() -> new IllegalArgumentException(
                        label + " is not a member of this group"));
    }

    private GroupTrip getAuthorizedGroup(Integer groupId, Integer requesterId) {
        if (groupId == null || requesterId == null) {
            throw new IllegalArgumentException("Group ID and requester ID are required");
        }
        GroupTrip group = groupTripRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        boolean isCreator = group.getCreatedBy().getUserId().equals(requesterId);
        boolean isMember = groupMemberRepository
                .existsByGroup_GroupIdAndUser_UserId(groupId, requesterId);
        if (!isCreator && !isMember) {
            throw new IllegalArgumentException("You do not have permission to access this group");
        }
        return group;
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(ZERO) <= 0) {
            throw new IllegalArgumentException("Settlement amount must be greater than zero");
        }
    }
}
