package backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.entity.UserPreference;

public interface UserPreferenceRepository
        extends JpaRepository<UserPreference, Integer> {

    Optional<UserPreference> findByUserId(Integer userId);
}