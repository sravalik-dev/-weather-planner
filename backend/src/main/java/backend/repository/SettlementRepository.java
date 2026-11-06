package backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.Settlement;
import backend.entity.SettlementStatus;

public interface SettlementRepository
        extends JpaRepository<Settlement, Integer> {

    List<Settlement> findByGroup_GroupIdOrderByCreatedAtDesc(
            Integer groupId
    );

    List<Settlement> findByGroup_GroupIdAndStatus(
            Integer groupId,
            SettlementStatus status
    );

    Optional<Settlement> findBySettlementIdAndGroup_GroupId(
            Integer settlementId,
            Integer groupId
    );
}