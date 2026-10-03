package backend.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public class FoodRecommendationRequest {

    private Integer destinationId;

    private LocalDate plannedDate;

    private LocalTime plannedTime;

    private String recommendationType;

    private String foodType;

    private String category;

    private String mealPeriod;

    private String cuisine;

    private String spiceLevel;

    private String dietaryPreference;

    private String foodPreference;

    private String budgetRange;

    private Double maxDistanceKm;

    private String placeType;

    private Boolean includeBars;

    private Boolean includeRestrobars;

    private Boolean includeLocalDrinks;

    private Boolean includeFoodAndBeverage;

    public FoodRecommendationRequest() {
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
    // PLANNED DATE
    // ==========================================

    public LocalDate getPlannedDate() {
        return plannedDate;
    }

    public void setPlannedDate(LocalDate plannedDate) {
        this.plannedDate = plannedDate;
    }

    // ==========================================
    // PLANNED TIME
    // ==========================================

    public LocalTime getPlannedTime() {
        return plannedTime;
    }

    public void setPlannedTime(LocalTime plannedTime) {
        this.plannedTime = plannedTime;
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
    // FOOD TYPE
    // ==========================================

    public String getFoodType() {
        return foodType;
    }

    public void setFoodType(String foodType) {
        this.foodType = foodType;
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
    // MEAL PERIOD
    // ==========================================

    public String getMealPeriod() {
        return mealPeriod;
    }

    public void setMealPeriod(String mealPeriod) {
        this.mealPeriod = mealPeriod;
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
    // SPICE LEVEL
    // ==========================================

    public String getSpiceLevel() {
        return spiceLevel;
    }

    public void setSpiceLevel(String spiceLevel) {
        this.spiceLevel = spiceLevel;
    }

    // ==========================================
    // DIETARY PREFERENCE
    // ==========================================

    public String getDietaryPreference() {
        return dietaryPreference;
    }

    public void setDietaryPreference(String dietaryPreference) {
        this.dietaryPreference = dietaryPreference;
    }

    // ==========================================
    // FOOD PREFERENCE
    // ==========================================

    public String getFoodPreference() {
        return foodPreference;
    }

    public void setFoodPreference(String foodPreference) {
        this.foodPreference = foodPreference;
    }

    // ==========================================
    // BUDGET RANGE
    // ==========================================

    public String getBudgetRange() {
        return budgetRange;
    }

    public void setBudgetRange(String budgetRange) {
        this.budgetRange = budgetRange;
    }

    // ==========================================
    // MAX DISTANCE
    // ==========================================

    public Double getMaxDistanceKm() {
        return maxDistanceKm;
    }

    public void setMaxDistanceKm(Double maxDistanceKm) {
        this.maxDistanceKm = maxDistanceKm;
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
    // INCLUDE BARS
    // ==========================================

    public Boolean getIncludeBars() {
        return includeBars;
    }

    public void setIncludeBars(Boolean includeBars) {
        this.includeBars = includeBars;
    }

    // ==========================================
    // INCLUDE RESTROBARS
    // ==========================================

    public Boolean getIncludeRestrobars() {
        return includeRestrobars;
    }

    public void setIncludeRestrobars(Boolean includeRestrobars) {
        this.includeRestrobars = includeRestrobars;
    }

    // ==========================================
    // INCLUDE LOCAL DRINKS
    // ==========================================

    public Boolean getIncludeLocalDrinks() {
        return includeLocalDrinks;
    }

    public void setIncludeLocalDrinks(Boolean includeLocalDrinks) {
        this.includeLocalDrinks = includeLocalDrinks;
    }

    // ==========================================
    // INCLUDE FOOD + BEVERAGE
    // ==========================================

    public Boolean getIncludeFoodAndBeverage() {
        return includeFoodAndBeverage;
    }

    public void setIncludeFoodAndBeverage(
            Boolean includeFoodAndBeverage) {

        this.includeFoodAndBeverage = includeFoodAndBeverage;
    }
}