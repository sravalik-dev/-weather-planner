
package backend.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

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

    /*
     * Primary endpoint: previously tested successfully
     * using PowerShell and returned HTTP 200.
     *
     * Remaining endpoints are fallbacks.
     */
    private static final List<String> OVERPASS_ENDPOINTS = List.of(
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.nchc.org.tw/api/interpreter"
    );

    private static final int MAX_RETRIES_PER_ENDPOINT = 2;

    private static final int MAX_RADIUS_METERS = 50000;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public NearbyPlacesService(ObjectMapper objectMapper) {

        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    // ==================================================
    // PUBLIC FOOD SEARCH
    // ==================================================

    public List<NearbyPlace> findFood(
            double latitude,
            double longitude,
            int radius,
            String category) {

        validateCoordinates(latitude, longitude);
        validateRadius(radius);

        String query = buildFoodQuery(
                latitude,
                longitude,
                radius,
                category
        );

        return search(
                query,
                latitude,
                longitude,
                "food"
        );
    }

    // ==================================================
    // PUBLIC ACCOMMODATION SEARCH
    // ==================================================

    public List<NearbyPlace> findAccommodation(
            double latitude,
            double longitude,
            int radius,
            String category) {

        validateCoordinates(latitude, longitude);
        validateRadius(radius);

        String query = buildAccommodationQuery(
                latitude,
                longitude,
                radius,
                category
        );

        return search(
                query,
                latitude,
                longitude,
                "accommodation"
        );
    }

    // ==================================================
    // VALIDATION
    // ==================================================

    private void validateCoordinates(
            double latitude,
            double longitude) {

        if (!Double.isFinite(latitude)
                || !Double.isFinite(longitude)
                || latitude < -90
                || latitude > 90
                || longitude < -180
                || longitude > 180) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid latitude or longitude."
            );
        }
    }

    private void validateRadius(int radius) {

        if (radius <= 0 || radius > MAX_RADIUS_METERS) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Radius must be between 1 and 50000 meters."
            );
        }
    }

    // ==================================================
    // FOOD QUERY
    // ==================================================

    private String buildFoodQuery(
            double lat,
            double lon,
            int radius,
            String category) {

        String filter;

        switch (safe(category)) {

            case "restaurant" ->
                    filter = nodeWayRelation(
                            radius, lat, lon,
                            "amenity", "restaurant"
                    );

            case "cafe" ->
                    filter = nodeWayRelation(
                            radius, lat, lon,
                            "amenity", "cafe"
                    );

            case "bakery" ->
                    filter = nodeWayRelation(
                            radius, lat, lon,
                            "shop", "bakery"
                    );

            case "fast_food" ->
                    filter = nodeWayRelation(
                            radius, lat, lon,
                            "amenity", "fast_food"
                    );

            default -> filter = String.format(
                    Locale.ROOT,
                    """
                    nwr(around:%d,%.7f,%.7f)["amenity"~"restaurant|cafe|fast_food|food_court|ice_cream"];
                    nwr(around:%d,%.7f,%.7f)["shop"="bakery"];
                    """,
                    radius, lat, lon,
                    radius, lat, lon
            );
        }

        return "[out:json][timeout:25];("
                + filter
                + ");out center tags;";
    }

    // ==================================================
    // ACCOMMODATION QUERY
    // ==================================================

    private String buildAccommodationQuery(
            double lat,
            double lon,
            int radius,
            String category) {

        String filter;

        switch (safe(category)) {

            case "hotel" ->
                    filter = nodeWayRelation(
                            radius, lat, lon,
                            "tourism", "hotel"
                    );

            case "resort" ->
                    filter = nodeWayRelation(
                            radius, lat, lon,
                            "tourism", "resort"
                    );

            case "hostel" ->
                    filter = nodeWayRelation(
                            radius, lat, lon,
                            "tourism", "hostel"
                    );

            case "guest_house" ->
                    filter = nodeWayRelation(
                            radius, lat, lon,
                            "tourism", "guest_house"
                    );

            case "apartment" ->
                    filter = nodeWayRelation(
                            radius, lat, lon,
                            "tourism", "apartment"
                    );

            default -> filter = String.format(
                    Locale.ROOT,
                    """
                    nwr(around:%d,%.7f,%.7f)["tourism"~"hotel|resort|hostel|guest_house|motel|apartment|chalet|camp_site"];
                    """,
                    radius, lat, lon
            );
        }

        return "[out:json][timeout:25];("
                + filter
                + ");out center tags;";
    }

    // ==================================================
    // QUERY HELPERS
    // ==================================================

    private String nodeWayRelation(
            int radius,
            double lat,
            double lon,
            String key,
            String value) {

        return String.format(
                Locale.ROOT,
                "nwr(around:%d,%.7f,%.7f)[\"%s\"=\"%s\"];",
                radius,
                lat,
                lon,
                key,
                value
        );
    }

    private String safe(String value) {

        return value == null
                ? "all"
                : value.trim().toLowerCase(Locale.ROOT);
    }

    // ==================================================
    // OVERPASS SEARCH WITH RETRIES AND FALLBACKS
    // ==================================================

    private List<NearbyPlace> search(
            String query,
            double userLat,
            double userLon,
            String type) {

        Exception lastError = null;

        for (String endpoint : OVERPASS_ENDPOINTS) {

            for (int attempt = 1;
                    attempt <= MAX_RETRIES_PER_ENDPOINT;
                    attempt++) {

                try {

                    log.info(
                            "Searching nearby {} using {} (attempt {}/{})",
                            type,
                            endpoint,
                            attempt,
                            MAX_RETRIES_PER_ENDPOINT
                    );

                    String form = "data=" + URLEncoder.encode(
                            query,
                            StandardCharsets.UTF_8
                    );

                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(endpoint))
                            .timeout(Duration.ofSeconds(45))
                            .header(
                                    "Content-Type",
                                    "application/x-www-form-urlencoded; charset=UTF-8"
                            )
                            .header(
                                    "Accept",
                                    "application/json"
                            )
                            .header(
                                    "User-Agent",
                                    "WeatherPlannerCapstone/1.0 (local development)"
                            )
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            form,
                                            StandardCharsets.UTF_8
                                    )
                            )
                            .build();

                    HttpResponse<String> response =
                            httpClient.send(
                                    request,
                                    HttpResponse.BodyHandlers.ofString()
                            );

                    int status = response.statusCode();

                    if (status != 200) {

                        lastError = new IllegalStateException(
                                "Overpass HTTP " + status
                                        + " from " + endpoint
                        );

                        log.warn(
                                "Overpass returned HTTP {} from {}",
                                status,
                                endpoint
                        );

                        if (isTemporaryError(status)
                                && attempt < MAX_RETRIES_PER_ENDPOINT) {

                            waitBeforeRetry(attempt);
                            continue;
                        }

                        break;
                    }

                    JsonNode root = objectMapper.readTree(
                            response.body()
                    );

                    /*
                     * Some Overpass servers return an error
                     * message inside an otherwise valid JSON body.
                     */
                    if (root.has("remark")) {

                        lastError = new IllegalStateException(
                                root.path("remark").asText(
                                        "Overpass returned an error."
                                )
                        );

                        log.warn(
                                "Overpass returned a remark from {}: {}",
                                endpoint,
                                lastError.getMessage()
                        );

                        break;
                    }

                    JsonNode elements = root.path("elements");

                    if (!elements.isArray()) {

                        lastError = new IllegalStateException(
                                "Invalid Overpass response: elements is not an array."
                        );

                        log.warn(
                                "Invalid JSON response from {}",
                                endpoint
                        );

                        break;
                    }

                    List<NearbyPlace> places = parsePlaces(
                            elements,
                            userLat,
                            userLon,
                            type
                    );

                    places.sort(
                            Comparator.comparingLong(
                                    NearbyPlace::getDistanceMeters
                            )
                    );

                    log.info(
                            "Nearby {} search returned {} places from {}",
                            type,
                            places.size(),
                            endpoint
                    );

                    /*
                     * An empty result is still a successful
                     * API response. Do not retry every server
                     * just because a location has no mapped places.
                     */
                    return places;

                } catch (InterruptedException ex) {

                    Thread.currentThread().interrupt();

                    throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "Nearby search was interrupted. Please try again.",
                            ex
                    );

                } catch (Exception ex) {

                    lastError = ex;

                    log.warn(
                            "Nearby search failed using {} (attempt {}): {}",
                            endpoint,
                            attempt,
                            ex.toString()
                    );

                    if (attempt < MAX_RETRIES_PER_ENDPOINT) {
                        waitBeforeRetry(attempt);
                    }
                }
            }
        }

        log.error(
                "All Overpass endpoints failed for nearby {} search.",
                type,
                lastError
        );

        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Nearby places are temporarily unavailable from OpenStreetMap. Please try again in a moment.",
                lastError
        );
    }

    private boolean isTemporaryError(int status) {

        return status == 408
                || status == 425
                || status == 429
                || status == 500
                || status == 502
                || status == 503
                || status == 504;
    }

    // ==================================================
    // RETRY DELAY
    // ==================================================

    private void waitBeforeRetry(int attempt) {

        long delayMillis = attempt == 1 ? 1500 : 3000;

        try {

            Thread.sleep(delayMillis);

        } catch (InterruptedException ex) {

            Thread.currentThread().interrupt();

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Nearby search retry was interrupted.",
                    ex
            );
        }
    }

    // ==================================================
    // PARSE OVERPASS RESULTS
    // ==================================================

    private List<NearbyPlace> parsePlaces(
            JsonNode elements,
            double userLat,
            double userLon,
            String type) {

        List<NearbyPlace> places = new ArrayList<>();

        for (JsonNode element : elements) {

            JsonNode tags = element.path("tags");

            double placeLat;
            double placeLon;

            if (element.hasNonNull("lat")
                    && element.hasNonNull("lon")) {

                placeLat = element.path("lat").asDouble(Double.NaN);
                placeLon = element.path("lon").asDouble(Double.NaN);

            } else if (element.path("center").hasNonNull("lat")
                    && element.path("center").hasNonNull("lon")) {

                placeLat = element.path("center")
                        .path("lat").asDouble(Double.NaN);

                placeLon = element.path("center")
                        .path("lon").asDouble(Double.NaN);

            } else {

                continue;
            }

            if (!Double.isFinite(placeLat)
                    || !Double.isFinite(placeLon)) {
                continue;
            }

            String name = tag(tags, "name");

            if (name.isBlank()) {
                name = tag(tags, "name:en");
            }

            if (name.isBlank()) {
                continue;
            }

            String osmType = element.path("type").asText("");
            String osmId = element.path("id").asText("");

            NearbyPlace place = new NearbyPlace();

            place.setOsmId(osmId);
            place.setOsmType(osmType);
            place.setName(name);

            place.setCategory(
                    resolveCategory(tags, type)
            );

            place.setLatitude(placeLat);
            place.setLongitude(placeLon);

            place.setDistanceMeters(
                    Math.round(
                            haversine(
                                    userLat,
                                    userLon,
                                    placeLat,
                                    placeLon
                            )
                    )
            );

            place.setAddress(buildAddress(tags));

            place.setPhone(
                    firstTag(tags, "contact:phone", "phone")
            );

            place.setWebsite(
                    normalizeUrl(
                            firstTag(
                                    tags,
                                    "contact:website",
                                    "website"
                            )
                    )
            );

            place.setEmail(
                    firstTag(tags, "contact:email", "email")
            );

            place.setOpeningHours(
                    tag(tags, "opening_hours")
            );

            place.setCuisine(
                    tag(tags, "cuisine")
            );

            place.setImageUrl(
                    resolveImage(tags)
            );

            place.setBookingUrl(
                    normalizeUrl(
                            firstTag(
                                    tags,
                                    "contact:booking",
                                    "booking",
                                    "reservation",
                                    "contact:website",
                                    "website"
                            )
                    )
            );

            place.setMapUrl(
                    "https://www.openstreetmap.org/"
                            + osmType + "/" + osmId
            );

            place.setSource("OpenStreetMap");

            /*
             * OSM does not confirm live room availability.
             */
            place.setAvailabilityStatus(
                    "accommodation".equals(type)
                            ? "NOT_VERIFIED"
                            : "NOT_APPLICABLE"
            );

            places.add(place);
        }

        return places;
    }

    // ==================================================
    // CATEGORY
    // ==================================================

    private String resolveCategory(
            JsonNode tags,
            String type) {

        if ("food".equals(type)) {

            String value = firstTag(
                    tags,
                    "amenity",
                    "shop"
            );

            return value.isBlank() ? "food" : value;
        }

        String value = tag(tags, "tourism");

        return value.isBlank()
                ? "accommodation"
                : value;
    }

    // ==================================================
    // URL HELPERS
    // ==================================================

    private String normalizeUrl(String value) {

        if (value == null || value.isBlank()) {
            return "";
        }

        String trimmed = value.trim();

        if (trimmed.startsWith("https://")
                || trimmed.startsWith("http://")) {

            return trimmed;
        }

        if (trimmed.contains(".")
                && !trimmed.contains(" ")) {

            return "https://" + trimmed;
        }

        return "";
    }

    private String resolveImage(JsonNode tags) {

        String image = firstTag(
                tags,
                "image",
                "contact:image"
        );

        String normalized = normalizeUrl(image);

        if (!normalized.isBlank()) {
            return normalized;
        }

        String commons = tag(
                tags,
                "wikimedia_commons"
        );

        if (commons.startsWith("File:")) {

            String fileName = commons.substring(
                    "File:".length()
            ).trim();

            return "https://commons.wikimedia.org/wiki/Special:FilePath/"
                    + URLEncoder.encode(
                            fileName,
                            StandardCharsets.UTF_8
                    );
        }

        return "";
    }

    // ==================================================
    // ADDRESS HELPERS
    // ==================================================

    private String buildAddress(JsonNode tags) {

        List<String> parts = new ArrayList<>();

        addIfPresent(parts, tag(tags, "addr:housenumber"));
        addIfPresent(parts, tag(tags, "addr:street"));
        addIfPresent(parts, tag(tags, "addr:suburb"));
        addIfPresent(parts, tag(tags, "addr:city"));
        addIfPresent(parts, tag(tags, "addr:postcode"));

        return String.join(", ", parts);
    }

    private void addIfPresent(
            List<String> parts,
            String value) {

        if (value != null && !value.isBlank()) {
            parts.add(value);
        }
    }

    // ==================================================
    // TAG HELPERS
    // ==================================================

    private String firstTag(
            JsonNode tags,
            String... keys) {

        for (String key : keys) {

            String value = tag(tags, key);

            if (!value.isBlank()) {
                return value;
            }
        }

        return "";
    }

    private String tag(
            JsonNode tags,
            String key) {

        JsonNode value = tags.path(key);

        return value.isMissingNode() || value.isNull()
                ? ""
                : value.asText("").trim();
    }

    // ==================================================
    // DISTANCE CALCULATION
    // ==================================================

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
                Math.sqrt(a),
                Math.sqrt(1 - a)
        );
    }

    // ==================================================
    // RESPONSE MODEL
    // ==================================================

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

        public String getOsmId() {
            return osmId;
        }

        public void setOsmId(String v) {
            osmId = v;
        }

        public String getOsmType() {
            return osmType;
        }

        public void setOsmType(String v) {
            osmType = v;
        }

        public String getName() {
            return name;
        }

        public void setName(String v) {
            name = v;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String v) {
            category = v;
        }

        public double getLatitude() {
            return latitude;
        }

        public void setLatitude(double v) {
            latitude = v;
        }

        public double getLongitude() {
            return longitude;
        }

        public void setLongitude(double v) {
            longitude = v;
        }

        public long getDistanceMeters() {
            return distanceMeters;
        }

        public void setDistanceMeters(long v) {
            distanceMeters = v;
        }

        public String getAddress() {
            return address;
        }

        public void setAddress(String v) {
            address = v;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String v) {
            phone = v;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String v) {
            email = v;
        }

        public String getWebsite() {
            return website;
        }

        public void setWebsite(String v) {
            website = v;
        }

        public String getOpeningHours() {
            return openingHours;
        }

        public void setOpeningHours(String v) {
            openingHours = v;
        }

        public String getCuisine() {
            return cuisine;
        }

        public void setCuisine(String v) {
            cuisine = v;
        }

        public String getImageUrl() {
            return imageUrl;
        }

        public void setImageUrl(String v) {
            imageUrl = v;
        }

        public String getBookingUrl() {
            return bookingUrl;
        }

        public void setBookingUrl(String v) {
            bookingUrl = v;
        }

        public String getMapUrl() {
            return mapUrl;
        }

        public void setMapUrl(String v) {
            mapUrl = v;
        }

        public String getSource() {
            return source;
        }

        public void setSource(String v) {
            source = v;
        }

        public String getAvailabilityStatus() {
            return availabilityStatus;
        }

        public void setAvailabilityStatus(String v) {
            availabilityStatus = v;
        }
    }
}
