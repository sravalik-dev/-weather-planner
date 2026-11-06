package backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.GroupTrip;

public interface GroupTripRepository
        extends JpaRepository<GroupTrip, Integer> {

    Optional<GroupTrip> findByTrip_TripId(Integer tripId);

    Optional<GroupTrip> findByGroupIdAndCreatedBy_UserId(
            Integer groupId,
            Integer userId
    );

    boolean existsByTrip_TripId(Integer tripId);
}