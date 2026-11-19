package backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "itinerary_activities")
public class ItineraryActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_id")
    private Integer activityId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id")
    private TripDestination destination;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "activity_name", nullable = false)
    private String activityName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    private String category;

    @Column
    private Integer duration;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @Column(nullable = false)
    private Boolean locked = false;

    /*
     * 24-HOUR SCHEDULING
     * activityDate + startTime is where the activity starts. endDate + endTime
     * is where it ends. endDate is NULL for older rows and for activities that
     * finish on the same day, so existing data keeps working unchanged. An
     * activity that crosses midnight has endDate = activityDate + 1.
     */
    @Column(name = "end_date")
    private LocalDate endDate;

    /** TRAVEL, RETURN, VISIT, MEAL, REST, FREE_TIME, ACCOMMODATION or CUSTOM. */
    @Column(name = "activity_type", length = 30)
    private String activityType;

    @Column(name = "distance_km")
    private Double distanceKm;

    /** OSRM or ESTIMATE (straight-line fallback) for travel activities. */
    @Column(name = "route_source", length = 20)
    private String routeSource;

    /** True when the travel time or visit duration is an estimate, not real data. */
    @Column(name = "is_estimated")
    private Boolean estimated;

    /**
     * True for activities created by the generator. Regeneration replaces only
     * unlocked GENERATED activities; manual ones are kept. NULL on rows from
     * before this column existed (see isGeneratedActivity()).
     */
    @Column(name = "is_generated")
    private Boolean generated;

    public ItineraryActivity() {
    }

    public Integer getActivityId() {
        return activityId;
    }

    public void setActivityId(Integer activityId) {
        this.activityId = activityId;
    }

    public Trip getTrip() {
        return trip;
    }

    public void setTrip(Trip trip) {
        this.trip = trip;
    }

    public TripDestination getDestination() {
        return destination;
    }

    public void setDestination(TripDestination destination) {
        this.destination = destination;
    }

    public LocalDate getActivityDate() {
        return activityDate;
    }

    public void setActivityDate(LocalDate activityDate) {
        this.activityDate = activityDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public String getActivityName() {
        return activityName;
    }

    public void setActivityName(String activityName) {
        this.activityName = activityName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public Integer getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }

    public Boolean getLocked() {
        return locked;
    }

    public void setLocked(Boolean locked) {
        this.locked = locked;
    }

    // ==========================================
    // DATE-TIME HELPERS (not persisted)
    // ==========================================

    /** Start as a full date-time, or null when no start time is stored. */
    public LocalDateTime computeStartDateTime() {
        if (activityDate == null || startTime == null) {
            return null;
        }
        return activityDate.atTime(startTime);
    }

    /**
     * End as a full date-time, or null when no end time is stored.
     * Older rows have no endDate, so the activity date is used.
     */
    public LocalDateTime computeEndDateTime() {
        if (activityDate == null || endTime == null) {
            return null;
        }
        return (endDate != null ? endDate : activityDate).atTime(endTime);
    }

    /**
     * Whether regeneration may replace this activity. Rows created before the
     * is_generated column existed are recognised by what the old generator
     * produced: travel, meal and break rows and rows linked to a destination.
     * Manual "Custom" activities are never treated as generated.
     */
    public boolean isGeneratedActivity() {
        if (generated != null) {
            return generated;
        }
        if (destination != null) {
            return true;
        }
        String c = category == null ? "" : category.trim().toUpperCase();
        return c.equals("TRAVEL") || c.equals("MEAL") || c.equals("BREAK");
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getActivityType() {
        return activityType;
    }

    public void setActivityType(String activityType) {
        this.activityType = activityType;
    }

    public Double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(Double distanceKm) {
        this.distanceKm = distanceKm;
    }

    public String getRouteSource() {
        return routeSource;
    }

    public void setRouteSource(String routeSource) {
        this.routeSource = routeSource;
    }

    public Boolean getEstimated() {
        return estimated;
    }

    public void setEstimated(Boolean estimated) {
        this.estimated = estimated;
    }

    public Boolean getGenerated() {
        return generated;
    }

    public void setGenerated(Boolean generated) {
        this.generated = generated;
    }
}
