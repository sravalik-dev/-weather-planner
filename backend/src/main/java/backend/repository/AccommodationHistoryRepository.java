package backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import backend.entity.AccommodationHistory;

public interface AccommodationHistoryRepository
        extends JpaRepository<AccommodationHistory, Integer> {

    @Query("""
        SELECT h
        FROM AccommodationHistory h
        WHERE h.user.userId = :userId
        ORDER BY h.createdAt DESC
    """)
    List<AccommodationHistory> findUserHistory(
            @Param("userId") Integer userId);

    @Query("""
        SELECT h
        FROM AccommodationHistory h
        WHERE h.user.userId = :userId
          AND h.trip.tripId = :tripId
        ORDER BY h.createdAt DESC
    """)
    List<AccommodationHistory> findUserTripHistory(
            @Param("userId") Integer userId,
            @Param("tripId") Integer tripId);

    List<AccommodationHistory>
    findByAccommodation_AccommodationIdOrderByCreatedAtDesc(
            Integer accommodationId);

    long countByAccommodation_AccommodationId(
            Integer accommodationId);
}