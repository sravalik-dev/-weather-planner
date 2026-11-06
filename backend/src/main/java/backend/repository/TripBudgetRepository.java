package backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.TripBudget;

public interface TripBudgetRepository
        extends JpaRepository<TripBudget, Integer> {

    Optional<TripBudget> findByTrip_TripId(Integer tripId);

    Optional<TripBudget> findByTrip_TripIdAndTrip_User_UserId(
            Integer tripId,
            Integer userId
    );

    boolean existsByTrip_TripId(Integer tripId);
}