
package backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import backend.dto.BudgetHistoryResponse;
import backend.entity.BudgetHistory;
import backend.service.BudgetHistoryService;

@RestController
@RequestMapping("/api/budget-history")
public class BudgetHistoryController {

    private final BudgetHistoryService budgetHistoryService;

    public BudgetHistoryController(
            BudgetHistoryService budgetHistoryService) {
        this.budgetHistoryService = budgetHistoryService;
    }

    private Integer getUserId(Authentication authentication) {
        if (authentication == null
                || authentication.getPrincipal() == null) {
            throw new IllegalArgumentException(
                    "Authentication required");
        }

        return (Integer) authentication.getPrincipal();
    }

    // CONVERT ENTITY INTO RESPONSE DTO
    private BudgetHistoryResponse toResponse(
            BudgetHistory history) {

        return new BudgetHistoryResponse(
                history.getHistoryId(),
                history.getEventType(),
                history.getDescription(),
                history.getUser().getUserId(),
                history.getCreatedAt()
        );
    }

    // GET HISTORY FOR A TRIP
    @GetMapping("/trips/{tripId}")
    public ResponseEntity<List<BudgetHistoryResponse>> getBudgetHistory(
            @PathVariable Integer tripId,
            Authentication authentication) {

        List<BudgetHistoryResponse> responses =
                budgetHistoryService.getBudgetHistory(
                        tripId,
                        getUserId(authentication)
                )
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }

    // GET HISTORY FOR A BUDGET ID
    @GetMapping("/budgets/{budgetId}")
    public ResponseEntity<List<BudgetHistoryResponse>> getHistoryByBudgetId(
            @PathVariable Integer budgetId,
            Authentication authentication) {

        List<BudgetHistoryResponse> responses =
                budgetHistoryService.getHistoryByBudgetId(
                        budgetId,
                        getUserId(authentication)
                )
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }
}
