package backend.entity;

import java.math.BigDecimal;
import java.time.LocalTime;

import jakarta.persistence.*;

@Entity
@Table(name = "trip_destinations")
public class TripDestination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "destination_id")
    private Integer destinationId;

    @ManyToOne
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    // ==========================================
    // MODULE 4 FIELDS
    // ==========================================

    @Column(name = "destination_name", nullable = false)
    private String destinationName;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "destination_order", nullable = false)
    private Integer destinationOrder;

    // ==========================================
    // MODULE 5 FIELDS
    // ==========================================

    @Column
    private String category;

    @Column(name = "best_time")
    private String bestTime;

    @Column(name = "opening_time")
    private LocalTime openingTime;

    @Column(name = "closing_time")
    private LocalTime closingTime;

    @Column(name = "ticket_price", precision = 12, scale = 2)
    private BigDecimal ticketPrice;

    /*
     * Expected duration is stored in minutes.
     */
    @Column(name = "expected_duration")
    private Integer expectedDuration;

    /*
     * Popularity rating.
     * Example: 4.5
     */
    @Column
    private Double popularity;

    @Enumerated(EnumType.STRING)
    @Column(name = "indoor_outdoor")
    private IndoorOutdoorType indoorOutdoor;

    @Column(name = "family_friendly")
    private Boolean familyFriendly;

    @Column(name = "wheelchair_friendly")
    private Boolean wheelchairFriendly;

    @Column(name = "kids_friendly")
    private Boolean kidsFriendly;

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    public TripDestination() {
    }

    // ==========================================
    // GETTERS AND SETTERS
    // ==========================================

    public Integer getDestinationId() {
        return destinationId;
    }

    public void setDestinationId(Integer destinationId) {
        this.destinationId = destinationId;
    }

    public Trip getTrip() {
        return trip;
    }

    public void setTrip(Trip trip) {
        this.trip = trip;
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