package backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SettlementResponse(
        Integer settlementId,
        Integer groupId,
        Integer payerUserId,
        String payerName,
        Integer receiverUserId,
        String receiverName,
        BigDecimal amount,
        String status,
        LocalDateTime createdAt,
        LocalDateTime settledAt
) {}