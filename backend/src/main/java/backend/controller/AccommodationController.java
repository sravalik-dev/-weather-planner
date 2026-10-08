package backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import backend.dto.AccommodationHistoryResponse;
import backend.dto.AccommodationRequest;
import backend.dto.AccommodationResponse;
import backend.dto.AccommodationSearchRequest;
import backend.entity.AccommodationType;
import backend.service.AccommodationService;

@RestController
@RequestMapping("/api/accommodations")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178"
})
public class AccommodationController {

    @Autowired
    private AccommodationService accommodationService;

    // ============================================================
    // CREATE
    // ============================================================

    @PostMapping
    public ResponseEntity<AccommodationResponse> create(
            @RequestBody AccommodationRequest request,
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        AccommodationResponse response =
                accommodationService.create(
                        request,
                        userId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // ============================================================
    // GET ALL
    // ============================================================

    @GetMapping
    public ResponseEntity<List<AccommodationResponse>> getAll() {

        return ResponseEntity.ok(
                accommodationService.getAll());
    }

    // ============================================================
    // GET BY ID
    // ============================================================

    @GetMapping("/{id}")
    public ResponseEntity<AccommodationResponse> getById(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                accommodationService.getById(id));
    }

    // ============================================================
    // UPDATE
    // ============================================================

    @PutMapping("/{id}")
    public ResponseEntity<AccommodationResponse> update(
            @PathVariable Integer id,
            @RequestBody AccommodationRequest request,
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                accommodationService.update(
                        id,
                        request,
                        userId));
    }

    // ============================================================
    // DELETE
    // ============================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(
            @PathVariable Integer id,
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        accommodationService.delete(
                id,
                userId);

        return ResponseEntity.ok(
                "Accommodation deleted successfully.");
    }

    // ============================================================
    // SEARCH / RECOMMENDATIONS
    // ============================================================

    @PostMapping("/search")
    public ResponseEntity<List<AccommodationResponse>> search(
            @RequestBody AccommodationSearchRequest request,
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                accommodationService.search(
                        request,
                        userId));
    }

    // ============================================================
    // TYPE
    // ============================================================

    @GetMapping("/type/{type}")
    public ResponseEntity<List<AccommodationResponse>> getByType(
            @PathVariable AccommodationType type) {

        return ResponseEntity.ok(
                accommodationService.getByType(type));
    }

    // ============================================================
    // BEACH
    // ============================================================

    @GetMapping("/beach")
    public ResponseEntity<List<AccommodationResponse>>
    getBeachAccommodations() {

        return ResponseEntity.ok(
                accommodationService
                        .getBeachAccommodations());
    }

    // ============================================================
    // POOL
    // ============================================================

    @GetMapping("/pool")
    public ResponseEntity<List<AccommodationResponse>>
    getPoolAccommodations() {

        return ResponseEntity.ok(
                accommodationService
                        .getPoolAccommodations());
    }

    // ============================================================
    // BEACH + POOL
    // ============================================================

    @GetMapping("/beach-pool")
    public ResponseEntity<List<AccommodationResponse>>
    getBeachPoolAccommodations() {

        return ResponseEntity.ok(
                accommodationService
                        .getBeachPoolAccommodations());
    }

    // ============================================================
    // VIEW
    // ============================================================

    @PostMapping("/{id}/view")
    public ResponseEntity<AccommodationHistoryResponse> view(
            @PathVariable Integer id,
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                accommodationService.view(
                        id,
                        userId));
    }

    // ============================================================
    // SELECT
    // ============================================================

    @PostMapping("/{id}/select")
    public ResponseEntity<AccommodationHistoryResponse> select(
            @PathVariable Integer id,
            @RequestParam(required = false) Integer tripId,
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                accommodationService.select(
                        id,
                        userId,
                        tripId));
    }

    // ============================================================
    // ADD TO TRIP
    // ============================================================

    @PostMapping("/{id}/add-to-trip")
    public ResponseEntity<AccommodationHistoryResponse> addToTrip(
            @PathVariable Integer id,
            @RequestParam Integer tripId,
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                accommodationService.addToTrip(
                        id,
                        userId,
                        tripId));
    }

    // ============================================================
    // HISTORY
    // ============================================================

    @GetMapping("/history")
    public ResponseEntity<List<AccommodationHistoryResponse>>
    getHistory(Authentication authentication) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                accommodationService.getHistory(
                        userId));
    }

    // ============================================================
    // TRIP HISTORY
    // ============================================================

    @GetMapping("/history/trip/{tripId}")
    public ResponseEntity<List<AccommodationHistoryResponse>>
    getTripHistory(
            @PathVariable Integer tripId,
            Authentication authentication) {

        Integer userId = getUserId(authentication);

        return ResponseEntity.ok(
                accommodationService.getTripHistory(
                        userId,
                        tripId));
    }

    // ============================================================
    // USER ID
    // ============================================================

    private Integer getUserId(
            Authentication authentication) {

        if (authentication == null
                || authentication.getPrincipal() == null) {

            throw new IllegalArgumentException(
                    "User is not authenticated.");
        }

        return (Integer) authentication.getPrincipal();
    }
}