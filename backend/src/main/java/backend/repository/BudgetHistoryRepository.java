package backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.BudgetHistory;

public interface BudgetHistoryRepository
        extends JpaRepository<BudgetHistory, Integer> {

    List<BudgetHistory> findByBudget_BudgetIdOrderByCreatedAtDesc(
            Integer budgetId
    );
}