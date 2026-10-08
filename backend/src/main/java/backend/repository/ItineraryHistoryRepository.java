package backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.ItineraryHistory;

public interface ItineraryHistoryRepository extends JpaRepository<ItineraryHistory, Integer> {

    List<ItineraryHistory> findByTrip_TripIdOrderByCreatedAtDesc(
            Integer tripId
    );
}