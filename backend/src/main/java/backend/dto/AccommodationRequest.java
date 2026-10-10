package backend.dto;

import java.math.BigDecimal;
import java.time.LocalTime;

import backend.entity.AccommodationType;
import backend.entity.PoolType;

public class AccommodationRequest {

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

    private boolean availability = true;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public AccommodationType getAccommodationType() {
        return accommodationType;
    }

    public void setAccommodationType(AccommodationType accommodationType) {
        this.accommodationType = accommodationType;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
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

    public BigDecimal getPricePerNight() {
        return pricePerNight;
    }

    public void setPricePerNight(BigDecimal pricePerNight) {
        this.pricePerNight = pricePerNight;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public void setRating(BigDecimal rating) {
        this.rating = rating;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalTime getCheckInTime() {
        return checkInTime;
    }

    public void setCheckInTime(LocalTime checkInTime) {
        this.checkInTime = checkInTime;
    }

    public LocalTime getCheckOutTime() {
        return checkOutTime;
    }

    public void setCheckOutTime(LocalTime checkOutTime) {
        this.checkOutTime = checkOutTime;
    }

    public Integer getMaxGuests() {
        return maxGuests;
    }

    public void setMaxGuests(Integer maxGuests) {
        this.maxGuests = maxGuests;
    }

    public boolean isBeachView() {
        return beachView;
    }

    public void setBeachView(boolean beachView) {
        this.beachView = beachView;
    }

    public boolean isBeachAccess() {
        return beachAccess;
    }

    public void setBeachAccess(boolean beachAccess) {
        this.beachAccess = beachAccess;
    }

    public boolean isBeachfront() {
        return beachfront;
    }

    public void setBeachfront(boolean beachfront) {
        this.beachfront = beachfront;
    }

    public boolean isSeaView() {
        return seaView;
    }

    public void setSeaView(boolean seaView) {
        this.seaView = seaView;
    }

    public boolean isPartialSeaView() {
        return partialSeaView;
    }

    public void setPartialSeaView(boolean partialSeaView) {
        this.partialSeaView = partialSeaView;
    }

    public boolean isNearBeach() {
        return nearBeach;
    }

    public void setNearBeach(boolean nearBeach) {
        this.nearBeach = nearBeach;
    }

    public boolean isSwimmingPool() {
        return swimmingPool;
    }

    public void setSwimmingPool(boolean swimmingPool) {
        this.swimmingPool = swimmingPool;
    }

    public PoolType getPoolType() {
        return poolType;
    }

    public void setPoolType(PoolType poolType) {
        this.poolType = poolType;
    }

    public boolean isPrivatePool() {
        return privatePool;
    }

    public void setPrivatePool(boolean privatePool) {
        this.privatePool = privatePool;
    }

    public boolean isRestaurant() {
        return restaurant;
    }

    public void setRestaurant(boolean restaurant) {
        this.restaurant = restaurant;
    }

    public boolean isWifi() {
        return wifi;
    }

    public void setWifi(boolean wifi) {
        this.wifi = wifi;
    }

    public boolean isParking() {
        return parking;
    }

    public void setParking(boolean parking) {
        this.parking = parking;
    }

    public boolean isBreakfastIncluded() {
        return breakfastIncluded;
    }

    public void setBreakfastIncluded(boolean breakfastIncluded) {
        this.breakfastIncluded = breakfastIncluded;
    }

    public boolean isSpa() {
        return spa;
    }

    public void setSpa(boolean spa) {
        this.spa = spa;
    }

    public boolean isFitness() {
        return fitness;
    }

    public void setFitness(boolean fitness) {
        this.fitness = fitness;
    }

    public boolean isRoomService() {
        return roomService;
    }

    public void setRoomService(boolean roomService) {
        this.roomService = roomService;
    }

    public boolean isKitchen() {
        return kitchen;
    }

    public void setKitchen(boolean kitchen) {
        this.kitchen = kitchen;
    }

    public boolean isLounge() {
        return lounge;
    }

    public void setLounge(boolean lounge) {
        this.lounge = lounge;
    }

    public boolean isLockers() {
        return lockers;
    }

    public void setLockers(boolean lockers) {
        this.lockers = lockers;
    }

    public boolean isFamilyFriendly() {
        return familyFriendly;
    }

    public void setFamilyFriendly(boolean familyFriendly) {
        this.familyFriendly = familyFriendly;
    }

    public boolean isAccessibility() {
        return accessibility;
    }

    public void setAccessibility(boolean accessibility) {
        this.accessibility = accessibility;
    }

    public boolean isKidsPool() {
        return kidsPool;
    }

    public void setKidsPool(boolean kidsPool) {
        this.kidsPool = kidsPool;
    }

    public boolean isGarden() {
        return garden;
    }

    public void setGarden(boolean garden) {
        this.garden = garden;
    }

    public boolean isWaterSports() {
        return waterSports;
    }

    public void setWaterSports(boolean waterSports) {
        this.waterSports = waterSports;
    }

    public boolean isRecreation() {
        return recreation;
    }

    public void setRecreation(boolean recreation) {
        this.recreation = recreation;
    }

    public boolean isBalcony() {
        return balcony;
    }

    public void setBalcony(boolean balcony) {
        this.balcony = balcony;
    }

    public boolean isLocalExperience() {
        return localExperience;
    }

    public void setLocalExperience(boolean localExperience) {
        this.localExperience = localExperience;
    }

    public boolean isFoodAvailable() {
        return foodAvailable;
    }

    public void setFoodAvailable(boolean foodAvailable) {
        this.foodAvailable = foodAvailable;
    }

    public boolean isAvailability() {
        return availability;
    }

    public void setAvailability(boolean availability) {
        this.availability = availability;
    }
}