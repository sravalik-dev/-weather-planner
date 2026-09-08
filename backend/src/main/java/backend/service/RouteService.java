package backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

    /*
     * Default average road speed.
     *
     * This is only an estimate.
     * A real map API can be connected later.
     */
    private static final double DEFAULT_SPEED_KMPH = 50.0;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private TripDestinationRepository
            tripDestinationRepository;

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

        // Module 4
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

        // Module 5
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

        // Module 4
        destination.setDestinationName(
                request.getDestinationName().trim()
        );

        destination.setLatitude(
                request.getLatitude()
        );

        destination.setLongitude(
                request.getLongitude()
        );

        // Module 5
        setModule5Data(destination, request);

        TripDestination updated =
                tripDestinationRepository.save(destination);

        return convertToResponse(updated);
    }

    // ==========================================
    // REMOVE DESTINATION
    // ==========================================

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
    // CALCULATE DISTANCE
    // ==========================================

    public RouteDistanceResponse calculateDistance(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

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

        double totalDistance = 0.0;

        for (int i = 0;
             i < destinations.size() - 1;
             i++) {

            TripDestination current =
                    destinations.get(i);

            TripDestination next =
                    destinations.get(i + 1);

            totalDistance += calculateHaversineDistance(
                    current.getLatitude(),
                    current.getLongitude(),
                    next.getLatitude(),
                    next.getLongitude()
            );
        }

        totalDistance =
                Math.round(totalDistance * 100.0) / 100.0;

        return new RouteDistanceResponse(
                tripId,
                totalDistance
        );
    }

    // ==========================================
    // CALCULATE ETA
    // ==========================================

    public RouteEtaResponse calculateEta(
            Integer userId,
            Integer tripId) {

        RouteDistanceResponse distance =
                calculateDistance(userId, tripId);

        double estimatedHours =
                distance.getTotalDistanceKm()
                        / DEFAULT_SPEED_KMPH;

        estimatedHours =
                Math.round(estimatedHours * 100.0) / 100.0;

        return new RouteEtaResponse(
                tripId,
                distance.getTotalDistanceKm(),
                DEFAULT_SPEED_KMPH,
                estimatedHours
        );
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
    // HAVERSINE DISTANCE
    // ==========================================

    private double calculateHaversineDistance(
            double latitude1,
            double longitude1,
            double latitude2,
            double longitude2) {

        final double EARTH_RADIUS_KM = 6371.0;

        double latDistance =
                Math.toRadians(latitude2 - latitude1);

        double lonDistance =
                Math.toRadians(longitude2 - longitude1);

        double a =
                Math.sin(latDistance / 2)
                        * Math.sin(latDistance / 2)
                +
                Math.cos(Math.toRadians(latitude1))
                        * Math.cos(Math.toRadians(latitude2))
                        * Math.sin(lonDistance / 2)
                        * Math.sin(lonDistance / 2);

        double c =
                2 * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a)
                );

        return EARTH_RADIUS_KM * c;
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

        // Module 4
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

        // Module 5
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

        // ==========================================
        // MODULE 5 VALIDATION
        // ==========================================

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