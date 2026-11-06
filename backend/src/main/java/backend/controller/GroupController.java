
package backend.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import backend.entity.GroupMember;
import backend.entity.GroupTrip;
import backend.service.GroupService;
import backend.service.ExpenseService;
import backend.dto.ExpenseResponse;

@RestController
@RequestMapping("/api/budget/groups")
public class GroupController {

    private final GroupService groupService;
    private final ExpenseService expenseService;

    public GroupController(
            GroupService groupService,
            ExpenseService expenseService) {
        this.groupService = groupService;
        this.expenseService = expenseService;
    }

    public record CreateGroupPayload(String groupName) {}

    public record AddMemberPayload(Integer userId) {}

    // Small response DTOs prevent circular entity serialization.
    public record GroupResponse(
            Integer groupId,
            Integer tripId,
            String groupName,
            Integer createdByUserId
    ) {}

    public record GroupMemberResponse(
            Integer memberId,
            Integer userId,
            String role,
            BigDecimal totalShare,
            BigDecimal amountPaid,
            BigDecimal amountOwed,
            BigDecimal amountReceivable
    ) {}

    private Integer getUserId(Authentication authentication) {
        if (authentication == null
                || authentication.getPrincipal() == null) {
            throw new IllegalArgumentException(
                    "Authentication required");
        }

        return (Integer) authentication.getPrincipal();
    }

    private GroupResponse toGroupResponse(GroupTrip group) {
        return new GroupResponse(
                group.getGroupId(),
                group.getTrip().getTripId(),
                group.getGroupName(),
                group.getCreatedBy().getUserId()
        );
    }

    private GroupMemberResponse toMemberResponse(GroupMember member) {
        return new GroupMemberResponse(
                member.getMemberId(),
                member.getUser().getUserId(),
                member.getRole(),
                member.getTotalShare(),
                member.getAmountPaid(),
                member.getAmountOwed(),
                member.getAmountReceivable()
        );
    }

    // CREATE GROUP FOR A TRIP
    @PostMapping("/trips/{tripId}")
    public ResponseEntity<GroupResponse> createGroup(
            @PathVariable Integer tripId,
            @RequestBody CreateGroupPayload request,
            Authentication authentication) {

        GroupTrip group = groupService.createGroup(
                tripId,
                request.groupName(),
                getUserId(authentication)
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toGroupResponse(group));
    }

    // GET GROUP FOR A TRIP
    @GetMapping("/trips/{tripId}")
    public ResponseEntity<GroupResponse> getGroup(
            @PathVariable Integer tripId,
            Authentication authentication) {

        GroupTrip group = groupService.getGroup(
                tripId,
                getUserId(authentication)
        );

        return ResponseEntity.ok(toGroupResponse(group));
    }

    // GET ALL EXPENSES FOR A GROUP
    @GetMapping("/{groupId}/expenses")
    public ResponseEntity<List<ExpenseResponse>> getGroupExpenses(
            @PathVariable Integer groupId,
            Authentication authentication) {

        return ResponseEntity.ok(
                expenseService.getGroupExpenses(
                        groupId, getUserId(authentication)));
    }

    // GET ALL GROUP MEMBERS
    @GetMapping("/{groupId}/members")
    public ResponseEntity<List<GroupMemberResponse>> getMembers(
            @PathVariable Integer groupId,
            Authentication authentication) {

        List<GroupMemberResponse> members =
                groupService.getMembers(
                        groupId,
                        getUserId(authentication)
                )
                .stream()
                .map(this::toMemberResponse)
                .toList();

        return ResponseEntity.ok(members);
    }

    // ADD MEMBER
    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupMemberResponse> addMember(
            @PathVariable Integer groupId,
            @RequestBody AddMemberPayload request,
            Authentication authentication) {

        GroupMember member = groupService.addMember(
                groupId,
                request.userId(),
                getUserId(authentication)
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toMemberResponse(member));
    }

    // REMOVE MEMBER
    @DeleteMapping("/{groupId}/members/{memberUserId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Integer groupId,
            @PathVariable Integer memberUserId,
            Authentication authentication) {

        groupService.removeMember(
                groupId,
                memberUserId,
                getUserId(authentication)
        );

        return ResponseEntity.noContent().build();
    }
}
