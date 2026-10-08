package backend.entity;

import java.math.BigDecimal;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "food_places")
public class FoodPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "food_place_id")
    private Integer foodPlaceId;

    @ManyToOne
    @JoinColumn(name = "destination_id", nullable = false)
    private TripDestination destination;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "cuisine")
    private String cuisine;

    @Enumerated(EnumType.STRING)
    @Column(name = "place_type", nullable = false)
    private FoodPlaceType placeType;

    @Column(name = "price_range")
    private String priceRange;

    @Column(name = "opening_time")
    private LocalTime openingTime;

    @Column(name = "closing_time")
    private LocalTime closingTime;

    @Column(name = "popularity")
    private Double popularity;

    @Column(name = "rating", precision = 4, scale = 2)
    private BigDecimal rating;

    @Column(name = "vegetarian_available")
    private Boolean vegetarianAvailable = false;

    @Column(name = "vegan_available")
    private Boolean veganAvailable = false;

    @Column(name = "dietary_information", columnDefinition = "TEXT")
    private String dietaryInformation;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /*
     * Optional beverage/alcohol-related information.
     *
     * This does not store alcohol consumption amounts.
     * It only describes whether the establishment provides
     * alcohol-related options.
     */

    @Column(name = "alcohol_available")
    private Boolean alcoholAvailable = false;

    @Column(name = "local_drinks_available")
    private Boolean localDrinksAvailable = false;

    public FoodPlace() {
    }

    // ==========================================
    // FOOD PLACE ID
    // ==========================================

    public Integer getFoodPlaceId() {
        return foodPlaceId;
    }

    public void setFoodPlaceId(Integer foodPlaceId) {
        this.foodPlaceId = foodPlaceId;
    }

    // ==========================================
    // DESTINATION
    // ==========================================

    public TripDestination getDestination() {
        return destination;
    }

    public void setDestination(TripDestination destination) {
        this.destination = destination;
    }

    // ==========================================
    // NAME
    // ==========================================

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    // ==========================================
    // LATITUDE
    // ==========================================

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    // ==========================================
    // LONGITUDE
    // ==========================================

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    // ==========================================
    // CUISINE
    // ==========================================

    public String getCuisine() {
        return cuisine;
    }

    public void setCuisine(String cuisine) {
        this.cuisine = cuisine;
    }

    // ==========================================
    // PLACE TYPE
    // ==========================================

    public FoodPlaceType getPlaceType() {
        return placeType;
    }

    public void setPlaceType(FoodPlaceType placeType) {
        this.placeType = placeType;
    }

    // ==========================================
    // PRICE RANGE
    // ==========================================

    public String getPriceRange() {
        return priceRange;
    }

    public void setPriceRange(String priceRange) {
        this.priceRange = priceRange;
    }

    // ==========================================
    // OPENING TIME
    // ==========================================

    public LocalTime getOpeningTime() {
        return openingTime;
    }

    public void setOpeningTime(LocalTime openingTime) {
        this.openingTime = openingTime;
    }

    // ==========================================
    // CLOSING TIME
    // ==========================================

    public LocalTime getClosingTime() {
        return closingTime;
    }

    public void setClosingTime(LocalTime closingTime) {
        this.closingTime = closingTime;
    }

    // ==========================================
    // POPULARITY
    // ==========================================

    public Double getPopularity() {
        return popularity;
    }

    public void setPopularity(Double popularity) {
        this.popularity = popularity;
    }

    // ==========================================
    // RATING
    // ==========================================

    public BigDecimal getRating() {
        return rating;
    }

    public void setRating(BigDecimal rating) {
        this.rating = rating;
    }

    // ==========================================
    // VEGETARIAN AVAILABLE
    // ==========================================

    public Boolean getVegetarianAvailable() {
        return vegetarianAvailable;
    }

    public void setVegetarianAvailable(Boolean vegetarianAvailable) {
        this.vegetarianAvailable = vegetarianAvailable;
    }

    // ==========================================
    // VEGAN AVAILABLE
    // ==========================================

    public Boolean getVeganAvailable() {
        return veganAvailable;
    }

    public void setVeganAvailable(Boolean veganAvailable) {
        this.veganAvailable = veganAvailable;
    }

    // ==========================================
    // DIETARY INFORMATION
    // ==========================================

    public String getDietaryInformation() {
        return dietaryInformation;
    }

    public void setDietaryInformation(String dietaryInformation) {
        this.dietaryInformation = dietaryInformation;
    }

    // ==========================================
    // DESCRIPTION
    // ==========================================

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    // ==========================================
    // ALCOHOL AVAILABLE
    // ==========================================

    public Boolean getAlcoholAvailable() {
        return alcoholAvailable;
    }

    public void setAlcoholAvailable(Boolean alcoholAvailable) {
        this.alcoholAvailable = alcoholAvailable;
    }

    // ==========================================
    // LOCAL DRINKS AVAILABLE
    // ==========================================

    public Boolean getLocalDrinksAvailable() {
        return localDrinksAvailable;
    }

    public void setLocalDrinksAvailable(Boolean localDrinksAvailable) {
        this.localDrinksAvailable = localDrinksAvailable;
    }
}