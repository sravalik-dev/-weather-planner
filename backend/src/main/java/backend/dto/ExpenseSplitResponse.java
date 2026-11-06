package backend.dto;

import java.math.BigDecimal;

public record ExpenseSplitResponse(
        Integer memberUserId,
        String memberName,
        BigDecimal shareAmount,
        BigDecimal amountPaid,
        BigDecimal balance
) {}