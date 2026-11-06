package backend.dto;

import java.math.BigDecimal;

import backend.entity.ExpenseCategory;

public record CategoryBudgetRequest(
        ExpenseCategory category,
        BigDecimal allocatedAmount
) {}