package backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyBudgetResponse(
        Integer dailyBudgetId,
        LocalDate budgetDate,
        BigDecimal dailyLimit,
        BigDecimal spentAmount,
        BigDecimal remainingAmount
) {}