package backend.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class LocationService {

    private static final String OPEN_METEO_REVERSE =
            "https://geocoding-api.open-meteo.com/v1/reverse";
    private static final String NOMINATIM_REVERSE =
            "https://nominatim.openstreetmap.org/reverse";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public LocationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public Map<String, Object> reverseGeocode(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Latitude and longitude are required.");
        }
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Latitude and longitude are outside the valid range.");
        }

        Map<String, Object> fromOpenMeteo = fromOpenMeteo(latitude, longitude);
        if (hasName(fromOpenMeteo)) {
            return fromOpenMeteo;
        }

        Map<String, Object> fromNominatim = fromNominatim(latitude, longitude);
        if (hasName(fromNominatim)) {
            return fromNominatim;
        }

        Map<String, Object> empty = new LinkedHashMap<>();
        empty.put("latitude", latitude);
        empty.put("longitude", longitude);
        empty.put("city", null);
        empty.put("admin1", null);
        empty.put("country", null);
        empty.put("displayName", null);
        empty.put("resolved", false);
        return empty;
    }

    private Map<String, Object> fromOpenMeteo(Double latitude, Double longitude) {
        try {
            String url = OPEN_METEO_REVERSE
                    + "?latitude=" + latitude
                    + "&longitude=" + longitude
                    + "&language=en"
                    + "&format=json";
            JsonNode root = getJson(url, "WeatherPlanner/1.0");
            JsonNode results = root.path("results");
            if (!results.isArray() || results.isEmpty()) {
                return Map.of();
            }
            JsonNode first = results.get(0);
            return namedLocation(
                    latitude,
                    longitude,
                    text(first, "name"),
                    first.hasNonNull("admin1") ? text(first, "admin1") : text(first, "admin2"),
                    text(first, "country")
            );
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private Map<String, Object> fromNominatim(Double latitude, Double longitude) {
        try {
            String url = NOMINATIM_REVERSE
                    + "?lat=" + URLEncoder.encode(String.valueOf(latitude), StandardCharsets.UTF_8)
                    + "&lon=" + URLEncoder.encode(String.valueOf(longitude), StandardCharsets.UTF_8)
                    + "&format=jsonv2"
                    + "&zoom=10"
                    + "&addressdetails=1";
            JsonNode root = getJson(url, "WeatherAdaptiveItineraryPlanner/1.0 (capstone)");
            JsonNode address = root.path("address");
            String city = firstNonBlank(
                    text(address, "city"),
                    text(address, "town"),
                    text(address, "village"),
                    text(address, "municipality"),
                    text(address, "county")
            );
            String admin1 = firstNonBlank(
                    text(address, "state"),
                    text(address, "region")
            );
            return namedLocation(
                    latitude,
                    longitude,
                    city,
                    admin1,
                    text(address, "country")
            );
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private Map<String, Object> namedLocation(
            Double latitude,
            Double longitude,
            String city,
            String admin1,
            String country) {

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("latitude", latitude);
        response.put("longitude", longitude);
        response.put("city", blankToNull(city));
        response.put("admin1", blankToNull(admin1));
        response.put("country", blankToNull(country));
        response.put("displayName", formatDisplayName(city, admin1));
        response.put("resolved", formatDisplayName(city, admin1) != null);
        return response;
    }

    private String formatDisplayName(String city, String admin1) {
        String c = blankToNull(city);
        String a = blankToNull(admin1);
        if (c != null && a != null && !c.equalsIgnoreCase(a)) {
            return c + ", " + a;
        }
        return c != null ? c : a;
    }

    private boolean hasName(Map<String, Object> location) {
        return location != null && location.get("displayName") instanceof String name
                && !name.isBlank();
    }

    private JsonNode getJson(String url, String userAgent) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .header("User-Agent", userAgent)
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Geocoding failed: " + response.statusCode());
        }
        return objectMapper.readTree(response.body());
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text.trim();
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}