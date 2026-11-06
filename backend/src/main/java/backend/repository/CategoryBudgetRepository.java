package backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.CategoryBudget;
import backend.entity.ExpenseCategory;

public interface CategoryBudgetRepository
        extends JpaRepository<CategoryBudget, Integer> {

    List<CategoryBudget> findByBudget_BudgetId(Integer budgetId);

    Optional<CategoryBudget> findByBudget_BudgetIdAndCategory(
            Integer budgetId,
            ExpenseCategory category
    );

    void deleteByBudget_BudgetId(Integer budgetId);
}