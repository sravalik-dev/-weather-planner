package backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(
            RuntimeException ex,
            HttpServletRequest request) {

        System.err.println();
        System.err.println("========== RUNTIME EXCEPTION ==========");
        System.err.println("Request: " + request.getRequestURI());
        System.err.println("Exception: " + ex.getClass().getName());
        System.err.println("Message: " + ex.getMessage());
        ex.printStackTrace(System.err);
        System.err.println("=======================================");
        System.err.println();

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

        System.err.println();
        System.err.println("========== UNEXPECTED EXCEPTION ==========");
        System.err.println("Request: " + request.getRequestURI());
        System.err.println("Exception: " + ex.getClass().getName());
        System.err.println("Message: " + ex.getMessage());
        ex.printStackTrace(System.err);
        System.err.println("==========================================");
        System.err.println();

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