package backend.dto;

import java.math.BigDecimal;

public record GroupBalanceResponse(
        Integer userId,
        String memberName,
        BigDecimal totalShare,
        BigDecimal amountPaid,
        BigDecimal balance
) {}
