package backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import backend.dto.TripRequest;
import backend.dto.TripResponse;
import backend.entity.Trip;
import backend.entity.TripStatus;
import backend.entity.User;
import backend.repository.TripRepository;
import backend.repository.UserRepository;

@Service
public class TripService {

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private UserRepository userRepository;

    public TripResponse createTrip(Integer userId, TripRequest request) {

        validateRequest(request);

        User user = getUser(userId);

        Trip trip = new Trip();

        trip.setUser(user);
        setTripData(trip, request);
        trip.setStatus(TripStatus.ACTIVE);
        trip.setCreatedAt(LocalDateTime.now());
        trip.setUpdatedAt(LocalDateTime.now());

        Trip savedTrip = tripRepository.save(trip);

        return convertToResponse(savedTrip);
    }

    public TripResponse saveDraft(Integer userId, TripRequest request) {

        validateRequest(request);

        User user = getUser(userId);

        Trip trip = new Trip();

        trip.setUser(user);
        setTripData(trip, request);
        trip.setStatus(TripStatus.DRAFT);
        trip.setCreatedAt(LocalDateTime.now());
        trip.setUpdatedAt(LocalDateTime.now());

        Trip savedTrip = tripRepository.save(trip);

        return convertToResponse(savedTrip);
    }

    public TripResponse updateTrip(
            Integer userId,
            Integer tripId,
            TripRequest request) {

        validateRequest(request);

        Trip trip = getUserTrip(tripId, userId);

        setTripData(trip, request);
        trip.setUpdatedAt(LocalDateTime.now());

        Trip updatedTrip = tripRepository.save(trip);

        return convertToResponse(updatedTrip);
    }

    public void deleteTrip(Integer userId, Integer tripId) {

        Trip trip = getUserTrip(tripId, userId);

        tripRepository.delete(trip);
    }

    public TripResponse duplicateTrip(Integer userId, Integer tripId) {

        Trip originalTrip = getUserTrip(tripId, userId);

        Trip duplicateTrip = new Trip();

        duplicateTrip.setUser(originalTrip.getUser());
        duplicateTrip.setTripName(originalTrip.getTripName() + " Copy");
        duplicateTrip.setOrigin(originalTrip.getOrigin());
        duplicateTrip.setDestination(originalTrip.getDestination());
        duplicateTrip.setStartDate(originalTrip.getStartDate());
        duplicateTrip.setEndDate(originalTrip.getEndDate());
        duplicateTrip.setNoOfDays(originalTrip.getNoOfDays());
        duplicateTrip.setNoOfTravelers(originalTrip.getNoOfTravelers());
        duplicateTrip.setBudget(originalTrip.getBudget());
        duplicateTrip.setPace(originalTrip.getPace());
        duplicateTrip.setFeatures(originalTrip.getFeatures());

        duplicateTrip.setStatus(TripStatus.DRAFT);
        duplicateTrip.setCreatedAt(LocalDateTime.now());
        duplicateTrip.setUpdatedAt(LocalDateTime.now());

        Trip savedTrip = tripRepository.save(duplicateTrip);

        return convertToResponse(savedTrip);
    }

    public TripResponse archiveTrip(Integer userId, Integer tripId) {

        Trip trip = getUserTrip(tripId, userId);

        trip.setStatus(TripStatus.ARCHIVED);
        trip.setUpdatedAt(LocalDateTime.now());

        Trip archivedTrip = tripRepository.save(trip);

        return convertToResponse(archivedTrip);
    }

    public List<TripResponse> getMyTrips(Integer userId) {

        return tripRepository
                .findByUser_UserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public TripResponse getTrip(Integer userId, Integer tripId) {

        Trip trip = getUserTrip(tripId, userId);

        return convertToResponse(trip);
    }

    private User getUser(Integer userId) {

        if (userId == null) {
            throw new RuntimeException("User ID cannot be null");
        }

        return userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));
    }

    private Trip getUserTrip(Integer tripId, Integer userId) {

        if (tripId == null) {
            throw new RuntimeException("Trip ID cannot be null");
        }

        if (userId == null) {
            throw new RuntimeException("User ID cannot be null");
        }

        return tripRepository
                .findByTripIdAndUser_UserId(tripId, userId)
                .orElseThrow(() ->
                        new RuntimeException("Trip not found"));
    }

    private void setTripData(Trip trip, TripRequest request) {

        trip.setTripName(request.getTripName());
        trip.setOrigin(request.getOrigin());
        trip.setDestination(request.getDestination());
        trip.setStartDate(request.getStartDate());
        trip.setEndDate(request.getEndDate());
        trip.setNoOfDays(request.getNoOfDays());
        trip.setNoOfTravelers(request.getNoOfTravelers());
        trip.setBudget(request.getBudget());
        trip.setPace(request.getPace());
        trip.setFeatures(request.getFeatures());
    }

    private void validateRequest(TripRequest request) {

        if (request == null) {
            throw new RuntimeException("Trip request cannot be empty");
        }

        if (isBlank(request.getTripName())) {
            throw new RuntimeException("Trip name is required");
        }

        if (isBlank(request.getOrigin())) {
            throw new RuntimeException("Origin is required");
        }

        if (isBlank(request.getDestination())) {
            throw new RuntimeException("Destination is required");
        }

        if (request.getStartDate() == null) {
            throw new RuntimeException("Start date is required");
        }

        if (request.getEndDate() == null) {
            throw new RuntimeException("End date is required");
        }

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new RuntimeException(
                    "End date cannot be before start date");
        }

        if (request.getNoOfDays() == null ||
                request.getNoOfDays() <= 0) {

            throw new RuntimeException(
                    "Number of days must be greater than zero");
        }

        if (request.getNoOfTravelers() == null ||
                request.getNoOfTravelers() <= 0) {

            throw new RuntimeException(
                    "Number of travelers must be greater than zero");
        }

        if (request.getBudget() == null ||
                request.getBudget().signum() < 0) {

            throw new RuntimeException(
                    "Budget cannot be negative");
        }

        if (isBlank(request.getPace())) {
            throw new RuntimeException("Pace is required");
        }
    }

    private boolean isBlank(String value) {

        return value == null || value.trim().isEmpty();
    }

    private TripResponse convertToResponse(Trip trip) {

        TripResponse response = new TripResponse();

        response.setTripId(trip.getTripId());
        response.setTripName(trip.getTripName());
        response.setOrigin(trip.getOrigin());
        response.setDestination(trip.getDestination());
        response.setStartDate(trip.getStartDate());
        response.setEndDate(trip.getEndDate());
        response.setNoOfDays(trip.getNoOfDays());
        response.setNoOfTravelers(trip.getNoOfTravelers());
        response.setBudget(trip.getBudget());
        response.setPace(trip.getPace());
        response.setFeatures(trip.getFeatures());
        response.setStatus(trip.getStatus());
        response.setCreatedAt(trip.getCreatedAt());
        response.setUpdatedAt(trip.getUpdatedAt());

        return response;
    }
}