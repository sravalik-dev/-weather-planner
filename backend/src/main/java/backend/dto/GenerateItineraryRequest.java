package backend.dto;

import java.time.LocalTime;

/**
 * Optional body for POST /api/trips/{tripId}/itinerary/generate.
 * Sending no body (as the old frontend did) means: round trip, saved
 * destination order, all other values from application.properties.
 */
public class GenerateItineraryRequest {

    /** true (default): finish with a return journey to the trip origin. */
    private Boolean roundTrip;

    /** false (default): visit destinations in the saved order. */
    private Boolean optimizeRoute;

    /** Clock time of departure on the first trip day, e.g. "07:00" or "00:00". */
    private LocalTime departureTime;

    /** Earliest clock time a visit may start (default 07:00; "00:00" allows any hour). */
    private LocalTime earliestVisitTime;

    /** false: never insert overnight rest (non-stop planning). Default true. */
    private Boolean overnightRest;

    /** false: place destinations back-to-back instead of spreading them over the trip days. */
    private Boolean spreadAcrossTripDays;

    public GenerateItineraryRequest() {
    }

    public Boolean getRoundTrip() {
        return roundTrip;
    }

    public void setRoundTrip(Boolean roundTrip) {
        this.roundTrip = roundTrip;
    }

    public Boolean getOptimizeRoute() {
        return optimizeRoute;
    }

    public void setOptimizeRoute(Boolean optimizeRoute) {
        this.optimizeRoute = optimizeRoute;
    }

    public LocalTime getDepartureTime() {
        return departureTime;
    }

    public void setDepartureTime(LocalTime departureTime) {
        this.departureTime = departureTime;
    }

    public Boolean getOvernightRest() {
        return overnightRest;
    }

    public void setOvernightRest(Boolean overnightRest) {
        this.overnightRest = overnightRest;
    }

    public Boolean getSpreadAcrossTripDays() {
        return spreadAcrossTripDays;
    }

    public void setSpreadAcrossTripDays(Boolean spreadAcrossTripDays) {
        this.spreadAcrossTripDays = spreadAcrossTripDays;
    }

    public LocalTime getEarliestVisitTime() {
        return earliestVisitTime;
    }

    public void setEarliestVisitTime(LocalTime earliestVisitTime) {
        this.earliestVisitTime = earliestVisitTime;
    }
}
