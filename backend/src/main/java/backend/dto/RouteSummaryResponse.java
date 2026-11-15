package backend.dto;

import java.util.List;

/**
 * Everything the Smart Route Planner page needs in ONE call:
 * totals, per-leg details, and whether the numbers are live road data
 * (source = "OSRM") or an approximate estimate (source = "ESTIMATE").
 */
public class RouteSummaryResponse {

    private Integer tripId;
    private Integer stopCount;
    private Double totalDistanceKm;
    private Double totalDurationMinutes;
    private Double averageSpeedKmph;
    private String source;
    private Boolean approximate;
    private String notice;
    private List<RouteLegResponse> legs;
    private Boolean roundTrip;
    private String originName;

    public RouteSummaryResponse() {
    }

    public Integer getTripId() { return tripId; }
    public void setTripId(Integer v) { this.tripId = v; }

    public Integer getStopCount() { return stopCount; }
    public void setStopCount(Integer v) { this.stopCount = v; }

    public Double getTotalDistanceKm() { return totalDistanceKm; }
    public void setTotalDistanceKm(Double v) { this.totalDistanceKm = v; }

    public Double getTotalDurationMinutes() { return totalDurationMinutes; }
    public void setTotalDurationMinutes(Double v) { this.totalDurationMinutes = v; }

    public Double getAverageSpeedKmph() { return averageSpeedKmph; }
    public void setAverageSpeedKmph(Double v) { this.averageSpeedKmph = v; }

    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }

    public Boolean getApproximate() { return approximate; }
    public void setApproximate(Boolean v) { this.approximate = v; }

    public String getNotice() { return notice; }
    public void setNotice(String v) { this.notice = v; }

    public List<RouteLegResponse> getLegs() { return legs; }
    public void setLegs(List<RouteLegResponse> v) { this.legs = v; }

    /** true when the route starts at the trip origin and returns to it. */
    public Boolean getRoundTrip() { return roundTrip; }
    public void setRoundTrip(Boolean v) { this.roundTrip = v; }

    public String getOriginName() { return originName; }
    public void setOriginName(String v) { this.originName = v; }
}
