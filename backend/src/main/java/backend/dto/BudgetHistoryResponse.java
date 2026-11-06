package backend.dto;

import java.time.LocalDateTime;

public record BudgetHistoryResponse(
        Integer historyId,
        String eventType,
        String description,
        Integer userId,
        LocalDateTime createdAt
) {}
