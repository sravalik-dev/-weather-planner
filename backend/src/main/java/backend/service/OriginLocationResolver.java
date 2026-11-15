package backend.service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import backend.exception.ItineraryException;
import backend.service.ItineraryScheduler.Point;

/**
 * Turns the trip's free-text origin ("Vijayawada", "Pune, Maharashtra")
 * into coordinates using the free Open-Meteo geocoder that the project
 * already uses. Shared by the itinerary generator and the round-trip route
 * summary so both always start from the same place.
 */
@Service
public class OriginLocationResolver {

    private final LocationService locationService;
    private final Map<String, Point> cache = new ConcurrentHashMap<>();

    public OriginLocationResolver(LocationService locationService) {
        this.locationService = locationService;
    }

    public Point resolve(String origin) {
        if (origin == null || origin.isBlank()) {
            throw ItineraryException.badRequest(
                    "Set the trip starting point before generating a round trip.");
        }
        String key = origin.trim().toLowerCase();
        Point cached = cache.get(key);
        if (cached != null) {
            return cached;
        }

        Point found = lookup(origin.trim(), origin.trim());
        if (found == null && origin.contains(",")) {
            // "Pune, Maharashtra" is not a city name to the geocoder; try "Pune".
            found = lookup(origin.substring(0, origin.indexOf(',')).trim(), origin.trim());
        }
        if (found == null) {
            throw ItineraryException.badRequest("No coordinates were found for the trip starting point '"
                    + origin + "'. Edit the trip and use a plain city name (for example 'Vijayawada').");
        }
        cache.put(key, found);
        return found;
    }

    private Point lookup(String query, String label) {
        List<Map<String, Object>> matches;
        try {
            matches = locationService.searchLocations(query);
        } catch (RuntimeException e) {
            throw ItineraryException.badRequest("Could not look up the trip starting point '" + label
                    + "' right now (" + e.getMessage() + "). Check your internet connection and try again.");
        }
        if (matches == null || matches.isEmpty()) {
            return null;
        }
        Object lat = matches.get(0).get("latitude");
        Object lon = matches.get(0).get("longitude");
        if (!(lat instanceof Number) || !(lon instanceof Number)) {
            return null;
        }
        return new Point(label, ((Number) lat).doubleValue(), ((Number) lon).doubleValue());
    }
}
