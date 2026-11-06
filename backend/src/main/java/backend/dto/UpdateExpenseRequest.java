package backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import backend.entity.ExpenseCategory;
import backend.entity.SplitType;

public record UpdateExpenseRequest(
        ExpenseCategory category,
        String description,
        BigDecimal amount,
        LocalDate expenseDate,
        SplitType splitType,
        String paymentMethod
) {}