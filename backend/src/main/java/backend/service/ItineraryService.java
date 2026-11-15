package backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
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

    private static final LocalTime DAY_START = LocalTime.of(9, 0);
    private static final LocalTime DAY_END = LocalTime.of(17, 0);
    private static final int MAX_CANDIDATES_PER_DAY = 3;

    private static final DateTimeFormatter ML_TIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm:ss");

    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final ItineraryActivityRepository itineraryActivityRepository;
    private final ItineraryHistoryRepository itineraryHistoryRepository;

    private final MlServiceClient mlServiceClient;
    private final MlActivityCategoryMapper categoryMapper;
    private final WeatherService weatherService;
    private final RouteService routeService;

    public ItineraryService(
            TripRepository tripRepository,
            TripDestinationRepository tripDestinationRepository,
            ItineraryActivityRepository itineraryActivityRepository,
            ItineraryHistoryRepository itineraryHistoryRepository,
            MlServiceClient mlServiceClient,
            MlActivityCategoryMapper categoryMapper,
            WeatherService weatherService,
            RouteService routeService) {

        this.tripRepository = tripRepository;
        this.tripDestinationRepository = tripDestinationRepository;
        this.itineraryActivityRepository = itineraryActivityRepository;
        this.itineraryHistoryRepository = itineraryHistoryRepository;
        this.mlServiceClient = mlServiceClient;
        this.categoryMapper = categoryMapper;
        this.weatherService = weatherService;
        this.routeService = routeService;
    }

    // =========================================================
    // ML-BASED ITINERARY GENERATION
    // =========================================================

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
                    "No destinations found for this trip. "
                            + "Add destinations before generating the itinerary."
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

        if (trip.getBudget() == null) {
            throw new RuntimeException(
                    "A trip budget is required for ML itinerary generation."
            );
        }

        if (trip.getBudget().signum() < 0) {
            throw new RuntimeException(
                    "Trip budget cannot be negative."
            );
        }

        if (itineraryActivityRepository
                .existsByTrip_TripIdAndLockedTrue(tripId)) {

            throw new RuntimeException(
                    "The itinerary contains locked activities. "
                            + "Unlock them before regenerating the itinerary."
            );
        }

        long totalDays =
                trip.getEndDate().toEpochDay()
                        - trip.getStartDate().toEpochDay() + 1;

        if (destinations.size() > totalDays * MAX_CANDIDATES_PER_DAY) {
            throw new RuntimeException(
                    "There are too many destinations for the trip duration. "
                            + "The current ML integration processes up to "
                            + MAX_CANDIDATES_PER_DAY
                            + " destinations per day."
            );
        }

        double dailyBudget =
                trip.getBudget().doubleValue() / totalDays;

        // Check that the Python ML service is reachable.
        mlServiceClient.checkHealth();

        List<ItineraryActivity> generatedActivities =
                new ArrayList<>();

        LocalDate currentDate = trip.getStartDate();

        int destinationIndex = 0;
        int orderIndex = 1;

        while (!currentDate.isAfter(trip.getEndDate())
                && destinationIndex < destinations.size()) {

            int endIndex = Math.min(
                    destinationIndex + MAX_CANDIDATES_PER_DAY,
                    destinations.size()
            );

            List<TripDestination> dailyDestinations =
                    new ArrayList<>(
                            destinations.subList(
                                    destinationIndex,
                                    endIndex
                            )
                    );

            Map<String, Object> mlResponse =
                    generateDailyItinerary(
                            dailyDestinations,
                            currentDate,
                            dailyBudget
                    );

            Map<String, Object> itinerary =
                    getMap(
                            mlResponse.get("itinerary"),
                            "ML response does not contain itinerary data."
                    );

            Object scheduleObject = itinerary.get("schedule");

            if (!(scheduleObject instanceof List<?> schedule)) {
                throw new RuntimeException(
                        "ML service returned an invalid itinerary schedule."
                );
            }

            if (schedule.isEmpty()) {
                throw new RuntimeException(
                        "ML optimizer could not generate a feasible schedule "
                                + "for " + currentDate
                                + ". Check the budget, destination hours "
                                + "and activity durations."
                );
            }

            Map<String, TripDestination> destinationMap =
                    new HashMap<>();

            for (TripDestination destination : dailyDestinations) {
                destinationMap.put(
                        String.valueOf(destination.getDestinationId()),
                        destination
                );
            }

            Set<String> scheduledIds = new HashSet<>();

            for (Object scheduleItem : schedule) {

                Map<String, Object> item =
                        getMap(
                                scheduleItem,
                                "Invalid schedule item returned by ML service."
                        );

                String candidateId =
                        String.valueOf(item.get("candidate_id"));

                TripDestination destination =
                        destinationMap.get(candidateId);

                if (destination == null) {
                    throw new RuntimeException(
                            "ML service returned an unknown destination ID: "
                                    + candidateId
                    );
                }

                if (!scheduledIds.add(candidateId)) {
                    throw new RuntimeException(
                            "ML service returned a duplicate destination: "
                                    + candidateId
                    );
                }

                LocalTime startTime =
                        parseMlTime(item.get("start_time"));

                LocalTime endTime =
                        parseMlTime(item.get("end_time"));

                int duration =
                        getInteger(
                                item.get("duration_minutes"),
                                destination.getExpectedDuration() != null
                                        ? destination.getExpectedDuration()
                                        : 120
                        );

                if (!endTime.isAfter(startTime)) {
                    throw new RuntimeException(
                            "ML service returned an invalid activity time."
                    );
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
                                + ". Scheduled using weather suitability, "
                                + "budget and travel-time optimization."
                );

                activity.setCategory(destination.getCategory());
                activity.setDuration(duration);
                activity.setOrderIndex(orderIndex++);
                activity.setLocked(false);

                generatedActivities.add(activity);
            }

            destinationIndex = endIndex;
            currentDate = currentDate.plusDays(1);
        }

        /*
         * Save only after all daily ML requests have succeeded.
         * The transaction protects the existing itinerary if
         * generation fails before the save operation.
         */
        itineraryActivityRepository.deleteByTrip_TripId(tripId);

        List<ItineraryActivity> savedActivities =
                itineraryActivityRepository.saveAll(
                        generatedActivities
                );

        saveHistory(
                trip,
                "GENERATE",
                null,
                "ML-based itinerary generated with "
                        + savedActivities.size()
                        + " activities across "
                        + totalDays
                        + " trip days."
        );

        return savedActivities.stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // BUILD REQUEST AND CALL PYTHON ML SERVICE
    // =========================================================

    private Map<String, Object> generateDailyItinerary(
            List<TripDestination> destinations,
            LocalDate date,
            double dailyBudget) {

        if (destinations == null || destinations.isEmpty()) {
            throw new RuntimeException(
                    "No destinations available for " + date
            );
        }

        // Fetch the weather values required by the ML model.
        Map<String, Object> weather = new LinkedHashMap<>();

        weather.putAll(
                weatherService.getMlWeatherForDate(
                        destinations.get(0).getLatitude(),
                        destinations.get(0).getLongitude(),
                        date
                )
        );

        // Build the activity candidates.
        List<Map<String, Object>> activities =
                new ArrayList<>();

        Set<String> activityTypes = new HashSet<>();

        for (TripDestination destination : destinations) {

            if (destination.getDestinationId() == null) {
                throw new RuntimeException(
                        "A destination is missing its database ID."
                );
            }

            String activityType =
                    categoryMapper.mapCategory(
                            destination.getCategory()
                    );

            if (!activityTypes.add(activityType)) {
                throw new RuntimeException(
                        "More than one destination has the ML activity "
                                + "category '" + activityType
                                + "' on " + date
                                + ". The current ML model accepts only "
                                + "one candidate per activity category "
                                + "per daily request."
                );
            }

            int duration =
                    destination.getExpectedDuration() != null
                            && destination.getExpectedDuration() > 0
                            ? destination.getExpectedDuration()
                            : 120;

            if (duration > 1440) {
                throw new RuntimeException(
                        "Activity duration cannot exceed 1440 minutes: "
                                + destination.getDestinationName()
                );
            }

            double estimatedCost =
                    destination.getTicketPrice() != null
                            ? destination.getTicketPrice().doubleValue()
                            : 0.0;

            if (estimatedCost < 0) {
                throw new RuntimeException(
                        "Destination ticket price cannot be negative."
                );
            }

            double budgetMatch;

            if (dailyBudget > 0) {
                budgetMatch = Math.max(
                        0.0,
                        Math.min(
                                1.0,
                                1.0 - (estimatedCost / dailyBudget)
                        )
                );
            } else {
                budgetMatch = estimatedCost == 0 ? 1.0 : 0.0;
            }

            /*
             * Missing opening/closing times use the planner's
             * 09:00-17:00 scheduling window.
             */
            LocalTime openingTime =
                    destination.getOpeningTime() != null
                            ? destination.getOpeningTime()
                            : DAY_START;

            LocalTime closingTime =
                    destination.getClosingTime() != null
                            ? destination.getClosingTime()
                            : DAY_END;

            if (!closingTime.isAfter(openingTime)) {
                throw new RuntimeException(
                        "Invalid opening and closing times for "
                                + destination.getDestinationName()
                );
            }

            Map<String, Object> candidate =
                    new LinkedHashMap<>();

            candidate.put(
                    "candidate_id",
                    String.valueOf(destination.getDestinationId())
            );

            candidate.put("activity_type", activityType);

            // Neutral preference until an explicit preference field exists.
            candidate.put("user_preference", 0.5);

            candidate.put("budget_match", budgetMatch);
            candidate.put("duration_minutes", duration);
            candidate.put("estimated_cost", estimatedCost);

            candidate.put(
                    "opening_time",
                    openingTime.format(ML_TIME_FORMAT)
            );

            candidate.put(
                    "closing_time",
                    closingTime.format(ML_TIME_FORMAT)
            );

            activities.add(candidate);
        }

        // Get actual pairwise driving times from OSRM.
        Map<String, Map<String, Double>> travelTimeMatrix =
                routeService.calculateTravelTimeMatrix(destinations);

        // Construct the exact request expected by FastAPI.
        Map<String, Object> payload =
                new LinkedHashMap<>();

        payload.put("weather", weather);
        payload.put("activities", activities);

        payload.put(
                "start_time",
                DAY_START.format(ML_TIME_FORMAT)
        );

        payload.put(
                "end_time",
                DAY_END.format(ML_TIME_FORMAT)
        );

        payload.put("budget", dailyBudget);
        payload.put("travel_time_matrix", travelTimeMatrix);

        return mlServiceClient.generateItinerary(payload);
    }

    // =========================================================
    // GET ITINERARY
    // =========================================================

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

    // =========================================================
    // ADD ACTIVITY
    // =========================================================

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

    // =========================================================
    // UPDATE ACTIVITY
    // =========================================================

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

    // =========================================================
    // DELETE ACTIVITY
    // =========================================================

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

    // =========================================================
    // REORDER ACTIVITIES
    // =========================================================

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

        List<Integer> requestedIds = request.getActivityIds();

        Set<Integer> uniqueIds = new HashSet<>(requestedIds);

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
                        "Activity " + activityId
                                + " is locked and cannot be rearranged."
                );
            }

            if (!request.getActivityDate()
                    .equals(activity.getActivityDate())) {

                throw new RuntimeException(
                        "All reordered activities must belong to the selected date."
                );
            }
        }

        List<ItineraryActivity> oldDateActivities =
                itineraryActivityRepository
                        .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
                                tripId,
                                request.getActivityDate()
                        );

        Set<Integer> requestedSet = new HashSet<>(requestedIds);

        for (ItineraryActivity activity : oldDateActivities) {
            if (!requestedSet.contains(activity.getActivityId())
                    && Boolean.TRUE.equals(activity.getLocked())) {

                throw new RuntimeException(
                        "The selected date contains a locked activity. "
                                + "Unlock it before reordering."
                );
            }
        }

        int order = 1;

        for (Integer activityId : requestedIds) {

            ItineraryActivity activity =
                    activityMap.get(activityId);

            activity.setOrderIndex(order++);
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

    // =========================================================
    // LOCK / UNLOCK ACTIVITY
    // =========================================================

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

    // =========================================================
    // GET HISTORY
    // =========================================================

    @Transactional(readOnly = true)
    public List<ItineraryHistory> getHistory(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        return itineraryHistoryRepository
                .findByTrip_TripIdOrderByCreatedAtDesc(tripId);
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private Trip getUserTrip(
            Integer tripId,
            Integer userId) {

        return tripRepository
                .findByTripIdAndUser_UserId(
                        tripId,
                        userId
                )
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

        if (activityDate == null) {
            throw new RuntimeException(
                    "Activity date is required."
            );
        }

        if (trip.getStartDate() == null || trip.getEndDate() == null) {
            throw new RuntimeException(
                    "Trip dates are required."
            );
        }

        if (activityDate.isBefore(trip.getStartDate())
                || activityDate.isAfter(trip.getEndDate())) {

            throw new RuntimeException(
                    "Activity date must be within the trip dates."
            );
        }
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

    // =========================================================
    // ML RESPONSE HELPERS
    // =========================================================

    private Map<String, Object> getMap(
            Object value,
            String errorMessage) {

        if (!(value instanceof Map<?, ?> source)) {
            throw new RuntimeException(errorMessage);
        }

        Map<String, Object> result = new LinkedHashMap<>();

        for (Map.Entry<?, ?> entry : source.entrySet()) {
            result.put(
                    String.valueOf(entry.getKey()),
                    entry.getValue()
            );
        }

        return result;
    }

    private LocalTime parseMlTime(Object value) {

        if (value == null) {
            throw new RuntimeException(
                    "ML service returned a missing activity time."
            );
        }

        try {
            return LocalTime.parse(
                    value.toString(),
                    ML_TIME_FORMAT
            );
        } catch (Exception exception) {
            throw new RuntimeException(
                    "Invalid time returned by ML service: " + value,
                    exception
            );
        }
    }

    private int getInteger(
            Object value,
            int defaultValue) {

        if (value instanceof Number number) {
            return number.intValue();
        }

        if (value == null) {
            return defaultValue;
        }

        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException exception) {
            throw new RuntimeException(
                    "Invalid duration returned by ML service: " + value,
                    exception
            );
        }
    }
}
