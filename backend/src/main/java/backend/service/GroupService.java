
package backend.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.entity.GroupMember;
import backend.entity.GroupTrip;
import backend.entity.Trip;
import backend.entity.User;
import backend.repository.GroupMemberRepository;
import backend.repository.GroupTripRepository;
import backend.repository.TripRepository;
import backend.repository.UserRepository;

@Service
public class GroupService {

    private final GroupTripRepository groupTripRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;

    public GroupService(
            GroupTripRepository groupTripRepository,
            GroupMemberRepository groupMemberRepository,
            TripRepository tripRepository,
            UserRepository userRepository) {

        this.groupTripRepository = groupTripRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
    }

    // CREATE A GROUP FOR AN EXISTING TRIP
    @Transactional
    public GroupTrip createGroup(
            Integer tripId,
            String groupName,
            Integer userId) {

        if (tripId == null || userId == null) {
            throw new IllegalArgumentException(
                    "Trip ID and user ID are required");
        }

        if (groupName == null || groupName.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Group name is required");
        }

        Trip trip = tripRepository
                .findByTripIdAndUser_UserId(tripId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Trip not found or you do not have permission"));

        if (groupTripRepository.existsByTrip_TripId(tripId)) {
            throw new IllegalArgumentException(
                    "A group already exists for this trip");
        }

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User not found"));

        GroupTrip group = new GroupTrip();
        group.setTrip(trip);
        group.setCreatedBy(creator);
        group.setGroupName(groupName.trim());

        GroupTrip savedGroup = groupTripRepository.save(group);

        // Automatically add the creator as the first member.
        GroupMember creatorMember = new GroupMember();
        creatorMember.setGroup(savedGroup);
        creatorMember.setUser(creator);
        creatorMember.setRole("OWNER");
        creatorMember.setTotalShare(BigDecimal.ZERO);
        creatorMember.setAmountPaid(BigDecimal.ZERO);
        creatorMember.setAmountOwed(BigDecimal.ZERO);
        creatorMember.setAmountReceivable(BigDecimal.ZERO);

        groupMemberRepository.save(creatorMember);

        return savedGroup;
    }

    // ADD A REGISTERED USER TO A GROUP
    @Transactional
    public GroupMember addMember(
            Integer groupId,
            Integer newUserId,
            Integer requesterId) {

        if (groupId == null || newUserId == null
                || requesterId == null) {
            throw new IllegalArgumentException(
                    "Group ID, member ID and requester ID are required");
        }

        GroupTrip group = getAuthorizedGroup(groupId, requesterId);

        if (groupMemberRepository.existsByGroup_GroupIdAndUser_UserId(
                groupId, newUserId)) {
            throw new IllegalArgumentException(
                    "This user is already a member of the group");
        }

        User newUser = userRepository.findById(newUserId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User not found"));

        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setUser(newUser);
        member.setRole("MEMBER");
        member.setTotalShare(BigDecimal.ZERO);
        member.setAmountPaid(BigDecimal.ZERO);
        member.setAmountOwed(BigDecimal.ZERO);
        member.setAmountReceivable(BigDecimal.ZERO);

        return groupMemberRepository.save(member);
    }

    // GET GROUP DETAILS
    @Transactional(readOnly = true)
    public GroupTrip getGroup(
            Integer tripId,
            Integer userId) {

        Trip trip = tripRepository
                .findByTripIdAndUser_UserId(tripId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Trip not found or you do not have permission"));

        return groupTripRepository.findByTrip_TripId(trip.getTripId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No group exists for this trip"));
    }

    // GET ALL GROUP MEMBERS
    @Transactional(readOnly = true)
    public List<GroupMember> getMembers(
            Integer groupId,
            Integer userId) {

        getAuthorizedGroup(groupId, userId);

        return groupMemberRepository.findByGroup_GroupId(groupId);
    }

    // REMOVE A MEMBER FROM A GROUP
    @Transactional
    public void removeMember(
            Integer groupId,
            Integer memberUserId,
            Integer requesterId) {

        GroupTrip group = getAuthorizedGroup(groupId, requesterId);

        if (group.getCreatedBy().getUserId().equals(memberUserId)) {
            throw new IllegalArgumentException(
                    "The group owner cannot be removed");
        }

        GroupMember member = groupMemberRepository
                .findByGroup_GroupIdAndUser_UserId(
                        groupId, memberUserId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Group member not found"));

        groupMemberRepository.delete(member);
    }

    // VALIDATE GROUP ACCESS
    private GroupTrip getAuthorizedGroup(
            Integer groupId,
            Integer userId) {

        GroupTrip group = groupTripRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Group not found"));

        boolean isCreator = group.getCreatedBy()
                .getUserId().equals(userId);

        boolean isMember = groupMemberRepository
                .existsByGroup_GroupIdAndUser_UserId(
                        groupId, userId);

        if (!isCreator && !isMember) {
            throw new IllegalArgumentException(
                    "You do not have permission to access this group");
        }

        return group;
    }
}
