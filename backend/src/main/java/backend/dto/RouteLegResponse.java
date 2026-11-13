package backend.dto;

/** One stretch of the route: from one stop to the next. */
public class RouteLegResponse {

    private Integer fromDestinationId;
    private String fromName;
    private Integer toDestinationId;
    private String toName;
    private Double distanceKm;
    private Double durationMinutes;

    public RouteLegResponse() {
    }

    public RouteLegResponse(
            Integer fromDestinationId,
            String fromName,
            Integer toDestinationId,
            String toName,
            Double distanceKm,
            Double durationMinutes) {

        this.fromDestinationId = fromDestinationId;
        this.fromName = fromName;
        this.toDestinationId = toDestinationId;
        this.toName = toName;
        this.distanceKm = distanceKm;
        this.durationMinutes = durationMinutes;
    }

    public Integer getFromDestinationId() { return fromDestinationId; }
    public void setFromDestinationId(Integer v) { this.fromDestinationId = v; }

    public String getFromName() { return fromName; }
    public void setFromName(String v) { this.fromName = v; }

    public Integer getToDestinationId() { return toDestinationId; }
    public void setToDestinationId(Integer v) { this.toDestinationId = v; }

    public String getToName() { return toName; }
    public void setToName(String v) { this.toName = v; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double v) { this.distanceKm = v; }

    public Double getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Double v) { this.durationMinutes = v; }
}
