package backend.dto;

import java.time.LocalDateTime;

import backend.entity.AccommodationHistory;

public class AccommodationHistoryResponse {

    private Integer historyId;
    private Integer userId;
    private Integer tripId;
    private Integer accommodationId;
    private String accommodationName;
    private String destination;
    private String action;
    private String filterUsed;
    private LocalDateTime createdAt;

    public static AccommodationHistoryResponse fromEntity(
            AccommodationHistory history) {

        AccommodationHistoryResponse response =
                new AccommodationHistoryResponse();

        response.historyId = history.getHistoryId();

        if (history.getUser() != null) {
            response.userId = history.getUser().getUserId();
        }

        if (history.getTrip() != null) {
            response.tripId = history.getTrip().getTripId();
        }

        if (history.getAccommodation() != null) {
            response.accommodationId =
                    history.getAccommodation().getAccommodationId();

            response.accommodationName =
                    history.getAccommodation().getName();

            response.destination =
                    history.getAccommodation().getDestination();
        }

        response.action = history.getAction();
        response.filterUsed = history.getFilterUsed();
        response.createdAt = history.getCreatedAt();

        return response;
    }

    public Integer getHistoryId() {
        return historyId;
    }

    public Integer getUserId() {
        return userId;
    }

    public Integer getTripId() {
        return tripId;
    }

    public Integer getAccommodationId() {
        return accommodationId;
    }

    public String getAccommodationName() {
        return accommodationName;
    }

    public String getDestination() {
        return destination;
    }

    public String getAction() {
        return action;
    }

    public String getFilterUsed() {
        return filterUsed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}