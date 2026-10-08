package backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.FoodHistory;

public interface FoodHistoryRepository
        extends JpaRepository<FoodHistory, Integer> {

    List<FoodHistory> findByTrip_TripIdOrderByCreatedAtDesc(
            Integer tripId
    );

    List<FoodHistory> findByUser_UserIdOrderByCreatedAtDesc(
            Integer userId
    );

    List<FoodHistory> findByFoodRecommendation_FoodRecommendationIdOrderByCreatedAtDesc(
            Integer foodRecommendationId
    );

    void deleteByTrip_TripId(Integer tripId);
}