package backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record BudgetOverviewResponse(
        Integer budgetId,
        Integer tripId,
        BigDecimal totalBudget,
        BigDecimal totalSpent,
        BigDecimal remainingBudget,
        BigDecimal spentPercentage,
        BigDecimal warningThreshold,
        boolean overspending,
        List<CategoryBudgetResponse> categoryBudgets,
        List<DailyBudgetResponse> dailyBudgets
) {}