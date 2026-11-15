
package backend.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import backend.dto.DestinationRequest;
import backend.dto.DestinationResponse;
import backend.dto.ReorderDestinationRequest;
import backend.dto.RouteDistanceResponse;
import backend.dto.RouteEtaResponse;
import backend.dto.RouteLegResponse;
import backend.dto.RouteSummaryResponse;
import backend.entity.Trip;
import backend.entity.TripDestination;
import backend.repository.TripDestinationRepository;
import backend.repository.TripRepository;

@Service
public class RouteService {

    /*
     * Road routing server. Defaults to the free public OSRM demo server.
     * Override in application.properties with:
     *     route.osrm.base-url=http://your-own-osrm:5000
     */
    @Value("${route.osrm.base-url:https://router.project-osrm.org}")
    private String osrmBaseUrl;

    @Value("${route.osrm.timeout-seconds:12}")
    private long osrmTimeoutSeconds;

    private volatile RouteCalculator routeCalculator;

    private RouteCalculator calculator() {
        RouteCalculator local = routeCalculator;
        if (local == null) {
            synchronized (this) {
                if (routeCalculator == null) {
                    routeCalculator = new RouteCalculator(
                            osrmBaseUrl,
                            Duration.ofSeconds(osrmTimeoutSeconds));
                }
                local = routeCalculator;
            }
        }
        return local;
    }

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private TripDestinationRepository tripDestinationRepository;

    // Used to check dependent itinerary activities
    @Autowired
    private JdbcTemplate jdbcTemplate;

    // ==========================================
    // ADD DESTINATION
    // ==========================================

    @Transactional
    public DestinationResponse addDestination(
            Integer userId,
            Integer tripId,
            DestinationRequest request) {

        Trip trip = getUserTrip(tripId, userId);

        validateDestinationRequest(request);

        List<TripDestination> destinations =
                tripDestinationRepository
                        .findByTrip_TripIdOrderByDestinationOrderAsc(
                                tripId
                        );

        TripDestination destination =
                new TripDestination();

        destination.setTrip(trip);

        destination.setDestinationName(
                request.getDestinationName().trim()
        );

        destination.setLatitude(
                request.getLatitude()
        );

        destination.setLongitude(
                request.getLongitude()
        );

        // Use the highest existing order + 1 (not the list size), so the
        // new stop is always last even if earlier orders have gaps.
        int nextOrder = 1;
        for (TripDestination existing : destinations) {
            if (existing.getDestinationOrder() != null
                    && existing.getDestinationOrder() >= nextOrder) {
                nextOrder = existing.getDestinationOrder() + 1;
            }
        }

        destination.setDestinationOrder(nextOrder);

        setModule5Data(destination, request);

        TripDestination saved =
                tripDestinationRepository.save(destination);

        return convertToResponse(saved);
    }

    // ==========================================
    // UPDATE DESTINATION
    // ==========================================

    @Transactional
    public DestinationResponse updateDestination(
            Integer userId,
            Integer tripId,
            Integer destinationId,
            DestinationRequest request) {

        getUserTrip(tripId, userId);

        validateDestinationRequest(request);

        TripDestination destination =
                tripDestinationRepository
                        .findByDestinationIdAndTrip_TripId(
                                destinationId,
                                tripId
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Destination not found"
                                )
                        );

        destination.setDestinationName(
                request.getDestinationName().trim()
        );

        destination.setLatitude(
                request.getLatitude()
        );

        destination.setLongitude(
                request.getLongitude()
        );

        setModule5Data(destination, request);

        TripDestination updated =
                tripDestinationRepository.save(destination);

        return convertToResponse(updated);
    }

    // ==========================================
    // REMOVE DESTINATION
    // ==========================================

    @Transactional
    public void removeDestination(
            Integer userId,
            Integer tripId,
            Integer destinationId) {

        getUserTrip(tripId, userId);

        TripDestination destination =
                tripDestinationRepository
                        .findByDestinationIdAndTrip_TripId(
                                destinationId,
                                tripId
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Destination not found"
                                )
                        );

        // Check associated itinerary activities
        Long activityCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM itinerary_activities WHERE destination_id = ?",
                Long.class,
                destinationId
        );

        if (activityCount != null && activityCount > 0) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot delete this destination because "
                            + activityCount
                            + " itinerary activity is associated with it. "
                            + "Remove or reassign the activity first."
            );
        }

        // Delete destination only if no activities are associated
        tripDestinationRepository.delete(destination);

        reorderAfterDelete(tripId);
    }

    // ==========================================
    // GET DESTINATIONS
    // ==========================================

    public List<DestinationResponse> getDestinations(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        return tripDestinationRepository
                .findByTrip_TripIdOrderByDestinationOrderAsc(
                        tripId
                )
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // ==========================================
    // REORDER DESTINATIONS
    // ==========================================

    @Transactional
    public List<DestinationResponse> reorderDestinations(
            Integer userId,
            Integer tripId,
            ReorderDestinationRequest request) {

        getUserTrip(tripId, userId);

        if (request == null ||
                request.getDestinationIds() == null ||
                request.getDestinationIds().isEmpty()) {

            throw new RuntimeException(
                    "Destination order cannot be empty"
            );
        }

        List<Integer> requestedIds = request.getDestinationIds();

        // Reject duplicates. Without this check a list such as [1, 1, 3]
        // has the right size but leaves destination 2 without a new order.
        Set<Integer> uniqueIds = new HashSet<>(requestedIds);

        if (uniqueIds.contains(null)
                || uniqueIds.size() != requestedIds.size()) {

            throw new RuntimeException(
                    "Invalid destination order: each destination must appear exactly once"
            );
        }

        List<TripDestination> destinations =
                tripDestinationRepository
                        .findByTrip_TripIdOrderByDestinationOrderAsc(
                                tripId
                        );

        if (destinations.size() != requestedIds.size()) {

            throw new RuntimeException(
                    "All destinations must be included when reordering"
            );
        }

        // Save all changes together, in one transaction
        // (all succeed, or none are applied).
        for (int i = 0; i < requestedIds.size(); i++) {

            Integer destinationId = requestedIds.get(i);

            TripDestination destination =
                    destinations.stream()
                            .filter(d ->
                                    d.getDestinationId()
                                            .equals(destinationId))
                            .findFirst()
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Invalid destination ID: "
                                                    + destinationId
                                    )
                            );

            destination.setDestinationOrder(i + 1);
        }

        tripDestinationRepository.saveAll(destinations);

        return tripDestinationRepository
                .findByTrip_TripIdOrderByDestinationOrderAsc(
                        tripId
                )
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // ==========================================
    // ROUTE SUMMARY (NEW: totals + every leg in one call)
    // ==========================================

    public RouteSummaryResponse getRouteSummary(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        RouteCalculator.Result route = computeRoute(tripId);

        List<RouteLegResponse> legs = new ArrayList<>();

        for (RouteCalculator.Leg leg : route.legs) {
            legs.add(new RouteLegResponse(
                    leg.from.id,
                    leg.from.name,
                    leg.to.id,
                    leg.to.name,
                    leg.distanceKm,
                    leg.durationMinutes
            ));
        }

        RouteSummaryResponse response = new RouteSummaryResponse();
        response.setTripId(tripId);
        response.setStopCount(route.legs.size() + 1);
        response.setTotalDistanceKm(route.totalDistanceKm);
        response.setTotalDurationMinutes(route.totalDurationMinutes);
        response.setAverageSpeedKmph(route.averageSpeedKmph());
        response.setSource(route.source);
        response.setApproximate(route.isApproximate());
        response.setNotice(route.notice);
        response.setLegs(legs);

        return response;
    }

    
    // =========================================================
    // PAIRWISE TRAVEL-TIME MATRIX FOR ML
    // =========================================================

    public Map<String, Map<String, Double>> calculateTravelTimeMatrix(
            List<TripDestination> destinations) {

        if (destinations == null || destinations.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one destination is required."
            );
        }

        StringBuilder coordinates = new StringBuilder();

        for (TripDestination destination : destinations) {

            if (destination.getDestinationId() == null
                    || destination.getLatitude() == null
                    || destination.getLongitude() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Every destination must have an ID and valid coordinates."
                );
            }

            if (coordinates.length() > 0) {
                coordinates.append(";");
            }

            // OSRM coordinate order: longitude,latitude
            coordinates.append(destination.getLongitude())
                    .append(",")
                    .append(destination.getLatitude());
        }

        try {
            String baseUrl = osrmBaseUrl.replaceAll("/+$", "");

            String url = baseUrl
                    + "/table/v1/driving/"
                    + coordinates
                    + "?annotations=duration";

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(osrmTimeoutSeconds))
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() != 200) {
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "OSRM travel-time service returned HTTP "
                                + response.statusCode()
                );
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response.body());

            if (!"Ok".equals(root.path("code").asText())) {
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Unable to calculate travel-time matrix: "
                                + root.path("message").asText()
                );
            }

            JsonNode durations = root.path("durations");
            int size = destinations.size();

            if (!durations.isArray() || durations.size() != size) {
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "OSRM returned an incomplete travel-time matrix."
                );
            }

            Map<String, Map<String, Double>> matrix =
                    new LinkedHashMap<>();

            for (int i = 0; i < size; i++) {

                JsonNode row = durations.get(i);

                if (!row.isArray() || row.size() != size) {
                    throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "Invalid travel-time matrix row."
                    );
                }

                String sourceId = String.valueOf(
                        destinations.get(i).getDestinationId()
                );

                Map<String, Double> travelTimes =
                        new LinkedHashMap<>();

                for (int j = 0; j < size; j++) {

                    JsonNode value = row.get(j);

                    if (value == null || value.isNull()
                            || !value.isNumber()) {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "No driving route is available between destinations "
                                        + sourceId + " and "
                                        + destinations.get(j).getDestinationId()
                        );
                    }

                    double seconds = value.asDouble();

                    if (seconds < 0) {
                        throw new ResponseStatusException(
                                HttpStatus.SERVICE_UNAVAILABLE,
                                "OSRM returned an invalid travel time."
                        );
                    }

                    // ML optimizer expects travel time in minutes.
                    double minutes = Math.ceil(seconds / 60.0);

                    travelTimes.put(
                            String.valueOf(
                                    destinations.get(j).getDestinationId()
                            ),
                            minutes
                    );
                }

                matrix.put(sourceId, travelTimes);
            }

            return matrix;

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Travel-time matrix calculation was interrupted.",
                    exception
            );

        } catch (ResponseStatusException exception) {
            throw exception;

        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Unable to calculate pairwise travel times: "
                            + exception.getMessage(),
                    exception
            );
        }
    }

    // ==========================================
    // CALCULATE ROAD DISTANCE (existing endpoint, unchanged format)
    // ==========================================

    public RouteDistanceResponse calculateDistance(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        RouteCalculator.Result route = computeRoute(tripId);

        return new RouteDistanceResponse(
                tripId,
                route.totalDistanceKm
        );
    }

    // ==========================================
    // CALCULATE ROAD ETA (existing endpoint, unchanged format)
    // ==========================================

    public RouteEtaResponse calculateEta(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        RouteCalculator.Result route = computeRoute(tripId);

        double hours =
                Math.round(
                        route.totalDurationMinutes / 60.0 * 100.0
                ) / 100.0;

        return new RouteEtaResponse(
                tripId,
                route.totalDistanceKm,
                route.averageSpeedKmph(),
                hours
        );
    }

    // ==========================================
    // LOAD STOPS AND CALCULATE (OSRM, with safe fallback)
    // ==========================================

    private RouteCalculator.Result computeRoute(Integer tripId) {

        List<TripDestination> destinations =
                tripDestinationRepository
                        .findByTrip_TripIdOrderByDestinationOrderAsc(
                                tripId
                        );

        if (destinations.size() < 2) {
            throw new RuntimeException(
                    "At least two destinations are required"
            );
        }

        List<RouteCalculator.Stop> stops = new ArrayList<>();

        for (TripDestination destination : destinations) {

            if (destination.getLatitude() == null ||
                    destination.getLongitude() == null) {

                throw new RuntimeException(
                        "Every destination must have valid coordinates"
                );
            }

            stops.add(new RouteCalculator.Stop(
                    destination.getDestinationId(),
                    destination.getDestinationName(),
                    destination.getLatitude(),
                    destination.getLongitude()
            ));
        }

        return calculator().calculate(stops);
    }

    // ==========================================
    // SET MODULE 5 DATA
    // ==========================================

    private void setModule5Data(
            TripDestination destination,
            DestinationRequest request) {

        destination.setCategory(
                request.getCategory()
        );

        destination.setBestTime(
                request.getBestTime()
        );

        destination.setOpeningTime(
                request.getOpeningTime()
        );

        destination.setClosingTime(
                request.getClosingTime()
        );

        destination.setTicketPrice(
                request.getTicketPrice()
        );

        destination.setExpectedDuration(
                request.getExpectedDuration()
        );

        destination.setPopularity(
                request.getPopularity()
        );

        destination.setIndoorOutdoor(
                request.getIndoorOutdoor()
        );

        destination.setFamilyFriendly(
                request.getFamilyFriendly()
        );

        destination.setWheelchairFriendly(
                request.getWheelchairFriendly()
        );

        destination.setKidsFriendly(
                request.getKidsFriendly()
        );
    }

    // ==========================================
    // REORDER AFTER DELETE
    // ==========================================

    private void reorderAfterDelete(Integer tripId) {

        List<TripDestination> destinations =
                tripDestinationRepository
                        .findByTrip_TripIdOrderByDestinationOrderAsc(
                                tripId
                        );

        for (int i = 0;
             i < destinations.size();
             i++) {

            destinations.get(i)
                    .setDestinationOrder(i + 1);

            tripDestinationRepository.save(
                    destinations.get(i)
            );
        }
    }

    // ==========================================
    // CONVERT ENTITY TO RESPONSE
    // ==========================================

    private DestinationResponse convertToResponse(
            TripDestination destination) {

        DestinationResponse response =
                new DestinationResponse();

        response.setDestinationId(
                destination.getDestinationId()
        );

        response.setDestinationName(
                destination.getDestinationName()
        );

        response.setLatitude(
                destination.getLatitude()
        );

        response.setLongitude(
                destination.getLongitude()
        );

        response.setDestinationOrder(
                destination.getDestinationOrder()
        );

        response.setCategory(
                destination.getCategory()
        );

        response.setBestTime(
                destination.getBestTime()
        );

        response.setOpeningTime(
                destination.getOpeningTime()
        );

        response.setClosingTime(
                destination.getClosingTime()
        );

        response.setTicketPrice(
                destination.getTicketPrice()
        );

        response.setExpectedDuration(
                destination.getExpectedDuration()
        );

        response.setPopularity(
                destination.getPopularity()
        );

        response.setIndoorOutdoor(
                destination.getIndoorOutdoor()
        );

        response.setFamilyFriendly(
                destination.getFamilyFriendly()
        );

        response.setWheelchairFriendly(
                destination.getWheelchairFriendly()
        );

        response.setKidsFriendly(
                destination.getKidsFriendly()
        );

        return response;
    }

    // ==========================================
    // GET USER TRIP
    // ==========================================

    private Trip getUserTrip(
            Integer tripId,
            Integer userId) {

        if (tripId == null) {
            throw new RuntimeException(
                    "Trip ID cannot be null"
            );
        }

        if (userId == null) {
            throw new RuntimeException(
                    "User ID cannot be null"
            );
        }

        return tripRepository
                .findByTripIdAndUser_UserId(
                        tripId,
                        userId
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Trip not found"
                        )
                );
    }

    // ==========================================
    // VALIDATE DESTINATION
    // ==========================================

    private void validateDestinationRequest(
            DestinationRequest request) {

        if (request == null) {
            throw new RuntimeException(
                    "Destination request cannot be empty"
            );
        }

        if (request.getDestinationName() == null ||
                request.getDestinationName()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Destination name is required"
            );
        }

        if (request.getLatitude() == null ||
                request.getLatitude() < -90 ||
                request.getLatitude() > 90) {

            throw new RuntimeException(
                    "Latitude must be between -90 and 90"
            );
        }

        if (request.getLongitude() == null ||
                request.getLongitude() < -180 ||
                request.getLongitude() > 180) {

            throw new RuntimeException(
                    "Longitude must be between -180 and 180"
            );
        }

        if (request.getTicketPrice() != null &&
                request.getTicketPrice().signum() < 0) {

            throw new RuntimeException(
                    "Ticket price cannot be negative"
            );
        }

        if (request.getExpectedDuration() != null &&
                request.getExpectedDuration() <= 0) {

            throw new RuntimeException(
                    "Expected duration must be greater than zero"
            );
        }

        if (request.getPopularity() != null &&
                (request.getPopularity() < 0 ||
                        request.getPopularity() > 5)) {

            throw new RuntimeException(
                    "Popularity must be between 0 and 5"
            );
        }

        if (request.getOpeningTime() != null &&
                request.getClosingTime() != null &&
                !request.getOpeningTime()
                        .isBefore(request.getClosingTime())) {

            throw new RuntimeException(
                    "Opening time must be before closing time"
            );
        }
    }
}
