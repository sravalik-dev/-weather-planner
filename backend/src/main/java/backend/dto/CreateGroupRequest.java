package backend.dto;

public record CreateGroupRequest(
        Integer tripId,
        String groupName
) {}
