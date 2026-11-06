package backend.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.*;

@Entity
@Table(
    name = "daily_budget",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_daily_budget",
            columnNames = {"budget_id", "budget_date"}
        )
    }
)
public class DailyBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "daily_budget_id")
    private Integer dailyBudgetId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_id", nullable = false)
    private TripBudget budget;

    @Column(name = "budget_date", nullable = false)
    private LocalDate budgetDate;

    @Column(name = "daily_limit", nullable = false, precision = 14, scale = 2)
    private BigDecimal dailyLimit;

    public Integer getDailyBudgetId() {
        return dailyBudgetId;
    }

    public void setDailyBudgetId(Integer dailyBudgetId) {
        this.dailyBudgetId = dailyBudgetId;
    }

    public TripBudget getBudget() {
        return budget;
    }

    public void setBudget(TripBudget budget) {
        this.budget = budget;
    }

    public LocalDate getBudgetDate() {
        return budgetDate;
    }

    public void setBudgetDate(LocalDate budgetDate) {
        this.budgetDate = budgetDate;
    }

    public BigDecimal getDailyLimit() {
        return dailyLimit;
    }

    public void setDailyLimit(BigDecimal dailyLimit) {
        this.dailyLimit = dailyLimit;
    }
}