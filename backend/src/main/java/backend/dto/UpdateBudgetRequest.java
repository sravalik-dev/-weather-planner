package backend.dto;

import java.math.BigDecimal;

public record UpdateBudgetRequest(
        BigDecimal totalBudget,
        BigDecimal warningThreshold
) {}