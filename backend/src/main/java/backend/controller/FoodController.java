package backend.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import backend.dto.FoodCreateRequest;
import backend.dto.FoodPlaceCreateRequest;
import backend.entity.Food;
import backend.entity.FoodCategory;
import backend.entity.FoodPlace;
import backend.entity.FoodPlaceType;
import backend.entity.FoodType;
import backend.entity.MealPeriod;
import backend.entity.SpiceLevel;
import backend.entity.TripDestination;
import backend.repository.FoodPlaceRepository;
import backend.repository.FoodRepository;
import backend.repository.TripDestinationRepository;

@RestController
@RequestMapping("/api/foods")
public class FoodController {

    private final FoodRepository foodRepository;
    private final FoodPlaceRepository foodPlaceRepository;
    private final TripDestinationRepository tripDestinationRepository;

    public FoodController(
            FoodRepository foodRepository,
            FoodPlaceRepository foodPlaceRepository,
            TripDestinationRepository tripDestinationRepository) {

        this.foodRepository = foodRepository;
        this.foodPlaceRepository = foodPlaceRepository;
        this.tripDestinationRepository = tripDestinationRepository;
    }

    // =========================================================
    // CREATE FOOD
    // =========================================================

    @PostMapping
    public ResponseEntity<FoodResponse> createFood(
            @RequestBody FoodCreateRequest request) {

        if (request.getDestinationId() == null) {
            throw new RuntimeException("Destination ID is required.");
        }

        if (request.getDishName() == null
                || request.getDishName().trim().isEmpty()) {
            throw new RuntimeException("Dish name is required.");
        }

        TripDestination destination =
                tripDestinationRepository
                        .findById(request.getDestinationId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Destination not found."));

        Food food = new Food();

        food.setDestination(destination);
        food.setDishName(request.getDishName());
        food.setCuisine(request.getCuisine());
        food.setDescription(request.getDescription());
        food.setIngredients(request.getIngredients());
        food.setPrice(request.getPrice());
        food.setPopularity(request.getPopularity());

        if (request.getCategory() != null) {
            food.setCategory(
                    parseFoodCategory(request.getCategory()));
        }

        if (request.getFoodType() != null) {
            food.setFoodType(
                    parseFoodType(request.getFoodType()));
        }

        if (request.getSpiceLevel() != null) {
            food.setSpiceLevel(
                    parseSpiceLevel(request.getSpiceLevel()));
        }

        if (request.getRecommendedMeal() != null) {
            food.setRecommendedMeal(
                    parseMealPeriod(request.getRecommendedMeal()));
        }

        Food savedFood = foodRepository.save(food);

        return ResponseEntity.ok(
                toFoodResponse(savedFood));
    }

    // =========================================================
    // GET FOOD FOR DESTINATION
    // =========================================================

    @GetMapping("/destination/{destinationId}")
    public ResponseEntity<List<FoodResponse>> getFoodsByDestination(
            @PathVariable Integer destinationId) {

        List<FoodResponse> response =
                foodRepository
                        .findByDestination_DestinationId(destinationId)
                        .stream()
                        .map(this::toFoodResponse)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // =========================================================
    // CREATE FOOD PLACE
    // =========================================================

    @PostMapping("/places")
    public ResponseEntity<FoodPlaceResponse> createFoodPlace(
            @RequestBody FoodPlaceCreateRequest request) {

        if (request.getDestinationId() == null) {
            throw new RuntimeException("Destination ID is required.");
        }

        if (request.getName() == null
                || request.getName().trim().isEmpty()) {
            throw new RuntimeException("Food place name is required.");
        }

        if (request.getLatitude() == null
                || request.getLongitude() == null) {
            throw new RuntimeException(
                    "Latitude and longitude are required.");
        }

        if (request.getLatitude() < -90
                || request.getLatitude() > 90) {
            throw new RuntimeException("Invalid latitude.");
        }

        if (request.getLongitude() < -180
                || request.getLongitude() > 180) {
            throw new RuntimeException("Invalid longitude.");
        }

        TripDestination destination =
                tripDestinationRepository
                        .findById(request.getDestinationId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Destination not found."));

        FoodPlace foodPlace = new FoodPlace();

        foodPlace.setDestination(destination);
        foodPlace.setName(request.getName());
        foodPlace.setLatitude(request.getLatitude());
        foodPlace.setLongitude(request.getLongitude());
        foodPlace.setCuisine(request.getCuisine());
        foodPlace.setPriceRange(request.getPriceRange());
        foodPlace.setOpeningTime(request.getOpeningTime());
        foodPlace.setClosingTime(request.getClosingTime());
        foodPlace.setPopularity(request.getPopularity());
        foodPlace.setRating(request.getRating());

        foodPlace.setVegetarianAvailable(
                request.getVegetarianAvailable() != null
                        ? request.getVegetarianAvailable()
                        : false);

        foodPlace.setVeganAvailable(
                request.getVeganAvailable() != null
                        ? request.getVeganAvailable()
                        : false);

        foodPlace.setDietaryInformation(
                request.getDietaryInformation());

        foodPlace.setDescription(
                request.getDescription());

        foodPlace.setAlcoholAvailable(
                request.getAlcoholAvailable() != null
                        ? request.getAlcoholAvailable()
                        : false);

        foodPlace.setLocalDrinksAvailable(
                request.getLocalDrinksAvailable() != null
                        ? request.getLocalDrinksAvailable()
                        : false);

        if (request.getPlaceType() != null) {
            foodPlace.setPlaceType(
                    parseFoodPlaceType(request.getPlaceType()));
        }

        FoodPlace savedFoodPlace =
                foodPlaceRepository.save(foodPlace);

        return ResponseEntity.ok(
                toFoodPlaceResponse(savedFoodPlace));
    }

    // =========================================================
    // GET FOOD PLACES FOR DESTINATION
    // =========================================================

    @GetMapping("/places/destination/{destinationId}")
    public ResponseEntity<List<FoodPlaceResponse>>
            getFoodPlacesByDestination(
                    @PathVariable Integer destinationId) {

        List<FoodPlaceResponse> response =
                foodPlaceRepository
                        .findByDestination_DestinationId(destinationId)
                        .stream()
                        .map(this::toFoodPlaceResponse)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // =========================================================
    // FOOD RESPONSE MAPPER
    // =========================================================

    private FoodResponse toFoodResponse(Food food) {

        FoodResponse response = new FoodResponse();

        response.foodId = food.getFoodId();

        if (food.getDestination() != null) {
            response.destinationId =
                    food.getDestination().getDestinationId();

            response.destinationName =
                    food.getDestination().getDestinationName();
        }

        response.dishName = food.getDishName();
        response.cuisine = food.getCuisine();
        response.category =
                food.getCategory() != null
                        ? food.getCategory().name()
                        : null;

        response.description = food.getDescription();
        response.ingredients = food.getIngredients();

        response.foodType =
                food.getFoodType() != null
                        ? food.getFoodType().name()
                        : null;

        response.spiceLevel =
                food.getSpiceLevel() != null
                        ? food.getSpiceLevel().name()
                        : null;

        response.price = food.getPrice();
        response.popularity = food.getPopularity();

        response.recommendedMeal =
                food.getRecommendedMeal() != null
                        ? food.getRecommendedMeal().name()
                        : null;

        return response;
    }

    // =========================================================
    // FOOD PLACE RESPONSE MAPPER
    // =========================================================

    private FoodPlaceResponse toFoodPlaceResponse(
            FoodPlace foodPlace) {

        FoodPlaceResponse response = new FoodPlaceResponse();

        response.foodPlaceId =
                foodPlace.getFoodPlaceId();

        if (foodPlace.getDestination() != null) {
            response.destinationId =
                    foodPlace.getDestination()
                            .getDestinationId();

            response.destinationName =
                    foodPlace.getDestination()
                            .getDestinationName();
        }

        response.name = foodPlace.getName();
        response.latitude = foodPlace.getLatitude();
        response.longitude = foodPlace.getLongitude();
        response.cuisine = foodPlace.getCuisine();

        response.placeType =
                foodPlace.getPlaceType() != null
                        ? foodPlace.getPlaceType().name()
                        : null;

        response.priceRange =
                foodPlace.getPriceRange();

        response.openingTime =
                foodPlace.getOpeningTime();

        response.closingTime =
                foodPlace.getClosingTime();

        response.popularity =
                foodPlace.getPopularity();

        response.rating =
                foodPlace.getRating();

        response.vegetarianAvailable =
                foodPlace.getVegetarianAvailable();

        response.veganAvailable =
                foodPlace.getVeganAvailable();

        response.dietaryInformation =
                foodPlace.getDietaryInformation();

        response.description =
                foodPlace.getDescription();

        response.alcoholAvailable =
                foodPlace.getAlcoholAvailable();

        response.localDrinksAvailable =
                foodPlace.getLocalDrinksAvailable();

        return response;
    }

    // =========================================================
    // FOOD RESPONSE
    // =========================================================

    public static class FoodResponse {

        public Integer foodId;
        public Integer destinationId;
        public String destinationName;
        public String dishName;
        public String cuisine;
        public String category;
        public String description;
        public String ingredients;
        public String foodType;
        public String spiceLevel;
        public java.math.BigDecimal price;
        public Double popularity;
        public String recommendedMeal;
    }

    // =========================================================
    // FOOD PLACE RESPONSE
    // =========================================================

    public static class FoodPlaceResponse {

        public Integer foodPlaceId;
        public Integer destinationId;
        public String destinationName;
        public String name;
        public Double latitude;
        public Double longitude;
        public String cuisine;
        public String placeType;
        public String priceRange;
        public java.time.LocalTime openingTime;
        public java.time.LocalTime closingTime;
        public Double popularity;
        public java.math.BigDecimal rating;
        public Boolean vegetarianAvailable;
        public Boolean veganAvailable;
        public String dietaryInformation;
        public String description;
        public Boolean alcoholAvailable;
        public Boolean localDrinksAvailable;
    }

    // =========================================================
    // ENUM PARSERS
    // =========================================================

    private FoodCategory parseFoodCategory(String value) {

        try {
            return FoodCategory.valueOf(
                    value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException(
                    "Invalid food category.");
        }
    }

    private FoodType parseFoodType(String value) {

        try {
            return FoodType.valueOf(
                    value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException(
                    "Invalid food type.");
        }
    }

    private SpiceLevel parseSpiceLevel(String value) {

        try {
            return SpiceLevel.valueOf(
                    value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException(
                    "Invalid spice level.");
        }
    }

    private MealPeriod parseMealPeriod(String value) {

        try {
            return MealPeriod.valueOf(
                    value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException(
                    "Invalid meal period.");
        }
    }

    private FoodPlaceType parseFoodPlaceType(String value) {

        try {
            return FoodPlaceType.valueOf(
                    value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new RuntimeException(
                    "Invalid food place type.");
        }
    }
}