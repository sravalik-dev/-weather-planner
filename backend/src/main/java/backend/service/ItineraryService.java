package backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.dto.ItineraryActivityRequest;
import backend.dto.ItineraryActivityResponse;
import backend.dto.LockActivityRequest;
import backend.dto.ReorderActivityRequest;
import backend.entity.ItineraryActivity;
import backend.entity.ItineraryHistory;
import backend.entity.Trip;
import backend.entity.TripDestination;
import backend.repository.ItineraryActivityRepository;
import backend.repository.ItineraryHistoryRepository;
import backend.repository.TripDestinationRepository;
import backend.repository.TripRepository;

@Service
public class ItineraryService {

    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final ItineraryActivityRepository itineraryActivityRepository;
    private final ItineraryHistoryRepository itineraryHistoryRepository;

    public ItineraryService(
            TripRepository tripRepository,
            TripDestinationRepository tripDestinationRepository,
            ItineraryActivityRepository itineraryActivityRepository,
            ItineraryHistoryRepository itineraryHistoryRepository) {

        this.tripRepository = tripRepository;
        this.tripDestinationRepository = tripDestinationRepository;
        this.itineraryActivityRepository = itineraryActivityRepository;
        this.itineraryHistoryRepository = itineraryHistoryRepository;
    }

    @Transactional
    public List<ItineraryActivityResponse> generateItinerary(
            Integer userId,
            Integer tripId) {

        Trip trip = getUserTrip(tripId, userId);

        List<TripDestination> destinations =
                tripDestinationRepository
                        .findByTrip_TripIdOrderByDestinationOrderAsc(tripId);

        if (destinations.isEmpty()) {
            throw new RuntimeException(
                    "No destinations found for this trip. Add destinations before generating the itinerary."
            );
        }

        if (trip.getStartDate() == null || trip.getEndDate() == null) {
            throw new RuntimeException(
                    "Trip start date and end date are required."
            );
        }

        if (trip.getEndDate().isBefore(trip.getStartDate())) {
            throw new RuntimeException(
                    "Trip end date cannot be before start date."
            );
        }

        if (itineraryActivityRepository.existsByTrip_TripIdAndLockedTrue(tripId)) {
            throw new RuntimeException(
                    "The itinerary contains locked activities. Unlock them before regenerating the itinerary."
            );
        }

        itineraryActivityRepository.deleteByTrip_TripId(tripId);

        List<ItineraryActivity> generatedActivities = new ArrayList<>();

        LocalDate currentDate = trip.getStartDate();
        int orderIndex = 1;
        int destinationIndex = 0;

        Map<LocalDate, LocalTime> nextAvailableTime = new HashMap<>();

        while (!currentDate.isAfter(trip.getEndDate())
                && destinationIndex < destinations.size()) {

            LocalTime currentTime =
                    nextAvailableTime.getOrDefault(
                            currentDate,
                            LocalTime.of(9, 0)
                    );

            int activitiesForDay = 0;

            while (destinationIndex < destinations.size()
                    && activitiesForDay < 3) {

                TripDestination destination =
                        destinations.get(destinationIndex);

                LocalTime startTime =
                        calculateStartTime(destination, currentTime);

                int duration =
                        destination.getExpectedDuration() != null
                                && destination.getExpectedDuration() > 0
                                ? destination.getExpectedDuration()
                                : 120;

                LocalTime endTime =
                        startTime.plusMinutes(duration);

                if (destination.getClosingTime() != null
                        && endTime.isAfter(destination.getClosingTime())) {

                    LocalTime adjustedStart =
                            destination.getOpeningTime() != null
                                    ? destination.getOpeningTime()
                                    : startTime;

                    LocalTime adjustedEnd =
                            adjustedStart.plusMinutes(duration);

                    if (!adjustedEnd.isAfter(destination.getClosingTime())) {
                        startTime = adjustedStart;
                        endTime = adjustedEnd;
                    }
                }

                ItineraryActivity activity =
                        new ItineraryActivity();

                activity.setTrip(trip);
                activity.setDestination(destination);
                activity.setActivityDate(currentDate);
                activity.setStartTime(startTime);
                activity.setEndTime(endTime);
                activity.setActivityName(
                        destination.getDestinationName()
                );
                activity.setDescription(
                        "Visit " + destination.getDestinationName()
                );
                activity.setCategory(
                        destination.getCategory()
                );
                activity.setDuration(duration);
                activity.setOrderIndex(orderIndex++);
                activity.setLocked(false);

                generatedActivities.add(activity);

                currentTime = endTime.plusMinutes(30);

                destinationIndex++;
                activitiesForDay++;
            }

            nextAvailableTime.put(currentDate, currentTime);
            currentDate = currentDate.plusDays(1);
        }

        List<ItineraryActivity> savedActivities =
                itineraryActivityRepository.saveAll(generatedActivities);

        saveHistory(
                trip,
                "GENERATE",
                null,
                "Itinerary automatically generated with "
                        + savedActivities.size()
                        + " activities."
        );

        return savedActivities.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ItineraryActivityResponse> getItinerary(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        return itineraryActivityRepository
                .findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(tripId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ItineraryActivityResponse addActivity(
            Integer userId,
            Integer tripId,
            ItineraryActivityRequest request) {

        Trip trip = getUserTrip(tripId, userId);

        validateRequest(request);

        validateActivityDate(trip, request.getActivityDate());

        TripDestination destination = null;

        if (request.getDestinationId() != null) {
            destination =
                    tripDestinationRepository
                            .findByDestinationIdAndTrip_TripId(
                                    request.getDestinationId(),
                                    tripId
                            )
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Destination not found for this trip."
                                    )
                            );
        }

        int nextOrder =
                itineraryActivityRepository
                        .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
                                tripId,
                                request.getActivityDate()
                        )
                        .size() + 1;

        ItineraryActivity activity =
                new ItineraryActivity();

        activity.setTrip(trip);
        activity.setDestination(destination);
        activity.setActivityDate(request.getActivityDate());
        activity.setStartTime(request.getStartTime());
        activity.setEndTime(request.getEndTime());
        activity.setActivityName(request.getActivityName());
        activity.setDescription(request.getDescription());
        activity.setCategory(request.getCategory());
        activity.setDuration(request.getDuration());
        activity.setOrderIndex(nextOrder);
        activity.setLocked(
                request.getLocked() != null
                        ? request.getLocked()
                        : false
        );

        ItineraryActivity saved =
                itineraryActivityRepository.save(activity);

        saveHistory(
                trip,
                "ADD",
                saved.getActivityId(),
                "Activity added: " + saved.getActivityName()
        );

        return toResponse(saved);
    }

    @Transactional
    public ItineraryActivityResponse updateActivity(
            Integer userId,
            Integer tripId,
            Integer activityId,
            ItineraryActivityRequest request) {

        Trip trip = getUserTrip(tripId, userId);

        validateRequest(request);

        ItineraryActivity activity =
                getActivity(tripId, activityId);

        validateActivityDate(trip, request.getActivityDate());

        if (Boolean.TRUE.equals(activity.getLocked())) {
            throw new RuntimeException(
                    "This activity is locked. Unlock it before editing."
            );
        }

        TripDestination destination = null;

        if (request.getDestinationId() != null) {
            destination =
                    tripDestinationRepository
                            .findByDestinationIdAndTrip_TripId(
                                    request.getDestinationId(),
                                    tripId
                            )
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Destination not found for this trip."
                                    )
                            );
        }

        boolean dateChanged =
                !request.getActivityDate()
                        .equals(activity.getActivityDate());

        if (dateChanged) {
            List<ItineraryActivity> oldDateActivities =
                    itineraryActivityRepository
                            .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
                                    tripId,
                                    activity.getActivityDate()
                            );

            int oldOrder = activity.getOrderIndex();

            for (ItineraryActivity item : oldDateActivities) {
                if (!item.getActivityId().equals(activityId)
                        && item.getOrderIndex() > oldOrder) {
                    item.setOrderIndex(item.getOrderIndex() - 1);
                }
            }

            itineraryActivityRepository.saveAll(oldDateActivities);

            int newOrder =
                    itineraryActivityRepository
                            .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
                                    tripId,
                                    request.getActivityDate()
                            )
                            .size() + 1;

            activity.setOrderIndex(newOrder);
        }

        activity.setDestination(destination);
        activity.setActivityDate(request.getActivityDate());
        activity.setStartTime(request.getStartTime());
        activity.setEndTime(request.getEndTime());
        activity.setActivityName(request.getActivityName());
        activity.setDescription(request.getDescription());
        activity.setCategory(request.getCategory());
        activity.setDuration(request.getDuration());

        if (request.getLocked() != null) {
            activity.setLocked(request.getLocked());
        }

        ItineraryActivity saved =
                itineraryActivityRepository.save(activity);

        saveHistory(
                trip,
                "UPDATE",
                saved.getActivityId(),
                "Activity updated: " + saved.getActivityName()
        );

        return toResponse(saved);
    }

    @Transactional
    public void deleteActivity(
            Integer userId,
            Integer tripId,
            Integer activityId) {

        Trip trip = getUserTrip(tripId, userId);

        ItineraryActivity activity =
                getActivity(tripId, activityId);

        if (Boolean.TRUE.equals(activity.getLocked())) {
            throw new RuntimeException(
                    "This activity is locked. Unlock it before deleting."
            );
        }

        LocalDate date = activity.getActivityDate();
        int deletedOrder = activity.getOrderIndex();

        itineraryActivityRepository.delete(activity);

        List<ItineraryActivity> remaining =
                itineraryActivityRepository
                        .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
                                tripId,
                                date
                        );

        for (ItineraryActivity item : remaining) {
            if (item.getOrderIndex() > deletedOrder) {
                item.setOrderIndex(item.getOrderIndex() - 1);
            }
        }

        itineraryActivityRepository.saveAll(remaining);

        saveHistory(
                trip,
                "DELETE",
                activityId,
                "Activity deleted: " + activity.getActivityName()
        );
    }

    @Transactional
    public List<ItineraryActivityResponse> reorderActivities(
            Integer userId,
            Integer tripId,
            ReorderActivityRequest request) {

        Trip trip = getUserTrip(tripId, userId);

        if (request == null
                || request.getActivityDate() == null
                || request.getActivityIds() == null
                || request.getActivityIds().isEmpty()) {

            throw new RuntimeException(
                    "Activity date and activity IDs are required."
            );
        }

        validateActivityDate(trip, request.getActivityDate());

        List<Integer> requestedIds =
                request.getActivityIds();

        Set<Integer> uniqueIds =
                new HashSet<>(requestedIds);

        if (uniqueIds.size() != requestedIds.size()) {
            throw new RuntimeException(
                    "Duplicate activity IDs are not allowed."
            );
        }

        List<ItineraryActivity> allActivities =
                itineraryActivityRepository
                        .findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(
                                tripId
                        );

        Map<Integer, ItineraryActivity> activityMap =
                new HashMap<>();

        for (ItineraryActivity activity : allActivities) {
            activityMap.put(
                    activity.getActivityId(),
                    activity
            );
        }

        for (Integer activityId : requestedIds) {

            ItineraryActivity activity =
                    activityMap.get(activityId);

            if (activity == null) {
                throw new RuntimeException(
                        "Activity " + activityId
                                + " does not belong to this trip."
                );
            }

            if (Boolean.TRUE.equals(activity.getLocked())) {
                throw new RuntimeException(
                        "Activity "
                                + activityId
                                + " is locked and cannot be rearranged."
                );
            }
        }

        List<ItineraryActivity> oldDateActivities =
                itineraryActivityRepository
                        .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
                                tripId,
                                request.getActivityDate()
                        );

        Set<Integer> requestedSet =
                new HashSet<>(requestedIds);

        for (ItineraryActivity activity : oldDateActivities) {

            if (!requestedSet.contains(activity.getActivityId())
                    && Boolean.TRUE.equals(activity.getLocked())) {

                int lockedOrder = activity.getOrderIndex();

                if (lockedOrder > requestedIds.size()) {
                    continue;
                }
            }
        }

        int order = 1;

        for (Integer activityId : requestedIds) {
            ItineraryActivity activity =
                    activityMap.get(activityId);

            activity.setActivityDate(
                    request.getActivityDate()
            );

            activity.setOrderIndex(order++);
        }

        for (ItineraryActivity activity : allActivities) {

            if (!requestedSet.contains(activity.getActivityId())
                    && activity.getActivityDate()
                    .equals(request.getActivityDate())) {

                activity.setOrderIndex(order++);
            }
        }

        itineraryActivityRepository.saveAll(allActivities);

        saveHistory(
                trip,
                "REORDER",
                null,
                "Activities rearranged for "
                        + request.getActivityDate()
        );

        return getItinerary(userId, tripId);
    }

    @Transactional
    public ItineraryActivityResponse lockActivity(
            Integer userId,
            Integer tripId,
            Integer activityId,
            LockActivityRequest request) {

        Trip trip = getUserTrip(tripId, userId);

        if (request == null || request.getLocked() == null) {
            throw new RuntimeException(
                    "The locked value is required."
            );
        }

        ItineraryActivity activity =
                getActivity(tripId, activityId);

        activity.setLocked(request.getLocked());

        ItineraryActivity saved =
                itineraryActivityRepository.save(activity);

        saveHistory(
                trip,
                request.getLocked() ? "LOCK" : "UNLOCK",
                activityId,
                request.getLocked()
                        ? "Activity locked: " + activity.getActivityName()
                        : "Activity unlocked: " + activity.getActivityName()
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ItineraryHistory> getHistory(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        return itineraryHistoryRepository
                .findByTrip_TripIdOrderByCreatedAtDesc(tripId);
    }

    private Trip getUserTrip(
            Integer tripId,
            Integer userId) {

        return tripRepository
                .findByTripIdAndUser_UserId(tripId, userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Trip not found or you do not have access to this trip."
                        )
                );
    }

    private ItineraryActivity getActivity(
            Integer tripId,
            Integer activityId) {

        return itineraryActivityRepository
                .findByActivityIdAndTrip_TripId(
                        activityId,
                        tripId
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Itinerary activity not found."
                        )
                );
    }

    private void validateRequest(
            ItineraryActivityRequest request) {

        if (request == null) {
            throw new RuntimeException(
                    "Activity request is required."
            );
        }

        if (request.getActivityDate() == null) {
            throw new RuntimeException(
                    "Activity date is required."
            );
        }

        if (request.getActivityName() == null
                || request.getActivityName().trim().isEmpty()) {

            throw new RuntimeException(
                    "Activity name is required."
            );
        }

        if (request.getDuration() != null
                && request.getDuration() <= 0) {

            throw new RuntimeException(
                    "Duration must be greater than zero."
            );
        }

        if (request.getStartTime() != null
                && request.getEndTime() != null
                && !request.getEndTime()
                        .isAfter(request.getStartTime())) {

            throw new RuntimeException(
                    "End time must be after start time."
            );
        }
    }

    private void validateActivityDate(
            Trip trip,
            LocalDate activityDate) {

        if (activityDate.isBefore(trip.getStartDate())
                || activityDate.isAfter(trip.getEndDate())) {

            throw new RuntimeException(
                    "Activity date must be within the trip dates."
            );
        }
    }

    private LocalTime calculateStartTime(
            TripDestination destination,
            LocalTime currentTime) {

        LocalTime startTime = currentTime;

        if (destination.getOpeningTime() != null
                && startTime.isBefore(
                        destination.getOpeningTime())) {

            startTime = destination.getOpeningTime();
        }

        if (destination.getClosingTime() != null
                && !startTime.isBefore(
                        destination.getClosingTime())) {

            startTime = destination.getOpeningTime() != null
                    ? destination.getOpeningTime()
                    : LocalTime.of(9, 0);
        }

        return startTime;
    }

    private void saveHistory(
            Trip trip,
            String action,
            Integer activityId,
            String details) {

        ItineraryHistory history =
                new ItineraryHistory();

        history.setTrip(trip);
        history.setAction(action);
        history.setActivityId(activityId);
        history.setDetails(details);
        history.setCreatedAt(LocalDateTime.now());

        itineraryHistoryRepository.save(history);
    }

    private ItineraryActivityResponse toResponse(
            ItineraryActivity activity) {

        ItineraryActivityResponse response =
                new ItineraryActivityResponse();

        response.setActivityId(
                activity.getActivityId()
        );

        if (activity.getDestination() != null) {
            response.setDestinationId(
                    activity.getDestination()
                            .getDestinationId()
            );

            response.setDestinationName(
                    activity.getDestination()
                            .getDestinationName()
            );
        }

        response.setActivityDate(
                activity.getActivityDate()
        );

        response.setStartTime(
                activity.getStartTime()
        );

        response.setEndTime(
                activity.getEndTime()
        );

        response.setActivityName(
                activity.getActivityName()
        );

        response.setDescription(
                activity.getDescription()
        );

        response.setCategory(
                activity.getCategory()
        );

        response.setDuration(
                activity.getDuration()
        );

        response.setOrderIndex(
                activity.getOrderIndex()
        );

        response.setLocked(
                activity.getLocked()
        );

        return response;
    }
}