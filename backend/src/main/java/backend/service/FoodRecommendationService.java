package backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.dto.FoodActionRequest;
import backend.dto.FoodHistoryResponse;
import backend.dto.FoodRecommendationRequest;
import backend.dto.FoodRecommendationResponse;
import backend.entity.Food;
import backend.entity.FoodCategory;
import backend.entity.FoodHistory;
import backend.entity.FoodPlace;
import backend.entity.FoodPlaceType;
import backend.entity.FoodRecommendation;
import backend.entity.FoodType;
import backend.entity.MealPeriod;
import backend.entity.SpiceLevel;
import backend.entity.Trip;
import backend.entity.TripDestination;
import backend.repository.FoodHistoryRepository;
import backend.repository.FoodPlaceRepository;
import backend.repository.FoodRecommendationRepository;
import backend.repository.FoodRepository;
import backend.repository.TripDestinationRepository;
import backend.repository.TripRepository;

@Service
public class FoodRecommendationService {

    private final FoodRepository foodRepository;
    private final FoodPlaceRepository foodPlaceRepository;
    private final FoodRecommendationRepository foodRecommendationRepository;
    private final FoodHistoryRepository foodHistoryRepository;
    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final WeatherService weatherService;

    public FoodRecommendationService(
            FoodRepository foodRepository,
            FoodPlaceRepository foodPlaceRepository,
            FoodRecommendationRepository foodRecommendationRepository,
            FoodHistoryRepository foodHistoryRepository,
            TripRepository tripRepository,
            TripDestinationRepository tripDestinationRepository,
            WeatherService weatherService) {

        this.foodRepository = foodRepository;
        this.foodPlaceRepository = foodPlaceRepository;
        this.foodRecommendationRepository = foodRecommendationRepository;
        this.foodHistoryRepository = foodHistoryRepository;
        this.tripRepository = tripRepository;
        this.tripDestinationRepository = tripDestinationRepository;
        this.weatherService = weatherService;
    }

    /*
     * =========================================================
     * GENERATE RECOMMENDATIONS
     * =========================================================
     */

    @Transactional
    public List<FoodRecommendationResponse> generateRecommendations(
            Integer userId,
            Integer tripId,
            FoodRecommendationRequest request) {

        Trip trip = getUserTrip(
                tripId,
                userId);

        validateTripDates(trip);

        List<TripDestination> destinations =
                tripDestinationRepository
                        .findByTrip_TripIdOrderByDestinationOrderAsc(
                                tripId);

        if (destinations == null
                || destinations.isEmpty()) {

            throw new IllegalArgumentException(
                    "No destinations are configured for this trip.");
        }

        TripDestination destination =
                resolveDestination(
                        tripId,
                        request == null
                                ? null
                                : request.getDestinationId(),
                        destinations);

        LocalDate plannedDate =
                request != null
                        && request.getPlannedDate() != null
                                ? request.getPlannedDate()
                                : trip.getStartDate();

        LocalTime plannedTime =
                request != null
                        && request.getPlannedTime() != null
                                ? request.getPlannedTime()
                                : LocalTime.now();

        validatePlannedDate(
                trip,
                plannedDate);

        String recommendationType =
                normalizeRecommendationType(
                        request == null
                                ? null
                                : request.getRecommendationType());

        MealPeriod mealPeriod =
                parseMealPeriod(
                        request == null
                                ? null
                                : request.getMealPeriod());

        if (mealPeriod == null) {
            mealPeriod =
                    determineMealPeriod(
                            plannedTime);
        }

        WeatherData weather =
                loadWeather(destination);

        List<Food> foods =
                foodRepository
                        .findByDestination_DestinationId(
                                destination.getDestinationId());

        List<FoodPlace> foodPlaces =
                foodPlaceRepository
                        .findByDestination_DestinationId(
                                destination.getDestinationId());

        if (foods.isEmpty()
                && foodPlaces.isEmpty()) {

            throw new IllegalArgumentException(
                    "No local food recommendations are currently available for this destination.");
        }

        List<Candidate> candidates =
                new ArrayList<>();

        /*
         * ---------------------------------------------------------
         * FOOD CANDIDATES
         * ---------------------------------------------------------
         */

        for (Food food : foods) {

            if (!matchesFoodFilters(
                    food,
                    request)) {

                continue;
            }

            Candidate candidate =
                    buildFoodCandidate(
                            destination,
                            food,
                            request,
                            plannedTime,
                            mealPeriod,
                            weather);

            candidates.add(candidate);
        }

        /*
         * ---------------------------------------------------------
         * FOOD PLACE CANDIDATES
         * ---------------------------------------------------------
         */

        for (FoodPlace place : foodPlaces) {

            if (!matchesFoodPlaceFilters(
                    place,
                    request)) {

                continue;
            }

            double distance =
                    calculateDistanceKm(
                            destination.getLatitude(),
                            destination.getLongitude(),
                            place.getLatitude(),
                            place.getLongitude());

            if (request != null
                    && request.getMaxDistanceKm() != null
                    && distance >
                    request.getMaxDistanceKm()) {

                continue;
            }

            /*
             * Closed places are not recommended.
             */
            if (!isOpenAt(
                    place,
                    plannedTime)) {

                continue;
            }

            Candidate candidate =
                    buildFoodPlaceCandidate(
                            destination,
                            place,
                            request,
                            plannedTime,
                            mealPeriod,
                            weather,
                            distance);

            candidates.add(candidate);
        }

        candidates =
                filterByRecommendationType(
                        candidates,
                        recommendationType,
                        request);

        if (candidates.isEmpty()) {

            if (hasDietaryFilter(request)) {

                throw new IllegalArgumentException(
                        "No food options match your selected preferences.");
            }

            if (hasApplicableClosedPlace(
                    foodPlaces,
                    request,
                    plannedTime)) {

                throw new IllegalArgumentException(
                        "This food place is currently closed.");
            }

            throw new IllegalArgumentException(
                    "No food options match your selected preferences.");
        }

        /*
 * Highest score first.
 *
 * Explicit Double.compare avoids the IDE null-type-safety
 * warning associated with Comparator method references.
 */
candidates.sort(
        (left, right) ->
                Double.compare(
                        right.getScore(),
                        left.getScore()));

List<FoodRecommendationResponse> responses =
        new ArrayList<>();
        /*
         * Preserve previous recommendations because history
         * references those records.
         */
        for (Candidate candidate : candidates) {

            FoodRecommendation recommendation =
                    new FoodRecommendation();

            recommendation.setUser(
                    trip.getUser());

            recommendation.setTrip(
                    trip);

            recommendation.setDestination(
                    candidate.destination);

            recommendation.setFood(
                    candidate.food);

            recommendation.setFoodPlace(
                    candidate.foodPlace);

            recommendation.setRecommendationType(
                    candidate.recommendationType);

            recommendation.setReason(
                    candidate.reason);

            recommendation.setScore(
                    decimal(
                            candidate.score));

            recommendation.setDistanceKm(
                    decimal(
                            candidate.distanceKm));

            recommendation.setMealPeriod(
                    candidate.mealPeriod);

            recommendation.setRecommendedTime(
                    plannedTime);

            recommendation.setWeatherCondition(
                    weather.condition);

            recommendation.setBudgetMatch(
                    candidate.budgetMatch);

            recommendation.setPreferenceMatch(
                    candidate.preferenceMatch);

            recommendation.setDietaryMatch(
                    candidate.dietaryMatch);

            FoodRecommendation saved =
                    foodRecommendationRepository.save(
                            recommendation);

            responses.add(
                    toResponse(saved));
        }

        return responses;
    }

    /*
     * =========================================================
     * GET RECOMMENDATIONS
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<FoodRecommendationResponse> getRecommendations(
            Integer userId,
            Integer tripId) {

        getUserTrip(
                tripId,
                userId);

        return foodRecommendationRepository
                .findByTrip_TripIdOrderByScoreDescCreatedAtDesc(
                        tripId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FoodRecommendationResponse> getRecommendationsByType(
            Integer userId,
            Integer tripId,
            String type) {

        getUserTrip(
                tripId,
                userId);

        String normalized =
                normalizeRecommendationType(type);

        return foodRecommendationRepository
                .findByTrip_TripIdAndRecommendationTypeOrderByScoreDescCreatedAtDesc(
                        tripId,
                        normalized)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /*
     * =========================================================
     * HISTORY
     * =========================================================
     */

    @Transactional(readOnly = true)
    public List<FoodHistoryResponse> getHistory(
            Integer userId,
            Integer tripId) {

        getUserTrip(
                tripId,
                userId);

        return foodHistoryRepository
                .findByTrip_TripIdOrderByCreatedAtDesc(
                        tripId)
                .stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    /*
     * =========================================================
     * RECORD ACTION
     * =========================================================
     */

    @Transactional
    public FoodHistoryResponse recordAction(
            Integer userId,
            Integer tripId,
            Integer foodRecommendationId,
            FoodActionRequest request) {

        Trip trip =
                getUserTrip(
                        tripId,
                        userId);

        if (request == null
                || request.getAction() == null
                || request.getAction().isBlank()) {

            throw new IllegalArgumentException(
                    "Food recommendation action is required.");
        }

        FoodRecommendation recommendation =
                foodRecommendationRepository
                        .findByFoodRecommendationIdAndTrip_TripId(
                                foodRecommendationId,
                                tripId)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Food recommendation not found."));

        String action =
                normalizeAction(
                        request.getAction());

        validateActionCombination(
                action,
                recommendation);

        FoodHistory history =
                new FoodHistory();

        history.setUser(
                trip.getUser());

        history.setTrip(
                trip);

        history.setFood(
                recommendation.getFood());

        history.setFoodPlace(
                recommendation.getFoodPlace());

        history.setFoodRecommendation(
                recommendation);

        history.setAction(
                action);

        history.setRecommendationType(
                recommendation.getRecommendationType());

        history.setReason(
                request.getReason());

        FoodHistory saved =
                foodHistoryRepository.save(
                        history);

        return toHistoryResponse(
                saved);
    }

    /*
     * =========================================================
     * FOOD CANDIDATE
     * =========================================================
     */

    private Candidate buildFoodCandidate(
            TripDestination destination,
            Food food,
            FoodRecommendationRequest request,
            LocalTime plannedTime,
            MealPeriod mealPeriod,
            WeatherData weather) {

        Candidate candidate =
                new Candidate();

        candidate.destination =
                destination;

        candidate.food =
                food;

        candidate.foodPlace =
                null;

        candidate.mealPeriod =
                mealPeriod;

        candidate.distanceKm =
                0.0;

        candidate.budgetMatch =
                matchesBudget(
                        food.getPrice(),
                        request == null
                                ? null
                                : request.getBudgetRange());

        candidate.preferenceMatch =
                matchesFoodPreference(
                        food,
                        request == null
                                ? null
                                : request.getFoodPreference());

        candidate.dietaryMatch =
                matchesDietaryPreference(
                        food,
                        request == null
                                ? null
                                : request.getDietaryPreference());

        candidate.recommendationType =
                determineFoodRecommendationType(
                        food,
                        request,
                        mealPeriod);

        double score =
                50.0;

        score +=
                mealMatchScore(
                        food,
                        mealPeriod);

        score +=
                popularityScore(
                        food.getPopularity());

        if (candidate.budgetMatch) {
            score += 12;
        } else {
            score -= 8;
        }

        if (candidate.preferenceMatch) {
            score += 15;
        }

        if (candidate.dietaryMatch) {
            score += 15;
        }

        score +=
                weatherFoodAdjustment(
                        weather,
                        food);

        candidate.score =
                clamp(
                        score,
                        0,
                        100);

        candidate.reason =
                buildFoodReason(
                        food,
                        mealPeriod,
                        weather,
                        candidate);

        return candidate;
    }

    /*
     * =========================================================
     * FOOD PLACE CANDIDATE
     * =========================================================
     */

    private Candidate buildFoodPlaceCandidate(
            TripDestination destination,
            FoodPlace place,
            FoodRecommendationRequest request,
            LocalTime plannedTime,
            MealPeriod mealPeriod,
            WeatherData weather,
            double distance) {

        Candidate candidate =
                new Candidate();

        candidate.destination =
                destination;

        candidate.food =
                null;

        candidate.foodPlace =
                place;

        candidate.mealPeriod =
                mealPeriod;

        candidate.distanceKm =
                distance;

        candidate.budgetMatch =
                matchesBudgetRange(
                        place.getPriceRange(),
                        request == null
                                ? null
                                : request.getBudgetRange());

        candidate.preferenceMatch =
                matchesPlacePreference(
                        place,
                        request == null
                                ? null
                                : request.getFoodPreference());

        candidate.dietaryMatch =
                matchesPlaceDietaryPreference(
                        place,
                        request == null
                                ? null
                                : request.getDietaryPreference());

        candidate.recommendationType =
                determinePlaceRecommendationType(
                        place,
                        request,
                        distance);

        double score =
                45.0;

        score +=
                distanceScore(
                        distance);

        score +=
                popularityScore(
                        place.getPopularity());

        score +=
                ratingScore(
                        place.getRating());

        if (candidate.budgetMatch) {
            score += 12;
        } else {
            score -= 8;
        }

        if (candidate.preferenceMatch) {
            score += 12;
        }

        if (candidate.dietaryMatch) {
            score += 15;
        }

        if (isOpenAt(
                place,
                plannedTime)) {
            score += 15;
        }

        score +=
                weatherFoodPlaceAdjustment(
                        weather,
                        place);

        candidate.score =
                clamp(
                        score,
                        0,
                        100);

        candidate.reason =
                buildPlaceReason(
                        place,
                        distance,
                        mealPeriod,
                        weather,
                        candidate);

        return candidate;
    }

    /*
     * =========================================================
     * FOOD FILTERS
     * =========================================================
     */

    private boolean matchesFoodFilters(
            Food food,
            FoodRecommendationRequest request) {

        if (request == null) {
            return true;
        }

        FoodType requestedFoodType =
                parseFoodType(
                        request.getFoodType());

        if (requestedFoodType != null
                && food.getFoodType()
                != requestedFoodType) {

            return false;
        }

        FoodCategory requestedCategory =
                parseFoodCategory(
                        request.getCategory());

        if (requestedCategory != null
                && food.getCategory()
                != requestedCategory) {

            return false;
        }

        MealPeriod requestedMeal =
                parseMealPeriod(
                        request.getMealPeriod());

        if (requestedMeal != null
                && food.getRecommendedMeal() != null
                && food.getRecommendedMeal()
                != requestedMeal) {

            return false;
        }

        SpiceLevel requestedSpice =
                parseSpiceLevel(
                        request.getSpiceLevel());

        if (requestedSpice != null
                && food.getSpiceLevel()
                != requestedSpice) {

            return false;
        }

        if (request.getCuisine() != null
                && !request.getCuisine().isBlank()
                && !containsIgnoreCase(
                        food.getCuisine(),
                        request.getCuisine())) {

            return false;
        }

        if (request.getDietaryPreference() != null
                && !request.getDietaryPreference().isBlank()
                && !matchesDietaryPreference(
                        food,
                        request.getDietaryPreference())) {

            return false;
        }

        if (request.getFoodPreference() != null
                && !request.getFoodPreference().isBlank()
                && !matchesFoodPreference(
                        food,
                        request.getFoodPreference())) {

            return false;
        }

        if (request.getBudgetRange() != null
                && !request.getBudgetRange().isBlank()
                && !matchesBudget(
                        food.getPrice(),
                        request.getBudgetRange())) {

            return false;
        }

        return true;
    }

    /*
     * =========================================================
     * FOOD PLACE FILTERS
     * =========================================================
     */

    private boolean matchesFoodPlaceFilters(
            FoodPlace place,
            FoodRecommendationRequest request) {

        if (request == null) {

            return !isAlcoholPlace(place);
        }

        FoodPlaceType requestedPlaceType =
                parseFoodPlaceType(
                        request.getPlaceType());

        if (requestedPlaceType != null
                && place.getPlaceType()
                != requestedPlaceType) {

            return false;
        }

        if (!isAllowedOptionalEstablishment(
                place,
                request)) {

            return false;
        }

        String requestedType =
                normalizeRecommendationType(
                        request.getRecommendationType());

        if (requestedType.equals("FOOD_AND_BEVERAGE")
                && Boolean.TRUE.equals(
                        request.getIncludeLocalDrinks())
                && !Boolean.TRUE.equals(
                        place.getLocalDrinksAvailable())) {

            return false;
        }

        if (requestedType.equals("FOOD_AND_BEVERAGE")
                && Boolean.FALSE.equals(
                        request.getIncludeLocalDrinks())
                && Boolean.TRUE.equals(
                        place.getLocalDrinksAvailable())) {

            return false;
        }

        if (request.getCuisine() != null
                && !request.getCuisine().isBlank()
                && !containsIgnoreCase(
                        place.getCuisine(),
                        request.getCuisine())) {

            return false;
        }

        if (request.getDietaryPreference() != null
                && !request.getDietaryPreference().isBlank()
                && !matchesPlaceDietaryPreference(
                        place,
                        request.getDietaryPreference())) {

            return false;
        }

        if (request.getFoodPreference() != null
                && !request.getFoodPreference().isBlank()
                && !matchesPlacePreference(
                        place,
                        request.getFoodPreference())) {

            return false;
        }

        if (request.getBudgetRange() != null
                && !request.getBudgetRange().isBlank()
                && !matchesBudgetRange(
                        place.getPriceRange(),
                        request.getBudgetRange())) {

            return false;
        }

        return true;
    }

    private boolean isAllowedOptionalEstablishment(
            FoodPlace place,
            FoodRecommendationRequest request) {

        FoodPlaceType type =
                place.getPlaceType();

        boolean bar =
                type == FoodPlaceType.BAR
                        || type == FoodPlaceType.PUB
                        || type == FoodPlaceType.BREWPUB
                        || type == FoodPlaceType.LOUNGE;

        boolean restrobar =
                type == FoodPlaceType.RESTROBAR
                        || type == FoodPlaceType.RESTAURANT_WITH_BAR;

        if (bar) {

            return Boolean.TRUE.equals(
                    request.getIncludeBars());
        }

        if (restrobar) {

            return Boolean.TRUE.equals(
                    request.getIncludeRestrobars());
        }

        return true;
    }

    /*
     * =========================================================
     * RECOMMENDATION TYPES
     * =========================================================
     */

    private String determineFoodRecommendationType(
            Food food,
            FoodRecommendationRequest request,
            MealPeriod mealPeriod) {

        if (request != null
                && request.getRecommendationType() != null
                && !request.getRecommendationType().isBlank()) {

            return normalizeRecommendationType(
                    request.getRecommendationType());
        }

        if (food.getCategory()
                == FoodCategory.TRADITIONAL_SPECIALTY) {

            return "TRADITIONAL_DISH";
        }

        if (food.getRecommendedMeal()
                == mealPeriod) {

            return "MEAL_TIME";
        }

        if (food.getPopularity() != null
                && food.getPopularity() >= 8) {

            return "POPULAR_LOCAL_FOOD";
        }

        return "LOCAL_FOOD";
    }

    private String determinePlaceRecommendationType(
            FoodPlace place,
            FoodRecommendationRequest request,
            double distance) {

        FoodPlaceType type =
                place.getPlaceType();

        String requestedType =
                request == null
                        ? "ALL"
                        : normalizeRecommendationType(
                                request.getRecommendationType());

        /*
         * Explicit recommendation types always take precedence over
         * automatic classification. This keeps the response type
         * consistent with the user's request.
         */
        if (requestedType.equals("FOOD_AND_BEVERAGE")
                && Boolean.TRUE.equals(
                        place.getAlcoholAvailable())) {

            return "FOOD_AND_BEVERAGE";
        }

        if (requestedType.equals("BAR")
                && isBarType(type)) {

            return "BAR";
        }

        if (requestedType.equals("RESTROBAR")
                && isRestrobarType(type)) {

            return "RESTROBAR";
        }

        if (requestedType.equals("FOOD_PLACE")) {
            return "FOOD_PLACE";
        }

        if (requestedType.equals("NEARBY_FOOD")
                && distance <= 5) {
            return "NEARBY_FOOD";
        }

        if (requestedType.equals("FOOD_AND_BEVERAGE")
                && Boolean.TRUE.equals(
                        request == null
                                ? null
                                : request.getIncludeFoodAndBeverage())
                && Boolean.TRUE.equals(
                        place.getAlcoholAvailable())) {

            return "FOOD_AND_BEVERAGE";
        }

        if (isBarType(type)) {
            return "BAR";
        }

        if (isRestrobarType(type)) {
            return "RESTROBAR";
        }

        if (request != null
                && Boolean.TRUE.equals(
                        request.getIncludeFoodAndBeverage())
                && Boolean.TRUE.equals(
                        place.getAlcoholAvailable())) {

            return "FOOD_AND_BEVERAGE";
        }

        if (distance <= 5) {
            return "NEARBY_FOOD";
        }

        return "FOOD_PLACE";
    }

    private List<Candidate> filterByRecommendationType(
            List<Candidate> candidates,
            String type,
            FoodRecommendationRequest request) {

        if (type == null
                || type.isBlank()
                || type.equals("ALL")) {

            return candidates;
        }

        List<Candidate> result =
                new ArrayList<>();

        for (Candidate candidate : candidates) {

            /*
             * FOOD_PLACE must return only FoodPlace candidates.
             */
            if (type.equals("FOOD_PLACE")) {

                if (candidate.foodPlace != null) {
                    result.add(candidate);
                }

                continue;
            }

            /*
             * BAR must return only BAR/PUB/BREWPUB/LOUNGE places.
             */
            if (type.equals("BAR")) {

                if (candidate.foodPlace != null
                        && isBarType(
                                candidate.foodPlace.getPlaceType())) {

                    result.add(candidate);
                }

                continue;
            }

            /*
             * RESTROBAR must return only RESTROBAR or
             * RESTAURANT_WITH_BAR places.
             */
            if (type.equals("RESTROBAR")) {

                if (candidate.foodPlace != null
                        && isRestrobarType(
                                candidate.foodPlace.getPlaceType())) {

                    result.add(candidate);
                }

                continue;
            }

            /*
             * FOOD_AND_BEVERAGE requires a food place with alcohol
             * availability. Local-drink preference is enforced here
             * as an explicit positive/negative filter.
             */
            if (type.equals("FOOD_AND_BEVERAGE")) {

                if (candidate.foodPlace == null
                        || !Boolean.TRUE.equals(
                                candidate.foodPlace
                                        .getAlcoholAvailable())) {

                    continue;
                }

                if (request != null
                        && Boolean.TRUE.equals(
                                request.getIncludeLocalDrinks())
                        && !Boolean.TRUE.equals(
                                candidate.foodPlace
                                        .getLocalDrinksAvailable())) {

                    continue;
                }

                if (request != null
                        && Boolean.FALSE.equals(
                                request.getIncludeLocalDrinks())
                        && Boolean.TRUE.equals(
                                candidate.foodPlace
                                        .getLocalDrinksAvailable())) {

                    continue;
                }

                result.add(candidate);
                continue;
            }

            /*
             * LOCAL_FOOD must return only Food records. The requested
             * type is intentionally not compared with the candidate's
             * derived type because a traditional/popular dish is still
             * valid local food when LOCAL_FOOD was explicitly requested.
             */
            if (type.equals("LOCAL_FOOD")) {

                if (candidate.food != null) {
                    result.add(candidate);
                }

                continue;
            }

            /*
             * TRADITIONAL_DISH must return traditional Food records.
             */
            if (type.equals("TRADITIONAL_DISH")) {

                if (candidate.food != null
                        && candidate.food.getCategory()
                        == FoodCategory.TRADITIONAL_SPECIALTY) {

                    result.add(candidate);
                }

                continue;
            }

            /*
             * NEARBY_FOOD is specifically a nearby FoodPlace result.
             */
            if (type.equals("NEARBY_FOOD")) {

                if (candidate.foodPlace != null
                        && candidate.distanceKm <= 5) {

                    result.add(candidate);
                }

                continue;
            }

            /*
             * Remaining food recommendation types use the candidate
             * classification while keeping either a food or place source.
             */
            if (type.equals(candidate.recommendationType)
                    && (candidate.food != null
                    || candidate.foodPlace != null)) {

                result.add(candidate);
            }
        }

        return result;
    }

    private boolean isBarType(
            FoodPlaceType type) {

        return type == FoodPlaceType.BAR
                || type == FoodPlaceType.PUB
                || type == FoodPlaceType.BREWPUB
                || type == FoodPlaceType.LOUNGE;
    }

    private boolean isRestrobarType(
            FoodPlaceType type) {

        return type == FoodPlaceType.RESTROBAR
                || type == FoodPlaceType.RESTAURANT_WITH_BAR;
    }

    private String normalizeRecommendationType(
            String value) {

        if (value == null
                || value.isBlank()) {

            return "ALL";
        }

        String normalized =
                value.trim()
                        .replace("-", "_")
                        .replace(" ", "_")
                        .toUpperCase(Locale.ROOT);

        return switch (normalized) {

            case "LOCAL",
                 "FOOD" ->
                    "LOCAL_FOOD";

            case "TRADITIONAL" ->
                    "TRADITIONAL_DISH";

            case "NEARBY" ->
                    "NEARBY_FOOD";

            case "MEAL" ->
                    "MEAL_TIME";

            case "PREFERENCE" ->
                    "FOOD_PREFERENCE";

            case "POPULAR" ->
                    "POPULAR_LOCAL_FOOD";

            case "PLACE" ->
                    "FOOD_PLACE";

            case "RESTOBAR" ->
                    "RESTROBAR";

            default ->
                    normalized;
        };
    }

    /*
     * =========================================================
     * STRING -> ENUM CONVERSION
     * =========================================================
     *
     * These methods fix the exact type errors shown in VS Code.
     */

    private FoodType parseFoodType(
            String value) {

        if (value == null
                || value.isBlank()) {
            return null;
        }

        try {
            return FoodType.valueOf(
                    value.trim()
                            .replace("-", "_")
                            .replace(" ", "_")
                            .toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private FoodCategory parseFoodCategory(
            String value) {

        if (value == null
                || value.isBlank()) {
            return null;
        }

        try {
            return FoodCategory.valueOf(
                    value.trim()
                            .replace("-", "_")
                            .replace(" ", "_")
                            .toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private MealPeriod parseMealPeriod(
            String value) {

        if (value == null
                || value.isBlank()) {
            return null;
        }

        try {
            return MealPeriod.valueOf(
                    value.trim()
                            .replace("-", "_")
                            .replace(" ", "_")
                            .toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private SpiceLevel parseSpiceLevel(
            String value) {

        if (value == null
                || value.isBlank()) {
            return null;
        }

        try {
            return SpiceLevel.valueOf(
                    value.trim()
                            .replace("-", "_")
                            .replace(" ", "_")
                            .toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private FoodPlaceType parseFoodPlaceType(
            String value) {

        if (value == null
                || value.isBlank()) {
            return null;
        }

        try {
            return FoodPlaceType.valueOf(
                    value.trim()
                            .replace("-", "_")
                            .replace(" ", "_")
                            .toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    /*
     * =========================================================
     * MEAL PERIOD
     * =========================================================
     */

    private MealPeriod determineMealPeriod(
            LocalTime time) {

        if (time == null) {
            return MealPeriod.AFTERNOON;
        }

        int hour =
                time.getHour();

        if (hour >= 5
                && hour < 11) {

            return MealPeriod.MORNING;
        }

        if (hour >= 11
                && hour < 16) {

            return MealPeriod.AFTERNOON;
        }

        if (hour >= 16
                && hour < 21) {

            return MealPeriod.EVENING;
        }

        return MealPeriod.NIGHT;
    }

    /*
     * =========================================================
     * WEATHER
     * =========================================================
     */

    private WeatherData loadWeather(
            TripDestination destination) {

        WeatherData data =
                new WeatherData();

        try {

            Map<String, Object> weather =
                    weatherService.getCurrentWeather(
                            destination.getLatitude(),
                            destination.getLongitude());

            if (weather == null) {

                data.condition =
                        "Weather information unavailable";

                return data;
            }

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
            }

            if (data.condition == null
                    || data.condition.isBlank()) {

                data.condition =
                        "Weather data available";
            }

            data.severeWeather =
                    data.rainProbability >= 90
                            || data.windSpeed >= 60;

        } catch (Exception exception) {

            data.condition =
                    "Weather information unavailable";
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
                return String.valueOf(value);
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
                return String.valueOf(value);
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
     * WEATHER SCORING
     * =========================================================
     */

    private double weatherFoodAdjustment(
            WeatherData weather,
            Food food) {

        double score = 0;

        if (weather.rainProbability >= 70) {

            if (food.getCategory()
                    == FoodCategory.BEVERAGE
                    || food.getCategory()
                    == FoodCategory.DESSERT) {

                score += 8;
            }
        }

        if (weather.temperature >= 30
                && food.getCategory()
                == FoodCategory.BEVERAGE) {

            score += 10;
        }

        if (weather.severeWeather) {
            score -= 5;
        }

        return score;
    }

    private double weatherFoodPlaceAdjustment(
            WeatherData weather,
            FoodPlace place) {

        double score = 0;

        if (weather.rainProbability >= 70) {

            if (isIndoorPlace(place)) {
                score += 15;
            } else {
                score -= 15;
            }
        }

        if (weather.windSpeed >= 35
                && isIndoorPlace(place)) {

            score += 8;
        }

        if (weather.uvIndex >= 8
                && isIndoorPlace(place)) {

            score += 8;
        }

        return score;
    }

    private boolean isIndoorPlace(
            FoodPlace place) {

        FoodPlaceType type =
                place.getPlaceType();

        return type == FoodPlaceType.RESTAURANT
                || type == FoodPlaceType.CAFE
                || type == FoodPlaceType.BAR
                || type == FoodPlaceType.PUB
                || type == FoodPlaceType.RESTROBAR
                || type == FoodPlaceType.BREWPUB
                || type == FoodPlaceType.LOUNGE
                || type == FoodPlaceType.RESTAURANT_WITH_BAR;
    }

    /*
     * =========================================================
     * SCORING
     * =========================================================
     */

    private double mealMatchScore(
            Food food,
            MealPeriod mealPeriod) {

        if (food.getRecommendedMeal() == null
                || mealPeriod == null) {

            return 0;
        }

        return food.getRecommendedMeal()
                == mealPeriod
                ? 20
                : -5;
    }

    private double popularityScore(
            Double popularity) {

        if (popularity == null) {
            return 0;
        }

        return clamp(
                popularity * 2,
                0,
                20);
    }

    private double ratingScore(
            BigDecimal rating) {

        if (rating == null) {
            return 0;
        }

        return clamp(
                rating.doubleValue() * 2,
                0,
                10);
    }

    private double distanceScore(
            double distanceKm) {

        if (distanceKm <= 1) {
            return 25;
        }

        if (distanceKm <= 3) {
            return 20;
        }

        if (distanceKm <= 5) {
            return 15;
        }

        if (distanceKm <= 10) {
            return 8;
        }

        if (distanceKm <= 20) {
            return 2;
        }

        return -10;
    }

    /*
     * =========================================================
     * FOOD PREFERENCES
     * =========================================================
     */

    private boolean matchesFoodPreference(
            Food food,
            String preference) {

        if (preference == null
                || preference.isBlank()) {

            return true;
        }

        String target =
                preference.toLowerCase(
                        Locale.ROOT);

        return containsIgnoreCase(
                food.getDishName(),
                target)

                || containsIgnoreCase(
                food.getCuisine(),
                target)

                || containsIgnoreCase(
                food.getCategory() == null
                        ? null
                        : food.getCategory().name(),
                target)

                || containsIgnoreCase(
                food.getDescription(),
                target)

                || containsIgnoreCase(
                food.getIngredients(),
                target)

                || containsIgnoreCase(
                food.getFoodType() == null
                        ? null
                        : food.getFoodType().name(),
                target);
    }

    private boolean matchesPlacePreference(
            FoodPlace place,
            String preference) {

        if (preference == null
                || preference.isBlank()) {

            return true;
        }

        String target =
                preference.toLowerCase(
                        Locale.ROOT);

        return containsIgnoreCase(
                place.getName(),
                target)

                || containsIgnoreCase(
                place.getCuisine(),
                target)

                || containsIgnoreCase(
                place.getPlaceType() == null
                        ? null
                        : place.getPlaceType().name(),
                target)

                || containsIgnoreCase(
                place.getDescription(),
                target);
    }

    /*
     * =========================================================
     * DIETARY
     * =========================================================
     */

    private boolean matchesDietaryPreference(
            Food food,
            String preference) {

        if (preference == null
                || preference.isBlank()) {

            return true;
        }

        if (food.getFoodType() == null) {
            return false;
        }

        String normalized =
                preference.trim()
                        .toLowerCase(
                                Locale.ROOT);

        FoodType type =
                food.getFoodType();

        if (containsAny(
                normalized,
                "vegetarian",
                "veg")) {

            return type == FoodType.VEGETARIAN;
        }

        if (containsAny(
                normalized,
                "vegan")) {

            return type == FoodType.VEGAN;
        }

        if (containsAny(
                normalized,
                "egg free",
                "egg-free",
                "eggfree")) {

            return type == FoodType.EGG_FREE
                    || type == FoodType.VEGAN;
        }

        if (containsAny(
                normalized,
                "dairy free",
                "dairy-free",
                "dairyfree")) {

            return type == FoodType.DAIRY_FREE
                    || type == FoodType.VEGAN;
        }

        if (containsAny(
                normalized,
                "gluten free",
                "gluten-free",
                "glutenfree")) {

            return type == FoodType.GLUTEN_FREE
                    || type == FoodType.VEGAN;
        }

        return containsIgnoreCase(
                type.name(),
                normalized);
    }

    private boolean matchesPlaceDietaryPreference(
            FoodPlace place,
            String preference) {

        if (preference == null
                || preference.isBlank()) {

            return true;
        }

        String normalized =
                preference.trim()
                        .toLowerCase(
                                Locale.ROOT);

        if (containsAny(
                normalized,
                "vegan")) {

            return Boolean.TRUE.equals(
                    place.getVeganAvailable());
        }

        if (containsAny(
                normalized,
                "vegetarian",
                "veg")) {

            return Boolean.TRUE.equals(
                    place.getVegetarianAvailable());
        }

        String dietaryInformation =
                safe(
                        place.getDietaryInformation())
                        .toLowerCase(
                                Locale.ROOT);

        return dietaryInformation.contains(
                normalized);
    }

    private boolean hasDietaryFilter(
            FoodRecommendationRequest request) {

        return request != null
                && request.getDietaryPreference() != null
                && !request.getDietaryPreference().isBlank();
    }

    /*
     * =========================================================
     * BUDGET
     * =========================================================
     */

    private boolean matchesBudget(
            BigDecimal price,
            String budgetRange) {

        if (budgetRange == null
                || budgetRange.isBlank()) {

            return true;
        }

        if (price == null) {
            return false;
        }

        String range =
                budgetRange.trim()
                        .toLowerCase(
                                Locale.ROOT);

        double value =
                price.doubleValue();

        if (containsAny(
                range,
                "low",
                "budget",
                "cheap")) {

            return value <= 500;
        }

        if (containsAny(
                range,
                "mid",
                "medium",
                "moderate")) {

            return value > 500
                    && value <= 1500;
        }

        if (containsAny(
                range,
                "high",
                "premium",
                "luxury")) {

            return value > 1500;
        }

        double[] numbers =
                extractNumbers(range);

        if (numbers.length >= 2) {

            return value >= numbers[0]
                    && value <= numbers[1];
        }

        if (numbers.length == 1) {

            if (range.contains("under")
                    || range.contains("below")
                    || range.contains("less")) {

                return value <= numbers[0];
            }

            if (range.contains("above")
                    || range.contains("over")
                    || range.contains("more")) {

                return value >= numbers[0];
            }
        }

        return true;
    }

    private boolean matchesBudgetRange(
            String priceRange,
            String budgetRange) {

        if (budgetRange == null
                || budgetRange.isBlank()) {

            return true;
        }

        if (priceRange == null
                || priceRange.isBlank()) {

            return false;
        }

        String foodRange =
                priceRange.toLowerCase(
                        Locale.ROOT);

        String requested =
                budgetRange.toLowerCase(
                        Locale.ROOT);

        if (requested.contains("low")
                || requested.contains("budget")
                || requested.contains("cheap")) {

            return containsAny(
                    foodRange,
                    "low",
                    "budget",
                    "cheap",
                    "0-500",
                    "under 500");
        }

        if (requested.contains("mid")
                || requested.contains("medium")
                || requested.contains("moderate")) {

            return containsAny(
                    foodRange,
                    "medium",
                    "mid",
                    "moderate",
                    "500-1500");
        }

        if (requested.contains("high")
                || requested.contains("premium")
                || requested.contains("luxury")) {

            return containsAny(
                    foodRange,
                    "high",
                    "premium",
                    "luxury",
                    "1500+",
                    "above 1500");
        }

        return containsIgnoreCase(
                priceRange,
                budgetRange);
    }

    private double[] extractNumbers(
            String value) {

        String[] parts =
                value.replaceAll(
                                "[^0-9.]+",
                                " ")
                        .trim()
                        .split("\\s+");

        List<Double> numbers =
                new ArrayList<>();

        for (String part : parts) {

            if (part.isBlank()) {
                continue;
            }

            try {

                numbers.add(
                        Double.parseDouble(
                                part));

            } catch (NumberFormatException ignored) {
            }
        }

        double[] result =
                new double[numbers.size()];

        for (int i = 0;
             i < numbers.size();
             i++) {

            result[i] =
                    numbers.get(i);
        }

        return result;
    }

    /*
     * =========================================================
     * OPENING HOURS
     * =========================================================
     */

    private boolean isOpenAt(
            FoodPlace place,
            LocalTime time) {

        LocalTime opening =
                place.getOpeningTime();

        LocalTime closing =
                place.getClosingTime();

        if (opening == null
                || closing == null
                || time == null) {

            return true;
        }

        if (opening.equals(closing)) {
            return true;
        }

        if (opening.isBefore(closing)) {

            return !time.isBefore(opening)
                    && !time.isAfter(closing);
        }

        /*
         * Overnight establishment.
         */
        return !time.isBefore(opening)
                || !time.isAfter(closing);
    }

    private boolean hasApplicableClosedPlace(
            List<FoodPlace> places,
            FoodRecommendationRequest request,
            LocalTime time) {

        boolean foundApplicable =
                false;

        for (FoodPlace place : places) {

            if (!matchesFoodPlaceFilters(
                    place,
                    request)) {

                continue;
            }

            foundApplicable = true;

            if (isOpenAt(
                    place,
                    time)) {

                return false;
            }
        }

        return foundApplicable;
    }

    /*
     * =========================================================
     * DISTANCE
     * =========================================================
     */

    private double calculateDistanceKm(
            Double latitude1,
            Double longitude1,
            Double latitude2,
            Double longitude2) {

        if (!validCoordinate(
                latitude1,
                longitude1)
                || !validCoordinate(
                latitude2,
                longitude2)) {

            throw new IllegalArgumentException(
                    "Destination coordinates are required.");
        }

        double earthRadiusKm =
                6371.0088;

        double lat1 =
                Math.toRadians(
                        latitude1);

        double lat2 =
                Math.toRadians(
                        latitude2);

        double deltaLat =
                Math.toRadians(
                        latitude2 - latitude1);

        double deltaLon =
                Math.toRadians(
                        longitude2 - longitude1);

        double a =
                Math.sin(deltaLat / 2)
                        * Math.sin(deltaLat / 2)
                        + Math.cos(lat1)
                        * Math.cos(lat2)
                        * Math.sin(deltaLon / 2)
                        * Math.sin(deltaLon / 2);

        double c =
                2 * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a));

        return earthRadiusKm * c;
    }

    private boolean validCoordinate(
            Double latitude,
            Double longitude) {

        return latitude != null
                && longitude != null
                && latitude >= -90
                && latitude <= 90
                && longitude >= -180
                && longitude <= 180;
    }

    /*
     * =========================================================
     * REASONS
     * =========================================================
     */

    private String buildFoodReason(
            Food food,
            MealPeriod mealPeriod,
            WeatherData weather,
            Candidate candidate) {

        StringBuilder reason =
                new StringBuilder();

        reason.append(
                food.getDishName())
                .append(
                        " is recommended");

        if (food.getCategory()
                == FoodCategory.TRADITIONAL_SPECIALTY) {

            reason.append(
                    " as a traditional local specialty");
        }

        if (food.getRecommendedMeal()
                == mealPeriod) {

            reason.append(
                    " for the current meal period");
        }

        if (candidate.budgetMatch) {

            reason.append(
                    " and matches the selected budget");
        }

        if (candidate.dietaryMatch) {

            reason.append(
                    " and dietary preference");
        }

        if (weather.condition != null
                && !weather.condition.isBlank()) {

            reason.append(
                    ". Weather: ")
                    .append(
                            weather.condition);
        }

        return reason.toString();
    }

    private String buildPlaceReason(
            FoodPlace place,
            double distanceKm,
            MealPeriod mealPeriod,
            WeatherData weather,
            Candidate candidate) {

        StringBuilder reason =
                new StringBuilder();

        reason.append(
                place.getName())
                .append(
                        " is a suitable food location");

        if (distanceKm <= 5) {

            reason.append(
                    " within ")
                    .append(
                            String.format(
                                    Locale.US,
                                    "%.2f",
                                    distanceKm))
                    .append(
                            " km");
        }

        if (candidate.budgetMatch) {

            reason.append(
                    " and matches the selected budget");
        }

        if (candidate.dietaryMatch) {

            reason.append(
                    " and dietary preference");
        }

        if (weather.rainProbability >= 70
                && isIndoorPlace(place)) {

            reason.append(
                    ". Indoor location is suitable for rainy conditions");
        }

        return reason.toString();
    }

    /*
     * =========================================================
     * TRIP VALIDATION
     * =========================================================
     */

    private Trip getUserTrip(
            Integer tripId,
            Integer userId) {

        if (tripId == null
                || userId == null) {

            throw new IllegalArgumentException(
                    "Trip and user are required.");
        }

        return tripRepository
                .findByTripIdAndUser_UserId(
                        tripId,
                        userId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Trip not found."));
    }

    private TripDestination resolveDestination(
            Integer tripId,
            Integer destinationId,
            List<TripDestination> destinations) {

        if (destinationId != null) {

            return tripDestinationRepository
                    .findByDestinationIdAndTrip_TripId(
                            destinationId,
                            tripId)
                    .orElseThrow(
                            () -> new IllegalArgumentException(
                                    "Destination not found for this trip."));
        }

        return destinations.get(0);
    }

    private void validateTripDates(
            Trip trip) {

        if (trip.getStartDate() == null
                || trip.getEndDate() == null) {

            throw new IllegalArgumentException(
                    "Trip start date and end date are required.");
        }

        if (trip.getEndDate()
                .isBefore(
                        trip.getStartDate())) {

            throw new IllegalArgumentException(
                    "Trip end date cannot be before trip start date.");
        }
    }

    private void validatePlannedDate(
            Trip trip,
            LocalDate plannedDate) {

        if (plannedDate == null) {

            throw new IllegalArgumentException(
                    "Planned date is required.");
        }

        if (plannedDate.isBefore(
                trip.getStartDate())
                || plannedDate.isAfter(
                trip.getEndDate())) {

            throw new IllegalArgumentException(
                    "Planned date must be within the trip dates.");
        }
    }

    /*
     * =========================================================
     * ACTIONS
     * =========================================================
     */

    private String normalizeAction(
            String action) {

        String normalized =
                action.trim()
                        .replace("_", " ")
                        .replace("-", " ")
                        .toLowerCase(
                                Locale.ROOT);

        return switch (normalized) {

            case "local food recommended" ->
                    "Local Food Recommended";

            case "traditional dish recommended" ->
                    "Traditional Dish Recommended";

            case "nearby food recommended" ->
                    "Nearby Food Recommended";

            case "food recommendation viewed",
                 "viewed" ->
                    "Food Recommendation Viewed";

            case "food recommendation selected",
                 "selected" ->
                    "Food Recommendation Selected";

            case "food recommendation rejected",
                 "rejected" ->
                    "Food Recommendation Rejected";

            case "food added to itinerary",
                 "added to itinerary" ->
                    "Food Added to Itinerary";

            case "food removed from itinerary",
                 "removed from itinerary" ->
                    "Food Removed from Itinerary";

            case "food place viewed",
                 "place viewed" ->
                    "Food Place Viewed";

            case "bar recommended" ->
                    "Bar Recommended";

            case "restrobar recommended" ->
                    "Restrobar Recommended";

            case "establishment viewed" ->
                    "Establishment Viewed";

            case "establishment selected" ->
                    "Establishment Selected";

            case "food beverage option selected",
                 "food + beverage option selected" ->
                    "Food + Beverage Option Selected";

            case "establishment added to itinerary" ->
                    "Establishment Added to Itinerary";

            case "establishment removed from itinerary" ->
                    "Establishment Removed from Itinerary";

            default ->
                    throw new IllegalArgumentException(
                            "Invalid food recommendation action.");
        };
    }

    private void validateActionCombination(
            String action,
            FoodRecommendation recommendation) {

        if (action.equals(
                "Bar Recommended")
                || action.equals(
                "Restrobar Recommended")
                || action.equals(
                "Food + Beverage Option Selected")) {

            if (recommendation.getFoodPlace() == null) {

                throw new IllegalArgumentException(
                        "This action requires a food place recommendation.");
            }
        }
    }

    /*
     * =========================================================
     * RESPONSE
     * =========================================================
     *
     * IMPORTANT:
     * FoodRecommendationResponse uses String values for
     * enum-style fields. Therefore we convert enum -> String here.
     * This fixes the setMealPeriod error from the screenshot.
     */

    private FoodRecommendationResponse toResponse(
            FoodRecommendation recommendation) {

        FoodRecommendationResponse response =
                new FoodRecommendationResponse();

        Food food =
                recommendation.getFood();

        FoodPlace place =
                recommendation.getFoodPlace();

        TripDestination destination =
                recommendation.getDestination();

        response.setFoodRecommendationId(
                recommendation.getFoodRecommendationId());

        response.setUserId(
                recommendation.getUser() == null
                        ? null
                        : recommendation.getUser()
                                .getUserId());

        response.setTripId(
                recommendation.getTrip() == null
                        ? null
                        : recommendation.getTrip()
                                .getTripId());

        response.setDestinationId(
                destination == null
                        ? null
                        : destination.getDestinationId());

        response.setFoodId(
                food == null
                        ? null
                        : food.getFoodId());

        response.setFoodPlaceId(
                place == null
                        ? null
                        : place.getFoodPlaceId());

        response.setDishName(
                food == null
                        ? null
                        : food.getDishName());

        response.setFoodPlaceName(
                place == null
                        ? null
                        : place.getName());

        response.setRecommendationType(
                recommendation.getRecommendationType());

        response.setCuisine(
                food != null
                        ? food.getCuisine()
                        : place == null
                                ? null
                                : place.getCuisine());

        /*
         * Enum -> String
         */
        response.setCategory(
                food == null
                        || food.getCategory() == null
                                ? null
                                : food.getCategory().name());

        /*
         * Enum -> String
         */
        response.setFoodType(
                food == null
                        || food.getFoodType() == null
                                ? null
                                : food.getFoodType().name());

        /*
         * Enum -> String
         */
        response.setSpiceLevel(
                food == null
                        || food.getSpiceLevel() == null
                                ? null
                                : food.getSpiceLevel().name());

        /*
         * Enum -> String
         */
        response.setMealPeriod(
                recommendation.getMealPeriod() == null
                        ? null
                        : recommendation
                                .getMealPeriod()
                                .name());

        /*
         * Enum -> String
         */
        response.setPlaceType(
                place == null
                        || place.getPlaceType() == null
                                ? null
                                : place.getPlaceType().name());

        response.setDescription(
                food != null
                        ? food.getDescription()
                        : place == null
                                ? null
                                : place.getDescription());

        response.setIngredients(
                food == null
                        ? null
                        : food.getIngredients());

        response.setPrice(
                food == null
                        ? null
                        : food.getPrice());

        response.setPriceRange(
                place == null
                        ? null
                        : place.getPriceRange());

        response.setPopularity(
                food != null
                        ? food.getPopularity()
                        : place == null
                                ? null
                                : place.getPopularity());

        response.setRating(
                place == null
                        ? null
                        : place.getRating());

        response.setLatitude(
                place != null
                        ? place.getLatitude()
                        : destination == null
                                ? null
                                : destination.getLatitude());

        response.setLongitude(
                place != null
                        ? place.getLongitude()
                        : destination == null
                                ? null
                                : destination.getLongitude());

        response.setScore(
                recommendation.getScore());

        response.setDistanceKm(
                recommendation.getDistanceKm());

        response.setRecommendedTime(
                recommendation.getRecommendedTime());

        response.setWeatherCondition(
                recommendation.getWeatherCondition());

        response.setReason(
                recommendation.getReason());

        response.setBudgetMatch(
                recommendation.getBudgetMatch());

        response.setPreferenceMatch(
                recommendation.getPreferenceMatch());

        response.setDietaryMatch(
                recommendation.getDietaryMatch());

        response.setVegetarianAvailable(
                place == null
                        ? null
                        : place.getVegetarianAvailable());

        response.setVeganAvailable(
                place == null
                        ? null
                        : place.getVeganAvailable());

        response.setDietaryInformation(
                place == null
                        ? null
                        : place.getDietaryInformation());

        response.setOpeningTime(
                place == null
                        ? null
                        : place.getOpeningTime());

        response.setClosingTime(
                place == null
                        ? null
                        : place.getClosingTime());

        response.setCurrentlyOpen(
                place == null
                        ? null
                        : isOpenAt(
                                place,
                                recommendation
                                        .getRecommendedTime()));

        response.setAlcoholAvailable(
                place == null
                        ? null
                        : place.getAlcoholAvailable());

        response.setLocalDrinksAvailable(
                place == null
                        ? null
                        : place.getLocalDrinksAvailable());

        response.setCreatedAt(
                recommendation.getCreatedAt());

        return response;
    }

    /*
     * =========================================================
     * HISTORY RESPONSE
     * =========================================================
     */

    private FoodHistoryResponse toHistoryResponse(
            FoodHistory history) {

        FoodHistoryResponse response =
                new FoodHistoryResponse();

        response.setHistoryId(
                history.getHistoryId());

        response.setUserId(
                history.getUser() == null
                        ? null
                        : history.getUser()
                                .getUserId());

        response.setTripId(
                history.getTrip() == null
                        ? null
                        : history.getTrip()
                                .getTripId());

        response.setFoodId(
                history.getFood() == null
                        ? null
                        : history.getFood()
                                .getFoodId());

        response.setFoodPlaceId(
                history.getFoodPlace() == null
                        ? null
                        : history.getFoodPlace()
                                .getFoodPlaceId());

        response.setFoodRecommendationId(
                history.getFoodRecommendation() == null
                        ? null
                        : history.getFoodRecommendation()
                                .getFoodRecommendationId());

        response.setDishName(
                history.getFood() == null
                        ? null
                        : history.getFood()
                                .getDishName());

        response.setFoodPlaceName(
                history.getFoodPlace() == null
                        ? null
                        : history.getFoodPlace()
                                .getName());

        response.setRecommendationType(
                history.getRecommendationType());

        response.setAction(
                history.getAction());

        response.setReason(
                history.getReason());

        response.setCreatedAt(
                history.getCreatedAt());

        return response;
    }

    /*
     * =========================================================
     * GENERAL HELPERS
     * =========================================================
     */

    private boolean containsIgnoreCase(
            String source,
            String target) {

        if (source == null
                || target == null) {

            return false;
        }

        return source.toLowerCase(
                        Locale.ROOT)
                .contains(
                        target.toLowerCase(
                                Locale.ROOT));
    }

    private boolean containsAny(
            String value,
            String... terms) {

        if (value == null) {
            return false;
        }

        String normalized =
                value.toLowerCase(
                        Locale.ROOT);

        for (String term : terms) {

            if (normalized.contains(
                    term.toLowerCase(
                            Locale.ROOT))) {

                return true;
            }
        }

        return false;
    }

    private String safe(
            String value) {

        return value == null
                ? ""
                : value.trim();
    }

    private boolean isAlcoholPlace(
            FoodPlace place) {

        if (place == null) {
            return false;
        }

        FoodPlaceType type =
                place.getPlaceType();

        return type == FoodPlaceType.BAR
                || type == FoodPlaceType.PUB
                || type == FoodPlaceType.RESTROBAR
                || type == FoodPlaceType.BREWPUB
                || type == FoodPlaceType.LOUNGE
                || type == FoodPlaceType.RESTAURANT_WITH_BAR;
    }

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

        if (!Double.isFinite(value)) {
            value = 0;
        }

        return BigDecimal
                .valueOf(value)
                .setScale(
                        2,
                        RoundingMode.HALF_UP);
    }

    /*
     * =========================================================
     * INTERNAL CLASSES
     * =========================================================
     */

    private static class WeatherData {

        double temperature;

        double rainProbability;

        double humidity;

        double windSpeed;

        double uvIndex;

        boolean severeWeather;

        String condition =
                "Weather data available";
    }

    private static class Candidate {

        TripDestination destination;

        Food food;

        FoodPlace foodPlace;

        String recommendationType;

        String reason;

        double score;

        double distanceKm;

        MealPeriod mealPeriod;

        boolean budgetMatch;

        boolean preferenceMatch;

        boolean dietaryMatch;

        double getScore() {
            return score;
        }
    }
}