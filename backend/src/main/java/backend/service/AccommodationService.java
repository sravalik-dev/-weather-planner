package backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.dto.AccommodationHistoryResponse;
import backend.dto.AccommodationRequest;
import backend.dto.AccommodationResponse;
import backend.dto.AccommodationSearchRequest;
import backend.entity.Accommodation;
import backend.entity.AccommodationHistory;
import backend.entity.AccommodationType;
import backend.entity.PoolType;
import backend.entity.Trip;
import backend.entity.User;
import backend.repository.AccommodationHistoryRepository;
import backend.repository.AccommodationRepository;
import backend.repository.TripRepository;
import backend.repository.UserRepository;

@Service
@Transactional
public class AccommodationService {

    @Autowired
    private AccommodationRepository accommodationRepository;

    @Autowired
    private AccommodationHistoryRepository historyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripRepository tripRepository;

    // ============================================================
    // CREATE
    // ============================================================

    public AccommodationResponse create(
            AccommodationRequest request,
            Integer userId) {

        validateRequest(request);

        getUser(userId);

        Accommodation accommodation = new Accommodation();

        applyRequest(accommodation, request);

        Accommodation saved =
                accommodationRepository.save(accommodation);

        return AccommodationResponse.fromEntity(saved);
    }

    // ============================================================
    // GET ALL
    // ============================================================

    @Transactional(readOnly = true)
    public List<AccommodationResponse> getAll() {

        return accommodationRepository
                .findAllByOrderByRatingDesc()
                .stream()
                .map(AccommodationResponse::fromEntity)
                .toList();
    }

    // ============================================================
    // GET BY ID
    // ============================================================

    @Transactional(readOnly = true)
    public AccommodationResponse getById(Integer id) {

        Accommodation accommodation =
                getAccommodation(id);

        return AccommodationResponse.fromEntity(accommodation);
    }

    // ============================================================
    // UPDATE
    // ============================================================

    public AccommodationResponse update(
            Integer id,
            AccommodationRequest request,
            Integer userId) {

        validateRequest(request);

        getUser(userId);

        Accommodation accommodation =
                getAccommodation(id);

        applyRequest(accommodation, request);

        Accommodation saved =
                accommodationRepository.save(accommodation);

        return AccommodationResponse.fromEntity(saved);
    }

    // ============================================================
    // DELETE
    // ============================================================

    public void delete(
            Integer id,
            Integer userId) {

        getUser(userId);

        Accommodation accommodation =
                getAccommodation(id);

        long historyCount =
                historyRepository
                        .countByAccommodation_AccommodationId(id);

        if (historyCount > 0) {

            throw new IllegalArgumentException(
                    "Accommodation cannot be deleted because history exists. "
                    + "Set availability to false instead.");
        }

        accommodationRepository.delete(accommodation);
    }

    // ============================================================
    // SEARCH / RECOMMENDATION ENGINE
    // ============================================================

    public List<AccommodationResponse> search(
            AccommodationSearchRequest request,
            Integer userId) {

        validateSearchRequest(request);

        getUser(userId);

        String destination =
                request.getDestination();

        List<Accommodation> accommodations;

        if (destination != null
                && !destination.isBlank()) {

            accommodations =
                    accommodationRepository
                            .findByDestinationContainingIgnoreCaseAndAvailabilityTrueOrderByRatingDesc(
                                    destination.trim());

        } else {

            accommodations =
                    accommodationRepository
                            .findByAvailabilityTrueOrderByRatingDesc();
        }

        List<AccommodationResponse> results =
                new ArrayList<>();

        for (Accommodation accommodation : accommodations) {

            if (!matchesBasicFilters(
                    accommodation,
                    request)) {

                continue;
            }

            Double distanceKm = null;

            if (request.getLatitude() != null
                    && request.getLongitude() != null
                    && accommodation.getLatitude() != null
                    && accommodation.getLongitude() != null) {

                distanceKm =
                        calculateDistanceKm(
                                request.getLatitude().doubleValue(),
                                request.getLongitude().doubleValue(),
                                accommodation.getLatitude().doubleValue(),
                                accommodation.getLongitude().doubleValue());

                if (request.getMaxDistanceKm() != null
                        && distanceKm > request.getMaxDistanceKm()) {

                    continue;
                }
            }

            AccommodationResponse response =
                    AccommodationResponse.fromEntity(
                            accommodation);

            response.setDistanceKm(distanceKm);

            double score =
                    calculateMatchScore(
                            accommodation,
                            request,
                            distanceKm);

            response.setMatchScore(score);

            results.add(response);
        }

        // ========================================================
        // SAFE SORTING
        // ========================================================

        results.sort((a, b) -> {

            // ----------------------------------------------------
            // MATCH SCORE
            // ----------------------------------------------------

            Double scoreA =
                    a.getMatchScore();

            Double scoreB =
                    b.getMatchScore();

            if (scoreA == null
                    && scoreB != null) {

                return 1;
            }

            if (scoreA != null
                    && scoreB == null) {

                return -1;
            }

            if (scoreA != null
                    && scoreB != null) {

                int result =
                        Double.compare(
                                scoreB,
                                scoreA);

                if (result != 0) {
                    return result;
                }
            }

            // ----------------------------------------------------
            // RATING
            // ----------------------------------------------------

            BigDecimal ratingA =
                    a.getRating();

            BigDecimal ratingB =
                    b.getRating();

            if (ratingA == null
                    && ratingB != null) {

                return 1;
            }

            if (ratingA != null
                    && ratingB == null) {

                return -1;
            }

            if (ratingA != null
                    && ratingB != null) {

                int result =
                        ratingB.compareTo(
                                ratingA);

                if (result != 0) {
                    return result;
                }
            }

            // ----------------------------------------------------
            // PRICE
            // ----------------------------------------------------

            BigDecimal priceA =
                    a.getPricePerNight();

            BigDecimal priceB =
                    b.getPricePerNight();

            if (priceA == null
                    && priceB != null) {

                return 1;
            }

            if (priceA != null
                    && priceB == null) {

                return -1;
            }

            if (priceA != null
                    && priceB != null) {

                return priceA.compareTo(
                        priceB);
            }

            return 0;
        });

        // ========================================================
        // NO RESULTS
        // ========================================================

        if (results.isEmpty()) {

            throw new IllegalArgumentException(
                    buildNoMatchMessage(request));
        }

        // Save recommendation/filter history.
        saveSearchHistory(
                request,
                userId,
                results);

        return results;
    }

    // ============================================================
    // GET BY TYPE
    // ============================================================

    @Transactional(readOnly = true)
    public List<AccommodationResponse> getByType(
            AccommodationType type) {

        if (type == null) {

            throw new IllegalArgumentException(
                    "Accommodation type is required.");
        }

        return accommodationRepository
                .findByAccommodationTypeAndAvailabilityTrueOrderByRatingDesc(
                        type)
                .stream()
                .map(AccommodationResponse::fromEntity)
                .toList();
    }

    // ============================================================
    // BEACH ACCOMMODATIONS
    // ============================================================

    @Transactional(readOnly = true)
    public List<AccommodationResponse> getBeachAccommodations() {

        return accommodationRepository
                .findByBeachViewTrueAndAvailabilityTrueOrderByRatingDesc()
                .stream()
                .map(AccommodationResponse::fromEntity)
                .toList();
    }

    // ============================================================
    // POOL ACCOMMODATIONS
    // ============================================================

    @Transactional(readOnly = true)
    public List<AccommodationResponse> getPoolAccommodations() {

        return accommodationRepository
                .findBySwimmingPoolTrueAndAvailabilityTrueOrderByRatingDesc()
                .stream()
                .map(AccommodationResponse::fromEntity)
                .toList();
    }

    // ============================================================
    // BEACH + POOL ACCOMMODATIONS
    // ============================================================

    @Transactional(readOnly = true)
    public List<AccommodationResponse> getBeachPoolAccommodations() {

        return accommodationRepository
                .findByBeachViewTrueAndSwimmingPoolTrueAndAvailabilityTrueOrderByRatingDesc()
                .stream()
                .map(AccommodationResponse::fromEntity)
                .toList();
    }

    // ============================================================
    // VIEW ACCOMMODATION
    // ============================================================

    public AccommodationHistoryResponse view(
            Integer accommodationId,
            Integer userId) {

        Accommodation accommodation =
                getAccommodation(accommodationId);

        User user =
                getUser(userId);

        AccommodationHistory history =
                createHistory(
                        user,
                        null,
                        accommodation,
                        "VIEWED",
                        "DETAILS_VIEWED");

        historyRepository.save(history);

        return AccommodationHistoryResponse
                .fromEntity(history);
    }

    // ============================================================
    // SELECT ACCOMMODATION
    // ============================================================

    public AccommodationHistoryResponse select(
            Integer accommodationId,
            Integer userId,
            Integer tripId) {

        Accommodation accommodation =
                getAccommodation(accommodationId);

        if (!accommodation.isAvailability()) {

            throw new IllegalArgumentException(
                    "Accommodation is currently unavailable.");
        }

        User user =
                getUser(userId);

        Trip trip = null;

        if (tripId != null) {

            trip =
                    getUserTrip(
                            tripId,
                            userId);
        }

        AccommodationHistory history =
                createHistory(
                        user,
                        trip,
                        accommodation,
                        "SELECTED",
                        "ACCOMMODATION_SELECTED");

        historyRepository.save(history);

        return AccommodationHistoryResponse
                .fromEntity(history);
    }

    // ============================================================
    // ADD ACCOMMODATION TO TRIP
    // ============================================================

    public AccommodationHistoryResponse addToTrip(
            Integer accommodationId,
            Integer userId,
            Integer tripId) {

        if (tripId == null) {

            throw new IllegalArgumentException(
                    "tripId is required when adding accommodation to a trip.");
        }

        Accommodation accommodation =
                getAccommodation(accommodationId);

        if (!accommodation.isAvailability()) {

            throw new IllegalArgumentException(
                    "Accommodation is currently unavailable.");
        }

        User user =
                getUser(userId);

        Trip trip =
                getUserTrip(
                        tripId,
                        userId);

        AccommodationHistory history =
                createHistory(
                        user,
                        trip,
                        accommodation,
                        "ADDED_TO_TRIP",
                        "ACCOMMODATION_ADDED_TO_TRIP");

        historyRepository.save(history);

        return AccommodationHistoryResponse
                .fromEntity(history);
    }

    // ============================================================
    // GET USER HISTORY
    // ============================================================

    @Transactional(readOnly = true)
    public List<AccommodationHistoryResponse> getHistory(
            Integer userId) {

        getUser(userId);

        return historyRepository
                .findUserHistory(userId)
                .stream()
                .map(AccommodationHistoryResponse::fromEntity)
                .toList();
    }

    // ============================================================
    // GET TRIP HISTORY
    // ============================================================

    @Transactional(readOnly = true)
    public List<AccommodationHistoryResponse> getTripHistory(
            Integer userId,
            Integer tripId) {

        getUserTrip(
                tripId,
                userId);

        return historyRepository
                .findUserTripHistory(
                        userId,
                        tripId)
                .stream()
                .map(AccommodationHistoryResponse::fromEntity)
                .toList();
    }

    // ============================================================
    // REQUEST VALIDATION
    // ============================================================

    private void validateRequest(
            AccommodationRequest request) {

        if (request == null) {

            throw new IllegalArgumentException(
                    "Accommodation request is required.");
        }

        if (isBlank(request.getName())) {

            throw new IllegalArgumentException(
                    "Accommodation name is required.");
        }

        if (isBlank(request.getDestination())) {

            throw new IllegalArgumentException(
                    "Destination is required.");
        }

        if (request.getAccommodationType() == null) {

            throw new IllegalArgumentException(
                    "Accommodation type is required.");
        }

        if (request.getPricePerNight() == null) {

            throw new IllegalArgumentException(
                    "Price per night is required.");
        }

        if (request.getPricePerNight()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalArgumentException(
                    "Price per night cannot be negative.");
        }

        // --------------------------------------------------------
        // RATING
        // --------------------------------------------------------

        if (request.getRating() != null) {

            if (request.getRating()
                    .compareTo(BigDecimal.ZERO) < 0
                    || request.getRating()
                    .compareTo(BigDecimal.valueOf(5)) > 0) {

                throw new IllegalArgumentException(
                        "Rating must be between 0 and 5.");
            }
        }

        // --------------------------------------------------------
        // LATITUDE
        // --------------------------------------------------------

        if (latitudeInvalid(
                request.getLatitude())) {

            throw new IllegalArgumentException(
                    "Latitude must be between -90 and 90.");
        }

        // --------------------------------------------------------
        // LONGITUDE
        // --------------------------------------------------------

        if (longitudeInvalid(
                request.getLongitude())) {

            throw new IllegalArgumentException(
                    "Longitude must be between -180 and 180.");
        }

        // --------------------------------------------------------
        // BOTH COORDINATES MUST EXIST TOGETHER
        // --------------------------------------------------------

        if ((request.getLatitude() == null)
                != (request.getLongitude() == null)) {

            throw new IllegalArgumentException(
                    "Latitude and longitude must be provided together.");
        }

        // --------------------------------------------------------
        // MAX GUESTS
        // --------------------------------------------------------

        if (request.getMaxGuests() == null
                || request.getMaxGuests() < 1) {

            throw new IllegalArgumentException(
                    "Maximum guests must be at least 1.");
        }

        // --------------------------------------------------------
        // PRIVATE POOL
        // --------------------------------------------------------

        if (request.isPrivatePool()
                && !request.isSwimmingPool()) {

            throw new IllegalArgumentException(
                    "Private pool cannot be enabled when swimming pool is false.");
        }

        // --------------------------------------------------------
        // POOL TYPE
        // --------------------------------------------------------

        if (!request.isSwimmingPool()
                && request.getPoolType() != null
                && request.getPoolType() != PoolType.NONE) {

            throw new IllegalArgumentException(
                    "Pool type cannot be set when swimming pool is false.");
        }
    }

    // ============================================================
    // SEARCH VALIDATION
    // ============================================================

    private void validateSearchRequest(
            AccommodationSearchRequest request) {

        if (request == null) {

            throw new IllegalArgumentException(
                    "Search request is required.");
        }

        // --------------------------------------------------------
        // GUESTS
        // --------------------------------------------------------

        if (request.getGuests() != null
                && request.getGuests() < 1) {

            throw new IllegalArgumentException(
                    "Guests must be at least 1.");
        }

        // --------------------------------------------------------
        // DATES
        // --------------------------------------------------------

        if (request.getCheckInDate() != null
                && request.getCheckOutDate() != null) {

            if (!request.getCheckOutDate()
                    .isAfter(
                            request.getCheckInDate())) {

                throw new IllegalArgumentException(
                        "Check-out date must be after check-in date.");
            }
        }

        // --------------------------------------------------------
        // MIN PRICE
        // --------------------------------------------------------

        if (request.getMinPricePerNight() != null
                && request.getMinPricePerNight()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalArgumentException(
                    "Minimum price cannot be negative.");
        }

        // --------------------------------------------------------
        // MAX PRICE
        // --------------------------------------------------------

        if (request.getMaxPricePerNight() != null
                && request.getMaxPricePerNight()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalArgumentException(
                    "Maximum price cannot be negative.");
        }

        // --------------------------------------------------------
        // PRICE RANGE
        // --------------------------------------------------------

        if (request.getMinPricePerNight() != null
                && request.getMaxPricePerNight() != null
                && request.getMinPricePerNight()
                .compareTo(
                        request.getMaxPricePerNight()) > 0) {

            throw new IllegalArgumentException(
                    "Minimum price cannot be greater than maximum price.");
        }

        // --------------------------------------------------------
        // DISTANCE
        // --------------------------------------------------------

        if (request.getMaxDistanceKm() != null
                && request.getMaxDistanceKm() < 0) {

            throw new IllegalArgumentException(
                    "Maximum distance cannot be negative.");
        }

        // --------------------------------------------------------
        // COORDINATES
        // --------------------------------------------------------

        validateCoordinates(
                request.getLatitude(),
                request.getLongitude());
    }

    // ============================================================
    // COORDINATE VALIDATION
    // ============================================================

    private void validateCoordinates(
            BigDecimal latitude,
            BigDecimal longitude) {

        if (latitude != null) {

            if (latitude.compareTo(
                    BigDecimal.valueOf(-90)) < 0
                    || latitude.compareTo(
                            BigDecimal.valueOf(90)) > 0) {

                throw new IllegalArgumentException(
                        "Latitude must be between -90 and 90.");
            }
        }

        if (longitude != null) {

            if (longitude.compareTo(
                    BigDecimal.valueOf(-180)) < 0
                    || longitude.compareTo(
                            BigDecimal.valueOf(180)) > 0) {

                throw new IllegalArgumentException(
                        "Longitude must be between -180 and 180.");
            }
        }

        if ((latitude == null)
                != (longitude == null)) {

            throw new IllegalArgumentException(
                    "Latitude and longitude must be provided together.");
        }
    }

    // ============================================================
    // BASIC FILTER LOGIC
    // ============================================================

    private boolean matchesBasicFilters(
            Accommodation accommodation,
            AccommodationSearchRequest request) {

        if (!accommodation.isAvailability()) {
            return false;
        }

        // --------------------------------------------------------
        // TYPE
        // --------------------------------------------------------

        if (request.getAccommodationType() != null
                && accommodation.getAccommodationType()
                != request.getAccommodationType()) {

            return false;
        }

        // --------------------------------------------------------
        // GUESTS
        // --------------------------------------------------------

        if (request.getGuests() != null
                && accommodation.getMaxGuests()
                < request.getGuests()) {

            return false;
        }

        // --------------------------------------------------------
        // MIN PRICE
        // --------------------------------------------------------

        if (request.getMinPricePerNight() != null
                && accommodation.getPricePerNight()
                .compareTo(
                        request.getMinPricePerNight()) < 0) {

            return false;
        }

        // --------------------------------------------------------
        // MAX PRICE
        // --------------------------------------------------------

        if (request.getMaxPricePerNight() != null
                && accommodation.getPricePerNight()
                .compareTo(
                        request.getMaxPricePerNight()) > 0) {

            return false;
        }

        // --------------------------------------------------------
        // FAMILY FRIENDLY
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getFamilyFriendly())
                && !accommodation.isFamilyFriendly()) {

            return false;
        }

        // --------------------------------------------------------
        // ACCESSIBILITY
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getAccessibility())
                && !accommodation.isAccessibility()) {

            return false;
        }

        // --------------------------------------------------------
        // WIFI
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getWifi())
                && !accommodation.isWifi()) {

            return false;
        }

        // --------------------------------------------------------
        // PARKING
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getParking())
                && !accommodation.isParking()) {

            return false;
        }

        // --------------------------------------------------------
        // BREAKFAST
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getBreakfastIncluded())
                && !accommodation.isBreakfastIncluded()) {

            return false;
        }

        // --------------------------------------------------------
        // RESTAURANT
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getRestaurant())
                && !accommodation.isRestaurant()) {

            return false;
        }

        // --------------------------------------------------------
        // BEACH
        // --------------------------------------------------------

        if (!matchesBeachFilter(
                accommodation,
                request.getBeachFilter())) {

            return false;
        }

        // --------------------------------------------------------
        // POOL
        // --------------------------------------------------------

        if (!matchesPoolFilter(
                accommodation,
                request.getPoolFilter())) {

            return false;
        }

        return true;
    }

    // ============================================================
    // BEACH FILTER
    // ============================================================

    private boolean matchesBeachFilter(
            Accommodation accommodation,
            String filter) {

        if (filter == null
                || filter.isBlank()
                || filter.equalsIgnoreCase("ANY")) {

            return true;
        }

        String value =
                filter.trim()
                        .toUpperCase(Locale.ROOT);

        return switch (value) {

            case "BEACH_VIEW" ->
                    accommodation.isBeachView();

            case "BEACH_ACCESS" ->
                    accommodation.isBeachAccess();

            case "BEACHFRONT" ->
                    accommodation.isBeachfront();

            case "SEA_VIEW" ->
                    accommodation.isSeaView();

            case "PARTIAL_SEA_VIEW" ->
                    accommodation.isPartialSeaView();

            case "NEAR_BEACH" ->
                    accommodation.isNearBeach();

            default ->
                    throw new IllegalArgumentException(
                            "Invalid beachFilter. Use ANY, BEACH_VIEW, "
                            + "BEACH_ACCESS, BEACHFRONT, SEA_VIEW, "
                            + "PARTIAL_SEA_VIEW or NEAR_BEACH.");
        };
    }

    // ============================================================
    // POOL FILTER
    // ============================================================

    private boolean matchesPoolFilter(
            Accommodation accommodation,
            String filter) {

        if (filter == null
                || filter.isBlank()
                || filter.equalsIgnoreCase("ANY")) {

            return true;
        }

        String value =
                filter.trim()
                        .toUpperCase(Locale.ROOT);

        return switch (value) {

            case "POOL_REQUIRED" ->
                    accommodation.isSwimmingPool();

            case "PRIVATE_POOL" ->
                    accommodation.isPrivatePool();

            case "OUTDOOR_POOL" ->
                    accommodation.isSwimmingPool()
                            && accommodation.getPoolType()
                            == PoolType.OUTDOOR;

            case "INDOOR_POOL" ->
                    accommodation.isSwimmingPool()
                            && accommodation.getPoolType()
                            == PoolType.INDOOR;

            case "INFINITY_POOL" ->
                    accommodation.isSwimmingPool()
                            && accommodation.getPoolType()
                            == PoolType.INFINITY;

            case "KIDS_POOL" ->
                    accommodation.isKidsPool()
                            || accommodation.getPoolType()
                            == PoolType.KIDS;

            default ->
                    throw new IllegalArgumentException(
                            "Invalid poolFilter. Use ANY, POOL_REQUIRED, "
                            + "PRIVATE_POOL, OUTDOOR_POOL, INDOOR_POOL, "
                            + "INFINITY_POOL or KIDS_POOL.");
        };
    }

    // ============================================================
    // MATCH SCORE
    // ============================================================

    private double calculateMatchScore(
            Accommodation accommodation,
            AccommodationSearchRequest request,
            Double distanceKm) {

        double score = 0;

        // --------------------------------------------------------
        // RATING
        // --------------------------------------------------------

        if (accommodation.getRating() != null) {

            score +=
                    accommodation
                            .getRating()
                            .doubleValue() * 10;
        }

        // --------------------------------------------------------
        // TYPE
        // --------------------------------------------------------

        if (request.getAccommodationType() != null
                && accommodation.getAccommodationType()
                == request.getAccommodationType()) {

            score += 15;
        }

        // --------------------------------------------------------
        // BEACH
        // --------------------------------------------------------

        if (request.getBeachFilter() != null
                && !request.getBeachFilter()
                .equalsIgnoreCase("ANY")) {

            score += 20;
        }

        // --------------------------------------------------------
        // POOL
        // --------------------------------------------------------

        if (request.getPoolFilter() != null
                && !request.getPoolFilter()
                .equalsIgnoreCase("ANY")) {

            score += 20;
        }

        // --------------------------------------------------------
        // WIFI
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getWifi())
                && accommodation.isWifi()) {

            score += 3;
        }

        // --------------------------------------------------------
        // PARKING
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getParking())
                && accommodation.isParking()) {

            score += 3;
        }

        // --------------------------------------------------------
        // RESTAURANT
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getRestaurant())
                && accommodation.isRestaurant()) {

            score += 3;
        }

        // --------------------------------------------------------
        // BREAKFAST
        // --------------------------------------------------------

        if (Boolean.TRUE.equals(
                request.getBreakfastIncluded())
                && accommodation.isBreakfastIncluded()) {

            score += 3;
        }

        // --------------------------------------------------------
        // DISTANCE
        // --------------------------------------------------------

        if (distanceKm != null) {

            if (distanceKm <= 1) {

                score += 15;

            } else if (distanceKm <= 3) {

                score += 10;

            } else if (distanceKm <= 5) {

                score += 5;
            }
        }

        // --------------------------------------------------------
        // PRICE
        // --------------------------------------------------------

        if (request.getMaxPricePerNight() != null
                && request.getMaxPricePerNight()
                .compareTo(BigDecimal.ZERO) > 0) {

            double budget =
                    request.getMaxPricePerNight()
                            .doubleValue();

            double price =
                    accommodation.getPricePerNight()
                            .doubleValue();

            if (price <= budget * 0.5) {

                score += 10;

            } else if (price <= budget * 0.75) {

                score += 7;

            } else if (price <= budget) {

                score += 4;
            }
        }

        return Math.round(
                score * 100.0) / 100.0;
    }

    // ============================================================
    // SAVE SEARCH HISTORY
    // ============================================================

    private void saveSearchHistory(
            AccommodationSearchRequest request,
            Integer userId,
            List<AccommodationResponse> results) {

        if (results.isEmpty()) {
            return;
        }

        User user =
                getUser(userId);

        String filterUsed =
                buildFilterDescription(request);

        String action =
                determineSearchAction(request);

        Accommodation firstAccommodation =
                getAccommodation(
                        results
                                .get(0)
                                .getAccommodationId());

        AccommodationHistory history =
                createHistory(
                        user,
                        null,
                        firstAccommodation,
                        action,
                        filterUsed);

        historyRepository.save(history);
    }

    // ============================================================
    // SEARCH ACTION
    // ============================================================

    private String determineSearchAction(
            AccommodationSearchRequest request) {

        boolean beach =
                request.getBeachFilter() != null
                        && !request.getBeachFilter()
                        .equalsIgnoreCase("ANY");

        boolean pool =
                request.getPoolFilter() != null
                        && !request.getPoolFilter()
                        .equalsIgnoreCase("ANY");

        if (beach && pool) {

            return "BEACH_POOL_FILTER";
        }

        if (beach) {

            return "BEACH_FILTER";
        }

        if (pool) {

            return "SWIMMING_POOL_FILTER";
        }

        if (request.getMaxPricePerNight() != null
                || request.getMinPricePerNight() != null) {

            return "BUDGET_FILTER";
        }

        return "RECOMMENDED";
    }

    // ============================================================
    // BUILD FILTER DESCRIPTION
    // ============================================================

    private String buildFilterDescription(
            AccommodationSearchRequest request) {

        List<String> filters =
                new ArrayList<>();

        if (request.getDestination() != null
                && !request.getDestination().isBlank()) {

            filters.add(
                    "destination="
                            + request.getDestination());
        }

        if (request.getAccommodationType() != null) {

            filters.add(
                    "type="
                            + request.getAccommodationType());
        }

        if (request.getGuests() != null) {

            filters.add(
                    "guests="
                            + request.getGuests());
        }

        if (request.getMinPricePerNight() != null) {

            filters.add(
                    "minPrice="
                            + request.getMinPricePerNight());
        }

        if (request.getMaxPricePerNight() != null) {

            filters.add(
                    "maxPrice="
                            + request.getMaxPricePerNight());
        }

        if (request.getBeachFilter() != null) {

            filters.add(
                    "beach="
                            + request.getBeachFilter());
        }

        if (request.getPoolFilter() != null) {

            filters.add(
                    "pool="
                            + request.getPoolFilter());
        }

        if (request.getCheckInDate() != null) {

            filters.add(
                    "checkIn="
                            + request.getCheckInDate());
        }

        if (request.getCheckOutDate() != null) {

            filters.add(
                    "checkOut="
                            + request.getCheckOutDate());
        }

        return String.join(
                ", ",
                filters);
    }

    // ============================================================
    // CREATE HISTORY OBJECT
    // ============================================================

    private AccommodationHistory createHistory(
            User user,
            Trip trip,
            Accommodation accommodation,
            String action,
            String filterUsed) {

        AccommodationHistory history =
                new AccommodationHistory();

        history.setUser(user);

        history.setTrip(trip);

        history.setAccommodation(
                accommodation);

        history.setAction(action);

        history.setFilterUsed(
                filterUsed);

        return history;
    }

    // ============================================================
    // APPLY REQUEST TO ENTITY
    // ============================================================

    private void applyRequest(
            Accommodation accommodation,
            AccommodationRequest request) {

        accommodation.setName(
                request.getName().trim());

        accommodation.setDestination(
                request.getDestination().trim());

        accommodation.setAccommodationType(
                request.getAccommodationType());

        accommodation.setAddress(
                request.getAddress());

        accommodation.setLatitude(
                request.getLatitude());

        accommodation.setLongitude(
                request.getLongitude());

        accommodation.setPricePerNight(
                request.getPricePerNight());

        accommodation.setRating(
                request.getRating());

        accommodation.setDescription(
                request.getDescription());

        accommodation.setCheckInTime(
                request.getCheckInTime());

        accommodation.setCheckOutTime(
                request.getCheckOutTime());

        accommodation.setMaxGuests(
                request.getMaxGuests());

        // --------------------------------------------------------
        // BEACH / SEA
        // --------------------------------------------------------

        accommodation.setBeachView(
                request.isBeachView());

        accommodation.setBeachAccess(
                request.isBeachAccess());

        accommodation.setBeachfront(
                request.isBeachfront());

        accommodation.setSeaView(
                request.isSeaView());

        accommodation.setPartialSeaView(
                request.isPartialSeaView());

        accommodation.setNearBeach(
                request.isNearBeach());

        // --------------------------------------------------------
        // POOL
        // --------------------------------------------------------

        accommodation.setSwimmingPool(
                request.isSwimmingPool());

        if (request.isSwimmingPool()) {

            if (request.getPoolType() == null) {

                accommodation.setPoolType(
                        PoolType.OUTDOOR);

            } else {

                accommodation.setPoolType(
                        request.getPoolType());
            }

        } else {

            accommodation.setPoolType(
                    PoolType.NONE);
        }

        accommodation.setPrivatePool(
                request.isSwimmingPool()
                        && request.isPrivatePool());

        // --------------------------------------------------------
        // FACILITIES
        // --------------------------------------------------------

        accommodation.setRestaurant(
                request.isRestaurant());

        accommodation.setWifi(
                request.isWifi());

        accommodation.setParking(
                request.isParking());

        accommodation.setBreakfastIncluded(
                request.isBreakfastIncluded());

        accommodation.setSpa(
                request.isSpa());

        accommodation.setFitness(
                request.isFitness());

        accommodation.setRoomService(
                request.isRoomService());

        accommodation.setKitchen(
                request.isKitchen());

        accommodation.setLounge(
                request.isLounge());

        accommodation.setLockers(
                request.isLockers());

        // --------------------------------------------------------
        // FAMILY / ACCESSIBILITY
        // --------------------------------------------------------

        accommodation.setFamilyFriendly(
                request.isFamilyFriendly());

        accommodation.setAccessibility(
                request.isAccessibility());

        accommodation.setKidsPool(
                request.isKidsPool());

        // --------------------------------------------------------
        // OTHER FACILITIES
        // --------------------------------------------------------

        accommodation.setGarden(
                request.isGarden());

        accommodation.setWaterSports(
                request.isWaterSports());

        accommodation.setRecreation(
                request.isRecreation());

        accommodation.setBalcony(
                request.isBalcony());

        accommodation.setLocalExperience(
                request.isLocalExperience());

        accommodation.setFoodAvailable(
                request.isFoodAvailable());

        // --------------------------------------------------------
        // AVAILABILITY
        // --------------------------------------------------------

        accommodation.setAvailability(
                request.isAvailability());
    }

    // ============================================================
    // GET ACCOMMODATION
    // ============================================================

    private Accommodation getAccommodation(
            Integer id) {

        if (id == null) {

            throw new IllegalArgumentException(
                    "Accommodation ID is required.");
        }

        return accommodationRepository
                .findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Accommodation not found with ID: "
                                        + id));
    }

    // ============================================================
    // GET USER
    // ============================================================

    private User getUser(
            Integer userId) {

        if (userId == null) {

            throw new IllegalArgumentException(
                    "User ID is required.");
        }

        return userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found."));
    }

    // ============================================================
    // GET USER TRIP
    // ============================================================

    private Trip getUserTrip(
            Integer tripId,
            Integer userId) {

        if (tripId == null) {

            throw new IllegalArgumentException(
                    "Trip ID is required.");
        }

        if (userId == null) {

            throw new IllegalArgumentException(
                    "User ID is required.");
        }

        return tripRepository
                .findByTripIdAndUser_UserId(
                        tripId,
                        userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Trip not found or does not belong to the logged-in user."));
    }

    // ============================================================
    // STRING VALIDATION
    // ============================================================

    private boolean isBlank(
            String value) {

        return value == null
                || value.trim().isEmpty();
    }

    // ============================================================
    // DISTANCE CALCULATION
    // ============================================================

    private double calculateDistanceKm(
            double lat1,
            double lon1,
            double lat2,
            double lon2) {

        final double earthRadiusKm =
                6371.0;

        double latDistance =
                Math.toRadians(
                        lat2 - lat1);

        double lonDistance =
                Math.toRadians(
                        lon2 - lon1);

        double a =
                Math.sin(latDistance / 2)
                        * Math.sin(latDistance / 2)
                + Math.cos(
                        Math.toRadians(lat1))
                        * Math.cos(
                                Math.toRadians(lat2))
                        * Math.sin(lonDistance / 2)
                        * Math.sin(lonDistance / 2);

        double c =
                2 * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a));

        return BigDecimal
                .valueOf(
                        earthRadiusKm * c)
                .setScale(
                        2,
                        RoundingMode.HALF_UP)
                .doubleValue();
    }

    // ============================================================
    // NO MATCH MESSAGE
    // ============================================================

    private String buildNoMatchMessage(
            AccommodationSearchRequest request) {

        boolean beachView =
                request.getBeachFilter() != null
                        && request.getBeachFilter()
                        .equalsIgnoreCase("BEACH_VIEW");

        boolean beach =
                request.getBeachFilter() != null
                        && !request.getBeachFilter()
                        .equalsIgnoreCase("ANY");

        boolean pool =
                request.getPoolFilter() != null
                        && !request.getPoolFilter()
                        .equalsIgnoreCase("ANY");

        // --------------------------------------------------------
        // BEACH + POOL
        // --------------------------------------------------------

        if (beachView && pool) {

            return "No accommodation matches your selected beach view and swimming pool preferences.";
        }

        // --------------------------------------------------------
        // BEACH
        // --------------------------------------------------------

        if (beach) {

            return "No accommodation matches your selected beach preference.";
        }

        // --------------------------------------------------------
        // POOL
        // --------------------------------------------------------

        if (pool) {

            return "No accommodation matches your selected swimming pool preference.";
        }

        // --------------------------------------------------------
        // BUDGET
        // --------------------------------------------------------

        if (request.getMaxPricePerNight() != null) {

            return "No accommodation matches your selected budget.";
        }

        // --------------------------------------------------------
        // DEFAULT
        // --------------------------------------------------------

        return "No accommodation matches your selected preferences.";
    }

    // ============================================================
    // LATITUDE VALIDATION HELPER
    // ============================================================

    private boolean latitudeInvalid(
            BigDecimal latitude) {

        return latitude != null
                && (
                    latitude.compareTo(
                            BigDecimal.valueOf(-90)) < 0
                    || latitude.compareTo(
                            BigDecimal.valueOf(90)) > 0
                );
    }

    // ============================================================
    // LONGITUDE VALIDATION HELPER
    // ============================================================

    private boolean longitudeInvalid(
            BigDecimal longitude) {

        return longitude != null
                && (
                    longitude.compareTo(
                            BigDecimal.valueOf(-180)) < 0
                    || longitude.compareTo(
                            BigDecimal.valueOf(180)) > 0
                );
    }
}