package backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "food_history")
public class FoodHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Integer historyId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne
    @JoinColumn(name = "food_id")
    private Food food;

    @ManyToOne
    @JoinColumn(name = "food_place_id")
    private FoodPlace foodPlace;

    @ManyToOne
    @JoinColumn(name = "food_recommendation_id")
    private FoodRecommendation foodRecommendation;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "recommendation_type")
    private String recommendationType;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public FoodHistory() {
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
    // HISTORY ID
    // ==========================================

    public Integer getHistoryId() {
        return historyId;
    }

    public void setHistoryId(Integer historyId) {
        this.historyId = historyId;
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
    // FOOD RECOMMENDATION
    // ==========================================

    public FoodRecommendation getFoodRecommendation() {
        return foodRecommendation;
    }

    public void setFoodRecommendation(
            FoodRecommendation foodRecommendation) {

        this.foodRecommendation = foodRecommendation;
    }

    // ==========================================
    // ACTION
    // ==========================================

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
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
    // CREATED AT
    // ==========================================

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}