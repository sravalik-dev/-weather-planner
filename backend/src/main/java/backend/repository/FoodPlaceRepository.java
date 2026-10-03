package backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.FoodPlace;
import backend.entity.FoodPlaceType;

public interface FoodPlaceRepository extends JpaRepository<FoodPlace, Integer> {

    List<FoodPlace> findByDestination_DestinationId(
            Integer destinationId
    );

    List<FoodPlace> findByDestination_DestinationIdAndPlaceType(
            Integer destinationId,
            FoodPlaceType placeType
    );

    Optional<FoodPlace> findByFoodPlaceIdAndDestination_DestinationId(
            Integer foodPlaceId,
            Integer destinationId
    );
}