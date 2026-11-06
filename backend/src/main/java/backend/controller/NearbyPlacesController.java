package backend.controller;

import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.service.NearbyPlacesService;
import backend.service.NearbyPlacesService.NearbyPlace;

@RestController
@RequestMapping("/api")
public class NearbyPlacesController {

    private final NearbyPlacesService nearbyPlacesService;

    public NearbyPlacesController(NearbyPlacesService nearbyPlacesService) {
        this.nearbyPlacesService = nearbyPlacesService;
    }

    @GetMapping({"/foods/nearby", "/nearby/food"})
    public ResponseEntity<List<NearbyPlace>> nearbyFood(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "3000") int radius,
            @RequestParam(defaultValue = "all") String category) {

        validateCoordinates(latitude, longitude);
        int safeRadius = normalizeRadius(radius);
        String safeCategory = normalizeCategory(category,
                Set.of("all", "restaurant", "cafe", "bakery", "fast_food"));

        return ResponseEntity.ok(nearbyPlacesService.findFood(
                latitude, longitude, safeRadius, safeCategory));
    }

    @GetMapping({"/accommodations/nearby", "/nearby/accommodations"})
    public ResponseEntity<List<NearbyPlace>> nearbyAccommodation(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "5000") int radius,
            @RequestParam(defaultValue = "all") String category) {

        validateCoordinates(latitude, longitude);
        int safeRadius = normalizeRadius(radius);
        String safeCategory = normalizeCategory(category,
                Set.of("all", "hotel", "resort", "hostel",
                        "guest_house", "apartment"));

        return ResponseEntity.ok(nearbyPlacesService.findAccommodation(
                latitude, longitude, safeRadius, safeCategory));
    }

    private void validateCoordinates(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException(
                    "Invalid coordinates. Latitude must be -90 to 90 and longitude -180 to 180.");
        }
    }

    private int normalizeRadius(int radius) {
        // Keep the request within a safe Overpass query range.
        return Math.max(100, Math.min(radius, 10000));
    }

    private String normalizeCategory(String category, Set<String> allowed) {
        String normalized = category == null
                ? "all"
                : category.trim().toLowerCase(Locale.ROOT);

        // Unknown UI values fall back to "all" instead of returning HTTP 400.
        return allowed.contains(normalized) ? normalized : "all";
    }
}
