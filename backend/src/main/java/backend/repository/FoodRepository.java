package backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.Food;
import backend.entity.FoodCategory;
import backend.entity.FoodType;

public interface FoodRepository extends JpaRepository<Food, Integer> {

    List<Food> findByDestination_DestinationId(Integer destinationId);

    List<Food> findByDestination_DestinationIdAndCategory(
            Integer destinationId,
            FoodCategory category
    );

    List<Food> findByDestination_DestinationIdAndFoodType(
            Integer destinationId,
            FoodType foodType
    );

    Optional<Food> findByFoodIdAndDestination_DestinationId(
            Integer foodId,
            Integer destinationId
    );
}