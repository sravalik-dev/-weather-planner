package backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.ExpenseSplit;

public interface ExpenseSplitRepository
        extends JpaRepository<ExpenseSplit, Integer> {

    List<ExpenseSplit> findByExpense_ExpenseId(Integer expenseId);

    List<ExpenseSplit> findByMember_MemberId(Integer memberId);

    void deleteByExpense_ExpenseId(Integer expenseId);
}