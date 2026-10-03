package backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import backend.dto.FoodActionRequest;
import backend.dto.FoodHistoryResponse;
import backend.dto.FoodRecommendationRequest;
import backend.dto.FoodRecommendationResponse;
import backend.service.FoodRecommendationService;

@RestController
@RequestMapping("/api/food-recommendations")
public class FoodRecommendationController {

    private final FoodRecommendationService foodRecommendationService;

    public FoodRecommendationController(
            FoodRecommendationService foodRecommendationService) {

        this.foodRecommendationService = foodRecommendationService;
    }

    /**
     * Get the authenticated user ID from the JWT authentication
     * already created by JwtAuthenticationFilter.
     */
    private Integer getAuthenticatedUserId() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || authentication.getPrincipal() == null) {

            throw new RuntimeException("User is not authenticated.");
        }

        Object principal = authentication.getPrincipal();

        if (!(principal instanceof Integer)) {
            throw new RuntimeException("Invalid authenticated user.");
        }

        return (Integer) principal;
    }

    /**
     * Generate food recommendations for a trip.
     */
    @PostMapping("/trips/{tripId}/generate")
    public ResponseEntity<List<FoodRecommendationResponse>> generateRecommendations(
            @PathVariable Integer tripId,
            @RequestBody(required = false) FoodRecommendationRequest request) {

        Integer userId = getAuthenticatedUserId();

        if (request == null) {
            request = new FoodRecommendationRequest();
        }

        List<FoodRecommendationResponse> recommendations =
                foodRecommendationService.generateRecommendations(
                        userId,
                        tripId,
                        request
                );

        return ResponseEntity.ok(recommendations);
    }

    /**
     * Get all food recommendations for a trip.
     */
    @GetMapping("/trips/{tripId}")
    public ResponseEntity<List<FoodRecommendationResponse>> getRecommendations(
            @PathVariable Integer tripId) {

        Integer userId = getAuthenticatedUserId();

        List<FoodRecommendationResponse> recommendations =
                foodRecommendationService.getRecommendations(
                        userId,
                        tripId
                );

        return ResponseEntity.ok(recommendations);
    }

    /**
     * Get food recommendations by recommendation type.
     */
    @GetMapping("/trips/{tripId}/type/{type}")
    public ResponseEntity<List<FoodRecommendationResponse>> getRecommendationsByType(
            @PathVariable Integer tripId,
            @PathVariable String type) {

        Integer userId = getAuthenticatedUserId();

        List<FoodRecommendationResponse> recommendations =
                foodRecommendationService.getRecommendationsByType(
                        userId,
                        tripId,
                        type
                );

        return ResponseEntity.ok(recommendations);
    }

    /**
     * Get food recommendation history for a trip.
     */
    @GetMapping("/trips/{tripId}/history")
    public ResponseEntity<List<FoodHistoryResponse>> getHistory(
            @PathVariable Integer tripId) {

        Integer userId = getAuthenticatedUserId();

        List<FoodHistoryResponse> history =
                foodRecommendationService.getHistory(
                        userId,
                        tripId
                );

        return ResponseEntity.ok(history);
    }

    /**
     * Record an action performed on a food recommendation.
     */
    @PostMapping("/{foodRecommendationId}/action")
    public ResponseEntity<FoodHistoryResponse> recordAction(
            @PathVariable Integer foodRecommendationId,
            @RequestParam Integer tripId,
            @RequestBody FoodActionRequest request) {

        Integer userId = getAuthenticatedUserId();

        FoodHistoryResponse response =
                foodRecommendationService.recordAction(
                        userId,
                        tripId,
                        foodRecommendationId,
                        request
                );

        return ResponseEntity.ok(response);
    }
}