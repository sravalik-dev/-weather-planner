package backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Totals for the saved itinerary, always computed from the activities that
 * are in the database right now (so they stay correct after manual edits).
 * "warnings" come from the most recent generation.
 */
public class ItinerarySummaryResponse {

    private Integer tripId;
    private String origin;
    private Boolean roundTrip;
    private Boolean returnIncluded;
    private LocalDateTime firstStart;
    private LocalDateTime lastEnd;
    private Integer activityCount;
    private Long totalTravelMinutes;
    private Long totalVisitMinutes;
    private Long totalBreakMinutes;
    private Long totalOvernightMinutes;
    private Double totalDistanceKm;
    private Double returnDistanceKm;
    private Long returnTravelMinutes;
    private Boolean hasEstimatedTravel;
    private List<String> warnings;
    private String lastGeneratedAt;
    private List<Day> days;

    public ItinerarySummaryResponse() {
    }

    public Integer getTripId() {
        return tripId;
    }

    public void setTripId(Integer tripId) {
        this.tripId = tripId;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public Boolean getRoundTrip() {
        return roundTrip;
    }

    public void setRoundTrip(Boolean roundTrip) {
        this.roundTrip = roundTrip;
    }

    public Boolean getReturnIncluded() {
        return returnIncluded;
    }

    public void setReturnIncluded(Boolean returnIncluded) {
        this.returnIncluded = returnIncluded;
    }

    public LocalDateTime getFirstStart() {
        return firstStart;
    }

    public void setFirstStart(LocalDateTime firstStart) {
        this.firstStart = firstStart;
    }

    public LocalDateTime getLastEnd() {
        return lastEnd;
    }

    public void setLastEnd(LocalDateTime lastEnd) {
        this.lastEnd = lastEnd;
    }

    public Integer getActivityCount() {
        return activityCount;
    }

    public void setActivityCount(Integer activityCount) {
        this.activityCount = activityCount;
    }

    public Long getTotalTravelMinutes() {
        return totalTravelMinutes;
    }

    public void setTotalTravelMinutes(Long totalTravelMinutes) {
        this.totalTravelMinutes = totalTravelMinutes;
    }

    public Long getTotalVisitMinutes() {
        return totalVisitMinutes;
    }

    public void setTotalVisitMinutes(Long totalVisitMinutes) {
        this.totalVisitMinutes = totalVisitMinutes;
    }

    public Long getTotalBreakMinutes() {
        return totalBreakMinutes;
    }

    public void setTotalBreakMinutes(Long totalBreakMinutes) {
        this.totalBreakMinutes = totalBreakMinutes;
    }

    public Long getTotalOvernightMinutes() {
        return totalOvernightMinutes;
    }

    public void setTotalOvernightMinutes(Long totalOvernightMinutes) {
        this.totalOvernightMinutes = totalOvernightMinutes;
    }

    public Double getTotalDistanceKm() {
        return totalDistanceKm;
    }

    public void setTotalDistanceKm(Double totalDistanceKm) {
        this.totalDistanceKm = totalDistanceKm;
    }

    public Double getReturnDistanceKm() {
        return returnDistanceKm;
    }

    public void setReturnDistanceKm(Double returnDistanceKm) {
        this.returnDistanceKm = returnDistanceKm;
    }

    public Long getReturnTravelMinutes() {
        return returnTravelMinutes;
    }

    public void setReturnTravelMinutes(Long returnTravelMinutes) {
        this.returnTravelMinutes = returnTravelMinutes;
    }

    public Boolean getHasEstimatedTravel() {
        return hasEstimatedTravel;
    }

    public void setHasEstimatedTravel(Boolean hasEstimatedTravel) {
        this.hasEstimatedTravel = hasEstimatedTravel;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public String getLastGeneratedAt() {
        return lastGeneratedAt;
    }

    public void setLastGeneratedAt(String lastGeneratedAt) {
        this.lastGeneratedAt = lastGeneratedAt;
    }

    public List<Day> getDays() {
        return days;
    }

    public void setDays(List<Day> days) {
        this.days = days;
    }

    /** Scheduled minutes per calendar day (an activity crossing midnight is split between its two days). */
    public static class Day {

        private LocalDate date;
        private Long scheduledMinutes;
        private Long travelMinutes;
        private Long visitMinutes;
        private Long breakMinutes;
        private Double distanceKm;

        public Day() {
        }

        public LocalDate getDate() {
            return date;
        }

        public void setDate(LocalDate date) {
            this.date = date;
        }

        public Long getScheduledMinutes() {
            return scheduledMinutes;
        }

        public void setScheduledMinutes(Long scheduledMinutes) {
            this.scheduledMinutes = scheduledMinutes;
        }

        public Long getTravelMinutes() {
            return travelMinutes;
        }

        public void setTravelMinutes(Long travelMinutes) {
            this.travelMinutes = travelMinutes;
        }

        public Long getVisitMinutes() {
            return visitMinutes;
        }

        public void setVisitMinutes(Long visitMinutes) {
            this.visitMinutes = visitMinutes;
        }

        public Long getBreakMinutes() {
            return breakMinutes;
        }

        public void setBreakMinutes(Long breakMinutes) {
            this.breakMinutes = breakMinutes;
        }

        public Double getDistanceKm() {
            return distanceKm;
        }

        public void setDistanceKm(Double distanceKm) {
            this.distanceKm = distanceKm;
        }
    }
}
