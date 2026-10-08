package backend.entity;

import java.math.BigDecimal;

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
@Table(name = "foods")
public class Food {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "food_id")
    private Integer foodId;

    @ManyToOne
    @JoinColumn(name = "destination_id", nullable = false)
    private TripDestination destination;

    @Column(name = "dish_name", nullable = false)
    private String dishName;

    @Column(name = "cuisine")
    private String cuisine;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private FoodCategory category;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "ingredients", columnDefinition = "TEXT")
    private String ingredients;

    @Enumerated(EnumType.STRING)
    @Column(name = "food_type")
    private FoodType foodType;

    @Enumerated(EnumType.STRING)
    @Column(name = "spice_level")
    private SpiceLevel spiceLevel;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "popularity")
    private Double popularity;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommended_meal")
    private MealPeriod recommendedMeal;

    public Food() {
    }

    // ==========================================
    // FOOD ID
    // ==========================================

    public Integer getFoodId() {
        return foodId;
    }

    public void setFoodId(Integer foodId) {
        this.foodId = foodId;
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
    // DISH NAME
    // ==========================================

    public String getDishName() {
        return dishName;
    }

    public void setDishName(String dishName) {
        this.dishName = dishName;
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
    // CATEGORY
    // ==========================================

    public FoodCategory getCategory() {
        return category;
    }

    public void setCategory(FoodCategory category) {
        this.category = category;
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
    // INGREDIENTS
    // ==========================================

    public String getIngredients() {
        return ingredients;
    }

    public void setIngredients(String ingredients) {
        this.ingredients = ingredients;
    }

    // ==========================================
    // FOOD TYPE
    // ==========================================

    public FoodType getFoodType() {
        return foodType;
    }

    public void setFoodType(FoodType foodType) {
        this.foodType = foodType;
    }

    // ==========================================
    // SPICE LEVEL
    // ==========================================

    public SpiceLevel getSpiceLevel() {
        return spiceLevel;
    }

    public void setSpiceLevel(SpiceLevel spiceLevel) {
        this.spiceLevel = spiceLevel;
    }

    // ==========================================
    // PRICE
    // ==========================================

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
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
    // RECOMMENDED MEAL
    // ==========================================

    public MealPeriod getRecommendedMeal() {
        return recommendedMeal;
    }

    public void setRecommendedMeal(MealPeriod recommendedMeal) {
        this.recommendedMeal = recommendedMeal;
    }
}