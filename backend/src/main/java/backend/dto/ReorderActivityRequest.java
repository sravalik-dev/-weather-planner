package backend.dto;

import java.time.LocalDate;
import java.util.List;

public class ReorderActivityRequest {

    private LocalDate activityDate;
    private List<Integer> activityIds;

    public ReorderActivityRequest() {
    }

    public LocalDate getActivityDate() {
        return activityDate;
    }

    public void setActivityDate(LocalDate activityDate) {
        this.activityDate = activityDate;
    }

    public List<Integer> getActivityIds() {
        return activityIds;
    }

    public void setActivityIds(List<Integer> activityIds) {
        this.activityIds = activityIds;
    }
}