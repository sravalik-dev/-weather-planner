package backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import backend.dto.TripRequest;
import backend.dto.TripResponse;
import backend.service.TripService;

@RestController
@RequestMapping("/api/trips")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176"
})
public class TripController {

    @Autowired
    private TripService tripService;

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(
            Authentication authentication,
            @RequestBody TripRequest request) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.createTrip(userId, request)
        );
    }

    @PostMapping("/draft")
    public ResponseEntity<TripResponse> saveDraft(
            Authentication authentication,
            @RequestBody TripRequest request) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.saveDraft(userId, request)
        );
    }

    @GetMapping
    public ResponseEntity<List<TripResponse>> getMyTrips(
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.getMyTrips(userId)
        );
    }

    @GetMapping("/{tripId}")
    public ResponseEntity<TripResponse> getTrip(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.getTrip(userId, tripId)
        );
    }

    @PutMapping("/{tripId}")
    public ResponseEntity<TripResponse> updateTrip(
            Authentication authentication,
            @PathVariable Integer tripId,
            @RequestBody TripRequest request) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.updateTrip(
                        userId,
                        tripId,
                        request
                )
        );
    }

    @DeleteMapping("/{tripId}")
    public ResponseEntity<String> deleteTrip(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        tripService.deleteTrip(userId, tripId);

        return ResponseEntity.ok(
                "Trip deleted successfully"
        );
    }

    @PostMapping("/{tripId}/duplicate")
    public ResponseEntity<TripResponse> duplicateTrip(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.duplicateTrip(userId, tripId)
        );
    }

    @PutMapping("/{tripId}/archive")
    public ResponseEntity<TripResponse> archiveTrip(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.archiveTrip(userId, tripId)
        );
    }

    private Integer getUserId(Authentication authentication) {

        return (Integer) authentication.getPrincipal();
    }
}