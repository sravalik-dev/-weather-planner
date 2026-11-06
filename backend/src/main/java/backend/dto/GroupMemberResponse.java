package backend.dto;

import java.math.BigDecimal;

public record GroupMemberResponse(
        Integer memberId,
        Integer userId,
        String memberName,
        String role,
        BigDecimal totalShare,
        BigDecimal amountPaid,
        BigDecimal amountOwed,
        BigDecimal amountReceivable
) {}