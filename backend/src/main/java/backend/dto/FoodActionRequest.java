package backend.dto;

public class FoodActionRequest {

    private String action;

    private String reason;

    public FoodActionRequest() {
    }

    // ==========================================
    // ACTION
    // ==========================================

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    // ==========================================
    // REASON
    // ==========================================

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}