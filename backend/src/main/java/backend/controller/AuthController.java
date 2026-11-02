package backend.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import backend.dto.ForgotPasswordRequest;
import backend.dto.LoginRequest;
import backend.dto.RegisterRequest;
import backend.dto.ResetPasswordRequest;
import backend.dto.VerifyOtpRequest;
import backend.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178"
})
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public String register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/verify-otp")
    public String verifyOtp(@RequestBody VerifyOtpRequest request) {
        return authService.verifyOtp(request);
    }

    @PostMapping("/resend-otp")
    public String resendOtp(@RequestParam String email) {
        return authService.resendOtp(email);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @RequestBody LoginRequest request) {

        try {
            String result = authService.login(request);

            if (result == null || !isJwt(result)) {
                return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                        "message",
                        result == null
                            ? "Invalid username/email or password."
                            : result
                    ));
            }

            return ResponseEntity.ok(Map.of("token", result));

        } catch (IllegalArgumentException |
                 IllegalStateException ex) {

            return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(
                    "message",
                    ex.getMessage() == null
                        ? "Login failed."
                        : ex.getMessage()
                ));
        }
    }

    private boolean isJwt(String value) {
        if (value == null) {
            return false;
        }

        String[] parts = value.trim().split("\\.", -1);

        return parts.length == 3
            && !parts[0].isEmpty()
            && !parts[1].isEmpty()
            && !parts[2].isEmpty();
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(
            @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/verify-reset-otp")
    public String verifyResetOtp(
            @RequestBody VerifyOtpRequest request) {
        return authService.verifyResetOtp(request);
    }

    @PostMapping("/reset-password")
    public String resetPassword(
            @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }
}

