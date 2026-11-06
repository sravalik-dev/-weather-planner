package backend.dto;

import java.math.BigDecimal;

public record ExpenseSplitRequest(
        Integer memberUserId,
        BigDecimal shareAmount,
        BigDecimal percentage
) {}