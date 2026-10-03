package backend.dto;

import java.time.LocalDateTime;

public class FoodHistoryResponse {

    private Integer historyId;

    private Integer userId;

    private Integer tripId;

    private Integer foodId;

    private Integer foodPlaceId;

    private Integer foodRecommendationId;

    private String dishName;

    private String foodPlaceName;

    private String recommendationType;

    private String action;

    private String reason;

    private LocalDateTime createdAt;

    public FoodHistoryResponse() {
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
    // FOOD RECOMMENDATION ID
    // ==========================================

    public Integer getFoodRecommendationId() {
        return foodRecommendationId;
    }

    public void setFoodRecommendationId(
            Integer foodRecommendationId) {

        this.foodRecommendationId = foodRecommendationId;
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
    // ACTION
    // ==========================================

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
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