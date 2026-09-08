package backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;

/**
 * MODULE 4
 *
 * Central exception handler for the whole application.
 *
 * Every RuntimeException thrown by existing services
 * (TripService, RouteService, ProfileService, AuthService, etc.)
 * is caught here and converted into a consistent JSON error
 * response instead of Spring's default whitelabel error page.
 *
 * No existing service code is modified by this class — it only
 * changes how already-thrown exceptions are serialized back to
 * the client, and assigns an appropriate HTTP status code based
 * on the exception's message text.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(
            RuntimeException ex,
            HttpServletRequest request) {

        HttpStatus status = resolveStatus(ex.getMessage());

        ErrorResponse body = new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                ex.getMessage() != null
                        ? ex.getMessage()
                        : "Something went wrong. Please try again.",
                request.getRequestURI()
        );

        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(
            Exception ex,
            HttpServletRequest request) {

        ErrorResponse body = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                "An unexpected error occurred. Please try again.",
                request.getRequestURI()
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(body);
    }

    /**
     * Maps a RuntimeException's message to the most appropriate
     * HTTP status code, based on the wording already used across
     * TripService / RouteService / ProfileService / AuthService.
     *
     * This keeps every existing "throw new RuntimeException(...)"
     * statement completely untouched while still returning correct
     * status codes and readable messages to the frontend.
     */
    private HttpStatus resolveStatus(String message) {

        if (message == null) {
            return HttpStatus.BAD_REQUEST;
        }

        String lower = message.toLowerCase();

        if (lower.contains("not found")) {
            return HttpStatus.NOT_FOUND;
        }

        if (lower.contains("already exists")
                || lower.contains("duplicate")
                || lower.contains("already registered")) {
            return HttpStatus.CONFLICT;
        }

        if (lower.contains("invalid")
                || lower.contains("required")
                || lower.contains("cannot be")
                || lower.contains("must ")
                || lower.contains("do not match")
                || lower.contains("incorrect")) {
            return HttpStatus.BAD_REQUEST;
        }

        return HttpStatus.BAD_REQUEST;
    }
}