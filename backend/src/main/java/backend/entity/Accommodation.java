package backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.*;

@Entity
@Table(name = "accommodations")
public class Accommodation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "accommodation_id")
    private Integer accommodationId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 100)
    private String destination;

    @Enumerated(EnumType.STRING)
    @Column(name = "accommodation_type", nullable = false, length = 30)
    private AccommodationType accommodationType;

    @Column(length = 300)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "price_per_night", nullable = false, precision = 12, scale = 2)
    private BigDecimal pricePerNight;

    @Column(precision = 3, scale = 2)
    private BigDecimal rating;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "check_in_time")
    private LocalTime checkInTime;

    @Column(name = "check_out_time")
    private LocalTime checkOutTime;

    @Column(name = "max_guests", nullable = false)
    private Integer maxGuests = 2;

    // Beach / Sea
    @Column(name = "beach_view", nullable = false)
    private boolean beachView = false;

    @Column(name = "beach_access", nullable = false)
    private boolean beachAccess = false;

    @Column(name = "beachfront", nullable = false)
    private boolean beachfront = false;

    @Column(name = "sea_view", nullable = false)
    private boolean seaView = false;

    @Column(name = "partial_sea_view", nullable = false)
    private boolean partialSeaView = false;

    @Column(name = "near_beach", nullable = false)
    private boolean nearBeach = false;

    // Pool
    @Column(name = "swimming_pool", nullable = false)
    private boolean swimmingPool = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "pool_type", length = 30)
    private PoolType poolType = PoolType.NONE;

    @Column(name = "private_pool", nullable = false)
    private boolean privatePool = false;

    // Facilities
    @Column(nullable = false)
    private boolean restaurant = false;

    @Column(nullable = false)
    private boolean wifi = false;

    @Column(nullable = false)
    private boolean parking = false;

    @Column(name = "breakfast_included", nullable = false)
    private boolean breakfastIncluded = false;

    @Column(nullable = false)
    private boolean spa = false;

    @Column(nullable = false)
    private boolean fitness = false;

    @Column(name = "room_service", nullable = false)
    private boolean roomService = false;

    @Column(nullable = false)
    private boolean kitchen = false;

    @Column(nullable = false)
    private boolean lounge = false;

    @Column(nullable = false)
    private boolean lockers = false;

    @Column(nullable = false)
    private boolean familyFriendly = false;

    @Column(nullable = false)
    private boolean accessibility = false;

    @Column(nullable = false)
    private boolean kidsPool = false;

    @Column(nullable = false)
    private boolean garden = false;

    @Column(nullable = false)
    private boolean waterSports = false;

    @Column(nullable = false)
    private boolean recreation = false;

    @Column(nullable = false)
    private boolean balcony = false;

    @Column(nullable = false)
    private boolean localExperience = false;

    @Column(nullable = false)
    private boolean foodAvailable = false;

    @Column(nullable = false)
    private boolean availability = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;

        if (poolType == null) {
            poolType = PoolType.NONE;
        }

        if (!swimmingPool) {
            privatePool = false;
            poolType = PoolType.NONE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();

        if (!swimmingPool) {
            privatePool = false;
            poolType = PoolType.NONE;
        }
    }

    public Integer getAccommodationId() {
        return accommodationId;
    }

    public void setAccommodationId(Integer accommodationId) {
        this.accommodationId = accommodationId;
    }

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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}