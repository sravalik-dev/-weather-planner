package backend.dto;

import java.math.BigDecimal;
import java.time.LocalTime;

public class FoodPlaceCreateRequest {

    private Integer destinationId;
    private String name;
    private Double latitude;
    private Double longitude;
    private String cuisine;
    private String placeType;
    private String priceRange;
    private LocalTime openingTime;
    private LocalTime closingTime;
    private Double popularity;
    private BigDecimal rating;
    private Boolean vegetarianAvailable;
    private Boolean veganAvailable;
    private String dietaryInformation;
    private String description;
    private Boolean alcoholAvailable;
    private Boolean localDrinksAvailable;

    public FoodPlaceCreateRequest() {
    }

    public Integer getDestinationId() {
        return destinationId;
    }

    public void setDestinationId(Integer destinationId) {
        this.destinationId = destinationId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public String getCuisine() {
        return cuisine;
    }

    public void setCuisine(String cuisine) {
        this.cuisine = cuisine;
    }

    public String getPlaceType() {
        return placeType;
    }

    public void setPlaceType(String placeType) {
        this.placeType = placeType;
    }

    public String getPriceRange() {
        return priceRange;
    }

    public void setPriceRange(String priceRange) {
        this.priceRange = priceRange;
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

    public Double getPopularity() {
        return popularity;
    }

    public void setPopularity(Double popularity) {
        this.popularity = popularity;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public void setRating(BigDecimal rating) {
        this.rating = rating;
    }

    public Boolean getVegetarianAvailable() {
        return vegetarianAvailable;
    }

    public void setVegetarianAvailable(Boolean vegetarianAvailable) {
        this.vegetarianAvailable = vegetarianAvailable;
    }

    public Boolean getVeganAvailable() {
        return veganAvailable;
    }

    public void setVeganAvailable(Boolean veganAvailable) {
        this.veganAvailable = veganAvailable;
    }

    public String getDietaryInformation() {
        return dietaryInformation;
    }

    public void setDietaryInformation(String dietaryInformation) {
        this.dietaryInformation = dietaryInformation;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getAlcoholAvailable() {
        return alcoholAvailable;
    }

    public void setAlcoholAvailable(Boolean alcoholAvailable) {
        this.alcoholAvailable = alcoholAvailable;
    }

    public Boolean getLocalDrinksAvailable() {
        return localDrinksAvailable;
    }

    public void setLocalDrinksAvailable(Boolean localDrinksAvailable) {
        this.localDrinksAvailable = localDrinksAvailable;
    }
}