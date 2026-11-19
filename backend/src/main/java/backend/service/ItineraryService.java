package backend.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.entity.Accommodation;
import backend.entity.AccommodationHistory;
import backend.dto.GenerateItineraryRequest;
import backend.dto.ItineraryActivityRequest;
import backend.dto.ItineraryActivityResponse;
import backend.dto.LockActivityRequest;
import backend.dto.ReorderActivityRequest;
import backend.entity.ItineraryActivity;
import backend.entity.ItineraryHistory;
import backend.entity.Trip;
import backend.entity.TripDestination;
import backend.exception.ItineraryException;
import backend.repository.AccommodationHistoryRepository;
import backend.repository.ItineraryActivityRepository;
import backend.repository.ItineraryHistoryRepository;
import backend.repository.TripDestinationRepository;
import backend.repository.TripRepository;
import backend.service.ItineraryScheduler.Block;
import backend.service.ItineraryScheduler.Fixed;
import backend.service.ItineraryScheduler.Input;
import backend.service.ItineraryScheduler.InsufficientTimeException;
import backend.service.ItineraryScheduler.Leg;
import backend.service.ItineraryScheduler.Plan;
import backend.service.ItineraryScheduler.Point;
import backend.service.ItineraryScheduler.Settings;
import backend.service.ItineraryScheduler.Stop;

@Service
public class ItineraryService {

    private static final Logger logger =
            LoggerFactory.getLogger(ItineraryService.class);
    /** History text is kept short so it fits any reasonable column size. */
    private static final int HISTORY_DETAILS_LIMIT = 250;
    private static final int ML_MAX_CANDIDATES = 8;
    private static final LocalTime ML_DAY_START = LocalTime.of(9, 0);
    private static final LocalTime ML_DAY_END = LocalTime.of(17, 0);
    private static final DateTimeFormatter ML_TIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm:ss");

    // Road routing (same settings as RouteService).
    @Value("${route.osrm.base-url:https://router.project-osrm.org}")
    private String osrmBaseUrl = "https://router.project-osrm.org";

    @Value("${route.osrm.timeout-seconds:12}")
    private long osrmTimeoutSeconds = 12;

    private volatile RouteCalculator routeCalculator;

    /** Trips whose itinerary is being generated right now. */
    private final Set<Integer> generating = ConcurrentHashMap.newKeySet();

    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final ItineraryActivityRepository itineraryActivityRepository;
    private final ItineraryHistoryRepository itineraryHistoryRepository;
    private final AccommodationHistoryRepository accommodationHistoryRepository;
    private final OriginLocationResolver originResolver;
    private final ItineraryProperties itineraryProperties;

    private final MlServiceClient mlServiceClient;
    private final MlActivityCategoryMapper categoryMapper;
    private final WeatherService weatherService;
    private final RouteService routeService;

    public ItineraryService(
            TripRepository tripRepository,
            TripDestinationRepository tripDestinationRepository,
            ItineraryActivityRepository itineraryActivityRepository,
            ItineraryHistoryRepository itineraryHistoryRepository,
            AccommodationHistoryRepository accommodationHistoryRepository,
            OriginLocationResolver originResolver,
            ItineraryProperties itineraryProperties,
            MlServiceClient mlServiceClient,
            MlActivityCategoryMapper categoryMapper,
            WeatherService weatherService,
            RouteService routeService) {

        this.tripRepository = tripRepository;
        this.tripDestinationRepository = tripDestinationRepository;
        this.itineraryActivityRepository = itineraryActivityRepository;
        this.itineraryHistoryRepository = itineraryHistoryRepository;
        this.accommodationHistoryRepository = accommodationHistoryRepository;
        this.originResolver = originResolver;
        this.itineraryProperties = itineraryProperties;
        this.mlServiceClient = mlServiceClient;
        this.categoryMapper = categoryMapper;
        this.weatherService = weatherService;
        this.routeService = routeService;
    }

    // =====================================================================
    // SUMMARY TYPES
    // =====================================================================

    public record DaySummary(
            LocalDate date,
            int activityCount,
            int travelMinutes,
            int visitMinutes,
            int totalMinutes) {
    }

    public record ItinerarySummary(
            Integer tripId,
            int activityCount,
            double totalDistanceKm,
            int totalTravelMinutes,
            int totalVisitMinutes,
            List<DaySummary> days,
            List<String> warnings) {
    }

    // =====================================================================
    // GENERATE
    // =====================================================================

    @Transactional
    public List<ItineraryActivityResponse> generateItinerary(
            Integer userId,
            Integer tripId,
            GenerateItineraryRequest request) {

        Trip trip = getUserTrip(tripId, userId);

        if (!generating.add(tripId)) {
            throw ItineraryException.conflict(
                    "An itinerary is already being generated for this trip. "
                            + "Wait for it to finish, then try again.");
        }

        try {
            return doGenerate(trip, tripId, request);
        } finally {
            generating.remove(tripId);
        }
    }

    private List<ItineraryActivityResponse> doGenerate(
            Trip trip,
            Integer tripId,
            GenerateItineraryRequest request) {

        List<TripDestination> destinations = new ArrayList<>(
                tripDestinationRepository.findByTrip_TripIdOrderByDestinationOrderAsc(tripId));

        if (destinations.isEmpty()) {
            throw ItineraryException.badRequest(
                    "Add at least one destination before generating the itinerary.");
        }
        if (trip.getStartDate() == null || trip.getEndDate() == null
                || trip.getEndDate().isBefore(trip.getStartDate())) {
            throw ItineraryException.badRequest(
                    "A valid trip start date and end date are required.");
        }
        if (trip.getOrigin() == null || trip.getOrigin().isBlank()) {
            throw ItineraryException.badRequest(
                    "Set the trip starting point before generating an itinerary.");
        }
        for (TripDestination d : destinations) {
            if (d.getLatitude() == null || d.getLongitude() == null) {
                throw ItineraryException.badRequest("Destination '" + d.getDestinationName()
                        + "' is missing coordinates. Update its latitude and longitude "
                        + "before generating the itinerary.");
            }
        }

        Point origin = originResolver.resolve(trip.getOrigin());

        String generationMethod;
        if (request != null && Boolean.TRUE.equals(request.getOptimizeRoute())) {
            destinations = optimizeOrder(origin, destinations);
            generationMethod = "Nearest-neighbour route order requested; ML ranking was not applied.";
        } else {
            MlOrdering ordering = orderWithMl(trip, destinations);
            destinations = ordering.destinations();
            generationMethod = ordering.details();
        }

        // Locked and manual activities are kept; the planner schedules around them.
        List<ItineraryActivity> existing = itineraryActivityRepository
                .findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(tripId);

        rejectFixedTravelActivities(existing);

        List<ItineraryActivity> kept = new ArrayList<>();
        List<ItineraryActivity> toDelete = new ArrayList<>();
        for (ItineraryActivity activity : existing) {
            if (isFixed(activity)) {
                kept.add(activity);
            } else {
                toDelete.add(activity);
            }
        }

        List<Fixed> fixed = new ArrayList<>();
        for (ItineraryActivity activity : kept) {
            LocalDateTime start = activity.computeStartDateTime();
            LocalDateTime end = activity.computeEndDateTime();
            if (start == null || end == null) {
                throw ItineraryException.badRequest("The locked or manual activity '"
                        + activity.getActivityName()
                        + "' needs both a start and end time before the itinerary can be regenerated.");
            }
            if (!end.isAfter(start)) {
                throw ItineraryException.badRequest("The locked or manual activity '"
                        + activity.getActivityName() + "' has an end time that is not after its "
                        + "start time. Fix or delete it, then generate again.");
            }
            Integer destinationId = activity.getDestination() == null
                    ? null : activity.getDestination().getDestinationId();
            boolean visit = destinationId != null && "VISIT".equals(typeOf(activity));
            fixed.add(new Fixed(start, end, activity.getActivityName(), destinationId, visit));
        }

        Map<Integer, TripDestination> byId = new HashMap<>();
        List<Stop> stops = new ArrayList<>();
        for (TripDestination d : destinations) {
            byId.put(d.getDestinationId(), d);
            stops.add(new Stop(
                    d.getDestinationId(),
                    new Point(d.getDestinationName(), d.getLatitude(), d.getLongitude()),
                    d.getExpectedDuration(),
                    d.getOpeningTime(),
                    d.getClosingTime(),
                    d.getCategory()));
        }

        Settings settings = itineraryProperties.toSettings();
        if (request != null) {
            if (request.getRoundTrip() != null) {
                settings.roundTrip = request.getRoundTrip();
            }
            if (request.getDepartureTime() != null) {
                settings.departureTime = request.getDepartureTime();
            }
            if (request.getEarliestVisitTime() != null) {
                settings.earliestVisitTime = request.getEarliestVisitTime();
            }
            if (request.getOvernightRest() != null) {
                settings.includeOvernightRest = request.getOvernightRest();
            }
            if (request.getSpreadAcrossTripDays() != null) {
                settings.spreadAcrossTripDays = request.getSpreadAcrossTripDays();
            }
        }

        Input input = new Input(
                trip.getStartDate(),
                trip.getEndDate(),
                origin,
                stops,
                resolveSelectedOvernight(trip),
                fixed,
                settings,
                legProvider());

        Plan plan;
        try {
            plan = ItineraryScheduler.schedule(input);
        } catch (InsufficientTimeException e) {
            throw ItineraryException.unprocessable(e.getMessage());
        } catch (IllegalArgumentException e) {
            throw ItineraryException.badRequest(e.getMessage());
        }

        List<ItineraryActivity> generated = new ArrayList<>();
        for (Block block : plan.blocks()) {
            ItineraryActivity activity = new ItineraryActivity();
            activity.setTrip(trip);
            if (block.destinationId() != null) {
                activity.setDestination(byId.get(block.destinationId()));
            }
            activity.setActivityDate(block.start().toLocalDate());
            activity.setStartTime(block.start().toLocalTime());
            activity.setEndDate(block.end().toLocalDate());
            activity.setEndTime(block.end().toLocalTime());
            activity.setActivityName(block.name());
            activity.setDescription(block.description());
            activity.setCategory(block.category());
            activity.setActivityType(block.type().name());
            activity.setDuration(block.minutes());
            activity.setDistanceKm(block.distanceKm());
            activity.setRouteSource(block.routeSource());
            activity.setEstimated(block.estimated());
            activity.setGenerated(true);
            activity.setLocked(false);
            generated.add(activity);
        }

        List<ItineraryActivity> all = new ArrayList<>(kept);
        all.addAll(generated);
        all.sort((a, b) -> {
            int byDate = a.getActivityDate().compareTo(b.getActivityDate());
            if (byDate != 0) {
                return byDate;
            }
            LocalTime x = a.getStartTime();
            LocalTime y = b.getStartTime();
            if (x == null && y == null) {
                return 0;
            }
            if (x == null) {
                return 1;
            }
            if (y == null) {
                return -1;
            }
            return x.compareTo(y);
        });
        Map<LocalDate, Integer> orderByDate = new HashMap<>();
        for (ItineraryActivity activity : all) {
            int order = orderByDate.getOrDefault(activity.getActivityDate(), 0) + 1;
            activity.setOrderIndex(order);
            orderByDate.put(activity.getActivityDate(), order);
        }

        // Nothing is deleted until the plan has been built successfully.
        itineraryActivityRepository.deleteAll(toDelete);
        itineraryActivityRepository.saveAll(generated);
        itineraryActivityRepository.saveAll(kept);

        StringBuilder details = new StringBuilder("Itinerary generated (")
                .append(plan.mode()).append(" plan): ")
                .append(generated.size()).append(" new activities, ")
                .append(kept.size()).append(" locked/manual kept. ")
                .append(generationMethod);
        for (String warning : plan.warnings()) {
            details.append(' ').append(warning);
        }
        saveHistory(trip, "GENERATE", null, truncate(details.toString(), HISTORY_DETAILS_LIMIT));

        return itineraryActivityRepository
                .findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(tripId)
                .stream().map(item -> toResponse(item)).toList();
    }

    /**
     * Regeneration keeps locked and manual activities. A kept travel or return
     * activity would be duplicated by the generated route, so it is refused
     * with a 409 that tells the user how to proceed.
     */
    public static void rejectFixedTravelActivities(List<ItineraryActivity> activities) {
        if (activities == null) {
            return;
        }
        List<String> names = new ArrayList<>();
        for (ItineraryActivity activity : activities) {
            if (activity == null || !isFixed(activity)) {
                continue;
            }
            String type = typeOf(activity);
            if (type.equals("TRAVEL") || type.equals("RETURN")) {
                String name = activity.getActivityName();
                names.add(name == null || name.isBlank() ? "(unnamed travel activity)" : name);
            }
        }
        if (!names.isEmpty()) {
            throw ItineraryException.conflict("Cannot regenerate the itinerary: "
                    + names.size() + " locked or manually added travel activity(ies) ("
                    + String.join(", ", names) + ") would be duplicated by the generated route. "
                    + "Unlock or delete them first, then generate again.");
        }
    }

    // =====================================================================
    // SUMMARY
    // =====================================================================

    @Transactional(readOnly = true)
    public ItinerarySummary getSummary(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        List<ItineraryActivity> items = itineraryActivityRepository
                .findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(tripId);

        double km = 0;
        int travel = 0;
        int visits = 0;
        int estimatedLegs = 0;
        int estimatedVisits = 0;
        // per day: count, travel minutes, visit minutes, total minutes
        Map<LocalDate, int[]> perDay = new TreeMap<>();

        for (ItineraryActivity activity : items) {
            String type = typeOf(activity);
            int minutes = minutesOf(activity);
            int[] day = perDay.computeIfAbsent(activity.getActivityDate(), k -> new int[4]);
            day[0]++;
            day[3] += minutes;

            boolean estimated = Boolean.TRUE.equals(activity.getEstimated())
                    || "ESTIMATE".equalsIgnoreCase(activity.getRouteSource());

            if (type.equals("TRAVEL") || type.equals("RETURN")) {
                travel += minutes;
                day[1] += minutes;
                if (activity.getDistanceKm() != null) {
                    km += activity.getDistanceKm();
                }
                if (estimated) {
                    estimatedLegs++;
                }
            } else if (type.equals("VISIT")) {
                visits += minutes;
                day[2] += minutes;
                if (estimated) {
                    estimatedVisits++;
                }
            }
        }

        List<DaySummary> days = new ArrayList<>();
        for (Map.Entry<LocalDate, int[]> entry : perDay.entrySet()) {
            int[] d = entry.getValue();
            days.add(new DaySummary(entry.getKey(), d[0], d[1], d[2], d[3]));
        }

        List<String> warnings = new ArrayList<>();
        if (estimatedLegs > 0) {
            warnings.add(estimatedLegs + " travel leg(s) use straight-line estimates because "
                    + "road routing was unavailable, so those times are rough.");
        }
        if (estimatedVisits > 0) {
            warnings.add(estimatedVisits + " visit(s) use the default duration because no "
                    + "expected duration is saved for them.");
        }
        for (ItineraryHistory history : itineraryHistoryRepository
                .findByTrip_TripIdOrderByCreatedAtDesc(tripId)) {
            if ("GENERATE".equals(history.getAction()) && history.getDetails() != null) {
                warnings.add("Last generation: " + history.getDetails());
                break;
            }
        }

        return new ItinerarySummary(
                tripId,
                items.size(),
                Math.round(km * 100.0) / 100.0,
                travel,
                visits,
                days,
                warnings);
    }

    // =====================================================================
    // GENERATION HELPERS
    // =====================================================================

    private record MlOrdering(List<TripDestination> destinations, String details) {
    }

    private MlOrdering orderWithMl(Trip trip, List<TripDestination> destinations) {
        if (trip.getBudget() == null) {
            return new MlOrdering(destinations, "ML ranking skipped because the trip has no budget.");
        }

        List<TripDestination> candidates = new ArrayList<>();
        Set<String> candidateTypes = new HashSet<>();
        for (TripDestination destination : destinations) {
            if (!categoryMapper.isSupportedCategory(destination.getCategory())) {
                continue;
            }
            String activityType = categoryMapper.mapCategory(destination.getCategory());
            if (candidateTypes.add(activityType)) {
                candidates.add(destination);
                if (candidates.size() == ML_MAX_CANDIDATES) {
                    break;
                }
            }
        }
        if (candidates.isEmpty()) {
            return new MlOrdering(destinations,
                    "ML ranking skipped because no destination has a supported ML category.");
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("weather", weatherService.getMlWeatherForDate(
                    candidates.get(0).getLatitude(),
                    candidates.get(0).getLongitude(),
                    trip.getStartDate()));

            List<Map<String, Object>> activities = new ArrayList<>();
            Map<String, TripDestination> destinationsById = new LinkedHashMap<>();
            int defaultVisitMinutes = itineraryProperties.toSettings().defaultVisitMinutes;
            long tripDays = trip.getEndDate().toEpochDay()
                    - trip.getStartDate().toEpochDay() + 1;
            double dailyBudget = trip.getBudget().doubleValue() / tripDays;
            for (TripDestination destination : candidates) {
                String candidateId = String.valueOf(destination.getDestinationId());
                String activityType = categoryMapper.mapCategory(destination.getCategory());
                double cost = destination.getTicketPrice() == null
                        ? 0.0 : destination.getTicketPrice().doubleValue();
                double budgetMatch = dailyBudget > 0
                        ? Math.max(0.0, Math.min(1.0, 1.0 - cost / dailyBudget))
                        : cost == 0 ? 1.0 : 0.0;
                LocalTime openingTime = destination.getOpeningTime() == null
                        ? ML_DAY_START : destination.getOpeningTime();
                LocalTime closingTime = destination.getClosingTime() == null
                        ? ML_DAY_END : destination.getClosingTime();
                if (!closingTime.isAfter(openingTime)) {
                    throw new IllegalArgumentException(
                            "Invalid opening hours for " + destination.getDestinationName());
                }

                Map<String, Object> candidate = new LinkedHashMap<>();
                candidate.put("candidate_id", candidateId);
                candidate.put("activity_type", activityType);
                candidate.put("user_preference", 0.5);
                candidate.put("budget_match", budgetMatch);
                candidate.put("duration_minutes", destination.getExpectedDuration() == null
                        ? defaultVisitMinutes
                        : destination.getExpectedDuration());
                candidate.put("estimated_cost", cost);
                candidate.put("opening_time", openingTime.format(ML_TIME_FORMAT));
                candidate.put("closing_time", closingTime.format(ML_TIME_FORMAT));
                activities.add(candidate);
                destinationsById.put(candidateId, destination);
            }

            payload.put("activities", activities);
            payload.put("start_time", ML_DAY_START.format(ML_TIME_FORMAT));
            payload.put("end_time", ML_DAY_END.format(ML_TIME_FORMAT));
            payload.put("budget", dailyBudget);
            payload.put("travel_time_matrix",
                    routeService.calculateTravelTimeMatrix(candidates));

            Map<String, Object> result = mlServiceClient.generateItinerary(payload);
            List<String> orderedIds = new ArrayList<>();
            Map<String, Object> itinerary = getMap(
                    result.get("itinerary"),
                    "ML response does not contain itinerary data.");
            if (Boolean.TRUE.equals(itinerary.get("feasible"))
                    && itinerary.get("schedule") instanceof List<?> schedule) {
                appendCandidateIds(schedule, orderedIds, destinationsById);
            }
            if (result.get("rankings") instanceof List<?> rankings) {
                appendCandidateIds(rankings, orderedIds, destinationsById);
            }
            if (orderedIds.isEmpty()) {
                throw new IllegalStateException("ML service returned no destination rankings.");
            }

            List<TripDestination> ordered = new ArrayList<>();
            Set<String> included = new HashSet<>();
            for (String id : orderedIds) {
                TripDestination destination = destinationsById.get(id);
                if (destination != null && included.add(id)) {
                    ordered.add(destination);
                }
            }
            for (TripDestination destination : destinations) {
                if (!included.contains(String.valueOf(destination.getDestinationId()))) {
                    ordered.add(destination);
                }
            }

            int unrankedCount = destinations.size() - candidates.size();
            String details = "XGBoost/TOPSIS order applied to " + candidates.size()
                    + " supported destination(s); " + unrankedCount
                    + " destination(s) retained in saved order because the ML contract "
                    + "supports one candidate per activity category and at most "
                    + ML_MAX_CANDIDATES + " candidates.";
            return new MlOrdering(ordered, details);
        } catch (RuntimeException exception) {
            logger.warn("ML ranking failed for trip {}; continuing with scheduler order.",
                    trip.getTripId(), exception);
            return new MlOrdering(destinations,
                    "ML ranking was unavailable; the constraint scheduler used saved destination order.");
        }
    }

    private static void appendCandidateIds(
            List<?> items,
            List<String> orderedIds,
            Map<String, TripDestination> destinationsById) {
        for (Object item : items) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Object value = map.get("candidate_id");
            if (value != null) {
                String id = value.toString();
                if (destinationsById.containsKey(id)) {
                    orderedIds.add(id);
                }
            }
        }
    }

    /** Nearest-neighbour ordering starting from the trip origin. */
    private List<TripDestination> optimizeOrder(Point origin, List<TripDestination> list) {
        List<TripDestination> remaining = new ArrayList<>(list);
        List<TripDestination> ordered = new ArrayList<>();
        double lat = origin.latitude();
        double lon = origin.longitude();

        while (!remaining.isEmpty()) {
            TripDestination best = null;
            double bestKm = Double.MAX_VALUE;
            for (TripDestination d : remaining) {
                double km = RouteCalculator.haversineKm(lat, lon, d.getLatitude(), d.getLongitude());
                if (km < bestKm) {
                    bestKm = km;
                    best = d;
                }
            }
            if (best == null) {
                break;
            }
            ordered.add(best);
            remaining.remove(best);
            lat = best.getLatitude();
            lon = best.getLongitude();
        }
        return ordered;
    }

    private ItineraryScheduler.LegProvider legProvider() {
        Map<String, Leg> memo = new HashMap<>();
        return (from, to) -> {
            String key = String.format(Locale.ROOT, "%.5f,%.5f>%.5f,%.5f",
                    from.latitude(), from.longitude(), to.latitude(), to.longitude());
            Leg cached = memo.get(key);
            if (cached == null) {
                cached = fetchLeg(from, to);
                memo.put(key, cached);
            }
            return cached;
        };
    }

    private Leg fetchLeg(Point from, Point to) {
        RouteCalculator.Result result = calculator().calculate(List.of(
                new RouteCalculator.Stop(null, from.name(), from.latitude(), from.longitude()),
                new RouteCalculator.Stop(null, to.name(), to.latitude(), to.longitude())));
        RouteCalculator.Leg leg = result.legs.get(0);
        return new Leg(leg.distanceKm, leg.durationMinutes, result.isApproximate(), result.source);
    }

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

    private Point resolveSelectedOvernight(Trip trip) {
        Integer userId = trip.getUser() == null ? null : trip.getUser().getUserId();
        if (userId == null) {
            return null;
        }
        List<AccommodationHistory> history = accommodationHistoryRepository
                .findUserTripHistory(userId, trip.getTripId());
        for (AccommodationHistory entry : history) {
            if (entry == null || entry.getAction() == null) {
                continue;
            }
            String action = entry.getAction().trim().toUpperCase(Locale.ROOT);
            if (!action.equals("SELECTED") && !action.equals("ADDED_TO_TRIP")) {
                continue;
            }
            Accommodation accommodation = entry.getAccommodation();
            if (accommodation == null || accommodation.getLatitude() == null
                    || accommodation.getLongitude() == null) {
                continue;
            }
            return new Point(accommodation.getName(),
                    accommodation.getLatitude().doubleValue(),
                    accommodation.getLongitude().doubleValue());
        }
        return null;
    }

    /** Locked activities and manual (non-generated) ones are never replaced. */
    private static boolean isFixed(ItineraryActivity activity) {
        return Boolean.TRUE.equals(activity.getLocked()) || !activity.isGeneratedActivity();
    }

    private static String typeOf(ItineraryActivity activity) {
        String type = activity.getActivityType();
        if (type != null && !type.isBlank()) {
            return type.trim().toUpperCase();
        }
        String fromCategory = typeFromCategory(activity.getCategory());
        if (!fromCategory.equals("CUSTOM")) {
            return fromCategory;
        }
        return activity.getDestination() != null ? "VISIT" : "CUSTOM";
    }

    private static String typeFromCategory(String category) {
        String c = category == null ? "" : category.trim().toUpperCase();
        switch (c) {
            case "TRAVEL":
                return "TRAVEL";
            case "MEAL":
                return "MEAL";
            case "BREAK":
                return "REST";
            default:
                return "CUSTOM";
        }
    }

    private static int minutesOf(ItineraryActivity activity) {
        if (activity.getDuration() != null && activity.getDuration() > 0) {
            return activity.getDuration();
        }
        LocalDateTime start = activity.computeStartDateTime();
        LocalDateTime end = activity.computeEndDateTime();
        if (start != null && end != null && end.isAfter(start)) {
            return (int) Duration.between(start, end).toMinutes();
        }
        return 0;
    }

    private static String truncate(String text, int limit) {
        if (text == null || text.length() <= limit) {
            return text;
        }
        return text.substring(0, limit - 3) + "...";
    }

    // =====================================================================
    // READ / EDIT ACTIVITIES
    // =====================================================================

    @Transactional(readOnly = true)
    public List<ItineraryActivityResponse> getItinerary(
            Integer userId,
            Integer tripId) {

        getUserTrip(tripId, userId);

        return itineraryActivityRepository
                .findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(tripId)
                .stream()
                .map(item -> toResponse(item))
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
            destination = tripDestinationRepository
                    .findByDestinationIdAndTrip_TripId(request.getDestinationId(), tripId)
                    .orElseThrow(() -> new RuntimeException("Destination not found for this trip."));
        }

        int nextOrder = itineraryActivityRepository
                .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(tripId, request.getActivityDate())
                .size() + 1;

        ItineraryActivity activity = new ItineraryActivity();

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
        activity.setLocked(request.getLocked() != null ? request.getLocked() : false);
        // Manual activities are never replaced by regeneration.
        activity.setGenerated(false);
        activity.setActivityType(destination != null
                ? "VISIT" : typeFromCategory(request.getCategory()));

        ItineraryActivity saved = itineraryActivityRepository.save(activity);

        saveHistory(trip, "ADD", saved.getActivityId(),
                "Activity added: " + saved.getActivityName());

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

        ItineraryActivity activity = getActivity(tripId, activityId);

        validateActivityDate(trip, request.getActivityDate());

        if (Boolean.TRUE.equals(activity.getLocked())) {
            throw new RuntimeException("This activity is locked. Unlock it before editing.");
        }

        TripDestination destination = null;

        if (request.getDestinationId() != null) {
            destination = tripDestinationRepository
                    .findByDestinationIdAndTrip_TripId(request.getDestinationId(), tripId)
                    .orElseThrow(() -> new RuntimeException("Destination not found for this trip."));
        }

        boolean dateChanged = !request.getActivityDate().equals(activity.getActivityDate());

        if (dateChanged) {
            List<ItineraryActivity> oldDateActivities = itineraryActivityRepository
                    .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
                            tripId, activity.getActivityDate());

            int oldOrder = activity.getOrderIndex();

            for (ItineraryActivity item : oldDateActivities) {
                if (!item.getActivityId().equals(activityId)
                        && item.getOrderIndex() > oldOrder) {

                    item.setOrderIndex(item.getOrderIndex() - 1);
                }
            }

            itineraryActivityRepository.saveAll(oldDateActivities);

            int newOrder = itineraryActivityRepository
                    .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
                            tripId, request.getActivityDate())
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
        activity.setEndDate(null);
        activity.setGenerated(false);
        activity.setActivityType(destination != null
                ? "VISIT" : typeFromCategory(request.getCategory()));
        activity.setDistanceKm(null);
        activity.setRouteSource(null);
        activity.setEstimated(null);

        if (request.getLocked() != null) {
            activity.setLocked(request.getLocked());
        }

        ItineraryActivity saved = itineraryActivityRepository.save(activity);

        saveHistory(trip, "UPDATE", saved.getActivityId(),
                "Activity updated: " + saved.getActivityName());

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

        ItineraryActivity activity = getActivity(tripId, activityId);

        if (Boolean.TRUE.equals(activity.getLocked())) {
            throw new RuntimeException("This activity is locked. Unlock it before deleting.");
        }

        LocalDate date = activity.getActivityDate();
        int deletedOrder = activity.getOrderIndex();

        itineraryActivityRepository.delete(activity);

        List<ItineraryActivity> remaining = itineraryActivityRepository
                .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(tripId, date);

        for (ItineraryActivity item : remaining) {
            if (item.getOrderIndex() > deletedOrder) {
                item.setOrderIndex(item.getOrderIndex() - 1);
            }
        }

        itineraryActivityRepository.saveAll(remaining);

        saveHistory(trip, "DELETE", activityId,
                "Activity deleted: " + activity.getActivityName());
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
            throw new RuntimeException("Activity date and activity IDs are required.");
        }

        validateActivityDate(trip, request.getActivityDate());

        List<Integer> requestedIds = request.getActivityIds();

        Set<Integer> requestedSet = new HashSet<>();
        for (Integer activityId : requestedIds) {
            if (activityId == null) {
                throw new RuntimeException("Activity IDs cannot be null.");
            }
            requestedSet.add(activityId);
        }

        if (requestedSet.size() != requestedIds.size()) {
            throw new RuntimeException("Duplicate activity IDs are not allowed.");
        }

        List<ItineraryActivity> allActivities = itineraryActivityRepository
                .findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc(tripId);

        Map<Integer, ItineraryActivity> activityMap = new HashMap<>();
        for (ItineraryActivity activity : allActivities) {
            activityMap.put(activity.getActivityId(), activity);
        }

        for (Integer activityId : requestedIds) {
            ItineraryActivity activity = activityMap.get(activityId);

            if (activity == null) {
                throw new RuntimeException("Activity " + activityId
                        + " does not belong to this trip.");
            }

            if (Boolean.TRUE.equals(activity.getLocked())) {
                throw new RuntimeException("Activity " + activityId
                        + " is locked and cannot be rearranged.");
            }
            if (!request.getActivityDate().equals(activity.getActivityDate())) {
                throw new RuntimeException(
                        "All reordered activities must belong to the selected date.");
            }
        }

        List<ItineraryActivity> selectedDateActivities = itineraryActivityRepository
                .findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc(
                        tripId, request.getActivityDate());
        for (ItineraryActivity activity : selectedDateActivities) {
            if (!requestedSet.contains(activity.getActivityId())
                    && Boolean.TRUE.equals(activity.getLocked())) {
                throw new RuntimeException(
                        "The selected date contains a locked activity. "
                                + "Unlock it before reordering.");
            }
        }

        int order = 1;

        for (Integer activityId : requestedIds) {
            ItineraryActivity activity = activityMap.get(activityId);
            if (activity == null) {
                continue;
            }
            activity.setActivityDate(request.getActivityDate());
            activity.setOrderIndex(order++);
        }

        for (ItineraryActivity activity : allActivities) {
            if (!requestedSet.contains(activity.getActivityId())
                    && request.getActivityDate().equals(activity.getActivityDate())) {
                activity.setOrderIndex(order++);
            }
        }

        itineraryActivityRepository.saveAll(allActivities);

        saveHistory(trip, "REORDER", null,
                "Activities rearranged for " + request.getActivityDate());

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
            throw new RuntimeException("The locked value is required.");
        }

        ItineraryActivity activity = getActivity(tripId, activityId);

        activity.setLocked(request.getLocked());

        ItineraryActivity saved = itineraryActivityRepository.save(activity);

        saveHistory(
                trip,
                request.getLocked() ? "LOCK" : "UNLOCK",
                activityId,
                request.getLocked()
                        ? "Activity locked: " + activity.getActivityName()
                        : "Activity unlocked: " + activity.getActivityName());

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

    // =====================================================================
    // PRIVATE HELPERS
    // =====================================================================

    private Trip getUserTrip(
            Integer tripId,
            Integer userId) {

        return tripRepository
                .findByTripIdAndUser_UserId(tripId, userId)
                .orElseThrow(() -> new RuntimeException(
                        "Trip not found or you do not have access to this trip."));
    }

    private ItineraryActivity getActivity(
            Integer tripId,
            Integer activityId) {

        return itineraryActivityRepository
                .findByActivityIdAndTrip_TripId(activityId, tripId)
                .orElseThrow(() -> new RuntimeException("Itinerary activity not found."));
    }

    private void validateRequest(ItineraryActivityRequest request) {

        if (request == null) {
            throw new RuntimeException("Activity request is required.");
        }

        if (request.getActivityDate() == null) {
            throw new RuntimeException("Activity date is required.");
        }

        if (request.getActivityName() == null
                || request.getActivityName().trim().isEmpty()) {
            throw new RuntimeException("Activity name is required.");
        }

        if (request.getDuration() != null && request.getDuration() <= 0) {
            throw new RuntimeException("Duration must be greater than zero.");
        }

        if (request.getStartTime() != null
                && request.getEndTime() != null
                && !request.getEndTime().isAfter(request.getStartTime())) {
            throw new RuntimeException("End time must be after start time.");
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
            throw new RuntimeException("Activity date must be within the trip dates.");
        }
    }

    private void saveHistory(
            Trip trip,
            String action,
            Integer activityId,
            String details) {

        ItineraryHistory history = new ItineraryHistory();

        history.setTrip(trip);
        history.setAction(action);
        history.setActivityId(activityId);
        history.setDetails(details);
        history.setCreatedAt(LocalDateTime.now());

        itineraryHistoryRepository.save(history);
    }

    private ItineraryActivityResponse toResponse(ItineraryActivity activity) {

        ItineraryActivityResponse response = new ItineraryActivityResponse();

        response.setActivityId(activity.getActivityId());

        if (activity.getDestination() != null) {
            response.setDestinationId(activity.getDestination().getDestinationId());
            response.setDestinationName(activity.getDestination().getDestinationName());
        }

        response.setActivityDate(activity.getActivityDate());
        response.setStartTime(activity.getStartTime());
        response.setEndTime(activity.getEndTime());
        response.setActivityName(activity.getActivityName());
        response.setDescription(activity.getDescription());
        response.setCategory(activity.getCategory());
        response.setDuration(activity.getDuration());
        response.setOrderIndex(activity.getOrderIndex());
        response.setLocked(activity.getLocked());
        response.setEndDate(activity.getEndDate());
        response.setStartDateTime(activity.computeStartDateTime());
        response.setEndDateTime(activity.computeEndDateTime());
        response.setCrossesMidnight(activity.getEndDate() != null
                && !activity.getEndDate().equals(activity.getActivityDate()));
        response.setActivityType(activity.getActivityType());
        response.setDistanceKm(activity.getDistanceKm());
        response.setRouteSource(activity.getRouteSource());
        response.setEstimated(activity.getEstimated());
        response.setGenerated(activity.getGenerated());

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

}
