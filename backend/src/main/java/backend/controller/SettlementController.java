
package backend.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import backend.entity.Settlement;
import backend.service.SettlementService;

@RestController
@RequestMapping("/api/budget/groups/{groupId}/settlements")
public class SettlementController {

    private final SettlementService settlementService;

    public SettlementController(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    public record CreateSettlementPayload(
            Integer payerMemberId,
            Integer receiverMemberId,
            BigDecimal amount
    ) {}

    // Small response DTO prevents circular JSON serialization.
    public record SettlementResponse(
            Integer settlementId,
            Integer groupId,
            Integer payerMemberId,
            Integer receiverMemberId,
            BigDecimal amount,
            String status,
            LocalDateTime createdAt,
            LocalDateTime settledAt
    ) {}

    private Integer getUserId(Authentication authentication) {
        if (authentication == null
                || authentication.getPrincipal() == null) {
            throw new IllegalArgumentException(
                    "Authentication required");
        }

        return (Integer) authentication.getPrincipal();
    }

    private SettlementResponse toResponse(Settlement settlement) {
        return new SettlementResponse(
                settlement.getSettlementId(),
                settlement.getGroup().getGroupId(),
                settlement.getPayer().getMemberId(),
                settlement.getReceiver().getMemberId(),
                settlement.getAmount(),
                settlement.getStatus().name(),
                settlement.getCreatedAt(),
                settlement.getSettledAt()
        );
    }

    // CREATE SETTLEMENT
    @PostMapping
    public ResponseEntity<SettlementResponse> createSettlement(
            @PathVariable Integer groupId,
            @RequestBody CreateSettlementPayload request,
            Authentication authentication) {

        Settlement settlement =
                settlementService.createSettlement(
                        groupId,
                        request.payerMemberId(),
                        request.receiverMemberId(),
                        request.amount(),
                        getUserId(authentication)
                );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(settlement));
    }

    // GET ALL SETTLEMENTS
    @GetMapping
    public ResponseEntity<List<SettlementResponse>> getSettlements(
            @PathVariable Integer groupId,
            Authentication authentication) {

        List<SettlementResponse> responses =
                settlementService.getSettlements(
                        groupId,
                        getUserId(authentication)
                )
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }

    // GET PENDING SETTLEMENTS
    @GetMapping("/pending")
    public ResponseEntity<List<SettlementResponse>> getPendingSettlements(
            @PathVariable Integer groupId,
            Authentication authentication) {

        List<SettlementResponse> responses =
                settlementService.getPendingSettlements(
                        groupId,
                        getUserId(authentication)
                )
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }

    // MARK SETTLEMENT AS COMPLETED
    @PutMapping("/{settlementId}/complete")
    public ResponseEntity<SettlementResponse> completeSettlement(
            @PathVariable Integer groupId,
            @PathVariable Integer settlementId,
            Authentication authentication) {

        Settlement settlement =
                settlementService.completeSettlement(
                        settlementId,
                        groupId,
                        getUserId(authentication)
                );

        return ResponseEntity.ok(toResponse(settlement));
    }
}
