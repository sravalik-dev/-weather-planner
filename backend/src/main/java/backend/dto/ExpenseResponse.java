package backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ExpenseResponse(
        Integer expenseId,
        Integer tripId,
        Integer groupId,
        String category,
        String description,
        BigDecimal amount,
        Integer paidByUserId,
        LocalDate expenseDate,
        String splitType,
        String paymentMethod,
        LocalDateTime createdAt,
        List<ExpenseSplitResponse> splits
) {}