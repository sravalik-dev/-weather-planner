package backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.GroupMember;

public interface GroupMemberRepository
        extends JpaRepository<GroupMember, Integer> {

    List<GroupMember> findByGroup_GroupId(Integer groupId);

    Optional<GroupMember> findByGroup_GroupIdAndUser_UserId(
            Integer groupId,
            Integer userId
    );

    Optional<GroupMember> findByMemberIdAndGroup_GroupId(
            Integer memberId,
            Integer groupId
    );

    boolean existsByGroup_GroupIdAndUser_UserId(
            Integer groupId,
            Integer userId
    );

    long countByGroup_GroupId(Integer groupId);

    void deleteByGroup_GroupIdAndUser_UserId(
            Integer groupId,
            Integer userId
    );
}