package backend.entity;

import java.math.BigDecimal;

import jakarta.persistence.*;

@Entity
@Table(
    name = "category_budget",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_category_budget",
            columnNames = {"budget_id", "category"}
        )
    }
)
public class CategoryBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_budget_id")
    private Integer categoryBudgetId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_id", nullable = false)
    private TripBudget budget;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExpenseCategory category;

    @Column(name = "allocated_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal allocatedAmount;

    public Integer getCategoryBudgetId() {
        return categoryBudgetId;
    }

    public void setCategoryBudgetId(Integer categoryBudgetId) {
        this.categoryBudgetId = categoryBudgetId;
    }

    public TripBudget getBudget() {
        return budget;
    }

    public void setBudget(TripBudget budget) {
        this.budget = budget;
    }

    public ExpenseCategory getCategory() {
        return category;
    }

    public void setCategory(ExpenseCategory category) {
        this.category = category;
    }

    public BigDecimal getAllocatedAmount() {
        return allocatedAmount;
    }

    public void setAllocatedAmount(BigDecimal allocatedAmount) {
        this.allocatedAmount = allocatedAmount;
    }
}