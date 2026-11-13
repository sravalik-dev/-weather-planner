
package backend.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class NearbyPlacesService {

    private static final Logger log =
            LoggerFactory.getLogger(NearbyPlacesService.class);

    private static final String PHOTON_ENDPOINT =
            "https://photon.komoot.io/reverse";

    private static final int PHOTON_LIMIT = 50;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public NearbyPlacesService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    // ---------------------------------------------------------
    // PUBLIC METHODS
    // ---------------------------------------------------------

    public List<NearbyPlace> findFood(
            double latitude,
            double longitude,
            int radius,
            String category) {

        validateCoordinates(latitude, longitude);

        List<String> tags = foodTags(category);

        return search(
                latitude, longitude, radius, tags, "food");
    }

    public List<NearbyPlace> findAccommodation(
            double latitude,
            double longitude,
            int radius,
            String category) {

        validateCoordinates(latitude, longitude);

        List<String> tags = accommodationTags(category);

        return search(
                latitude, longitude, radius, tags, "accommodation");
    }

    // ---------------------------------------------------------
    // CATEGORY TAGS
    // ---------------------------------------------------------

    private List<String> foodTags(String category) {

        return switch (safe(category)) {
            case "restaurant" ->
                    List.of("amenity:restaurant");

            case "cafe" ->
                    List.of("amenity:cafe");

            case "bakery" ->
                    List.of("shop:bakery");

            case "fast_food" ->
                    List.of("amenity:fast_food");

            case "food_court" ->
                    List.of("amenity:food_court");

            case "ice_cream" ->
                    List.of("amenity:ice_cream");

            default -> List.of(
                    "amenity:restaurant",
                    "amenity:cafe",
                    "amenity:fast_food",
                    "amenity:food_court",
                    "amenity:ice_cream",
                    "shop:bakery"
            );
        };
    }

    private List<String> accommodationTags(String category) {

        return switch (safe(category)) {
            case "hotel" ->
                    List.of("tourism:hotel");

            case "resort" ->
                    List.of("tourism:resort");

            case "hostel" ->
                    List.of("tourism:hostel");

            case "guest_house" ->
                    List.of("tourism:guest_house");

            case "apartment" ->
                    List.of("tourism:apartment");

            case "motel" ->
                    List.of("tourism:motel");

            case "chalet" ->
                    List.of("tourism:chalet");

            case "camp_site" ->
                    List.of("tourism:camp_site");

            default -> List.of(
                    "tourism:hotel",
                    "tourism:resort",
                    "tourism:hostel",
                    "tourism:guest_house",
                    "tourism:motel",
                    "tourism:apartment",
                    "tourism:chalet",
                    "tourism:camp_site"
            );
        };
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "all"
                : value.trim().toLowerCase(Locale.ROOT);
    }

    // ---------------------------------------------------------
    // PHOTON SEARCH
    // ---------------------------------------------------------

    private List<NearbyPlace> search(
            double userLat,
            double userLon,
            int radius,
            List<String> tags,
            String type) {

        if (radius < 100 || radius > 10000) {
            throw new IllegalArgumentException(
                    "Radius must be between 100 and 10000 meters.");
        }

        Map<String, NearbyPlace> uniquePlaces =
                new LinkedHashMap<>();

        AtomicInteger successfulRequests = new AtomicInteger(0);

        List<CompletableFuture<List<NearbyPlace>>> futures =
                new ArrayList<>();

        for (String tag : tags) {

            CompletableFuture<List<NearbyPlace>> future =
                    CompletableFuture.supplyAsync(() -> {
                        try {
                            List<NearbyPlace> result = fetchTag(
                                    userLat, userLon, radius, tag, type);

                            successfulRequests.incrementAndGet();
                            return result;

                        } catch (Exception ex) {
                            log.warn(
                                    "Photon search failed for {}: {}",
                                    tag, ex.toString());

                            return List.of();
                        }
                    });

            futures.add(future);
        }

        CompletableFuture<Void> allRequests =
                CompletableFuture.allOf(
                        futures.toArray(new CompletableFuture[0]));

        try {
            allRequests.get(18, TimeUnit.SECONDS);

        } catch (java.util.concurrent.TimeoutException ex) {
            log.warn("Photon search reached its time limit for {}.", type);

        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Nearby search was interrupted. Please try again.",
                    ex);

        } catch (Exception ex) {
            log.warn("Photon search completed with errors: {}", ex.toString());
        }

        // Collect successful responses, including partial results.
        for (CompletableFuture<List<NearbyPlace>> future : futures) {

            if (!future.isDone() || future.isCompletedExceptionally()) {
                continue;
            }

            try {
                List<NearbyPlace> results = future.getNow(List.of());

                for (NearbyPlace place : results) {
                    String key = place.getOsmType()
                            + ":" + place.getOsmId();

                    uniquePlaces.putIfAbsent(key, place);
                }

            } catch (Exception ex) {
                log.warn("Could not collect Photon results: {}", ex.toString());
            }
        }

        // If every Photon request failed, report temporary unavailability.
        if (successfulRequests.get() == 0) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Nearby places are temporarily unavailable. "
                            + "Please try again later.");
        }

        List<NearbyPlace> places =
                new ArrayList<>(uniquePlaces.values());

        places.sort((NearbyPlace first, NearbyPlace second) ->
        Long.compare(
                first.getDistanceMeters(),
                second.getDistanceMeters()
        )
);

        log.info(
                "Photon returned {} nearby {} places within {} meters.",
                places.size(), type, radius);

        return places;
    }

    // ---------------------------------------------------------
    // SINGLE PHOTON CATEGORY REQUEST
    // ---------------------------------------------------------

    private List<NearbyPlace> fetchTag(
            double latitude,
            double longitude,
            int radius,
            String osmTag,
            String type) throws Exception {

        String encodedTag = URLEncoder.encode(
                osmTag, StandardCharsets.UTF_8);

        String url = PHOTON_ENDPOINT
                + "?lon=" + longitude
                + "&lat=" + latitude
                + "&osm_tag=" + encodedTag
                + "&limit=" + PHOTON_LIMIT
                + "&lang=en";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(12))
                .header("Accept", "application/json")
                .header(
                        "User-Agent",
                        "WeatherPlannerStudentProject/1.0")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IllegalStateException(
                    "Photon returned HTTP " + response.statusCode()
                            + " for " + osmTag);
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode features = root.path("features");

        if (!features.isArray()) {
            throw new IllegalStateException(
                    "Photon returned an invalid GeoJSON response.");
        }

        return parseFeatures(
                features, latitude, longitude, radius, type);
    }

    // ---------------------------------------------------------
    // PARSE PHOTON GEOJSON
    // ---------------------------------------------------------

    private List<NearbyPlace> parseFeatures(
            JsonNode features,
            double userLat,
            double userLon,
            int radius,
            String type) {

        List<NearbyPlace> places = new ArrayList<>();

        for (JsonNode feature : features) {

            JsonNode properties = feature.path("properties");
            JsonNode coordinates =
                    feature.path("geometry").path("coordinates");

            if (!coordinates.isArray() || coordinates.size() < 2) {
                continue;
            }

            // GeoJSON coordinates are [longitude, latitude].
            double placeLon = coordinates.get(0).asDouble(Double.NaN);
            double placeLat = coordinates.get(1).asDouble(Double.NaN);

            if (!Double.isFinite(placeLat)
                    || !Double.isFinite(placeLon)) {
                continue;
            }

            long distance = Math.round(
                    haversine(userLat, userLon, placeLat, placeLon));

            // Photon reverse search is not a strict radius filter.
            // Enforce the requested radius here.
            if (distance > radius) {
                continue;
            }

            String name = firstProperty(
                    properties, "name", "street");

            if (name.isBlank()) {
                continue;
            }

            String osmId = property(properties, "osm_id");
            String photonOsmType = property(properties, "osm_type");

            if (osmId.isBlank() || photonOsmType.isBlank()) {
                continue;
            }

            String osmType = convertOsmType(photonOsmType);

            if (osmType.isBlank()) {
                continue;
            }

            NearbyPlace place = new NearbyPlace();

            place.setOsmId(osmId);
            place.setOsmType(osmType);
            place.setName(name);

            place.setCategory(resolveCategory(properties, type));

            place.setLatitude(placeLat);
            place.setLongitude(placeLon);
            place.setDistanceMeters(distance);

            place.setAddress(buildAddress(properties));

            place.setPhone(firstProperty(
                    properties, "phone", "contact:phone"));

            place.setEmail(firstProperty(
                    properties, "email", "contact:email"));

            place.setWebsite(normalizeUrl(firstProperty(
                    properties, "website", "url", "contact:website")));

            place.setOpeningHours(firstProperty(
                    properties, "opening_hours"));

            place.setCuisine(firstProperty(
                    properties, "cuisine"));

            place.setImageUrl(resolveImage(properties));

            place.setBookingUrl(normalizeUrl(firstProperty(
                    properties,
                    "booking",
                    "reservation",
                    "website",
                    "url")));

            place.setMapUrl(
                    "https://www.openstreetmap.org/"
                            + osmType + "/" + osmId);

            place.setSource("OpenStreetMap (Photon)");

            place.setAvailabilityStatus(
                    "accommodation".equals(type)
                            ? "NOT_VERIFIED"
                            : "NOT_APPLICABLE");

            places.add(place);
        }

        return places;
    }

    // ---------------------------------------------------------
    // CATEGORY MAPPING
    // ---------------------------------------------------------

    private String resolveCategory(
            JsonNode properties,
            String type) {

        String key = property(properties, "osm_key");
        String value = property(properties, "osm_value");

        if ("food".equals(type)) {

            if ("shop".equals(key) && "bakery".equals(value)) {
                return "bakery";
            }

            return value.isBlank() ? "food" : value;
        }

        return value.isBlank() ? "accommodation" : value;
    }

    // ---------------------------------------------------------
    // ADDRESS
    // ---------------------------------------------------------

    private String buildAddress(JsonNode properties) {

        List<String> parts = new ArrayList<>();

        addUnique(parts, property(properties, "housenumber"));
        addUnique(parts, property(properties, "street"));
        addUnique(parts, property(properties, "locality"));
        addUnique(parts, property(properties, "district"));
        addUnique(parts, property(properties, "city"));
        addUnique(parts, property(properties, "state"));
        addUnique(parts, property(properties, "postcode"));
        addUnique(parts, property(properties, "country"));

        return String.join(", ", parts);
    }

    private void addUnique(List<String> parts, String value) {

        if (value == null || value.isBlank()) {
            return;
        }

        boolean alreadyPresent = parts.stream()
                .anyMatch(existing ->
                        existing.equalsIgnoreCase(value.trim()));

        if (!alreadyPresent) {
            parts.add(value.trim());
        }
    }

    // ---------------------------------------------------------
    // PHOTON PROPERTY HELPERS
    // ---------------------------------------------------------

    private String property(JsonNode node, String key) {

        JsonNode value = node.path(key);

        if (value.isMissingNode() || value.isNull()) {
            return "";
        }

        return value.asText("").trim();
    }

    private String firstProperty(
            JsonNode node,
            String... keys) {

        for (String key : keys) {
            String value = property(node, key);

            if (!value.isBlank()) {
                return value;
            }
        }

        return "";
    }

    private String convertOsmType(String value) {

        return switch (value.toUpperCase(Locale.ROOT)) {
            case "N", "NODE" -> "node";
            case "W", "WAY" -> "way";
            case "R", "RELATION" -> "relation";
            default -> "";
        };
    }

    // ---------------------------------------------------------
    // URL AND IMAGE HELPERS
    // ---------------------------------------------------------

    private String normalizeUrl(String value) {

        if (value == null || value.isBlank()) {
            return "";
        }

        String trimmed = value.trim();

        if (trimmed.startsWith("https://")
                || trimmed.startsWith("http://")) {
            return trimmed;
        }

        if (trimmed.contains(".") && !trimmed.contains(" ")) {
            return "https://" + trimmed;
        }

        return "";
    }

    private String resolveImage(JsonNode properties) {

        String image = firstProperty(
                properties, "image", "contact:image");

        String normalized = normalizeUrl(image);

        if (!normalized.isBlank()) {
            return normalized;
        }

        String commons = property(properties, "wikimedia_commons");

        if (commons.startsWith("File:")) {
            String fileName = commons.substring("File:".length()).trim();

            return "https://commons.wikimedia.org/wiki/Special:FilePath/"
                    + URLEncoder.encode(
                            fileName, StandardCharsets.UTF_8);
        }

        return "";
    }

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    private void validateCoordinates(double latitude, double longitude) {

        if (!Double.isFinite(latitude)
                || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {

            throw new IllegalArgumentException(
                    "Invalid latitude or longitude.");
        }
    }

    // ---------------------------------------------------------
    // DISTANCE
    // ---------------------------------------------------------

    private double haversine(
            double lat1,
            double lon1,
            double lat2,
            double lon2) {

        final double earthRadius = 6371000.0;

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        return earthRadius * 2 * Math.atan2(
                Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ---------------------------------------------------------
    // RESPONSE DTO
    // ---------------------------------------------------------

    public static class NearbyPlace {

        private String osmId;
        private String osmType;
        private String name;
        private String category;
        private String address;
        private String phone;
        private String email;
        private String website;
        private String openingHours;
        private String cuisine;
        private String imageUrl;
        private String bookingUrl;
        private String mapUrl;
        private String source;
        private String availabilityStatus;

        private double latitude;
        private double longitude;
        private long distanceMeters;

        public String getOsmId() { return osmId; }
        public void setOsmId(String v) { osmId = v; }

        public String getOsmType() { return osmType; }
        public void setOsmType(String v) { osmType = v; }

        public String getName() { return name; }
        public void setName(String v) { name = v; }

        public String getCategory() { return category; }
        public void setCategory(String v) { category = v; }

        public String getAddress() { return address; }
        public void setAddress(String v) { address = v; }

        public String getPhone() { return phone; }
        public void setPhone(String v) { phone = v; }

        public String getEmail() { return email; }
        public void setEmail(String v) { email = v; }

        public String getWebsite() { return website; }
        public void setWebsite(String v) { website = v; }

        public String getOpeningHours() { return openingHours; }
        public void setOpeningHours(String v) { openingHours = v; }

        public String getCuisine() { return cuisine; }
        public void setCuisine(String v) { cuisine = v; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String v) { imageUrl = v; }

        public String getBookingUrl() { return bookingUrl; }
        public void setBookingUrl(String v) { bookingUrl = v; }

        public String getMapUrl() { return mapUrl; }
        public void setMapUrl(String v) { mapUrl = v; }

        public String getSource() { return source; }
        public void setSource(String v) { source = v; }

        public String getAvailabilityStatus() {
            return availabilityStatus;
        }

        public void setAvailabilityStatus(String v) {
            availabilityStatus = v;
        }

        public double getLatitude() { return latitude; }
        public void setLatitude(double v) { latitude = v; }

        public double getLongitude() { return longitude; }
        public void setLongitude(double v) { longitude = v; }

        public long getDistanceMeters() { return distanceMeters; }
        public void setDistanceMeters(long v) { distanceMeters = v; }
    }
}
