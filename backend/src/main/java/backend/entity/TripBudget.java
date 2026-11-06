package backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.*;

import backend.entity.Trip;

@Entity
@Table(
    name = "trip_budget",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_trip_budget_trip",
            columnNames = "trip_id"
        )
    }
)
public class TripBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "budget_id")
    private Integer budgetId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false, unique = true)
    private Trip trip;

    @Column(name = "total_budget", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalBudget;

    @Column(name = "total_spent", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalSpent = BigDecimal.ZERO;

    @Column(name = "warning_threshold", nullable = false)
    private Integer warningThreshold = 80;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeInsert() {
        createdAt = LocalDateTime.now();

        if (totalSpent == null) {
            totalSpent = BigDecimal.ZERO;
        }

        if (warningThreshold == null) {
            warningThreshold = 80;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Integer getBudgetId() {
        return budgetId;
    }

    public void setBudgetId(Integer budgetId) {
        this.budgetId = budgetId;
    }

    public Trip getTrip() {
        return trip;
    }

    public void setTrip(Trip trip) {
        this.trip = trip;
    }

    public BigDecimal getTotalBudget() {
        return totalBudget;
    }

    public void setTotalBudget(BigDecimal totalBudget) {
        this.totalBudget = totalBudget;
    }

    public BigDecimal getTotalSpent() {
        return totalSpent;
    }

    public void setTotalSpent(BigDecimal totalSpent) {
        this.totalSpent = totalSpent;
    }

    public Integer getWarningThreshold() {
        return warningThreshold;
    }

    public void setWarningThreshold(Integer warningThreshold) {
        this.warningThreshold = warningThreshold;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}