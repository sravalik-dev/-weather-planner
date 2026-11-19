package backend.exception;

/**
 * A planned, user-facing itinerary problem. The controller turns it into a
 * JSON ErrorResponse with the matching HTTP status instead of the old
 * catch-everything "400 Bad Request".
 *
 *   400  the request or the trip data is invalid (missing dates, no destinations...)
 *   409  another generation for the same trip is already running
 *   422  the data is valid but the trip dates genuinely cannot fit the itinerary
 */
public class ItineraryException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final int status;

    private ItineraryException(int status, String message) {
        super(message);
        this.status = status;
    }

    public static ItineraryException badRequest(String message) {
        return new ItineraryException(400, message);
    }

    public static ItineraryException conflict(String message) {
        return new ItineraryException(409, message);
    }

    public static ItineraryException unprocessable(String message) {
        return new ItineraryException(422, message);
    }

    public int getStatus() {
        return status;
    }
}
