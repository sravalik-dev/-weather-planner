package backend.dto;

import java.math.BigDecimal;
import java.time.LocalTime;

import backend.entity.IndoorOutdoorType;

public class DestinationResponse {

    // ==========================================
    // MODULE 4
    // ==========================================

    private Integer destinationId;
    private String destinationName;
    private Double latitude;
    private Double longitude;
    private Integer destinationOrder;

    // ==========================================
    // MODULE 5
    // ==========================================

    private String category;
    private String bestTime;
    private LocalTime openingTime;
    private LocalTime closingTime;
    private BigDecimal ticketPrice;
    private Integer expectedDuration;
    private Double popularity;
    private IndoorOutdoorType indoorOutdoor;
    private Boolean familyFriendly;
    private Boolean wheelchairFriendly;
    private Boolean kidsFriendly;

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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getBestTime() {
        return bestTime;
    }

    public void setBestTime(String bestTime) {
        this.bestTime = bestTime;
    }

    public LocalTime getOpeningTime() {
        return openingTime;
    }

    public void setOpeningTime(LocalTime openingTime) {
        this.openingTime = openingTime;
    }

    public LocalTime getClosingTime() {
        return closingTime;
    }

    public void setClosingTime(LocalTime closingTime) {
        this.closingTime = closingTime;
    }

    public BigDecimal getTicketPrice() {
        return ticketPrice;
    }

    public void setTicketPrice(BigDecimal ticketPrice) {
        this.ticketPrice = ticketPrice;
    }

    public Integer getExpectedDuration() {
        return expectedDuration;
    }

    public void setExpectedDuration(Integer expectedDuration) {
        this.expectedDuration = expectedDuration;
    }

    public Double getPopularity() {
        return popularity;
    }

    public void setPopularity(Double popularity) {
        this.popularity = popularity;
    }

    public IndoorOutdoorType getIndoorOutdoor() {
        return indoorOutdoor;
    }

    public void setIndoorOutdoor(IndoorOutdoorType indoorOutdoor) {
        this.indoorOutdoor = indoorOutdoor;
    }

    public Boolean getFamilyFriendly() {
        return familyFriendly;
    }

    public void setFamilyFriendly(Boolean familyFriendly) {
        this.familyFriendly = familyFriendly;
    }

    public Boolean getWheelchairFriendly() {
        return wheelchairFriendly;
    }

    public void setWheelchairFriendly(Boolean wheelchairFriendly) {
        this.wheelchairFriendly = wheelchairFriendly;
    }

    public Boolean getKidsFriendly() {
        return kidsFriendly;
    }

    public void setKidsFriendly(Boolean kidsFriendly) {
        this.kidsFriendly = kidsFriendly;
    }
}