package backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.Expense;

public interface ExpenseRepository
        extends JpaRepository<Expense, Integer> {

    List<Expense> findByTrip_TripIdOrderByExpenseDateDescCreatedAtDesc(
            Integer tripId
    );

    Optional<Expense> findByExpenseIdAndTrip_TripId(
            Integer expenseId,
            Integer tripId
    );

    List<Expense> findByTrip_TripIdAndExpenseDate(
            Integer tripId,
            LocalDate expenseDate
    );

    List<Expense> findByTrip_TripIdAndExpenseDateBetweenOrderByExpenseDateDesc(
            Integer tripId,
            LocalDate startDate,
            LocalDate endDate
    );

    List<Expense> findByBudget_BudgetId(Integer budgetId);

    List<Expense> findByGroup_GroupId(Integer groupId);
}