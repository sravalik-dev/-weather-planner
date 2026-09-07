package backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.Trip;

public interface TripRepository extends JpaRepository<Trip, Integer> {

    List<Trip> findByUser_UserIdOrderByCreatedAtDesc(Integer userId);

    Optional<Trip> findByTripIdAndUser_UserId(Integer tripId, Integer userId);
}