package backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
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
        "http://localhost:5176"
})
public class AuthController {

    @Autowired
    private AuthService authService;


    // REGISTER
    @PostMapping("/register")
    public String register(
            @RequestBody RegisterRequest request) {

        return authService.register(request);
    }


    // VERIFY REGISTRATION OTP
    @PostMapping("/verify-otp")
    public String verifyOtp(
            @RequestBody VerifyOtpRequest request) {

        return authService.verifyOtp(request);
    }


    // RESEND OTP
    @PostMapping("/resend-otp")
    public String resendOtp(
            @RequestParam String email) {

        return authService.resendOtp(email);
    }


    // LOGIN
    @PostMapping("/login")
    public String login(
            @RequestBody LoginRequest request) {

        return authService.login(request);
    }


    // FORGOT PASSWORD
    @PostMapping("/forgot-password")
    public String forgotPassword(
            @RequestBody ForgotPasswordRequest request) {

        return authService.forgotPassword(request);
    }


    // VERIFY RESET OTP
    @PostMapping("/verify-reset-otp")
    public String verifyResetOtp(
            @RequestBody VerifyOtpRequest request) {

        return authService.verifyResetOtp(request);
    }


    // RESET PASSWORD
    @PostMapping("/reset-password")
    public String resetPassword(
            @RequestBody ResetPasswordRequest request) {

        return authService.resetPassword(request);
    }
}