package backend.dto;

import java.util.List;

public class ReorderDestinationRequest {

    private List<Integer> destinationIds;

    public ReorderDestinationRequest() {
    }

    public List<Integer> getDestinationIds() {
        return destinationIds;
    }

    public void setDestinationIds(List<Integer> destinationIds) {
        this.destinationIds = destinationIds;
    }
}