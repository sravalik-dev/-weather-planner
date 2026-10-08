package backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import backend.entity.AccommodationType;

public class AccommodationSearchRequest {

    private String destination;

    private Integer tripId;

    private Integer guests;

    private LocalDate checkInDate;

    private LocalDate checkOutDate;

    private BigDecimal maxPricePerNight;

    private BigDecimal minPricePerNight;

    private AccommodationType accommodationType;

    /*
     * ANY
     * BEACH_VIEW
     * BEACH_ACCESS
     * BEACHFRONT
     * SEA_VIEW
     * PARTIAL_SEA_VIEW
     * NEAR_BEACH
     */
    private String beachFilter;

    /*
     * ANY
     * POOL_REQUIRED
     * PRIVATE_POOL
     * OUTDOOR_POOL
     * INDOOR_POOL
     * INFINITY_POOL
     * KIDS_POOL
     */
    private String poolFilter;

    private Boolean familyFriendly;
    private Boolean accessibility;
    private Boolean wifi;
    private Boolean parking;
    private Boolean breakfastIncluded;
    private Boolean restaurant;

    private BigDecimal latitude;
    private BigDecimal longitude;
    private Double maxDistanceKm;

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public Integer getTripId() {
        return tripId;
    }

    public void setTripId(Integer tripId) {
        this.tripId = tripId;
    }

    public Integer getGuests() {
        return guests;
    }

    public void setGuests(Integer guests) {
        this.guests = guests;
    }

    public LocalDate getCheckInDate() {
        return checkInDate;
    }

    public void setCheckInDate(LocalDate checkInDate) {
        this.checkInDate = checkInDate;
    }

    public LocalDate getCheckOutDate() {
        return checkOutDate;
    }

    public void setCheckOutDate(LocalDate checkOutDate) {
        this.checkOutDate = checkOutDate;
    }

    public BigDecimal getMaxPricePerNight() {
        return maxPricePerNight;
    }

    public void setMaxPricePerNight(BigDecimal maxPricePerNight) {
        this.maxPricePerNight = maxPricePerNight;
    }

    public BigDecimal getMinPricePerNight() {
        return minPricePerNight;
    }

    public void setMinPricePerNight(BigDecimal minPricePerNight) {
        this.minPricePerNight = minPricePerNight;
    }

    public AccommodationType getAccommodationType() {
        return accommodationType;
    }

    public void setAccommodationType(AccommodationType accommodationType) {
        this.accommodationType = accommodationType;
    }

    public String getBeachFilter() {
        return beachFilter;
    }

    public void setBeachFilter(String beachFilter) {
        this.beachFilter = beachFilter;
    }

    public String getPoolFilter() {
        return poolFilter;
    }

    public void setPoolFilter(String poolFilter) {
        this.poolFilter = poolFilter;
    }

    public Boolean getFamilyFriendly() {
        return familyFriendly;
    }

    public void setFamilyFriendly(Boolean familyFriendly) {
        this.familyFriendly = familyFriendly;
    }

    public Boolean getAccessibility() {
        return accessibility;
    }

    public void setAccessibility(Boolean accessibility) {
        this.accessibility = accessibility;
    }

    public Boolean getWifi() {
        return wifi;
    }

    public void setWifi(Boolean wifi) {
        this.wifi = wifi;
    }

    public Boolean getParking() {
        return parking;
    }

    public void setParking(Boolean parking) {
        this.parking = parking;
    }

    public Boolean getBreakfastIncluded() {
        return breakfastIncluded;
    }

    public void setBreakfastIncluded(Boolean breakfastIncluded) {
        this.breakfastIncluded = breakfastIncluded;
    }

    public Boolean getRestaurant() {
        return restaurant;
    }

    public void setRestaurant(Boolean restaurant) {
        this.restaurant = restaurant;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    public Double getMaxDistanceKm() {
        return maxDistanceKm;
    }

    public void setMaxDistanceKm(Double maxDistanceKm) {
        this.maxDistanceKm = maxDistanceKm;
    }
}