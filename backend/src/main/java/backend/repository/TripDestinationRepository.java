package backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.TripDestination;

public interface TripDestinationRepository
        extends JpaRepository<TripDestination, Integer> {

    List<TripDestination> findByTrip_TripIdOrderByDestinationOrderAsc(
            Integer tripId
    );

    Optional<TripDestination> findByDestinationIdAndTrip_TripId(
            Integer destinationId,
            Integer tripId
    );
}