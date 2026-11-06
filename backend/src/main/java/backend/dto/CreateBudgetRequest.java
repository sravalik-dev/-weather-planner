package backend.dto;

import java.math.BigDecimal;

public record CreateBudgetRequest(
        Integer tripId,
        BigDecimal totalBudget,
        BigDecimal warningThreshold
) {}