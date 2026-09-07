package backend.dto;

public class DestinationResponse {

    private Integer destinationId;
    private String destinationName;
    private Double latitude;
    private Double longitude;
    private Integer destinationOrder;

    public DestinationResponse() {
    }

    public Integer getDestinationId() {
        return destinationId;
    }

    public void setDestinationId(Integer destinationId) {
        this.destinationId = destinationId;
    }

    public String getDestinationName() {
        return destinationName;
    }

    public void setDestinationName(String destinationName) {
        this.destinationName = destinationName;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Integer getDestinationOrder() {
        return destinationOrder;
    }

    public void setDestinationOrder(Integer destinationOrder) {
        this.destinationOrder = destinationOrder;
    }
}