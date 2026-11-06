package backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
@Table(
    name = "group_member",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_group_member_user",
            columnNames = {"group_id", "user_id"}
        )
    }
)
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Integer memberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private GroupTrip group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String role = "MEMBER";

    @Column(name = "total_share", precision = 14, scale = 2)
    private BigDecimal totalShare = BigDecimal.ZERO;

    @Column(name = "amount_paid", precision = 14, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "amount_owed", precision = 14, scale = 2)
    private BigDecimal amountOwed = BigDecimal.ZERO;

    @Column(name = "amount_receivable", precision = 14, scale = 2)
    private BigDecimal amountReceivable = BigDecimal.ZERO;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    public void beforeInsert() {
        joinedAt = LocalDateTime.now();

        if (totalShare == null) totalShare = BigDecimal.ZERO;
        if (amountPaid == null) amountPaid = BigDecimal.ZERO;
        if (amountOwed == null) amountOwed = BigDecimal.ZERO;
        if (amountReceivable == null) amountReceivable = BigDecimal.ZERO;
    }

    public Integer getMemberId() {
        return memberId;
    }

    public void setMemberId(Integer memberId) {
        this.memberId = memberId;
    }

    public GroupTrip getGroup() {
        return group;
    }

    public void setGroup(GroupTrip group) {
        this.group = group;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public BigDecimal getTotalShare() {
        return totalShare;
    }

    public void setTotalShare(BigDecimal totalShare) {
        this.totalShare = totalShare;
    }

    public BigDecimal getAmountPaid() {
        return amountPaid;
    }

    public void setAmountPaid(BigDecimal amountPaid) {
        this.amountPaid = amountPaid;
    }

    public BigDecimal getAmountOwed() {
        return amountOwed;
    }

    public void setAmountOwed(BigDecimal amountOwed) {
        this.amountOwed = amountOwed;
    }

    public BigDecimal getAmountReceivable() {
        return amountReceivable;
    }

    public void setAmountReceivable(BigDecimal amountReceivable) {
        this.amountReceivable = amountReceivable;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }
}