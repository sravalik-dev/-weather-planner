package backend.dto;

public class WeatherHistoryRequest {

private Double latitude;
private Double longitude;
private String startDate;
private String endDate;

public WeatherHistoryRequest() {
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

public String getStartDate() {
    return startDate;
}

public void setStartDate(String startDate) {
    this.startDate = startDate;
}

public String getEndDate() {
    return endDate;
}

public void setEndDate(String endDate) {
    this.endDate = endDate;
}

}
