package backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyBudgetRequest(
        LocalDate budgetDate,
        BigDecimal dailyLimit
) {}
