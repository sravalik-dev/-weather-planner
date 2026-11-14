package backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import backend.dto.ItineraryActivityRequest;
import backend.dto.ItineraryActivityResponse;
import backend.dto.LockActivityRequest;
import backend.dto.ReorderActivityRequest;
import backend.entity.Accommodation;
import backend.entity.AccommodationHistory;
import backend.entity.ItineraryActivity;
import backend.entity.ItineraryHistory;
import backend.entity.Trip;
import backend.entity.TripDestination;
import backend.repository.AccommodationHistoryRepository;
import backend.repository.ItineraryActivityRepository;
import backend.repository.ItineraryHistoryRepository;
import backend.repository.TripDestinationRepository;
import backend.repository.TripRepository;

@Service
public class ItineraryService {

    private final TripRepository tripRepository;
    private final AccommodationHistoryRepository accommodationHistoryRepository;
    private final LocationService locationService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();
    private final TripDestinationRepository tripDestinationRepository;
    private final ItineraryActivityRepository itineraryActivityRepository;
    private final ItineraryHistoryRepository itineraryHistoryRepository;

    public ItineraryService(
            TripRepository tripRepository,
            TripDestinationRepository tripDestinationRepository,
            ItineraryActivityRepository itineraryActivityRepository,
            ItineraryHistoryRepository itineraryHistoryRepository,
            LocationService locationService,
            ObjectMapper objectMapper,
            AccommodationHistoryRepository accommodationHistoryRepository) {

        this.tripRepository = tripRepository;
        this.accommodationHistoryRepository = accommodationHistoryRepository;
        this.locationService = locationService;
        this.objectMapper = objectMapper;
        this.tripDestinationRepository = tripDestinationRepository;
        this.itineraryActivityRepository = itineraryActivityRepository;
        this.itineraryHistoryRepository = itineraryHistoryRepository;
    }

    @Transactional
    public List<ItineraryActivityResponse> generateItinerary(
            Integer userId,
            Integer tripId) {

        Trip trip = getUserTrip(tripId, userId);
        List<TripDestination> destinations = tripDestinationRepository
                .findByTrip_TripIdOrderByDestinationOrderAsc(tripId);

        if (destinations.isEmpty()) {
            throw new RuntimeException("Add at least one destination before generating the itinerary.");
        }
        if (trip.getStartDate() == null || trip.getEndDate() == null
                || trip.getEndDate().isBefore(trip.getStartDate())) {
            throw new RuntimeException("A valid trip start date and end date are required.");
        }
        if (trip.getOrigin() == null || trip.getOrigin().isBlank()) {
            throw new RuntimeException("Set the trip starting point before generating a round-trip itinerary.");
        }

        // Keep locked activities. The planner schedules around their time slots.
        List<ItineraryActivity> existing = itineraryActivityRepository
                .findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(tripId);
        List<ItineraryActivity> locked = existing.stream()
                .filter(a -> Boolean.TRUE.equals(a.getLocked())).toList();
        List<ItineraryActivity> unlocked = existing.stream()
                .filter(a -> !Boolean.TRUE.equals(a.getLocked())).toList();
        itineraryActivityRepository.deleteAll(unlocked);

        Coordinates origin = resolveOrigin(trip.getOrigin());
        Coordinates current = origin;
        LocalDate date = trip.getStartDate();
        long totalDays = ChronoUnit.DAYS.between(trip.getStartDate(), trip.getEndDate()) + 1;
        List<ItineraryActivity> generated = new ArrayList<>();
        int destinationIndex = 0;

        for (int day = 1; day <= totalDays; day++) {
            boolean finalDay = day == totalDays;
            LocalTime cursor = LocalTime.of(7, 0);
            boolean lunchAdded = false;
            boolean teaAdded = false;

            cursor = addGenerated(generated, locked, trip, null, date, cursor,
                    30, "Breakfast", "MEAL", "Breakfast break at " + current.label());

            while (destinationIndex < destinations.size()) {
                TripDestination next = destinations.get(destinationIndex);
                if (next.getLatitude() == null || next.getLongitude() == null) {
                    throw new RuntimeException("Destination '" + next.getDestinationName()
                            + "' is missing coordinates. Update its latitude and longitude before generating the itinerary.");
                }
                Coordinates target = new Coordinates(
                        next.getLatitude(), next.getLongitude(), next.getDestinationName());
                int travelMinutes = estimateTravelMinutes(current, target);
                int visitMinutes = next.getExpectedDuration() != null && next.getExpectedDuration() > 0
                        ? next.getExpectedDuration() : 90;

                // Never start a long leg across the lunch window without a meal stop.
                if (!lunchAdded && cursor.isBefore(LocalTime.of(14, 0))
                        && (cursor.isAfter(LocalTime.of(12, 0))
                        || cursor.plusMinutes(travelMinutes + visitMinutes).isAfter(LocalTime.of(12, 30)))) {
                    LocalTime mealTime = cursor.isBefore(LocalTime.of(12, 30))
                            ? LocalTime.of(12, 30) : cursor;
                    cursor = addGenerated(generated, locked, trip, null, date, mealTime,
                            45, "Lunch", "MEAL", "Lunch break near " + current.label());
                    lunchAdded = true;
                }

                if (!teaAdded && cursor.isBefore(LocalTime.of(17, 0))
                        && (cursor.isAfter(LocalTime.of(16, 0))
                        || cursor.plusMinutes(travelMinutes + visitMinutes).isAfter(LocalTime.of(16, 30)))) {
                    LocalTime teaTime = cursor.isBefore(LocalTime.of(16, 30))
                            ? LocalTime.of(16, 30) : cursor;
                    cursor = addGenerated(generated, locked, trip, null, date, teaTime,
                            20, "Tea / Rest Break", "BREAK", "Short rest stop near " + current.label());
                    teaAdded = true;
                }

                LocalTime travelStart = nextFreeTime(date, cursor, travelMinutes, locked);

                // The database stores activityDate plus LocalTime start/end values.
                // Do not create an activity whose end time wraps into the next date.
                // If this is not the final trip day, leave this destination pending;
                // the next day's scheduler will try it again from the morning.
                if (!fitsWithinSameDay(travelStart, travelMinutes)) {
                    break;
                }

                LocalTime arrival = travelStart.plusMinutes(travelMinutes);
                LocalTime visitStart = calculateStartTime(next, arrival);
                LocalTime visitEnd = visitStart.plusMinutes(visitMinutes);

                // Keep the final day open for the return trip to the original origin.
                int returnMinutes = finalDay ? estimateTravelMinutes(target, origin) : 0;
                boolean visitFitsWithinSameDay = fitsWithinSameDay(visitStart, visitMinutes);
                boolean returnFitsToday = !finalDay
                        || fitsWithinSameDay(visitEnd, returnMinutes);
                // A full 24-hour scheduling window is available. The only hard
                // boundary is midnight because this entity stores LocalTime values
                // against one activity date and cannot represent an overnight span.
                boolean fitsToday = visitFitsWithinSameDay && returnFitsToday;
                if (next.getClosingTime() != null && visitEnd.isAfter(next.getClosingTime())) {
                    fitsToday = false;
                }
                if (!fitsToday) {
                    break;
                }

                cursor = addGenerated(generated, locked, trip, null, date, travelStart,
                        travelMinutes, "Travel to " + next.getDestinationName(), "TRAVEL",
                        "Estimated road travel from " + current.label() + " to " + target.label()
                                + " (OSRM estimate with a planning buffer)");

                if (visitStart.isAfter(cursor)) {
                    int wait = (int) ChronoUnit.MINUTES.between(cursor, visitStart);
                    cursor = addGenerated(generated, locked, trip, next, date, cursor,
                            wait, "Wait until " + next.getDestinationName() + " opens", "BREAK",
                            "Waiting time based on the destination opening time");
                }

                cursor = addGenerated(generated, locked, trip, next, date, cursor,
                        visitMinutes, "Visit " + next.getDestinationName(),
                        next.getCategory() == null ? "SIGHTSEEING" : next.getCategory(),
                        "Explore " + next.getDestinationName());

                current = target;
                destinationIndex++;
                LocalTime afterVisitBuffer = cursor.plusMinutes(15);
                if (!afterVisitBuffer.isAfter(cursor)) {
                    cursor = LocalTime.MAX;
                } else {
                    cursor = afterVisitBuffer;
                }

                if (!lunchAdded && !cursor.isBefore(LocalTime.of(12, 0))
                        && cursor.isBefore(LocalTime.of(14, 30))) {
                    cursor = addGenerated(generated, locked, trip, null, date, cursor,
                            45, "Lunch", "MEAL", "Lunch break near " + current.label());
                    lunchAdded = true;
                }
                if (!teaAdded && !cursor.isBefore(LocalTime.of(16, 0))
                        && cursor.isBefore(LocalTime.of(17, 30))) {
                    cursor = addGenerated(generated, locked, trip, null, date, cursor,
                            20, "Tea / Rest Break", "BREAK", "Short rest stop near " + current.label());
                    teaAdded = true;
                }

                if (finalDay && destinationIndex < destinations.size()) {
                    // Continue only when the next attraction and return leg can still fit.
                    continue;
                }
                // Continue scheduling until the end of the 24-hour day.
                // A destination that cannot fit is deferred to the next day.
            }

            // Add fallback breaks only when there is enough time left in the day.
            // Do not force lunch/tea after a long route or locked activity has pushed
            // the schedule too close to midnight.
            if (!lunchAdded) {
                LocalTime lunchTime = cursor.isBefore(LocalTime.of(12, 30))
                        ? LocalTime.of(12, 30) : cursor;
                if (fitsWithinSameDay(lunchTime, 45)) {
                    cursor = addGenerated(generated, locked, trip, null, date, lunchTime,
                            45, "Lunch", "MEAL", "Lunch break near " + current.label());
                    lunchAdded = true;
                }
            }
            if (!teaAdded) {
                LocalTime teaTime = cursor.isBefore(LocalTime.of(16, 30))
                        ? LocalTime.of(16, 30) : cursor;
                if (fitsWithinSameDay(teaTime, 20)) {
                    cursor = addGenerated(generated, locked, trip, null, date, teaTime,
                            20, "Tea / Rest Break", "BREAK", "Short rest stop near " + current.label());
                    teaAdded = true;
                }
            }

            if (!finalDay) {
                Coordinates selectedOvernight = resolveSelectedOvernight(trip);
                if (selectedOvernight != null && !sameLocation(current, selectedOvernight)) {
                    int hotelTravelMinutes = estimateTravelMinutes(current, selectedOvernight);
                    LocalTime hotelTravelStart = nextFreeTime(date, cursor, hotelTravelMinutes, locked);
                    if (fitsWithinSameDay(hotelTravelStart, hotelTravelMinutes)) {
                        cursor = addGenerated(generated, locked, trip, null, date, hotelTravelStart,
                                hotelTravelMinutes, "Travel to overnight accommodation: " + selectedOvernight.label(),
                                "TRAVEL", "Road ETA from " + current.label() + " to the accommodation selected for this trip");
                        current = selectedOvernight;
                    }
                }
            }

            if (finalDay) {
                if (destinationIndex < destinations.size()) {
                    throw new RuntimeException("The trip dates are too short to visit all saved destinations and return to "
                            + trip.getOrigin() + " by the end of the final day. Add another trip day or remove/reorder a destination.");
                }
                if (!sameLocation(current, origin)) {
                    int returnMinutes = estimateTravelMinutes(current, origin);
                    LocalTime returnStart = nextFreeTime(date, cursor, returnMinutes, locked);
                    if (!fitsWithinSameDay(returnStart, returnMinutes)) {
                        throw new RuntimeException("The final-day return journey cannot finish before midnight on "
                                + date + ". Add another trip day or move the return journey earlier.");
                    }
                    LocalTime returnEnd = addGenerated(generated, locked, trip, null, date, returnStart,
                            returnMinutes, "Return to starting point: " + trip.getOrigin(), "TRAVEL",
                            "Final return journey to the original trip starting point " + trip.getOrigin());
                    if (returnEnd.isBefore(LocalTime.of(19, 0))) {
                        addGenerated(generated, locked, trip, null, date, LocalTime.of(19, 0),
                                45, "Dinner", "MEAL", "Dinner after returning to the starting point");
                    }
                }
            } else {
                LocalTime dinnerTime = cursor.isAfter(LocalTime.of(19, 0))
                        ? cursor : LocalTime.of(19, 0);
                if (fitsWithinSameDay(dinnerTime, 45)) {
                    addGenerated(generated, locked, trip, null, date, dinnerTime,
                            45, "Dinner", "MEAL", "Dinner and overnight rest near " + current.label());
                }
            }
            date = date.plusDays(1);
        }

        List<ItineraryActivity> all = new ArrayList<>();
        all.addAll(locked);
        all.addAll(generated);
        all.sort((a, b) -> {
            int byDate = a.getActivityDate().compareTo(b.getActivityDate());
            if (byDate != 0) return byDate;
            return a.getStartTime().compareTo(b.getStartTime());
        });
        Map<LocalDate, Integer> orderByDate = new HashMap<>();
        for (ItineraryActivity activity : all) {
            int order = orderByDate.getOrDefault(activity.getActivityDate(), 0) + 1;
            activity.setOrderIndex(order);
            orderByDate.put(activity.getActivityDate(), order);
        }
        List<ItineraryActivity> saved = itineraryActivityRepository.saveAll(generated);
        itineraryActivityRepository.saveAll(locked);

        saveHistory(trip, "GENERATE", null,
                "Round-trip itinerary generated with " + saved.size()
                        + " new activities; locked activities were preserved.");
        return itineraryActivityRepository
                .findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(tripId)
                .stream().map(this::toResponse).toList();
    }

    private Coordinates resolveOrigin(String originName) {
        try {
            List<Map<String, Object>> matches = locationService.searchLocations(originName);
            if (matches == null || matches.isEmpty()) {
                throw new RuntimeException("No coordinates were found for starting point: " + originName);
            }
            Map<String, Object> first = matches.get(0);
            Object lat = first.get("latitude");
            Object lon = first.get("longitude");
            if (!(lat instanceof Number) || !(lon instanceof Number)) {
                throw new RuntimeException("Starting point coordinates are missing for: " + originName);
            }
            return new Coordinates(((Number) lat).doubleValue(),
                    ((Number) lon).doubleValue(), originName);
        } catch (RuntimeException ex) {
            throw new RuntimeException("Could not resolve the trip starting point '"
                    + originName + "'. Check the origin name and try again. " + ex.getMessage(), ex);
        }
    }

    private Coordinates resolveSelectedOvernight(Trip trip) {
        try {
            Integer userId = trip.getUser() == null ? null : trip.getUser().getUserId();
            if (userId == null) return null;
            List<AccommodationHistory> history = accommodationHistoryRepository
                    .findUserTripHistory(userId, trip.getTripId());
            for (AccommodationHistory entry : history) {
                if (entry == null || entry.getAction() == null) continue;
                String action = entry.getAction().trim().toUpperCase();
                if (!action.equals("SELECTED") && !action.equals("ADDED_TO_TRIP")) continue;
                Accommodation accommodation = entry.getAccommodation();
                if (accommodation == null || accommodation.getLatitude() == null
                        || accommodation.getLongitude() == null) continue;
                return new Coordinates(accommodation.getLatitude().doubleValue(),
                        accommodation.getLongitude().doubleValue(), accommodation.getName());
            }
        } catch (Exception ignored) {
            // If no trip-linked accommodation was selected, use the last reached destination.
        }
        return null;
    }

    private boolean sameLocation(Coordinates a, Coordinates b) {
        return Math.abs(a.latitude() - b.latitude()) < 0.0001
                && Math.abs(a.longitude() - b.longitude()) < 0.0001;
    }

    private int estimateTravelMinutes(Coordinates from, Coordinates to) {
        try {
            String coordinates = from.longitude() + "," + from.latitude() + ";"
                    + to.longitude() + "," + to.latitude();
            String url = "https://router.project-osrm.org/route/v1/driving/" + coordinates
                    + "?overview=false&steps=false";
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url))
                    .timeout(Duration.ofSeconds(25)).header("User-Agent", "WeatherPlannerCapstone/1.0")
                    .GET().build();
            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("OSRM returned HTTP " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode routes = root.path("routes");
            if (!"Ok".equals(root.path("code").asText()) || !routes.isArray() || routes.isEmpty()) {
                throw new RuntimeException("No drivable route was returned by OSRM.");
            }
            double seconds = routes.get(0).path("duration").asDouble(0);
            if (seconds <= 0) throw new RuntimeException("OSRM returned an invalid travel duration.");
            // Public OSRM is not live-traffic aware. Add a modest 15% + 5 minute buffer.
            return Math.max(5, (int) Math.ceil(seconds / 60.0 * 1.15) + 5);
        } catch (Exception ex) {
            throw new RuntimeException("Unable to calculate road ETA from " + from.label()
                    + " to " + to.label() + ". Check your internet connection and retry. "
                    + ex.getMessage(), ex);
        }
    }

    private LocalTime addGenerated(
            List<ItineraryActivity> output,
            List<ItineraryActivity> locked,
            Trip trip,
            TripDestination destination,
            LocalDate date,
            LocalTime requestedStart,
            int duration,
            String name,
            String category,
            String description) {

        if (requestedStart == null) {
            throw new RuntimeException("Start time is missing for activity: " + name);
        }
        if (duration <= 0) {
            throw new RuntimeException("Duration must be greater than zero for activity: " + name);
        }

        LocalTime start = nextFreeTime(date, requestedStart, duration, locked);
        LocalTime end = start.plusMinutes(duration);
        if (!end.isAfter(start)) {
            throw new RuntimeException("Activity '" + name + "' on " + date
                    + " cannot fit before midnight. Requested start: " + requestedStart
                    + ", available start after locked activities: " + start
                    + ", duration: " + duration + " minutes. Move or unlock a conflicting activity, "
                    + "or reduce the activity duration.");
        }

        ItineraryActivity activity = new ItineraryActivity();
        activity.setTrip(trip);
        activity.setDestination(destination);
        activity.setActivityDate(date);
        activity.setStartTime(start);
        activity.setEndTime(end);
        activity.setActivityName(name);
        activity.setDescription(description);
        activity.setCategory(category);
        activity.setDuration(duration);
        activity.setLocked(false);
        activity.setOrderIndex(output.size() + 1);
        output.add(activity);
        return end;
    }

    private LocalTime nextFreeTime(
            LocalDate date,
            LocalTime requested,
            int duration,
            List<ItineraryActivity> locked) {

        if (requested == null) {
            throw new RuntimeException("A requested start time is required for " + date + ".");
        }
        if (duration <= 0) {
            throw new RuntimeException("Activity duration must be greater than zero for " + date + ".");
        }

        LocalTime candidate = requested;
        int attempts = 0;
        int maxAttempts = locked.size() + 1;

        while (attempts++ < maxAttempts) {
            LocalTime proposedEnd = candidate.plusMinutes(duration);
            if (!proposedEnd.isAfter(candidate)) {
                // The requested block would cross midnight. Return the candidate
                // unchanged so the caller can defer it to the following trip day.
                return candidate;
            }

            ItineraryActivity conflict = null;
            for (ItineraryActivity item : locked) {
                if (item == null || !date.equals(item.getActivityDate())
                        || item.getStartTime() == null || item.getEndTime() == null) {
                    continue;
                }
                if (candidate.isBefore(item.getEndTime())
                        && proposedEnd.isAfter(item.getStartTime())) {
                    conflict = item;
                    break;
                }
            }

            if (conflict == null) {
                return candidate;
            }

            LocalTime conflictEnd = conflict.getEndTime();
            if (conflictEnd == null || !conflictEnd.isAfter(candidate)) {
                throw new RuntimeException("A locked activity has an invalid time range on " + date + ".");
            }
            candidate = conflictEnd;
        }

        throw new RuntimeException("Could not find a free time slot on " + date
                + " because locked activities overlap or occupy the remaining schedule.");
    }

    /**
     * Returns true when a positive-duration activity ends before midnight on
     * the same calendar date. LocalTime wraps to 00:xx after midnight, so the
     * comparison detects an overnight activity without requiring date arithmetic.
     */
    private boolean fitsWithinSameDay(LocalTime start, int durationMinutes) {
        if (start == null || durationMinutes <= 0) {
            return false;
        }
        LocalTime end = start.plusMinutes(durationMinutes);
        return end.isAfter(start);
    }

    private record Coordinates(double latitude, double longitude, String label) {
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

        List<ItineraryActivity> dayActivities =
                allActivities.stream()
                        .filter(activity -> request.getActivityDate().equals(activity.getActivityDate()))
                        .toList();

        Set<Integer> dayActivityIds =
                dayActivities.stream()
                        .map(ItineraryActivity::getActivityId)
                        .collect(java.util.stream.Collectors.toSet());

        for (Integer activityId : requestedIds) {
            ItineraryActivity activity =
                    activityMap.get(activityId);

            if (activity == null) {
                throw new RuntimeException(
                        "Activity " + activityId
                                + " does not belong to this trip."
                );
            }

            if (!request.getActivityDate().equals(activity.getActivityDate())) {
                throw new RuntimeException(
                        "Activity " + activityId
                                + " is not scheduled for the selected day."
                );
            }

            if (Boolean.TRUE.equals(activity.getLocked())) {
                throw new RuntimeException(
                        "Activity "
                                + activityId
                                + " is locked and cannot be rearranged."
                );
            }

            if (!dayActivityIds.contains(activityId)) {
                throw new RuntimeException(
                        "Activity " + activityId
                                + " is not scheduled for the selected day."
                );
            }
        }

        Set<Integer> requestedSet = new HashSet<>(requestedIds);
        List<ItineraryActivity> reorderedDayActivities = new ArrayList<>();

        for (Integer activityId : requestedIds) {
            reorderedDayActivities.add(activityMap.get(activityId));
        }

        for (ItineraryActivity activity : dayActivities) {
            if (!requestedSet.contains(activity.getActivityId())) {
                reorderedDayActivities.add(activity);
            }
        }

        int order = 1;
        for (ItineraryActivity activity : reorderedDayActivities) {
            activity.setOrderIndex(order++);
        }

        itineraryActivityRepository.saveAll(reorderedDayActivities);

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

        if (request.getDuration() == null
                || request.getDuration() <= 0) {

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

        if (request.getStartTime() != null
                && request.getEndTime() != null
                && request.getDuration() != null
                && ChronoUnit.MINUTES.between(
                        request.getStartTime(),
                        request.getEndTime()
                ) != request.getDuration()) {

            throw new RuntimeException(
                    "Duration must match the activity start and end times."
            );
        }
    }

    private void validateActivityDate(
            Trip trip,
            LocalDate activityDate) {

        if (trip == null || activityDate == null) {
            throw new RuntimeException(
                    "Trip and activity date are required."
            );
        }

        if (trip.getStartDate() == null || trip.getEndDate() == null) {
            throw new RuntimeException(
                    "Trip dates must be set before managing activities."
            );
        }

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

        if (destination == null || currentTime == null) {
            throw new RuntimeException("Destination and arrival time are required to calculate the visit start time.");
        }

        if (destination.getOpeningTime() != null
                && currentTime.isBefore(destination.getOpeningTime())) {
            return destination.getOpeningTime();
        }

        return currentTime;
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