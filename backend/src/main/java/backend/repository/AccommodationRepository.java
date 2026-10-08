package backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.Accommodation;
import backend.entity.AccommodationType;

public interface AccommodationRepository
        extends JpaRepository<Accommodation, Integer> {

    List<Accommodation> findAllByOrderByRatingDesc();

    List<Accommodation> findByAvailabilityTrueOrderByRatingDesc();

    List<Accommodation>
    findByDestinationContainingIgnoreCaseAndAvailabilityTrueOrderByRatingDesc(
            String destination);

    List<Accommodation>
    findByAccommodationTypeAndAvailabilityTrueOrderByRatingDesc(
            AccommodationType accommodationType);

    List<Accommodation>
    findByBeachViewTrueAndAvailabilityTrueOrderByRatingDesc();

    List<Accommodation>
    findByBeachAccessTrueAndAvailabilityTrueOrderByRatingDesc();

    List<Accommodation>
    findByBeachfrontTrueAndAvailabilityTrueOrderByRatingDesc();

    List<Accommodation>
    findBySwimmingPoolTrueAndAvailabilityTrueOrderByRatingDesc();

    List<Accommodation>
    findByBeachViewTrueAndSwimmingPoolTrueAndAvailabilityTrueOrderByRatingDesc();

    List<Accommodation>
    findByBeachAccessTrueAndSwimmingPoolTrueAndAvailabilityTrueOrderByRatingDesc();

    List<Accommodation>
    findByBeachfrontTrueAndSwimmingPoolTrueAndAvailabilityTrueOrderByRatingDesc();
}