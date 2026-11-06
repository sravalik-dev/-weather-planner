package backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import backend.entity.ExpenseCategory;
import backend.entity.SplitType;

public record CreateExpenseRequest(
        Integer tripId,
        Integer groupId,
        ExpenseCategory category,
        String description,
        BigDecimal amount,
        LocalDate expenseDate,
        SplitType splitType,
        String paymentMethod,
        List<ExpenseSplitRequest> splits
) {}