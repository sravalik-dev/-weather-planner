package backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "food_recommendations")
public class FoodRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "food_recommendation_id")
    private Integer foodRecommendationId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne
    @JoinColumn(name = "destination_id")
    private TripDestination destination;

    @ManyToOne
    @JoinColumn(name = "food_id")
    private Food food;

    @ManyToOne
    @JoinColumn(name = "food_place_id")
    private FoodPlace foodPlace;

    @Column(name = "recommendation_type", nullable = false)
    private String recommendationType;

    @Column(name = "reason", columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(name = "score", precision = 8, scale = 2)
    private BigDecimal score;

    @Column(name = "distance_km", precision = 10, scale = 2)
    private BigDecimal distanceKm;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_period")
    private MealPeriod mealPeriod;

    @Column(name = "recommended_time")
    private LocalTime recommendedTime;

    @Column(name = "weather_condition")
    private String weatherCondition;

    @Column(name = "budget_match")
    private Boolean budgetMatch;

    @Column(name = "preference_match")
    private Boolean preferenceMatch;

    @Column(name = "dietary_match")
    private Boolean dietaryMatch;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public FoodRecommendation() {
    }

    // ==========================================
    // CREATED AT
    // ==========================================

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
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
    // USER
    // ==========================================

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    // ==========================================
    // TRIP
    // ==========================================

    public Trip getTrip() {
        return trip;
    }

    public void setTrip(Trip trip) {
        this.trip = trip;
    }

    // ==========================================
    // DESTINATION
    // ==========================================

    public TripDestination getDestination() {
        return destination;
    }

    public void setDestination(TripDestination destination) {
        this.destination = destination;
    }

    // ==========================================
    // FOOD
    // ==========================================

    public Food getFood() {
        return food;
    }

    public void setFood(Food food) {
        this.food = food;
    }

    // ==========================================
    // FOOD PLACE
    // ==========================================

    public FoodPlace getFoodPlace() {
        return foodPlace;
    }

    public void setFoodPlace(FoodPlace foodPlace) {
        this.foodPlace = foodPlace;
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
    // REASON
    // ==========================================

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
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
    // MEAL PERIOD
    // ==========================================

    public MealPeriod getMealPeriod() {
        return mealPeriod;
    }

    public void setMealPeriod(MealPeriod mealPeriod) {
        this.mealPeriod = mealPeriod;
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
    // CREATED AT
    // ==========================================

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}