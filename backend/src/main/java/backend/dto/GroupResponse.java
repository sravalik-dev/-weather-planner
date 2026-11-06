package backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record GroupResponse(
        Integer groupId,
        Integer tripId,
        String groupName,
        Integer createdByUserId,
        LocalDateTime createdAt,
        List<GroupMemberResponse> members
) {}