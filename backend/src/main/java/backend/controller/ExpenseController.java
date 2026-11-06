
package backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import backend.dto.CreateExpenseRequest;
import backend.dto.UpdateExpenseRequest;
import backend.service.ExpenseService;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    private Integer getUserId(Authentication authentication) {
        if (authentication == null
                || authentication.getPrincipal() == null) {
            throw new IllegalArgumentException("Authentication required");
        }
        return (Integer) authentication.getPrincipal();
    }

    // CREATE EXPENSE
    @PostMapping
    public ResponseEntity<?> createExpense(
            @RequestBody CreateExpenseRequest request,
            Authentication authentication) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(expenseService.createExpense(
                        request, getUserId(authentication)));
    }

    // GET ALL EXPENSES FOR A TRIP
    @GetMapping("/trips/{tripId}")
    public ResponseEntity<?> getExpenses(
            @PathVariable Integer tripId,
            Authentication authentication) {

        return ResponseEntity.ok(
                expenseService.getExpenses(
                        tripId, getUserId(authentication)));
    }

    // GET ONE EXPENSE
    @GetMapping("/trips/{tripId}/{expenseId}")
    public ResponseEntity<?> getExpense(
            @PathVariable Integer tripId,
            @PathVariable Integer expenseId,
            Authentication authentication) {

        return ResponseEntity.ok(
                expenseService.getExpense(
                        tripId, expenseId, getUserId(authentication)));
    }

    // UPDATE EXPENSE
    @PutMapping("/trips/{tripId}/{expenseId}")
    public ResponseEntity<?> updateExpense(
            @PathVariable Integer tripId,
            @PathVariable Integer expenseId,
            @RequestBody UpdateExpenseRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                expenseService.updateExpense(
                        tripId,
                        expenseId,
                        request,
                        getUserId(authentication)));
    }

    // DELETE EXPENSE
    @DeleteMapping("/trips/{tripId}/{expenseId}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable Integer tripId,
            @PathVariable Integer expenseId,
            Authentication authentication) {

        expenseService.deleteExpense(
                tripId, expenseId, getUserId(authentication));

        return ResponseEntity.noContent().build();
    }
}
