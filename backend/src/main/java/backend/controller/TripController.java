
package backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.DestinationRequest;
import backend.dto.DestinationResponse;
import backend.dto.ReorderDestinationRequest;
import backend.dto.RouteDistanceResponse;
import backend.dto.RouteEtaResponse;
import backend.dto.TripRequest;
import backend.dto.TripResponse;
import backend.service.RouteService;
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

    @Autowired
    private RouteService routeService;

    // ==========================================
    // CREATE TRIP
    // ==========================================

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(
            Authentication authentication,
            @RequestBody TripRequest request) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.createTrip(
                        userId,
                        request
                )
        );
    }

    // ==========================================
    // SAVE DRAFT
    // ==========================================

    @PostMapping("/draft")
    public ResponseEntity<TripResponse> saveDraft(
            Authentication authentication,
            @RequestBody TripRequest request) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.saveDraft(
                        userId,
                        request
                )
        );
    }

    // ==========================================
    // GET MY TRIPS / ROUTE HISTORY
    // ==========================================

    @GetMapping
    public ResponseEntity<List<TripResponse>> getMyTrips(
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.getMyTrips(userId)
        );
    }

    // ==========================================
    // GET SINGLE TRIP
    // ==========================================

    @GetMapping("/{tripId}")
    public ResponseEntity<TripResponse> getTrip(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.getTrip(
                        userId,
                        tripId
                )
        );
    }

    // ==========================================
    // UPDATE TRIP
    // ==========================================

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

    // ==========================================
    // DELETE TRIP
    // ==========================================

    @DeleteMapping("/{tripId}")
    public ResponseEntity<String> deleteTrip(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        tripService.deleteTrip(
                userId,
                tripId
        );

        return ResponseEntity.ok(
                "Trip deleted successfully"
        );
    }

    // ==========================================
    // DUPLICATE TRIP
    // ==========================================

    @PostMapping("/{tripId}/duplicate")
    public ResponseEntity<TripResponse> duplicateTrip(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.duplicateTrip(
                        userId,
                        tripId
                )
        );
    }

    // ==========================================
    // ARCHIVE TRIP
    // ==========================================

    @PutMapping("/{tripId}/archive")
    public ResponseEntity<TripResponse> archiveTrip(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                tripService.archiveTrip(
                        userId,
                        tripId
                )
        );
    }

    // ==========================================
    // MODULE 4
    // ADD DESTINATION
    // ==========================================

    @PostMapping("/{tripId}/destinations")
    public ResponseEntity<DestinationResponse> addDestination(
            Authentication authentication,
            @PathVariable Integer tripId,
            @RequestBody DestinationRequest request) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                routeService.addDestination(
                        userId,
                        tripId,
                        request
                )
        );
    }

    // ==========================================
    // MODULE 4
    // GET DESTINATIONS
    // ==========================================

    @GetMapping("/{tripId}/destinations")
    public ResponseEntity<List<DestinationResponse>>
    getDestinations(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                routeService.getDestinations(
                        userId,
                        tripId
                )
        );
    }

    // ==========================================
    // MODULE 4
    // REMOVE DESTINATION
    // ==========================================

    @DeleteMapping(
            "/{tripId}/destinations/{destinationId}"
    )
    public ResponseEntity<String> removeDestination(
            Authentication authentication,
            @PathVariable Integer tripId,
            @PathVariable Integer destinationId) {

        Integer userId = getUserId(authentication);

        routeService.removeDestination(
                userId,
                tripId,
                destinationId
        );

        return ResponseEntity.ok(
                "Destination removed successfully"
        );
    }

    // ==========================================
    // MODULE 4
    // REORDER DESTINATIONS
    // ==========================================

    @PutMapping("/{tripId}/destinations/reorder")
    public ResponseEntity<List<DestinationResponse>>
    reorderDestinations(
            Authentication authentication,
            @PathVariable Integer tripId,
            @RequestBody ReorderDestinationRequest request) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                routeService.reorderDestinations(
                        userId,
                        tripId,
                        request
                )
        );
    }

    // ==========================================
    // MODULE 4
    // CALCULATE DISTANCE
    // ==========================================

    @GetMapping("/{tripId}/route/distance")
    public ResponseEntity<RouteDistanceResponse>
    calculateDistance(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                routeService.calculateDistance(
                        userId,
                        tripId
                )
        );
    }

    // ==========================================
    // MODULE 4
    // CALCULATE ETA
    // ==========================================

    @GetMapping("/{tripId}/route/eta")
    public ResponseEntity<RouteEtaResponse>
    calculateEta(
            Authentication authentication,
            @PathVariable Integer tripId) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                routeService.calculateEta(
                        userId,
                        tripId
                )
        );
    }

    // ==========================================
    // GET USER ID FROM JWT
    // ==========================================

    private Integer getUserId(
            Authentication authentication) {

        return (Integer) authentication.getPrincipal();
    }
}

