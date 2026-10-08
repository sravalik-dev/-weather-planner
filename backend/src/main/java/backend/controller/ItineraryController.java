package backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.ItineraryActivityRequest;
import backend.dto.ItineraryActivityResponse;
import backend.dto.LockActivityRequest;
import backend.dto.ReorderActivityRequest;
import backend.entity.ItineraryHistory;
import backend.service.ItineraryService;

@RestController
@RequestMapping("/api/trips/{tripId}/itinerary")
public class ItineraryController {

    private final ItineraryService itineraryService;

    public ItineraryController(
            ItineraryService itineraryService) {

        this.itineraryService = itineraryService;
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateItinerary(
            @PathVariable Integer tripId,
            Authentication authentication) {

        try {
            Integer userId = getUserId(authentication);

            List<ItineraryActivityResponse> activities =
                    itineraryService.generateItinerary(
                            userId,
                            tripId
                    );

            return ResponseEntity.ok(activities);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getItinerary(
            @PathVariable Integer tripId,
            Authentication authentication) {

        try {
            Integer userId = getUserId(authentication);

            return ResponseEntity.ok(
                    itineraryService.getItinerary(
                            userId,
                            tripId
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @PostMapping("/activities")
    public ResponseEntity<?> addActivity(
            @PathVariable Integer tripId,
            @RequestBody ItineraryActivityRequest request,
            Authentication authentication) {

        try {
            Integer userId = getUserId(authentication);

            return ResponseEntity.ok(
                    itineraryService.addActivity(
                            userId,
                            tripId,
                            request
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @PutMapping("/activities/{activityId}")
    public ResponseEntity<?> updateActivity(
            @PathVariable Integer tripId,
            @PathVariable Integer activityId,
            @RequestBody ItineraryActivityRequest request,
            Authentication authentication) {

        try {
            Integer userId = getUserId(authentication);

            return ResponseEntity.ok(
                    itineraryService.updateActivity(
                            userId,
                            tripId,
                            activityId,
                            request
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @DeleteMapping("/activities/{activityId}")
    public ResponseEntity<?> deleteActivity(
            @PathVariable Integer tripId,
            @PathVariable Integer activityId,
            Authentication authentication) {

        try {
            Integer userId = getUserId(authentication);

            itineraryService.deleteActivity(
                    userId,
                    tripId,
                    activityId
            );

            return ResponseEntity.ok(
                    "Activity deleted successfully."
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @PutMapping("/reorder")
    public ResponseEntity<?> reorderActivities(
            @PathVariable Integer tripId,
            @RequestBody ReorderActivityRequest request,
            Authentication authentication) {

        try {
            Integer userId = getUserId(authentication);

            return ResponseEntity.ok(
                    itineraryService.reorderActivities(
                            userId,
                            tripId,
                            request
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @PutMapping("/activities/{activityId}/lock")
    public ResponseEntity<?> lockActivity(
            @PathVariable Integer tripId,
            @PathVariable Integer activityId,
            @RequestBody LockActivityRequest request,
            Authentication authentication) {

        try {
            Integer userId = getUserId(authentication);

            return ResponseEntity.ok(
                    itineraryService.lockActivity(
                            userId,
                            tripId,
                            activityId,
                            request
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(
            @PathVariable Integer tripId,
            Authentication authentication) {

        try {
            Integer userId = getUserId(authentication);

            List<ItineraryHistory> history =
                    itineraryService.getHistory(
                            userId,
                            tripId
                    );

            return ResponseEntity.ok(history);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    private Integer getUserId(
            Authentication authentication) {

        if (authentication == null
                || authentication.getPrincipal() == null) {

            throw new RuntimeException(
                    "Authentication required."
            );
        }

        return (Integer) authentication.getPrincipal();
    }
}