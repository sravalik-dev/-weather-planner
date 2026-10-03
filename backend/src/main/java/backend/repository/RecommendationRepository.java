package backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.Recommendation;
import backend.entity.RecommendationType;

public interface RecommendationRepository
        extends JpaRepository<Recommendation, Integer> {

    List<Recommendation>
    findByTrip_TripIdOrderByScoreDescCreatedAtDesc(
            Integer tripId
    );

    List<Recommendation>
    findByTrip_TripIdAndRecommendationTypeOrderByScoreDescCreatedAtDesc(
            Integer tripId,
            RecommendationType recommendationType
    );

    Optional<Recommendation>
    findByRecommendationIdAndTrip_TripId(
            Integer recommendationId,
            Integer tripId
    );

    void deleteByTrip_TripId(
            Integer tripId
    );
}