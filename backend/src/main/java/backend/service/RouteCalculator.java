package backend.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Calculates road distance and travel time between an ordered list of stops.
 *
 * This class has NO Spring dependency on purpose, so it can be unit tested
 * on its own (see RouteCalculatorTest).
 *
 * How it works:
 *   1. Ask the OSRM routing server for the driving route (retrying once).
 *   2. If OSRM is down, slow, rate limited, or has no road route
 *      (for example an island), fall back to a straight-line estimate and
 *      clearly mark the result as approximate. The page keeps working
 *      instead of showing an error.
 *   3. Cache the result for a short time so that "distance" and "eta"
 *      requests for the same route cost only one OSRM call.
 */
public class RouteCalculator {

    public static final String SOURCE_OSRM = "OSRM";
    public static final String SOURCE_ESTIMATE = "ESTIMATE";

    /** Straight lines are shorter than roads; this factor compensates. */
    static final double ROAD_FACTOR = 1.3;

    /** Average speed used by the estimate, in km/h. */
    static final double ESTIMATE_SPEED_KMPH = 50.0;

    private static final long OSRM_CACHE_MILLIS = 10 * 60 * 1000L;
    private static final long ESTIMATE_CACHE_MILLIS = 60 * 1000L;
    private static final int MAX_CACHE_ENTRIES = 200;

    // ---------------------------------------------------------------
    // Input / output types
    // ---------------------------------------------------------------

    public static class Stop {
        public final Integer id;
        public final String name;
        public final double latitude;
        public final double longitude;

        public Stop(Integer id, String name, double latitude, double longitude) {
            this.id = id;
            this.name = name;
            this.latitude = latitude;
            this.longitude = longitude;
        }
    }

    public static class Leg {
        public final Stop from;
        public final Stop to;
        public final double distanceKm;
        public final double durationMinutes;

        public Leg(Stop from, Stop to, double distanceKm, double durationMinutes) {
            this.from = from;
            this.to = to;
            this.distanceKm = distanceKm;
            this.durationMinutes = durationMinutes;
        }
    }

    public static class Result {
        public final List<Leg> legs;
        public final double totalDistanceKm;
        public final double totalDurationMinutes;
        public final String source;
        public final String notice;

        public Result(List<Leg> legs, String source, String notice) {
            this.legs = legs;
            this.source = source;
            this.notice = notice;
            double km = 0;
            double min = 0;
            for (Leg leg : legs) {
                km += leg.distanceKm;
                min += leg.durationMinutes;
            }
            this.totalDistanceKm = round2(km);
            this.totalDurationMinutes = round2(min);
        }

        public boolean isApproximate() {
            return SOURCE_ESTIMATE.equals(source);
        }

        public double averageSpeedKmph() {
            return totalDurationMinutes > 0
                    ? round2(totalDistanceKm / (totalDurationMinutes / 60.0))
                    : 0.0;
        }
    }

    private static class CacheEntry {
        final Result result;
        final long expiresAt;

        CacheEntry(Result result, long expiresAt) {
            this.result = result;
            this.expiresAt = expiresAt;
        }
    }

    // ---------------------------------------------------------------

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String osrmBaseUrl;
    private final Duration requestTimeout;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public RouteCalculator(String osrmBaseUrl, Duration requestTimeout) {
        this.osrmBaseUrl = stripTrailingSlash(osrmBaseUrl);
        this.requestTimeout = requestTimeout;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public Result calculate(List<Stop> stops) {

        if (stops == null || stops.size() < 2) {
            throw new IllegalArgumentException(
                    "At least two destinations are required");
        }

        for (Stop stop : stops) {
            if (!Double.isFinite(stop.latitude)
                    || !Double.isFinite(stop.longitude)) {
                throw new IllegalArgumentException(
                        "Every destination must have valid coordinates");
            }
        }

        String key = cacheKey(stops);
        long now = System.currentTimeMillis();

        CacheEntry cached = cache.get(key);
        if (cached != null && cached.expiresAt > now) {
            return cached.result;
        }

        Result result;
        String failure = null;

        try {
            result = callOsrmWithRetry(stops);
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            failure = e.getMessage();
            result = estimate(stops, failure);
        }

        if (cache.size() >= MAX_CACHE_ENTRIES) {
            cache.clear();
        }

        cache.put(key, new CacheEntry(
                result,
                now + (result.isApproximate()
                        ? ESTIMATE_CACHE_MILLIS
                        : OSRM_CACHE_MILLIS)));

        return result;
    }

    // ---------------------------------------------------------------
    // OSRM
    // ---------------------------------------------------------------

    private Result callOsrmWithRetry(List<Stop> stops) throws Exception {
        // Start with a real exception (never null), so "throw last" below
        // is always safe even if the loop somehow did not run.
        Exception last = new IllegalStateException(
                "Routing service did not respond");

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                return callOsrm(stops);
            } catch (NoRouteException e) {
                // Retrying will not help: there is simply no road.
                throw e;
            } catch (Exception e) {
                last = e;
                if (e instanceof InterruptedException) {
                    throw e;
                }
                if (attempt < 2) {
                    Thread.sleep(400);
                }
            }
        }
        throw last;
    }

    private Result callOsrm(List<Stop> stops) throws Exception {

        StringBuilder coordinates = new StringBuilder();

        for (Stop stop : stops) {
            if (coordinates.length() > 0) {
                coordinates.append(';');
            }
            // OSRM wants longitude first. Locale.ROOT + fixed decimals
            // avoids "1.0E-5" style numbers that break the URL.
            coordinates.append(String.format(
                            Locale.ROOT, "%.6f", stop.longitude))
                    .append(',')
                    .append(String.format(
                            Locale.ROOT, "%.6f", stop.latitude));
        }

        String url = osrmBaseUrl + "/route/v1/driving/" + coordinates
                + "?overview=false&steps=false";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(requestTimeout)
                // The public OSRM demo server asks clients to identify
                // themselves. Requests without this are throttled more.
                .header("User-Agent", "WeatherPlanner/1.0 (student project)")
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString());

        JsonNode root = objectMapper.readTree(response.body());
        String code = root.path("code").asText("");

        if ("NoRoute".equals(code) || "NoSegment".equals(code)) {
            throw new NoRouteException(
                    "No driving route exists between these stops");
        }

        if (response.statusCode() != 200 || !"Ok".equals(code)) {
            throw new IllegalStateException(
                    "Routing service returned HTTP " + response.statusCode()
                            + (code.isEmpty() ? "" : " (" + code + ")"));
        }

        JsonNode routes = root.path("routes");
        if (!routes.isArray() || routes.isEmpty()) {
            throw new NoRouteException(
                    "No driving route exists between these stops");
        }

        JsonNode legsNode = routes.get(0).path("legs");
        if (!legsNode.isArray() || legsNode.size() != stops.size() - 1) {
            throw new IllegalStateException(
                    "Routing service returned an unexpected number of legs");
        }

        List<Leg> legs = new ArrayList<>();

        for (int i = 0; i < legsNode.size(); i++) {
            JsonNode leg = legsNode.get(i);
            double meters = leg.path("distance").asDouble(-1);
            double seconds = leg.path("duration").asDouble(-1);

            if (meters < 0 || seconds < 0) {
                throw new IllegalStateException(
                        "Routing service returned an invalid leg");
            }

            legs.add(new Leg(
                    stops.get(i),
                    stops.get(i + 1),
                    round2(meters / 1000.0),
                    round2(seconds / 60.0)));
        }

        return new Result(legs, SOURCE_OSRM, null);
    }

    private static class NoRouteException extends Exception {
        private static final long serialVersionUID = 1L;

        NoRouteException(String message) {
            super(message);
        }
    }

    // ---------------------------------------------------------------
    // Fallback: straight-line estimate
    // ---------------------------------------------------------------

    Result estimate(List<Stop> stops, String reason) {

        List<Leg> legs = new ArrayList<>();

        for (int i = 0; i < stops.size() - 1; i++) {
            Stop a = stops.get(i);
            Stop b = stops.get(i + 1);

            double km = haversineKm(
                    a.latitude, a.longitude, b.latitude, b.longitude)
                    * ROAD_FACTOR;

            double minutes = km / ESTIMATE_SPEED_KMPH * 60.0;

            legs.add(new Leg(a, b, round2(km), round2(minutes)));
        }

        String notice = "Live road routing is unavailable"
                + (reason == null || reason.isBlank()
                        ? "" : " (" + reason + ")")
                + ". Showing an approximate estimate from straight-line "
                + "distance (x" + ROAD_FACTOR + ") at "
                + (int) ESTIMATE_SPEED_KMPH + " km/h.";

        return new Result(legs, SOURCE_ESTIMATE, notice);
    }

    static double haversineKm(
            double lat1, double lon1, double lat2, double lon2) {

        double r = 6371.0088;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        return 2 * r * Math.asin(Math.min(1.0, Math.sqrt(a)));
    }

    // ---------------------------------------------------------------

    private static String cacheKey(List<Stop> stops) {
        StringBuilder key = new StringBuilder();
        for (Stop stop : stops) {
            key.append(String.format(Locale.ROOT, "%.5f,%.5f;",
                    stop.latitude, stop.longitude));
        }
        return key.toString();
    }

    private static String stripTrailingSlash(String value) {
        String url = value == null ? "" : value.trim();
        while (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        return url;
    }

    static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}