package backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.ItineraryActivity;

public interface ItineraryActivityRepository extends JpaRepository<ItineraryActivity, Integer> {

    List<ItineraryActivity> findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(
            Integer tripId
    );

    List<ItineraryActivity> findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
            Integer tripId,
            LocalDate activityDate
    );

    Optional<ItineraryActivity> findByActivityIdAndTrip_TripId(
            Integer activityId,
            Integer tripId
    );

    boolean existsByTrip_TripIdAndLockedTrue(Integer tripId);

    void deleteByTrip_TripId(Integer tripId);
}