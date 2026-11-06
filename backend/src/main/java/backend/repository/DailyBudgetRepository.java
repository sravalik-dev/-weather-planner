package backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.DailyBudget;

public interface DailyBudgetRepository
        extends JpaRepository<DailyBudget, Integer> {

    List<DailyBudget> findByBudget_BudgetIdOrderByBudgetDateAsc(
            Integer budgetId
    );

    Optional<DailyBudget> findByBudget_BudgetIdAndBudgetDate(
            Integer budgetId,
            LocalDate budgetDate
    );
}