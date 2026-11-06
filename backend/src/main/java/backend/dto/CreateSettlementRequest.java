package backend.dto;

import java.math.BigDecimal;

public record CreateSettlementRequest(
        Integer receiverUserId,
        BigDecimal amount
) {}