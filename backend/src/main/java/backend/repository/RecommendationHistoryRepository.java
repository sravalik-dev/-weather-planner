package backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.RecommendationHistory;

public interface RecommendationHistoryRepository
        extends JpaRepository<
                RecommendationHistory,
                Integer> {

    List<RecommendationHistory>
    findByTrip_TripIdOrderByCreatedAtDesc(
            Integer tripId
    );

    List<RecommendationHistory>
    findByUser_UserIdOrderByCreatedAtDesc(
            Integer userId
    );

    List<RecommendationHistory>
    findByRecommendation_RecommendationIdOrderByCreatedAtDesc(
            Integer recommendationId
    );

    void deleteByTrip_TripId(
            Integer tripId
    );
}