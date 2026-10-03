package backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.entity.CrowdLevel;
import backend.entity.Recommendation;
import backend.entity.RecommendationHistory;
import backend.entity.RecommendationType;
import backend.entity.Trip;
import backend.entity.TripDestination;
import backend.repository.RecommendationHistoryRepository;
import backend.repository.RecommendationRepository;
import backend.repository.TripDestinationRepository;
import backend.repository.TripRepository;

@Service
public class RecommendationService {

    @Autowired
    private RecommendationRepository recommendationRepository;

    @Autowired
    private RecommendationHistoryRepository recommendationHistoryRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private TripDestinationRepository tripDestinationRepository;

    @Autowired
    private WeatherService weatherService;

    /*
     * =========================================================
     * GENERATE ALL RECOMMENDATIONS
     * =========================================================
     */

    @Transactional
    public Map<String, Object> generateRecommendations(
            Integer tripId,
            Integer userId,
            String plannedDate,
            String plannedTime) {

        Trip trip = getUserTrip(tripId, userId);

        List<TripDestination> destinations =
                tripDestinationRepository
                        .findByTrip_TripIdOrderByDestinationOrderAsc(tripId);

        if (destinations == null || destinations.isEmpty()) {
            throw new IllegalArgumentException(
                    "No suitable nearby attractions found.");
        }

        LocalDate date = resolveDate(trip, plannedDate);
        LocalTime time = resolveTime(plannedTime);

        validateDestinations(destinations);

        /*
         * First destination is used as the geographic anchor because
         * Trip currently does not store origin latitude/longitude.
         *
         * This is only the distance reference. Weather is still
         * calculated separately for every destination.
         */
        TripDestination anchorDestination = destinations.get(0);

        /*
         * Generate destination-specific weather data.
         */
        Map<Integer, WeatherData> weatherByDestination =
                new LinkedHashMap<>();

        for (TripDestination destination : destinations) {

            Map<String, Object> rawWeather =
                    getWeatherSafely(destination);

            WeatherData weather =
                    extractWeather(rawWeather);

            weatherByDestination.put(
                    destination.getDestinationId(),
                    weather);
        }

        String season = determineSeason(date);

        /*
         * Generate destination-specific crowd estimates.
         */
        Map<Integer, CrowdData> crowdByDestination =
                new LinkedHashMap<>();

        for (TripDestination destination : destinations) {

            CrowdData crowd =
                    estimateCrowd(
                            destination,
                            time,
                            date);

            crowdByDestination.put(
                    destination.getDestinationId(),
                    crowd);
        }
        /*
 * Keep previous recommendations because recommendation_history
 * contains foreign-key references to them.
 *
 * New generations are stored as new recommendation records,
 * preserving the complete recommendation history.
 */

        List<Recommendation> generated =
                new ArrayList<>();

        for (TripDestination destination : destinations) {

            WeatherData weather =
                    weatherByDestination.get(
                            destination.getDestinationId());

            CrowdData crowd =
                    crowdByDestination.get(
                            destination.getDestinationId());

            double distance =
                    calculateHaversineDistance(
                            anchorDestination,
                            destination);

            /*
             * WEATHER
             */
            Recommendation weatherRecommendation =
                    buildWeatherRecommendation(
                            trip,
                            destination,
                            weather,
                            crowd,
                            date,
                            time,
                            season,
                            distance);

            if (weatherRecommendation != null) {
                generated.add(weatherRecommendation);
            }

            /*
             * NEARBY
             */
            Recommendation nearbyRecommendation =
                    buildNearbyRecommendation(
                            trip,
                            destination,
                            destinations,
                            weather,
                            crowd,
                            date,
                            time,
                            season,
                            distance);

            if (nearbyRecommendation != null) {
                generated.add(nearbyRecommendation);
            }

            /*
             * CROWD
             */
            Recommendation crowdRecommendation =
                    buildCrowdRecommendation(
                            trip,
                            destination,
                            weather,
                            crowd,
                            date,
                            time,
                            season,
                            distance);

            if (crowdRecommendation != null) {
                generated.add(crowdRecommendation);
            }

            /*
             * SEASONAL
             */
            Recommendation seasonalRecommendation =
                    buildSeasonalRecommendation(
                            trip,
                            destination,
                            season,
                            weather,
                            date,
                            time,
                            crowd,
                            distance);

            if (seasonalRecommendation != null) {
                generated.add(seasonalRecommendation);
            }

            /*
             * TIME
             */
            Recommendation timeRecommendation =
                    buildTimeRecommendation(
                            trip,
                            destination,
                            weather,
                            time,
                            date,
                            season,
                            crowd,
                            distance);

            if (timeRecommendation != null) {
                generated.add(timeRecommendation);
            }
        }

        if (generated.isEmpty()) {
            throw new IllegalArgumentException(
                    "No recommendations match current conditions.");
        }

        /*
         * Persist recommendations.
         */
        List<Recommendation> saved =
                recommendationRepository.saveAll(generated);

        /*
         * Persist recommendation-generated history.
         */
        for (Recommendation recommendation : saved) {

            RecommendationHistory history =
                    createHistory(
                            trip,
                            userId,
                            recommendation,
                            generatedAction(
                                    recommendation.getRecommendationType()),
                            recommendation.getReason());

            recommendationHistoryRepository.save(history);
        }

        /*
         * Sort highest score first.
         */
        saved.sort(
                (first, second) -> {

                    BigDecimal firstScore =
                            first.getScore();

                    BigDecimal secondScore =
                            second.getScore();

                    if (firstScore == null
                            && secondScore == null) {
                        return 0;
                    }

                    if (firstScore == null) {
                        return 1;
                    }

                    if (secondScore == null) {
                        return -1;
                    }

                    return secondScore.compareTo(firstScore);
                });

        List<Map<String, Object>> responseItems =
                new ArrayList<>();

        for (Recommendation recommendation : saved) {
            responseItems.add(
                    toResponse(recommendation));
        }

        /*
         * The weather summary remains compatible with the previous
         * response structure. It represents the first destination,
         * while every recommendation itself contains destination-
         * specific weather information.
         */
        WeatherData firstWeather =
                weatherByDestination.get(
                        anchorDestination.getDestinationId());

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("tripId", tripId);
        response.put(
                "recommendationCount",
                saved.size());
        response.put(
                "plannedDate",
                date.toString());
        response.put(
                "plannedTime",
                time.toString());
        response.put(
                "season",
                season);
        response.put(
                "weather",
                firstWeather.toMap());
        response.put(
                "recommendations",
                responseItems);
        response.put(
                "message",
                "Recommendations generated successfully.");

        return response;
    }

    /*
     * =========================================================
     * GET RECOMMENDATIONS
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecommendations(
            Integer tripId,
            Integer userId) {

        getUserTrip(tripId, userId);

        List<Recommendation> recommendations =
                recommendationRepository
                        .findByTrip_TripIdOrderByScoreDescCreatedAtDesc(
                                tripId);

        List<Map<String, Object>> response =
                new ArrayList<>();

        for (Recommendation recommendation : recommendations) {
            response.add(
                    toResponse(recommendation));
        }

        return response;
    }

    /*
     * =========================================================
     * GET RECOMMENDATIONS BY TYPE
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecommendationsByType(
            Integer tripId,
            Integer userId,
            RecommendationType type) {

        getUserTrip(tripId, userId);

        if (type == null) {
            throw new IllegalArgumentException(
                    "Recommendation type is required.");
        }

        List<Recommendation> recommendations =
                recommendationRepository
                        .findByTrip_TripIdAndRecommendationTypeOrderByScoreDescCreatedAtDesc(
                                tripId,
                                type);

        List<Map<String, Object>> response =
                new ArrayList<>();

        for (Recommendation recommendation : recommendations) {
            response.add(
                    toResponse(recommendation));
        }

        return response;
    }

    /*
     * =========================================================
     * GET HISTORY
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getHistory(
            Integer tripId,
            Integer userId) {

        getUserTrip(tripId, userId);

        List<RecommendationHistory> history =
                recommendationHistoryRepository
                        .findByTrip_TripIdOrderByCreatedAtDesc(
                                tripId);

        List<Map<String, Object>> response =
                new ArrayList<>();

        for (RecommendationHistory item : history) {

            Map<String, Object> row =
                    new LinkedHashMap<>();

            row.put(
                    "historyId",
                    item.getHistoryId());

            row.put(
                    "recommendationId",
                    item.getRecommendation() == null
                            ? null
                            : item.getRecommendation()
                                    .getRecommendationId());

            row.put(
                    "recommendationType",
                    item.getRecommendationType() == null
                            ? null
                            : item.getRecommendationType().name());

            row.put(
                    "action",
                    item.getAction());

            row.put(
                    "reason",
                    item.getReason());

            row.put(
                    "createdAt",
                    item.getCreatedAt());

            response.add(row);
        }

        return response;
    }

    /*
     * =========================================================
     * RECORD RECOMMENDATION ACTION
     * =========================================================
     */

    @Transactional
    public Map<String, Object> recordAction(
            Integer recommendationId,
            Integer tripId,
            Integer userId,
            String action) {

        Trip trip =
                getUserTrip(
                        tripId,
                        userId);

        if (action == null
                || action.isBlank()) {

            throw new IllegalArgumentException(
                    "Recommendation action is required.");
        }

        String normalizedAction =
                normalizeAction(action);

        Recommendation recommendation =
                recommendationRepository
                        .findByRecommendationIdAndTrip_TripId(
                                recommendationId,
                                tripId)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Recommendation not found."));

        RecommendationHistory history =
                createHistory(
                        trip,
                        userId,
                        recommendation,
                        normalizedAction,
                        recommendation.getReason());

        recommendationHistoryRepository.save(history);

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "message",
                "Recommendation action recorded successfully.");

        response.put(
                "recommendationId",
                recommendationId);

        response.put(
                "action",
                normalizedAction);

        response.put(
                "historyId",
                history.getHistoryId());

        response.put(
                "createdAt",
                history.getCreatedAt());

        return response;
    }

    /*
     * =========================================================
     * WEATHER RECOMMENDATION
     * =========================================================
     */

    private Recommendation buildWeatherRecommendation(
            Trip trip,
            TripDestination destination,
            WeatherData weather,
            CrowdData crowd,
            LocalDate date,
            LocalTime time,
            String season,
            double distance) {

        String category =
                safe(destination.getCategory());

        String destinationType =
                safe(
                        destination.getIndoorOutdoor() == null
                                ? ""
                                : destination.getIndoorOutdoor().name());

        double score = 50.0;

        String reason;

        /*
         * Rain
         */
        if (weather.rainProbability >= 70) {

            if (isIndoor(destinationType)
                    || containsAny(
                            category,
                            "museum",
                            "shopping",
                            "gallery",
                            "cultural",
                            "restaurant",
                            "indoor")) {

                score += 30;

                reason =
                        "Rain probability is high, so this indoor "
                                + "destination is suitable for the current "
                                + "conditions.";

            } else {

                score -= 30;

                reason =
                        "Rain probability is high. Consider an indoor "
                                + "alternative or a later time.";
            }

        } else if (weather.rainProbability >= 40) {

            if (isIndoor(destinationType)) {

                score += 20;

                reason =
                        "There is a moderate chance of rain, so this "
                                + "indoor destination is a practical option.";

            } else {

                score -= 10;

                reason =
                        "There is a moderate chance of rain. Check the "
                                + "forecast again before outdoor activities.";
            }

        /*
         * Temperature
         */
        } else if (weather.temperature >= 35) {

            if (isIndoor(destinationType)
                    || containsAny(
                            category,
                            "museum",
                            "shopping",
                            "gallery",
                            "cultural",
                            "restaurant")) {

                score += 30;

                reason =
                        "High temperature favors an indoor or shaded "
                                + "activity.";

            } else {

                score -= 5;

                reason =
                        "The temperature is high. Consider visiting "
                                + "during a cooler part of the day.";
            }

        } else if (weather.temperature <= 10) {

            if (isIndoor(destinationType)) {

                score += 15;

                reason =
                        "Cool temperatures make this indoor destination "
                                + "a comfortable option.";

            } else {

                score -= 5;

                reason =
                        "Cool temperatures may require suitable clothing "
                                + "for this outdoor activity.";
            }

        /*
         * Wind
         */
        } else if (weather.windSpeed >= 35) {

            if (isOutdoor(destinationType)) {

                score -= 25;

                reason =
                        "Strong wind may make exposed outdoor activities "
                                + "less suitable.";

            } else {

                score += 20;

                reason =
                        "Windy conditions favor this indoor destination.";
            }

        /*
         * UV
         */
        } else if (weather.uvIndex >= 8) {

            if (isIndoor(destinationType)) {

                score += 25;

                reason =
                        "High UV conditions favor indoor activities.";

            } else {

                score -= 5;

                reason =
                        "UV levels are high. Consider shade, hydration, "
                                + "and appropriate sun protection.";
            }

        } else {

            score += 30;

            reason =
                    "Current weather conditions are generally suitable "
                            + "for sightseeing at this destination.";
        }

        /*
         * Humidity
         */
        score += weatherHumidityAdjustment(
                weather.humidity);

        /*
         * Very high wind is an additional outdoor penalty.
         */
        if (weather.windSpeed >= 45
                && isOutdoor(destinationType)) {

            score -= 10;
        }

        /*
         * Severe weather indicator.
         */
        if (weather.severeWeather) {

            score -= 35;

            reason =
                    "Severe weather conditions are detected. "
                            + "Consider postponing this activity or "
                            + "choosing a safer indoor alternative.";
        }

        score =
                clamp(
                        score,
                        0,
                        100);

        return createRecommendation(
                trip,
                destination,
                RecommendationType.WEATHER,
                reason,
                score,
                weather,
                crowd.level,
                time,
                season,
                distance);
    }

    /*
     * =========================================================
     * NEARBY RECOMMENDATION
     * =========================================================
     */

    private Recommendation buildNearbyRecommendation(
            Trip trip,
            TripDestination destination,
            List<TripDestination> destinations,
            WeatherData weather,
            CrowdData crowd,
            LocalDate date,
            LocalTime time,
            String season,
            double distance) {

        double score = 50.0;

        /*
         * Distance ranking.
         */
        if (distance <= 1) {

            score += 35;

        } else if (distance <= 3) {

            score += 28;

        } else if (distance <= 5) {

            score += 20;

        } else if (distance <= 10) {

            score += 10;

        } else if (distance <= 20) {

            score += 0;

        } else {

            score -= 15;
        }

        /*
         * Popularity ranking.
         */
        double popularity =
                destination.getPopularity() == null
                        ? 0
                        : destination.getPopularity();

        score += popularity * 5;

        /*
         * Opening hours.
         */
        boolean open =
                isOpenAt(
                        destination,
                        time);

        if (open) {

            score += 15;

        } else {

            score -= 35;
        }

        /*
         * Crowd adjustment.
         */
        if (crowd.level == CrowdLevel.LOW) {

            score += 10;

        } else if (crowd.level == CrowdLevel.MODERATE) {

            score += 5;

        } else if (crowd.level == CrowdLevel.HIGH) {

            score -= 5;

        } else {

            score -= 15;
        }

        /*
         * Weather suitability for nearby outdoor attractions.
         */
        String indoorOutdoor =
                destination.getIndoorOutdoor() == null
                        ? ""
                        : destination.getIndoorOutdoor().name();

        if (isOutdoor(indoorOutdoor)) {

            if (weather.rainProbability >= 60) {
                score -= 15;
            }

            if (weather.windSpeed >= 35) {
                score -= 10;
            }

            if (weather.uvIndex >= 9) {
                score -= 5;
            }
        }

        score =
                clamp(
                        score,
                        0,
                        100);

        String reason;

        if (!open) {

            reason =
                    "This attraction is approximately "
                            + format(distance)
                            + " km from the trip anchor but is "
                            + "currently closed. Consider visiting "
                            + "during its opening hours.";

        } else if (distance <= 3) {

            reason =
                    "This attraction is approximately "
                            + format(distance)
                            + " km from the trip anchor and is "
                            + "open around the planned time.";

        } else {

            reason =
                    "This attraction is approximately "
                            + format(distance)
                            + " km from the trip anchor and "
                            + "matches the nearby attraction criteria.";
        }

        return createRecommendation(
                trip,
                destination,
                RecommendationType.NEARBY,
                reason,
                score,
                weather,
                crowd.level,
                time,
                season,
                distance);
    }

    /*
     * =========================================================
     * CROWD RECOMMENDATION
     * =========================================================
     */

    private Recommendation buildCrowdRecommendation(
            Trip trip,
            TripDestination destination,
            WeatherData weather,
            CrowdData crowd,
            LocalDate date,
            LocalTime time,
            String season,
            double distance) {

        double score;

        switch (crowd.level) {

            case LOW:
                score = 90;
                break;

            case MODERATE:
                score = 75;
                break;

            case HIGH:
                score = 50;
                break;

            case VERY_HIGH:
                score = 25;
                break;

            default:
                score = 50;
        }

        /*
         * Opening hours influence crowd recommendations.
         */
        if (!isOpenAt(destination, time)) {
            score -= 25;
        }

        /*
         * Weather can change outdoor crowd suitability.
         */
        String indoorOutdoor =
                destination.getIndoorOutdoor() == null
                        ? ""
                        : destination.getIndoorOutdoor().name();

        if (isOutdoor(indoorOutdoor)) {

            if (weather.rainProbability >= 60) {
                score -= 10;
            }

            if (weather.windSpeed >= 35) {
                score -= 5;
            }
        }

        score =
                clamp(
                        score,
                        0,
                        100);

        String reason;

        if (crowd.level == CrowdLevel.LOW) {

            reason =
                    "Estimated crowd level is low. This is a suitable "
                            + "time to visit.";

        } else if (crowd.level == CrowdLevel.MODERATE) {

            reason =
                    "Estimated crowd level is moderate. The attraction "
                            + "should remain reasonably suitable.";

        } else if (crowd.level == CrowdLevel.HIGH) {

            reason =
                    "Estimated crowd level is high. Consider visiting "
                            + "after the busiest period.";

        } else {

            reason =
                    "Estimated crowd level is very high. Consider an "
                            + "alternative time or attraction.";
        }

        return createRecommendation(
                trip,
                destination,
                RecommendationType.CROWD,
                reason,
                score,
                weather,
                crowd.level,
                time,
                season,
                distance);
    }

    /*
     * =========================================================
     * SEASONAL RECOMMENDATION
     * =========================================================
     */

    private Recommendation buildSeasonalRecommendation(
            Trip trip,
            TripDestination destination,
            String season,
            WeatherData weather,
            LocalDate date,
            LocalTime time,
            CrowdData crowd,
            double distance) {

        String category =
                safe(destination.getCategory());

        String indoorOutdoor =
                destination.getIndoorOutdoor() == null
                        ? ""
                        : destination.getIndoorOutdoor().name();

        double score = 50;

        String reason;

        if ("SUMMER".equals(season)) {

            if (containsAny(
                    category,
                    "beach",
                    "water",
                    "museum",
                    "shopping",
                    "cultural")) {

                score += 30;

                reason =
                        "This destination matches common summer "
                                + "travel preferences.";

            } else {

                score += 10;

                reason =
                        "Summer conditions may be suitable, especially "
                                + "during morning or evening.";
            }

        } else if ("MONSOON".equals(season)) {

            if (isIndoor(indoorOutdoor)
                    || containsAny(
                            category,
                            "museum",
                            "gallery",
                            "shopping",
                            "cultural",
                            "restaurant")) {

                score += 35;

                reason =
                        "This destination is suitable for monsoon "
                                + "conditions because it offers indoor "
                                + "or weather-protected activity.";

            } else {

                score -= 10;

                reason =
                        "Monsoon weather may affect outdoor activities. "
                                + "Check the latest forecast before visiting.";
            }

        } else if ("WINTER".equals(season)) {

            if (containsAny(
                    category,
                    "hill",
                    "mountain",
                    "cultural",
                    "historical",
                    "outdoor",
                    "nature")) {

                score += 30;

                reason =
                        "This destination matches common winter "
                                + "sightseeing activities.";

            } else {

                score += 15;

                reason =
                        "Winter conditions may be suitable for this "
                                + "destination.";
            }

        } else {

            score += 25;

            reason =
                    "The current season generally supports sightseeing "
                            + "at this destination.";
        }

        /*
         * Weather-season interaction.
         */
        if (weather.rainProbability >= 70
                && isOutdoor(indoorOutdoor)) {

            score -= 15;

            reason +=
                    " Current rain probability may reduce outdoor suitability.";
        }

        if (weather.temperature >= 35
                && isOutdoor(indoorOutdoor)) {

            score -= 10;

            reason +=
                    " High temperature may make outdoor activity less comfortable.";
        }

        score =
                clamp(
                        score,
                        0,
                        100);

        return createRecommendation(
                trip,
                destination,
                RecommendationType.SEASONAL,
                reason,
                score,
                weather,
                crowd.level,
                time,
                season,
                distance);
    }

    /*
     * =========================================================
     * TIME BASED RECOMMENDATION
     * =========================================================
     */

    private Recommendation buildTimeRecommendation(
            Trip trip,
            TripDestination destination,
            WeatherData weather,
            LocalTime time,
            LocalDate date,
            String season,
            CrowdData crowd,
            double distance) {

        String category =
                safe(destination.getCategory());

        String indoorOutdoor =
                destination.getIndoorOutdoor() == null
                        ? ""
                        : destination.getIndoorOutdoor().name();

        double score = 50;

        String reason;

        int hour =
                time.getHour();

        if (hour >= 6 && hour < 11) {

            if (isOutdoor(indoorOutdoor)
                    || containsAny(
                            category,
                            "park",
                            "historical",
                            "temple",
                            "nature",
                            "sightseeing")) {

                score += 35;

                reason =
                        "Morning is suitable for outdoor sightseeing "
                                + "and historical attractions.";

            } else {

                score += 10;

                reason =
                        "Morning is available for this attraction "
                                + "before peak daytime periods.";
            }

        } else if (hour >= 11 && hour < 16) {

            if (isIndoor(indoorOutdoor)
                    || containsAny(
                            category,
                            "museum",
                            "shopping",
                            "gallery",
                            "restaurant",
                            "cultural")) {

                score += 35;

                reason =
                        "Afternoon conditions favor indoor activities "
                                + "and cultural or shopping destinations.";

            } else {

                score += 5;

                reason =
                        "The attraction can be visited during the "
                                + "afternoon if weather conditions remain suitable.";
            }

        } else if (hour >= 16 && hour < 20) {

            if (containsAny(
                    category,
                    "viewpoint",
                    "restaurant",
                    "entertainment",
                    "shopping",
                    "park")) {

                score += 35;

                reason =
                        "Evening is suitable for viewpoints, dining, "
                                + "shopping, and entertainment.";

            } else {

                score += 15;

                reason =
                        "Evening provides a useful alternative to "
                                + "busy daytime hours.";
            }

        } else {

            if (containsAny(
                    category,
                    "restaurant",
                    "night market",
                    "entertainment")) {

                score += 30;

                reason =
                        "This destination category can suit evening "
                                + "or nighttime activities.";

            } else {

                score -= 10;

                reason =
                        "The planned time is late. Check attraction "
                                + "closing hours before visiting.";
            }
        }

        /*
         * Opening hours.
         */
        if (!isOpenAt(destination, time)) {

            score -= 35;

            reason =
                    "The attraction is currently closed. "
                            + "Choose a time within its opening hours.";

        } else {

            score += 10;
        }

        /*
         * Expected duration.
         *
         * If the destination has a closing time, make sure there is
         * enough remaining time for the planned activity.
         */
        Integer expectedDuration =
                destination.getExpectedDuration();

        if (expectedDuration != null
                && expectedDuration > 0
                && destination.getClosingTime() != null) {

            long availableMinutes =
                    minutesUntilClosing(
                            time,
                            destination.getClosingTime());

            if (availableMinutes >= 0
                    && availableMinutes < expectedDuration) {

                score -= 30;

                reason =
                        "Not enough time is available before the "
                                + "attraction closes for the expected "
                                + "activity duration.";
            }
        }

        /*
         * Weather impact on time selection.
         */
        if (weather.temperature >= 35
                && isOutdoor(indoorOutdoor)
                && hour >= 11
                && hour < 16) {

            score -= 15;

            reason +=
                    " High daytime temperature makes a cooler time preferable.";
        }

        if (weather.rainProbability >= 60
                && isOutdoor(indoorOutdoor)) {

            score -= 15;

            reason +=
                    " Rain probability may affect outdoor plans.";
        }

        if (weather.uvIndex >= 8
                && isOutdoor(indoorOutdoor)
                && hour >= 10
                && hour < 16) {

            score -= 10;

            reason +=
                    " High UV exposure makes morning or evening preferable.";
        }

        score =
                clamp(
                        score,
                        0,
                        100);

        return createRecommendation(
                trip,
                destination,
                RecommendationType.TIME,
                reason,
                score,
                weather,
                crowd.level,
                time,
                season,
                distance);
    }

    /*
     * =========================================================
     * CREATE ENTITY
     * =========================================================
     */

    private Recommendation createRecommendation(
            Trip trip,
            TripDestination destination,
            RecommendationType type,
            String reason,
            double score,
            WeatherData weather,
            CrowdLevel crowdLevel,
            LocalTime time,
            String season,
            double distance) {

        Recommendation recommendation =
                new Recommendation();

        recommendation.setUser(
                trip.getUser());

        recommendation.setTrip(
                trip);

        recommendation.setDestination(
                destination);

        recommendation.setRecommendationType(
                type);

        recommendation.setReason(
                reason);

        recommendation.setScore(
                decimal(score));

        recommendation.setDistance(
                decimal(distance));

        recommendation.setWeatherCondition(
                weather.condition);

        recommendation.setCrowdLevel(
                crowdLevel);

        recommendation.setRecommendedTime(
                time);

        recommendation.setSeason(
                season);

        recommendation.setCreatedAt(
                LocalDateTime.now());

        return recommendation;
    }

    /*
     * =========================================================
     * HISTORY
     * =========================================================
     */

    private RecommendationHistory createHistory(
            Trip trip,
            Integer userId,
            Recommendation recommendation,
            String action,
            String reason) {

        RecommendationHistory history =
                new RecommendationHistory();

        history.setUser(
                trip.getUser());

        history.setTrip(
                trip);

        history.setRecommendation(
                recommendation);

        history.setRecommendationType(
                recommendation.getRecommendationType());

        history.setAction(
                action);

        history.setReason(
                reason);

        history.setCreatedAt(
                LocalDateTime.now());

        return history;
    }

    private String generatedAction(
            RecommendationType type) {

        switch (type) {

            case WEATHER:
                return "Weather Recommendation Generated";

            case NEARBY:
                return "Nearby Attraction Recommended";

            case CROWD:
                return "Crowd Recommendation Generated";

            case SEASONAL:
                return "Seasonal Recommendation Generated";

            case TIME:
                return "Time Based Recommendation Generated";

            default:
                return "Recommendation Generated";
        }
    }

    /*
     * =========================================================
     * TRIP VALIDATION
     * =========================================================
     */

    private Trip getUserTrip(
            Integer tripId,
            Integer userId) {

        if (tripId == null) {

            throw new IllegalArgumentException(
                    "Trip ID is required.");
        }

        if (userId == null) {

            throw new IllegalArgumentException(
                    "User authentication is required.");
        }

        return tripRepository
                .findByTripIdAndUser_UserId(
                        tripId,
                        userId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Trip not found."));
    }

    private void validateDestinations(
            List<TripDestination> destinations) {

        for (TripDestination destination : destinations) {

            if (destination == null) {

                throw new IllegalArgumentException(
                        "Destination information is required.");
            }

            if (destination.getDestinationId() == null) {

                throw new IllegalArgumentException(
                        "Destination ID is required.");
            }

            if (destination.getDestinationName() == null
                    || destination.getDestinationName().isBlank()) {

                throw new IllegalArgumentException(
                        "Destination name is required.");
            }

            if (destination.getLatitude() == null
                    || destination.getLongitude() == null) {

                throw new IllegalArgumentException(
                        "Destination coordinates are required.");
            }

            if (!Double.isFinite(
                    destination.getLatitude())
                    || !Double.isFinite(
                            destination.getLongitude())) {

                throw new IllegalArgumentException(
                        "Destination coordinates must be valid numbers.");
            }

            if (destination.getLatitude() < -90
                    || destination.getLatitude() > 90) {

                throw new IllegalArgumentException(
                        "Destination latitude must be between -90 and 90.");
            }

            if (destination.getLongitude() < -180
                    || destination.getLongitude() > 180) {

                throw new IllegalArgumentException(
                        "Destination longitude must be between -180 and 180.");
            }

            if (destination.getPopularity() != null
                    && (destination.getPopularity() < 0
                    || destination.getPopularity() > 5)) {

                throw new IllegalArgumentException(
                        "Destination popularity must be between 0 and 5.");
            }

            if (destination.getExpectedDuration() != null
                    && destination.getExpectedDuration() < 0) {

                throw new IllegalArgumentException(
                        "Destination expected duration cannot be negative.");
            }

            LocalTime opening =
                    destination.getOpeningTime();

            LocalTime closing =
                    destination.getClosingTime();

            if (opening != null
                    && closing != null
                    && opening.equals(closing)) {

                /*
                 * Equal opening and closing times are treated as
                 * a full-day/open destination for compatibility
                 * with the existing service behavior.
                 */
            }
        }
    }

    /*
     * =========================================================
     * WEATHER
     * =========================================================
     */

    private Map<String, Object> getWeatherSafely(
            TripDestination destination) {

        try {

            Map<String, Object> result =
                    weatherService.getCurrentWeather(
                            destination.getLatitude(),
                            destination.getLongitude());

            if (result == null
                    || result.isEmpty()) {

                throw new IllegalArgumentException(
                        "Weather information is currently unavailable.");
            }

            return result;

        } catch (IllegalArgumentException exception) {

            throw exception;

        } catch (Exception exception) {

            throw new IllegalArgumentException(
                    "Weather information is currently unavailable.");
        }
    }

    private WeatherData extractWeather(
            Map<String, Object> weather) {

        WeatherData data =
                new WeatherData();

        data.temperature =
                findNumber(
                        weather,
                        "temperature",
                        "temperatureC",
                        "temperature_2m",
                        "currentTemperature");

        data.humidity =
                findNumber(
                        weather,
                        "humidity",
                        "relativeHumidity",
                        "relative_humidity_2m");

        data.windSpeed =
                findNumber(
                        weather,
                        "windSpeed",
                        "wind_speed",
                        "wind_speed_10m",
                        "wind");

        data.uvIndex =
                findNumber(
                        weather,
                        "uvIndex",
                        "uv_index");

        data.rainProbability =
                findNumber(
                        weather,
                        "rainProbability",
                        "rain_probability",
                        "precipitationProbability",
                        "precipitation_probability");

        data.condition =
                findString(
                        weather,
                        "condition",
                        "weatherCondition",
                        "description",
                        "weatherDescription");

        /*
         * Open-Meteo commonly exposes current weather as a nested
         * object. Read both the outer and nested structures.
         */
        Object current =
                weather.get("current");

        if (current instanceof Map<?, ?> currentMap) {

            if (data.temperature == 0) {

                data.temperature =
                        findNumberFromMap(
                                currentMap,
                                "temperature_2m",
                                "temperature");
            }

            if (data.humidity == 0) {

                data.humidity =
                        findNumberFromMap(
                                currentMap,
                                "relative_humidity_2m",
                                "humidity");
            }

            if (data.windSpeed == 0) {

                data.windSpeed =
                        findNumberFromMap(
                                currentMap,
                                "wind_speed_10m",
                                "windSpeed");
            }

            if (data.uvIndex == 0) {

                data.uvIndex =
                        findNumberFromMap(
                                currentMap,
                                "uv_index",
                                "uvIndex");
            }

            if (data.rainProbability == 0) {

                data.rainProbability =
                        findNumberFromMap(
                                currentMap,
                                "precipitation_probability",
                                "rain_probability");
            }

            if (data.condition == null
                    || data.condition.isBlank()) {

                data.condition =
                        findStringFromMap(
                                currentMap,
                                "condition",
                                "weatherCondition",
                                "description");
            }

            /*
             * Open-Meteo weather-code support.
             */
            if ((data.condition == null
                    || data.condition.isBlank())) {

                Double weatherCode =
                        findNumberFromMap(
                                currentMap,
                                "weather_code",
                                "weatherCode");

                if (weatherCode != null) {

                    data.weatherCode =
                            weatherCode.intValue();
                }
            }
        }

        /*
         * Some WeatherService responses expose weatherCode
         * directly at the root level.
         */
        if (data.weatherCode == null) {

            Double weatherCode =
                    findNumber(
                            weather,
                            "weather_code",
                            "weatherCode",
                            "code");

            if (weatherCode != 0) {

                data.weatherCode =
                        weatherCode.intValue();
            }
        }

        /*
         * Convert weather code to a human-readable condition.
         */
        if (data.condition == null
                || data.condition.isBlank()) {

            data.condition =
                    weatherCodeToCondition(
                            data.weatherCode,
                            data.rainProbability,
                            data.windSpeed);
        }

        /*
         * Calculate severe-weather indicator.
         */
        data.severeWeather =
                isSevereWeather(
                        data.weatherCode,
                        data.rainProbability,
                        data.windSpeed);

        /*
         * If the provider returned no useful numeric values,
         * retain a useful fallback message instead of returning
         * an empty weather condition.
         */
        if (data.temperature == 0
                && data.humidity == 0
                && data.windSpeed == 0
                && data.uvIndex == 0
                && data.rainProbability == 0
                && (data.condition == null
                || data.condition.isBlank())) {

            data.condition =
                    "Weather data available";
        }

        return data;
    }

    private double findNumber(
            Map<String, Object> map,
            String... keys) {

        if (map == null) {
            return 0;
        }

        for (String key : keys) {

            Object value =
                    map.get(key);

            Double number =
                    toDouble(value);

            if (number != null) {
                return number;
            }
        }

        return 0;
    }


    private double findNumberFromMap(
            Map<?, ?> map,
            String... keys) {

        if (map == null) {
            return 0;
        }

        for (String key : keys) {

            Object value =
                    map.get(key);

            Double number =
                    toDouble(value);

            if (number != null) {
                return number;
            }
        }

        return 0;
    }

    private String findString(
            Map<String, Object> map,
            String... keys) {

        if (map == null) {
            return "";
        }

        for (String key : keys) {

            Object value =
                    map.get(key);

            if (value != null) {

                String text =
                        String.valueOf(value).trim();

                if (!text.isBlank()) {
                    return text;
                }
            }
        }

        return "";
    }

    private String findStringFromMap(
            Map<?, ?> map,
            String... keys) {

        if (map == null) {
            return "";
        }

        for (String key : keys) {

            Object value =
                    map.get(key);

            if (value != null) {

                String text =
                        String.valueOf(value).trim();

                if (!text.isBlank()) {
                    return text;
                }
            }
        }

        return "";
    }

    private Double toDouble(
            Object value) {

        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.doubleValue();
        }

        try {

            return Double.parseDouble(
                    String.valueOf(value));

        } catch (Exception exception) {

            return null;
        }
    }

    /*
     * =========================================================
     * WEATHER CONDITION
     * =========================================================
     */

    private String weatherCodeToCondition(
            Integer weatherCode,
            double rainProbability,
            double windSpeed) {

        if (weatherCode != null) {

            switch (weatherCode) {

                case 0:
                    return "Clear sky";

                case 1:
                    return "Mainly clear";

                case 2:
                    return "Partly cloudy";

                case 3:
                    return "Overcast";

                case 45:
                case 48:
                    return "Foggy";

                case 51:
                case 53:
                case 55:
                    return "Drizzle";

                case 56:
                case 57:
                    return "Freezing drizzle";

                case 61:
                case 63:
                case 65:
                    return "Rain";

                case 66:
                case 67:
                    return "Freezing rain";

                case 71:
                case 73:
                case 75:
                    return "Snow";

                case 77:
                    return "Snow grains";

                case 80:
                case 81:
                case 82:
                    return "Rain showers";

                case 85:
                case 86:
                    return "Snow showers";

                case 95:
                    return "Thunderstorm";

                case 96:
                case 99:
                    return "Thunderstorm with hail";

                default:
                    break;
            }
        }

        if (rainProbability >= 70) {
            return "Rain likely";
        }

        if (rainProbability >= 40) {
            return "Possible rain";
        }

        if (windSpeed >= 35) {
            return "Windy";
        }

        return "Partly cloudy";
    }

    private boolean isSevereWeather(
            Integer weatherCode,
            double rainProbability,
            double windSpeed) {

        if (weatherCode != null) {

            if (weatherCode == 95
                    || weatherCode == 96
                    || weatherCode == 99) {

                return true;
            }
        }

        return windSpeed >= 60
                || rainProbability >= 90;
    }

    /*
     * =========================================================
     * CROWD ESTIMATION
     * =========================================================
     */

    private CrowdData estimateCrowd(
            TripDestination destination,
            LocalTime time,
            LocalDate date) {

        CrowdData data =
                new CrowdData();

        double popularity =
                destination.getPopularity() == null
                        ? 2.5
                        : destination.getPopularity();

        /*
         * Convert 0-5 popularity into a 0-75 crowd contribution.
         */
        double crowdScore =
                popularity * 15;

        int hour =
                time.getHour();

        boolean weekend =
                date.getDayOfWeek()
                        == DayOfWeek.SATURDAY
                        || date.getDayOfWeek()
                        == DayOfWeek.SUNDAY;

        /*
         * Main daytime peak.
         */
        if (hour >= 11 && hour <= 14) {

            crowdScore += 30;

        } else if (hour >= 9 && hour <= 17) {

            crowdScore += 15;
        }

        /*
         * Weekend effect.
         */
        if (weekend) {
            crowdScore += 15;
        }

        /*
         * Opening-hours effect.
         */
        if (!isOpenAt(
                destination,
                time)) {

            /*
             * A closed destination is not treated as highly crowded.
             * The time recommendation handles closure separately.
             */
            crowdScore -= 20;
        }

        if (crowdScore < 30) {

            data.level =
                    CrowdLevel.LOW;

        } else if (crowdScore < 60) {

            data.level =
                    CrowdLevel.MODERATE;

        } else if (crowdScore < 80) {

            data.level =
                    CrowdLevel.HIGH;

        } else {

            data.level =
                    CrowdLevel.VERY_HIGH;
        }

        return data;
    }

    /*
     * =========================================================
     * HAVERSINE DISTANCE
     * =========================================================
     */

    private double calculateHaversineDistance(
            TripDestination first,
            TripDestination second) {

        if (first == null
                || second == null
                || first.getLatitude() == null
                || first.getLongitude() == null
                || second.getLatitude() == null
                || second.getLongitude() == null) {

            throw new IllegalArgumentException(
                    "Destination coordinates are required.");
        }

        double latitude1 =
                Math.toRadians(
                        first.getLatitude());

        double longitude1 =
                Math.toRadians(
                        first.getLongitude());

        double latitude2 =
                Math.toRadians(
                        second.getLatitude());

        double longitude2 =
                Math.toRadians(
                        second.getLongitude());

        double deltaLatitude =
                latitude2 - latitude1;

        double deltaLongitude =
                longitude2 - longitude1;

        double a =
                Math.sin(deltaLatitude / 2)
                        * Math.sin(deltaLatitude / 2)
                        + Math.cos(latitude1)
                        * Math.cos(latitude2)
                        * Math.sin(deltaLongitude / 2)
                        * Math.sin(deltaLongitude / 2);

        double c =
                2 * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a));

        /*
         * Mean earth radius in kilometres.
         */
        double earthRadiusKm =
                6371.0088;

        return earthRadiusKm * c;
    }

    /*
     * =========================================================
     * OPENING HOURS
     * =========================================================
     */

    private boolean isOpenAt(
            TripDestination destination,
            LocalTime time) {

        LocalTime opening =
                destination.getOpeningTime();

        LocalTime closing =
                destination.getClosingTime();

        /*
         * No hours supplied means we cannot reject the attraction.
         */
        if (opening == null
                || closing == null) {

            return true;
        }

        /*
         * Existing project behavior:
         * equal opening/closing values represent full-day availability.
         */
        if (opening.equals(closing)) {
            return true;
        }

        /*
         * Normal same-day opening period.
         */
        if (opening.isBefore(closing)) {

            return !time.isBefore(opening)
                    && !time.isAfter(closing);
        }

        /*
         * Overnight opening period, e.g. 18:00 -> 02:00.
         */
        return !time.isAfter(closing)
                || !time.isBefore(opening);
    }

    private long minutesUntilClosing(
            LocalTime currentTime,
            LocalTime closingTime) {

        if (closingTime == null) {
            return -1;
        }

        if (closingTime.equals(currentTime)) {
            return 0;
        }

        if (closingTime.isAfter(currentTime)) {

            return java.time.Duration
                    .between(
                            currentTime,
                            closingTime)
                    .toMinutes();
        }

        /*
         * Overnight closing time.
         */
        return java.time.Duration
                .between(
                        currentTime,
                        closingTime.plusHours(24))
                .toMinutes();
    }

    /*
     * =========================================================
     * SEASON
     * =========================================================
     */

    private String determineSeason(
            LocalDate date) {

        Month month =
                date.getMonth();

        switch (month) {

            case MARCH:
            case APRIL:
            case MAY:
                return "SUMMER";

            case JUNE:
            case JULY:
            case AUGUST:
            case SEPTEMBER:
                return "MONSOON";

            case OCTOBER:
            case NOVEMBER:
            case DECEMBER:
            case JANUARY:
            case FEBRUARY:
            default:
                return "WINTER";
        }
    }

    /*
     * =========================================================
     * DATE / TIME
     * =========================================================
     */

    private LocalDate resolveDate(
            Trip trip,
            String plannedDate) {

        if (plannedDate != null
                && !plannedDate.isBlank()) {

            try {

                LocalDate date =
                        LocalDate.parse(
                                plannedDate.trim());

                if (trip.getStartDate() != null
                        && date.isBefore(
                                trip.getStartDate())) {

                    throw new IllegalArgumentException(
                            "Planned date must be within the trip dates.");
                }

                if (trip.getEndDate() != null
                        && date.isAfter(
                                trip.getEndDate())) {

                    throw new IllegalArgumentException(
                            "Planned date must be within the trip dates.");
                }

                return date;

            } catch (DateTimeParseException exception) {

                throw new IllegalArgumentException(
                        "Planned date must use YYYY-MM-DD format.");
            }
        }

        if (trip.getStartDate() != null) {

            return trip.getStartDate();
        }

        return LocalDate.now();
    }

    private LocalTime resolveTime(
            String plannedTime) {

        if (plannedTime != null
                && !plannedTime.isBlank()) {

            try {

                return LocalTime.parse(
                        plannedTime.trim());

            } catch (DateTimeParseException exception) {

                throw new IllegalArgumentException(
                        "Planned time must use HH:mm format.");
            }
        }

        return LocalTime.now(
                ZoneId.of("Asia/Kolkata"));
    }

    /*
     * =========================================================
     * RESPONSE
     * =========================================================
     */

    private Map<String, Object> toResponse(
            Recommendation recommendation) {

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "recommendationId",
                recommendation.getRecommendationId());

        result.put(
                "tripId",
                recommendation.getTrip() == null
                        ? null
                        : recommendation.getTrip().getTripId());

        result.put(
                "destinationId",
                recommendation.getDestination() == null
                        ? null
                        : recommendation.getDestination()
                                .getDestinationId());

        result.put(
                "destinationName",
                recommendation.getDestination() == null
                        ? null
                        : recommendation.getDestination()
                                .getDestinationName());

        result.put(
                "recommendationType",
                recommendation.getRecommendationType() == null
                        ? null
                        : recommendation.getRecommendationType()
                                .name());

        result.put(
                "reason",
                recommendation.getReason());

        result.put(
                "score",
                recommendation.getScore());

        result.put(
                "distanceKm",
                recommendation.getDistance());

        result.put(
                "weatherCondition",
                recommendation.getWeatherCondition());

        result.put(
                "crowdLevel",
                recommendation.getCrowdLevel() == null
                        ? null
                        : recommendation.getCrowdLevel().name());

        result.put(
                "recommendedTime",
                recommendation.getRecommendedTime());

        result.put(
                "season",
                recommendation.getSeason());

        result.put(
                "createdAt",
                recommendation.getCreatedAt());

        return result;
    }

    /*
     * =========================================================
     * ACTION NORMALIZATION
     * =========================================================
     */

    private String normalizeAction(
            String action) {

        String normalized =
                action.trim()
                        .replace("_", " ")
                        .replace("-", " ")
                        .toLowerCase(Locale.ROOT);

        switch (normalized) {

            case "viewed":
            case "recommendation viewed":
                return "Recommendation Viewed";

            case "accepted":
            case "recommendation accepted":
                return "Recommendation Accepted";

            case "rejected":
            case "recommendation rejected":
                return "Recommendation Rejected";

            case "used":
            case "used in itinerary":
            case "recommendation used in itinerary":
                return "Recommendation Used in Itinerary";

            default:
                throw new IllegalArgumentException(
                        "Invalid recommendation action. "
                                + "Use Viewed, Accepted, Rejected, "
                                + "or Used in Itinerary.");
        }
    }

    /*
     * =========================================================
     * STRING / CATEGORY HELPERS
     * =========================================================
     */

    private boolean isIndoor(
            String value) {

        String normalized =
                safe(value)
                        .toUpperCase(Locale.ROOT);

        return normalized.contains("INDOOR")
                && !normalized.contains("OUTDOOR");
    }

    private boolean isOutdoor(
            String value) {

        String normalized =
                safe(value)
                        .toUpperCase(Locale.ROOT);

        return normalized.contains("OUTDOOR");
    }

    private boolean containsAny(
            String value,
            String... terms) {

        String normalized =
                safe(value)
                        .toLowerCase(Locale.ROOT);

        for (String term : terms) {

            if (normalized.contains(
                    term.toLowerCase(Locale.ROOT))) {

                return true;
            }
        }

        return false;
    }

    /*
     * =========================================================
     * WEATHER SCORING
     * =========================================================
     */

    private double weatherHumidityAdjustment(
            double humidity) {

        if (humidity >= 90) {
            return -15;
        }

        if (humidity >= 85) {
            return -10;
        }

        if (humidity >= 70) {
            return -5;
        }

        if (humidity >= 40
                && humidity <= 70) {

            return 5;
        }

        return 0;
    }

    /*
     * =========================================================
     * GENERAL HELPERS
     * =========================================================
     */

    private double clamp(
            double value,
            double minimum,
            double maximum) {

        return Math.max(
                minimum,
                Math.min(
                        maximum,
                        value));
    }

    private BigDecimal decimal(
            double value) {

        return BigDecimal
                .valueOf(value)
                .setScale(
                        2,
                        RoundingMode.HALF_UP);
    }

    private String format(
            double value) {

        return String.format(
                Locale.US,
                "%.2f",
                value);
    }

    private String safe(
            String value) {

        return value == null
                ? ""
                : value.trim();
    }

    /*
     * =========================================================
     * INTERNAL DATA CLASSES
     * =========================================================
     */

    private static class WeatherData {

        double temperature;

        double rainProbability;

        double humidity;

        double windSpeed;

        double uvIndex;

        Integer weatherCode;

        boolean severeWeather;

        String condition = "";

        Map<String, Object> toMap() {

            Map<String, Object> map =
                    new LinkedHashMap<>();

            map.put(
                    "temperature",
                    temperature);

            map.put(
                    "rainProbability",
                    rainProbability);

            map.put(
                    "humidity",
                    humidity);

            map.put(
                    "windSpeed",
                    windSpeed);

            map.put(
                    "uvIndex",
                    uvIndex);

            map.put(
                    "condition",
                    condition);

            return map;
        }
    }

    private static class CrowdData {

        CrowdLevel level =
                CrowdLevel.MODERATE;

    }
}