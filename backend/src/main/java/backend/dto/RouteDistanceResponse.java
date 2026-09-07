package backend.dto;

public class RouteDistanceResponse {

    private Integer tripId;
    private Double totalDistanceKm;

    public RouteDistanceResponse() {
    }

    public RouteDistanceResponse(
            Integer tripId,
            Double totalDistanceKm) {

        this.tripId = tripId;
        this.totalDistanceKm = totalDistanceKm;
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
}