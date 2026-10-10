package backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

import backend.entity.Accommodation;
import backend.entity.AccommodationType;
import backend.entity.PoolType;

public class AccommodationResponse {

    private Integer accommodationId;
    private String name;
    private String destination;
    private AccommodationType accommodationType;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal pricePerNight;
    private BigDecimal rating;
    private String description;
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private Integer maxGuests;

    private boolean beachView;
    private boolean beachAccess;
    private boolean beachfront;
    private boolean seaView;
    private boolean partialSeaView;
    private boolean nearBeach;

    private boolean swimmingPool;
    private PoolType poolType;
    private boolean privatePool;

    private boolean restaurant;
    private boolean wifi;
    private boolean parking;
    private boolean breakfastIncluded;
    private boolean spa;
    private boolean fitness;
    private boolean roomService;
    private boolean kitchen;
    private boolean lounge;
    private boolean lockers;
    private boolean familyFriendly;
    private boolean accessibility;
    private boolean kidsPool;
    private boolean garden;
    private boolean waterSports;
    private boolean recreation;
    private boolean balcony;
    private boolean localExperience;
    private boolean foodAvailable;

    private boolean availability;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Double distanceKm;
    private Double matchScore;

    public AccommodationResponse() {
    }

    public static AccommodationResponse fromEntity(Accommodation a) {

        AccommodationResponse r = new AccommodationResponse();

        r.accommodationId = a.getAccommodationId();
        r.name = a.getName();
        r.destination = a.getDestination();
        r.accommodationType = a.getAccommodationType();
        r.address = a.getAddress();
        r.latitude = a.getLatitude();
        r.longitude = a.getLongitude();
        r.pricePerNight = a.getPricePerNight();
        r.rating = a.getRating();
        r.description = a.getDescription();
        r.checkInTime = a.getCheckInTime();
        r.checkOutTime = a.getCheckOutTime();
        r.maxGuests = a.getMaxGuests();

        r.beachView = a.isBeachView();
        r.beachAccess = a.isBeachAccess();
        r.beachfront = a.isBeachfront();
        r.seaView = a.isSeaView();
        r.partialSeaView = a.isPartialSeaView();
        r.nearBeach = a.isNearBeach();

        r.swimmingPool = a.isSwimmingPool();
        r.poolType = a.getPoolType();
        r.privatePool = a.isPrivatePool();

        r.restaurant = a.isRestaurant();
        r.wifi = a.isWifi();
        r.parking = a.isParking();
        r.breakfastIncluded = a.isBreakfastIncluded();
        r.spa = a.isSpa();
        r.fitness = a.isFitness();
        r.roomService = a.isRoomService();
        r.kitchen = a.isKitchen();
        r.lounge = a.isLounge();
        r.lockers = a.isLockers();
        r.familyFriendly = a.isFamilyFriendly();
        r.accessibility = a.isAccessibility();
        r.kidsPool = a.isKidsPool();
        r.garden = a.isGarden();
        r.waterSports = a.isWaterSports();
        r.recreation = a.isRecreation();
        r.balcony = a.isBalcony();
        r.localExperience = a.isLocalExperience();
        r.foodAvailable = a.isFoodAvailable();

        r.availability = a.isAvailability();

        r.createdAt = a.getCreatedAt();
        r.updatedAt = a.getUpdatedAt();

        return r;
    }

    public Integer getAccommodationId() {
        return accommodationId;
    }

    public String getName() {
        return name;
    }

    public String getDestination() {
        return destination;
    }

    public AccommodationType getAccommodationType() {
        return accommodationType;
    }

    public String getAddress() {
        return address;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public BigDecimal getPricePerNight() {
        return pricePerNight;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public String getDescription() {
        return description;
    }

    public LocalTime getCheckInTime() {
        return checkInTime;
    }

    public LocalTime getCheckOutTime() {
        return checkOutTime;
    }

    public Integer getMaxGuests() {
        return maxGuests;
    }

    public boolean isBeachView() {
        return beachView;
    }

    public boolean isBeachAccess() {
        return beachAccess;
    }

    public boolean isBeachfront() {
        return beachfront;
    }

    public boolean isSeaView() {
        return seaView;
    }

    public boolean isPartialSeaView() {
        return partialSeaView;
    }

    public boolean isNearBeach() {
        return nearBeach;
    }

    public boolean isSwimmingPool() {
        return swimmingPool;
    }

    public PoolType getPoolType() {
        return poolType;
    }

    public boolean isPrivatePool() {
        return privatePool;
    }

    public boolean isRestaurant() {
        return restaurant;
    }

    public boolean isWifi() {
        return wifi;
    }

    public boolean isParking() {
        return parking;
    }

    public boolean isBreakfastIncluded() {
        return breakfastIncluded;
    }

    public boolean isSpa() {
        return spa;
    }

    public boolean isFitness() {
        return fitness;
    }

    public boolean isRoomService() {
        return roomService;
    }

    public boolean isKitchen() {
        return kitchen;
    }

    public boolean isLounge() {
        return lounge;
    }

    public boolean isLockers() {
        return lockers;
    }

    public boolean isFamilyFriendly() {
        return familyFriendly;
    }

    public boolean isAccessibility() {
        return accessibility;
    }

    public boolean isKidsPool() {
        return kidsPool;
    }

    public boolean isGarden() {
        return garden;
    }

    public boolean isWaterSports() {
        return waterSports;
    }

    public boolean isRecreation() {
        return recreation;
    }

    public boolean isBalcony() {
        return balcony;
    }

    public boolean isLocalExperience() {
        return localExperience;
    }

    public boolean isFoodAvailable() {
        return foodAvailable;
    }

    public boolean isAvailability() {
        return availability;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public Double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(Double distanceKm) {
        this.distanceKm = distanceKm;
    }

    public Double getMatchScore() {
        return matchScore;
    }

    public void setMatchScore(Double matchScore) {
        this.matchScore = matchScore;
    }
}