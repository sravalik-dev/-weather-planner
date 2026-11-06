
package backend.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import backend.dto.DestinationRequest;
import backend.dto.DestinationResponse;
import backend.dto.ReorderDestinationRequest;
import backend.dto.RouteDistanceResponse;
import backend.dto.RouteEtaResponse;
import backend.entity.Trip;
import backend.entity.TripDestination;
import backend.repository.TripDestinationRepository;
import backend.repository.TripRepository;

@Service
public class RouteService {

    // HTTP client for road routing
    private static final HttpClient httpClient =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(15))
                    .build();

    private final ObjectMapper objectMapper =
            new ObjectMapper();

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

        destination.setDestinationOrder(
                destinations.size() + 1
        );

        setModule5Data(destination, request);

        TripDestination saved =
                tripDestinationRepository.save(destination);

        return convertToResponse(saved);
    }

    // ==========================================
    // UPDATE DESTINATION
    // ==========================================

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

        List<TripDestination> destinations =
                tripDestinationRepository
                        .findByTrip_TripIdOrderByDestinationOrderAsc(
                                tripId
                        );

        if (destinations.size() !=
                request.getDestinationIds().size()) {

            throw new RuntimeException(
                    "All destinations must be included when reordering"
            );
        }

        for (int i = 0;
             i < request.getDestinationIds().size();
             i++) {

            Integer destinationId =
                    request.getDestinationIds().get(i);

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

            tripDestinationRepository.save(destination);
        }

        return tripDestinationRepository
                .findByTrip_TripIdOrderByDestinationOrderAsc(
                        tripId
                )
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // ==========================================
    // CALCULATE ROAD DISTANCE
    // ==========================================

    public RouteDistanceResponse calculateDistance(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        RoadRoute route = getRoadRoute(tripId);

        double distanceKm =
                route.distanceMeters / 1000.0;

        distanceKm =
                Math.round(distanceKm * 100.0) / 100.0;

        return new RouteDistanceResponse(
                tripId,
                distanceKm
        );
    }

    // ==========================================
    // CALCULATE ROAD ETA
    // ==========================================

    public RouteEtaResponse calculateEta(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        RoadRoute route = getRoadRoute(tripId);

        double distanceKm =
                route.distanceMeters / 1000.0;

        double estimatedHours =
                route.durationSeconds / 3600.0;

        double averageSpeed = 0.0;

        if (estimatedHours > 0) {
            averageSpeed = distanceKm / estimatedHours;
        }

        distanceKm =
                Math.round(distanceKm * 100.0) / 100.0;

        estimatedHours =
                Math.round(estimatedHours * 100.0) / 100.0;

        averageSpeed =
                Math.round(averageSpeed * 100.0) / 100.0;

        return new RouteEtaResponse(
                tripId,
                distanceKm,
                averageSpeed,
                estimatedHours
        );
    }

    // ==========================================
    // GET ROAD ROUTE FROM OSRM
    // ==========================================

    private RoadRoute getRoadRoute(Integer tripId) {

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

        StringBuilder coordinates =
                new StringBuilder();

        for (TripDestination destination : destinations) {

            if (destination.getLatitude() == null ||
                    destination.getLongitude() == null) {

                throw new RuntimeException(
                        "Every destination must have valid coordinates"
                );
            }

            if (coordinates.length() > 0) {
                coordinates.append(";");
            }

            // OSRM requires longitude first, latitude second
            coordinates.append(destination.getLongitude())
                    .append(",")
                    .append(destination.getLatitude());
        }

        try {

            String url =
                    "https://router.project-osrm.org/route/v1/driving/"
                            + coordinates
                            + "?overview=false&steps=false";

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .timeout(Duration.ofSeconds(30))
                            .GET()
                            .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() != 200) {
                throw new RuntimeException(
                        "Road routing service returned HTTP "
                                + response.statusCode()
                );
            }

            JsonNode root =
                    objectMapper.readTree(response.body());

            if (!"Ok".equals(root.path("code").asText())) {
                throw new RuntimeException(
                        "Unable to calculate road route: "
                                + root.path("message").asText()
                );
            }

            JsonNode routes = root.path("routes");

            if (!routes.isArray() || routes.isEmpty()) {
                throw new RuntimeException(
                        "No driving route found for these destinations"
                );
            }

            JsonNode firstRoute = routes.get(0);

            double distanceMeters =
                    firstRoute.path("distance").asDouble();

            double durationSeconds =
                    firstRoute.path("duration").asDouble();

            if (distanceMeters <= 0 || durationSeconds <= 0) {
                throw new RuntimeException(
                        "Invalid distance or duration returned by routing service"
                );
            }

            return new RoadRoute(
                    distanceMeters,
                    durationSeconds
            );

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Road route calculation was interrupted",
                    e
            );

        } catch (Exception e) {

            if (e instanceof RuntimeException) {
                throw (RuntimeException) e;
            }

            throw new RuntimeException(
                    "Unable to calculate road distance and travel time: "
                            + e.getMessage(),
                    e
            );
        }
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

    // ==========================================
    // ROAD ROUTE DATA
    // ==========================================

    private static class RoadRoute {

        private final double distanceMeters;
        private final double durationSeconds;

        public RoadRoute(
                double distanceMeters,
                double durationSeconds) {

            this.distanceMeters = distanceMeters;
            this.durationSeconds = durationSeconds;
        }
    }
}
