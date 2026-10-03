package backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.entity.RecommendationType;
import backend.service.RecommendationService;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178"
})
public class RecommendationController {

    @Autowired
    private RecommendationService recommendationService;

    /*
     * ---------------------------------------------------------
     * GENERATE RECOMMENDATIONS
     * ---------------------------------------------------------
     *
     * POST
     * /api/recommendations/trips/{tripId}/generate
     *
     * Optional:
     * ?plannedDate=2026-09-29&plannedTime=10:00
     *
     */

    @PostMapping("/trips/{tripId}/generate")
    public ResponseEntity<?> generateRecommendations(
            @PathVariable Integer tripId,
            @RequestParam(required = false) String plannedDate,
            @RequestParam(required = false) String plannedTime,
            Authentication authentication) {

        try {

            Integer userId =
                    getUserId(authentication);

            Map<String, Object> response =
                    recommendationService
                            .generateRecommendations(
                                    tripId,
                                    userId,
                                    plannedDate,
                                    plannedTime
                            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "status", 400,
                            "error", "Bad Request",
                            "message",
                            exception.getMessage()
                    ));

        } catch (Exception exception) {

            return ResponseEntity
                    .internalServerError()
                    .body(Map.of(
                            "status", 500,
                            "error", "Internal Server Error",
                            "message",
                            exception.getMessage() == null
                                    ? "An unexpected error occurred."
                                    : exception.getMessage()
                    ));
        }
    }

    /*
     * ---------------------------------------------------------
     * GET ALL RECOMMENDATIONS
     * ---------------------------------------------------------
     *
     * GET
     * /api/recommendations/trips/{tripId}
     *
     */

    @GetMapping("/trips/{tripId}")
    public ResponseEntity<?> getRecommendations(
            @PathVariable Integer tripId,
            Authentication authentication) {

        try {

            Integer userId =
                    getUserId(authentication);

            List<Map<String, Object>> response =
                    recommendationService
                            .getRecommendations(
                                    tripId,
                                    userId
                            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "status", 400,
                            "error", "Bad Request",
                            "message",
                            exception.getMessage()
                    ));

        } catch (Exception exception) {

            return ResponseEntity
                    .internalServerError()
                    .body(Map.of(
                            "status", 500,
                            "error", "Internal Server Error",
                            "message",
                            exception.getMessage() == null
                                    ? "An unexpected error occurred."
                                    : exception.getMessage()
                    ));
        }
    }

    /*
     * ---------------------------------------------------------
     * GET BY TYPE
     * ---------------------------------------------------------
     *
     * GET
     * /api/recommendations/trips/{tripId}/type/WEATHER
     *
     * Supported:
     * WEATHER
     * NEARBY
     * CROWD
     * SEASONAL
     * TIME
     *
     */

    @GetMapping("/trips/{tripId}/type/{type}")
    public ResponseEntity<?> getRecommendationsByType(
            @PathVariable Integer tripId,
            @PathVariable String type,
            Authentication authentication) {

        try {

            Integer userId =
                    getUserId(authentication);

            RecommendationType recommendationType;

            try {

                recommendationType =
                        RecommendationType.valueOf(
                                type.trim().toUpperCase()
                        );

            } catch (Exception exception) {

                throw new IllegalArgumentException(
                        "Invalid recommendation type. "
                        + "Use WEATHER, NEARBY, CROWD, "
                        + "SEASONAL, or TIME."
                );
            }

            List<Map<String, Object>> response =
                    recommendationService
                            .getRecommendationsByType(
                                    tripId,
                                    userId,
                                    recommendationType
                            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "status", 400,
                            "error", "Bad Request",
                            "message",
                            exception.getMessage()
                    ));

        } catch (Exception exception) {

            return ResponseEntity
                    .internalServerError()
                    .body(Map.of(
                            "status", 500,
                            "error", "Internal Server Error",
                            "message",
                            exception.getMessage() == null
                                    ? "An unexpected error occurred."
                                    : exception.getMessage()
                    ));
        }
    }

    /*
     * ---------------------------------------------------------
     * RECOMMENDATION HISTORY
     * ---------------------------------------------------------
     *
     * GET
     * /api/recommendations/trips/{tripId}/history
     *
     */

    @GetMapping("/trips/{tripId}/history")
    public ResponseEntity<?> getHistory(
            @PathVariable Integer tripId,
            Authentication authentication) {

        try {

            Integer userId =
                    getUserId(authentication);

            List<Map<String, Object>> response =
                    recommendationService
                            .getHistory(
                                    tripId,
                                    userId
                            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "status", 400,
                            "error", "Bad Request",
                            "message",
                            exception.getMessage()
                    ));

        } catch (Exception exception) {

            return ResponseEntity
                    .internalServerError()
                    .body(Map.of(
                            "status", 500,
                            "error", "Internal Server Error",
                            "message",
                            exception.getMessage() == null
                                    ? "An unexpected error occurred."
                                    : exception.getMessage()
                    ));
        }
    }

    /*
     * ---------------------------------------------------------
     * RECORD ACTION
     * ---------------------------------------------------------
     *
     * POST
     * /api/recommendations/{recommendationId}/action
     *
     * Example:
     * ?tripId=1&action=Viewed
     *
     */

    @PostMapping("/{recommendationId}/action")
    public ResponseEntity<?> recordAction(
            @PathVariable Integer recommendationId,
            @RequestParam Integer tripId,
            @RequestParam String action,
            Authentication authentication) {

        try {

            Integer userId =
                    getUserId(authentication);

            Map<String, Object> response =
                    recommendationService
                            .recordAction(
                                    recommendationId,
                                    tripId,
                                    userId,
                                    action
                            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "status", 400,
                            "error", "Bad Request",
                            "message",
                            exception.getMessage()
                    ));

        } catch (Exception exception) {

            return ResponseEntity
                    .internalServerError()
                    .body(Map.of(
                            "status", 500,
                            "error", "Internal Server Error",
                            "message",
                            exception.getMessage() == null
                                    ? "An unexpected error occurred."
                                    : exception.getMessage()
                    ));
        }
    }

    /*
     * ---------------------------------------------------------
     * AUTHENTICATION
     * ---------------------------------------------------------
     */

    private Integer getUserId(
            Authentication authentication) {

        if (authentication == null
                || authentication.getPrincipal() == null) {

            throw new IllegalArgumentException(
                    "Authentication is required."
            );
        }

        Object principal =
                authentication.getPrincipal();

        if (principal instanceof Integer integer) {
            return integer;
        }

        try {

            return Integer.valueOf(
                    principal.toString()
            );

        } catch (NumberFormatException exception) {

            throw new IllegalArgumentException(
                    "Invalid authenticated user."
            );
        }
    }
}