package backend.dto;

import java.math.BigDecimal;

public record CategoryBudgetResponse(
        Integer categoryBudgetId,
        String category,
        BigDecimal allocatedAmount,
        BigDecimal spentAmount,
        BigDecimal remainingAmount,
        BigDecimal spentPercentage
) {}
