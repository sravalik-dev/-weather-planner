package backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.FoodRecommendation;

public interface FoodRecommendationRepository
        extends JpaRepository<FoodRecommendation, Integer> {

    List<FoodRecommendation> findByTrip_TripIdOrderByScoreDescCreatedAtDesc(
            Integer tripId
    );

    List<FoodRecommendation> findByTrip_TripIdAndRecommendationTypeOrderByScoreDescCreatedAtDesc(
            Integer tripId,
            String recommendationType
    );

    Optional<FoodRecommendation> findByFoodRecommendationIdAndTrip_TripId(
            Integer foodRecommendationId,
            Integer tripId
    );

    void deleteByTrip_TripId(Integer tripId);
}