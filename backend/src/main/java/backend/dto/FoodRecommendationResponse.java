package backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class FoodRecommendationResponse {

    private Integer foodRecommendationId;

    private Integer userId;

    private Integer tripId;

    private Integer destinationId;

    private Integer foodId;

    private Integer foodPlaceId;

    private String dishName;

    private String foodPlaceName;

    private String recommendationType;

    private String cuisine;

    private String category;

    private String foodType;

    private String spiceLevel;

    private String mealPeriod;

    private String placeType;

    private String description;

    private String ingredients;

    private BigDecimal price;

    private String priceRange;

    private Double popularity;

    private BigDecimal rating;

    private Double latitude;

    private Double longitude;

    private BigDecimal score;

    private BigDecimal distanceKm;

    private LocalTime recommendedTime;

    private String weatherCondition;

    private String reason;

    private Boolean budgetMatch;

    private Boolean preferenceMatch;

    private Boolean dietaryMatch;

    private Boolean vegetarianAvailable;

    private Boolean veganAvailable;

    private String dietaryInformation;

    private LocalTime openingTime;

    private LocalTime closingTime;

    private Boolean currentlyOpen;

    private Boolean alcoholAvailable;

    private Boolean localDrinksAvailable;

    private LocalDateTime createdAt;

    public FoodRecommendationResponse() {
    }

    // ==========================================
    // FOOD RECOMMENDATION ID
    // ==========================================

    public Integer getFoodRecommendationId() {
        return foodRecommendationId;
    }

    public void setFoodRecommendationId(Integer foodRecommendationId) {
        this.foodRecommendationId = foodRecommendationId;
    }

    // ==========================================
    // USER ID
    // ==========================================

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    // ==========================================
    // TRIP ID
    // ==========================================

    public Integer getTripId() {
        return tripId;
    }

    public void setTripId(Integer tripId) {
        this.tripId = tripId;
    }

    // ==========================================
    // DESTINATION ID
    // ==========================================

    public Integer getDestinationId() {
        return destinationId;
    }

    public void setDestinationId(Integer destinationId) {
        this.destinationId = destinationId;
    }

    // ==========================================
    // FOOD ID
    // ==========================================

    public Integer getFoodId() {
        return foodId;
    }

    public void setFoodId(Integer foodId) {
        this.foodId = foodId;
    }

    // ==========================================
    // FOOD PLACE ID
    // ==========================================

    public Integer getFoodPlaceId() {
        return foodPlaceId;
    }

    public void setFoodPlaceId(Integer foodPlaceId) {
        this.foodPlaceId = foodPlaceId;
    }

    // ==========================================
    // DISH NAME
    // ==========================================

    public String getDishName() {
        return dishName;
    }

    public void setDishName(String dishName) {
        this.dishName = dishName;
    }

    // ==========================================
    // FOOD PLACE NAME
    // ==========================================

    public String getFoodPlaceName() {
        return foodPlaceName;
    }

    public void setFoodPlaceName(String foodPlaceName) {
        this.foodPlaceName = foodPlaceName;
    }

    // ==========================================
    // RECOMMENDATION TYPE
    // ==========================================

    public String getRecommendationType() {
        return recommendationType;
    }

    public void setRecommendationType(String recommendationType) {
        this.recommendationType = recommendationType;
    }

    // ==========================================
    // CUISINE
    // ==========================================

    public String getCuisine() {
        return cuisine;
    }

    public void setCuisine(String cuisine) {
        this.cuisine = cuisine;
    }

    // ==========================================
    // CATEGORY
    // ==========================================

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    // ==========================================
    // FOOD TYPE
    // ==========================================

    public String getFoodType() {
        return foodType;
    }

    public void setFoodType(String foodType) {
        this.foodType = foodType;
    }

    // ==========================================
    // SPICE LEVEL
    // ==========================================

    public String getSpiceLevel() {
        return spiceLevel;
    }

    public void setSpiceLevel(String spiceLevel) {
        this.spiceLevel = spiceLevel;
    }

    // ==========================================
    // MEAL PERIOD
    // ==========================================

    public String getMealPeriod() {
        return mealPeriod;
    }

    public void setMealPeriod(String mealPeriod) {
        this.mealPeriod = mealPeriod;
    }

    // ==========================================
    // PLACE TYPE
    // ==========================================

    public String getPlaceType() {
        return placeType;
    }

    public void setPlaceType(String placeType) {
        this.placeType = placeType;
    }

    // ==========================================
    // DESCRIPTION
    // ==========================================

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    // ==========================================
    // INGREDIENTS
    // ==========================================

    public String getIngredients() {
        return ingredients;
    }

    public void setIngredients(String ingredients) {
        this.ingredients = ingredients;
    }

    // ==========================================
    // PRICE
    // ==========================================

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    // ==========================================
    // PRICE RANGE
    // ==========================================

    public String getPriceRange() {
        return priceRange;
    }

    public void setPriceRange(String priceRange) {
        this.priceRange = priceRange;
    }

    // ==========================================
    // POPULARITY
    // ==========================================

    public Double getPopularity() {
        return popularity;
    }

    public void setPopularity(Double popularity) {
        this.popularity = popularity;
    }

    // ==========================================
    // RATING
    // ==========================================

    public BigDecimal getRating() {
        return rating;
    }

    public void setRating(BigDecimal rating) {
        this.rating = rating;
    }

    // ==========================================
    // LATITUDE
    // ==========================================

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    // ==========================================
    // LONGITUDE
    // ==========================================

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    // ==========================================
    // SCORE
    // ==========================================

    public BigDecimal getScore() {
        return score;
    }

    public void setScore(BigDecimal score) {
        this.score = score;
    }

    // ==========================================
    // DISTANCE
    // ==========================================

    public BigDecimal getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(BigDecimal distanceKm) {
        this.distanceKm = distanceKm;
    }

    // ==========================================
    // RECOMMENDED TIME
    // ==========================================

    public LocalTime getRecommendedTime() {
        return recommendedTime;
    }

    public void setRecommendedTime(LocalTime recommendedTime) {
        this.recommendedTime = recommendedTime;
    }

    // ==========================================
    // WEATHER CONDITION
    // ==========================================

    public String getWeatherCondition() {
        return weatherCondition;
    }

    public void setWeatherCondition(String weatherCondition) {
        this.weatherCondition = weatherCondition;
    }

    // ==========================================
    // REASON
    // ==========================================

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    // ==========================================
    // BUDGET MATCH
    // ==========================================

    public Boolean getBudgetMatch() {
        return budgetMatch;
    }

    public void setBudgetMatch(Boolean budgetMatch) {
        this.budgetMatch = budgetMatch;
    }

    // ==========================================
    // PREFERENCE MATCH
    // ==========================================

    public Boolean getPreferenceMatch() {
        return preferenceMatch;
    }

    public void setPreferenceMatch(Boolean preferenceMatch) {
        this.preferenceMatch = preferenceMatch;
    }

    // ==========================================
    // DIETARY MATCH
    // ==========================================

    public Boolean getDietaryMatch() {
        return dietaryMatch;
    }

    public void setDietaryMatch(Boolean dietaryMatch) {
        this.dietaryMatch = dietaryMatch;
    }

    // ==========================================
    // VEGETARIAN AVAILABLE
    // ==========================================

    public Boolean getVegetarianAvailable() {
        return vegetarianAvailable;
    }

    public void setVegetarianAvailable(Boolean vegetarianAvailable) {
        this.vegetarianAvailable = vegetarianAvailable;
    }

    // ==========================================
    // VEGAN AVAILABLE
    // ==========================================

    public Boolean getVeganAvailable() {
        return veganAvailable;
    }

    public void setVeganAvailable(Boolean veganAvailable) {
        this.veganAvailable = veganAvailable;
    }

    // ==========================================
    // DIETARY INFORMATION
    // ==========================================

    public String getDietaryInformation() {
        return dietaryInformation;
    }

    public void setDietaryInformation(String dietaryInformation) {
        this.dietaryInformation = dietaryInformation;
    }

    // ==========================================
    // OPENING TIME
    // ==========================================

    public LocalTime getOpeningTime() {
        return openingTime;
    }

    public void setOpeningTime(LocalTime openingTime) {
        this.openingTime = openingTime;
    }

    // ==========================================
    // CLOSING TIME
    // ==========================================

    public LocalTime getClosingTime() {
        return closingTime;
    }

    public void setClosingTime(LocalTime closingTime) {
        this.closingTime = closingTime;
    }

    // ==========================================
    // CURRENTLY OPEN
    // ==========================================

    public Boolean getCurrentlyOpen() {
        return currentlyOpen;
    }

    public void setCurrentlyOpen(Boolean currentlyOpen) {
        this.currentlyOpen = currentlyOpen;
    }

    // ==========================================
    // ALCOHOL AVAILABLE
    // ==========================================

    public Boolean getAlcoholAvailable() {
        return alcoholAvailable;
    }

    public void setAlcoholAvailable(Boolean alcoholAvailable) {
        this.alcoholAvailable = alcoholAvailable;
    }

    // ==========================================
    // LOCAL DRINKS AVAILABLE
    // ==========================================

    public Boolean getLocalDrinksAvailable() {
        return localDrinksAvailable;
    }

    public void setLocalDrinksAvailable(Boolean localDrinksAvailable) {
        this.localDrinksAvailable = localDrinksAvailable;
    }

    // ==========================================
    // CREATED AT
    // ==========================================

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}