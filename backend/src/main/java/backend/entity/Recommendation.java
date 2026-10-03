package backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "recommendations")
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recommendation_id")
    private Integer recommendationId;

    // ==========================================
    // USER
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // ==========================================
    // TRIP
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    // ==========================================
    // DESTINATION
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id")
    private TripDestination destination;

    // ==========================================
    // RECOMMENDATION TYPE
    // ==========================================

    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation_type", nullable = false)
    private RecommendationType recommendationType;

    // ==========================================
    // REASON
    // ==========================================

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    // ==========================================
    // INTERNAL RANKING SCORE
    // ==========================================

    @Column(
            precision = 8,
            scale = 2
    )
    private BigDecimal score;

    // ==========================================
    // DISTANCE
    // ==========================================

    @Column(
            name = "distance_km",
            precision = 10,
            scale = 2
    )
    private BigDecimal distance;

    // ==========================================
    // WEATHER CONDITION
    // ==========================================

    @Column(name = "weather_condition")
    private String weatherCondition;

    // ==========================================
    // CROWD LEVEL
    // ==========================================

    @Enumerated(EnumType.STRING)
    @Column(name = "crowd_level")
    private CrowdLevel crowdLevel;

    // ==========================================
    // RECOMMENDED TIME
    // ==========================================

    @Column(name = "recommended_time")
    private LocalTime recommendedTime;

    // ==========================================
    // SEASON
    // ==========================================

    @Column(name = "season")
    private String season;

    // ==========================================
    // CREATED AT
    // ==========================================

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Recommendation() {
    }

    // ==========================================
    // AUTO CREATED TIME
    // ==========================================

    @PrePersist
    protected void onCreate() {

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // ==========================================
    // RECOMMENDATION ID
    // ==========================================

    public Integer getRecommendationId() {
        return recommendationId;
    }

    public void setRecommendationId(
            Integer recommendationId) {

        this.recommendationId = recommendationId;
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

    public void setDestination(
            TripDestination destination) {

        this.destination = destination;
    }

    // ==========================================
    // RECOMMENDATION TYPE
    // ==========================================

    public RecommendationType getRecommendationType() {
        return recommendationType;
    }

    public void setRecommendationType(
            RecommendationType recommendationType) {

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

    public BigDecimal getDistance() {
        return distance;
    }

    public void setDistance(BigDecimal distance) {
        this.distance = distance;
    }

    // ==========================================
    // WEATHER CONDITION
    // ==========================================

    public String getWeatherCondition() {
        return weatherCondition;
    }

    public void setWeatherCondition(
            String weatherCondition) {

        this.weatherCondition = weatherCondition;
    }

    // ==========================================
    // CROWD LEVEL
    // ==========================================

    public CrowdLevel getCrowdLevel() {
        return crowdLevel;
    }

    public void setCrowdLevel(
            CrowdLevel crowdLevel) {

        this.crowdLevel = crowdLevel;
    }

    // ==========================================
    // RECOMMENDED TIME
    // ==========================================

    public LocalTime getRecommendedTime() {
        return recommendedTime;
    }

    public void setRecommendedTime(
            LocalTime recommendedTime) {

        this.recommendedTime = recommendedTime;
    }

    // ==========================================
    // SEASON
    // ==========================================

    public String getSeason() {
        return season;
    }

    public void setSeason(String season) {
        this.season = season;
    }

    // ==========================================
    // CREATED AT
    // ==========================================

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(
            LocalDateTime createdAt) {

        this.createdAt = createdAt;
    }
}