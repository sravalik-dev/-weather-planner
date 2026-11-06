
package backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import backend.dto.CreateBudgetRequest;
import backend.dto.UpdateBudgetRequest;
import backend.dto.CategoryBudgetRequest;
import backend.dto.DailyBudgetRequest;
import backend.service.BudgetService;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    private Integer getUserId(Authentication authentication) {
        if (authentication == null
                || authentication.getPrincipal() == null) {
            throw new IllegalArgumentException("Authentication required");
        }
        return (Integer) authentication.getPrincipal();
    }

    // CREATE BUDGET
    @PostMapping
    public ResponseEntity<?> createBudget(
            @RequestBody CreateBudgetRequest request,
            Authentication authentication) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(budgetService.createBudget(
                        request, getUserId(authentication)));
    }

    // GET BUDGET OVERVIEW
    @GetMapping("/trips/{tripId}")
    public ResponseEntity<?> getBudgetOverview(
            @PathVariable Integer tripId,
            Authentication authentication) {

        return ResponseEntity.ok(
                budgetService.getBudgetOverview(
                        tripId, getUserId(authentication)));
    }

    // UPDATE BUDGET
    @PutMapping("/trips/{tripId}")
    public ResponseEntity<?> updateBudget(
            @PathVariable Integer tripId,
            @RequestBody UpdateBudgetRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                budgetService.updateBudget(
                        tripId, request, getUserId(authentication)));
    }

    // CREATE OR UPDATE CATEGORY BUDGET
    @PostMapping("/trips/{tripId}/categories")
    public ResponseEntity<?> saveCategoryBudget(
            @PathVariable Integer tripId,
            @RequestBody CategoryBudgetRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                budgetService.saveCategoryBudget(
                        tripId, request, getUserId(authentication)));
    }

    // CREATE OR UPDATE DAILY BUDGET
    @PostMapping("/trips/{tripId}/daily")
    public ResponseEntity<?> saveDailyBudget(
            @PathVariable Integer tripId,
            @RequestBody DailyBudgetRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                budgetService.saveDailyBudget(
                        tripId, request, getUserId(authentication)));
    }
}
