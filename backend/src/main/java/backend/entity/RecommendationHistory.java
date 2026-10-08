package backend.entity;

import java.time.LocalDateTime;

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
@Table(name = "recommendation_history")
public class RecommendationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Integer historyId;

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
    // RECOMMENDATION
    // ==========================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recommendation_id", nullable = false)
    private Recommendation recommendation;

    // ==========================================
    // RECOMMENDATION TYPE
    // ==========================================

    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation_type", nullable = false)
    private RecommendationType recommendationType;

    // ==========================================
    // ACTION
    // ==========================================

    @Column(nullable = false)
    private String action;

    // ==========================================
    // REASON
    // ==========================================

    @Column(columnDefinition = "TEXT")
    private String reason;

    // ==========================================
    // CREATED AT
    // ==========================================

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public RecommendationHistory() {
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
    // RECOMMENDATION
    // ==========================================

    public Recommendation getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(
            Recommendation recommendation) {

        this.recommendation = recommendation;
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

    public void setCreatedAt(
            LocalDateTime createdAt) {

        this.createdAt = createdAt;
    }
}