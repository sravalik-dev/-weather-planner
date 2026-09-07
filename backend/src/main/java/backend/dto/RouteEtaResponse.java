package backend.dto;

public class RouteEtaResponse {

    private Integer tripId;
    private Double totalDistanceKm;
    private Double averageSpeedKmph;
    private Double estimatedTravelTimeHours;

    public RouteEtaResponse() {
    }

    public RouteEtaResponse(
            Integer tripId,
            Double totalDistanceKm,
            Double averageSpeedKmph,
            Double estimatedTravelTimeHours) {

        this.tripId = tripId;
        this.totalDistanceKm = totalDistanceKm;
        this.averageSpeedKmph = averageSpeedKmph;
        this.estimatedTravelTimeHours =
                estimatedTravelTimeHours;
    }

    public Integer getTripId() {
        return tripId;
    }

    public void setTripId(Integer tripId) {
        this.tripId = tripId;
    }

    public Double getTotalDistanceKm() {
        return totalDistanceKm;
    }

    public void setTotalDistanceKm(Double totalDistanceKm) {
        this.totalDistanceKm = totalDistanceKm;
    }

    public Double getAverageSpeedKmph() {
        return averageSpeedKmph;
    }

    public void setAverageSpeedKmph(Double averageSpeedKmph) {
        this.averageSpeedKmph = averageSpeedKmph;
    }

    public Double getEstimatedTravelTimeHours() {
        return estimatedTravelTimeHours;
    }

    public void setEstimatedTravelTimeHours(
            Double estimatedTravelTimeHours) {

        this.estimatedTravelTimeHours =
                estimatedTravelTimeHours;
    }
}