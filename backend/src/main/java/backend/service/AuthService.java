
package backend.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.dto.ForgotPasswordRequest;
import backend.dto.LoginRequest;
import backend.dto.RegisterRequest;
import backend.dto.ResetPasswordRequest;
import backend.dto.VerifyOtpRequest;
import backend.entity.User;
import backend.repository.UserRepository;
import backend.security.JwtService;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private EmailService emailService;

    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    private final SecureRandom random = new SecureRandom();

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int OTP_LENGTH = 6;

    // ==========================================
    // REGISTER
    // ==========================================

    @Transactional
    public String register(RegisterRequest request) {

        if (request == null ||
                request.getEmail() == null ||
                request.getEmail().trim().isEmpty()) {
            return "Email is required!";
        }

        if (request.getPassword() == null ||
                request.getPassword().trim().isEmpty()) {
            return "Password is required!";
        }

        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user != null && user.isEmailVerified()) {
            return "Email already exists!";
        }

        String otp = generateOtp();

        if (user == null) {
            user = new User();
            user.setFullName(request.getFullName());
            user.setEmail(email);
        } else if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }

        user.setEmail(email);

        user.setPassword(
                passwordEncoder.encode(request.getPassword())
        );

        user.setOtpCode(otp);
        user.setOtpExpiry(
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );

        user.setEmailVerified(false);

        userRepository.save(user);

        emailService.sendVerificationOtp(
                user.getEmail(),
                otp
        );

        return "OTP sent to your email!";
    }

    // ==========================================
    // VERIFY REGISTRATION OTP
    // ==========================================

    @Transactional
    public String verifyOtp(VerifyOtpRequest request) {

        if (request == null ||
                request.getEmail() == null ||
                request.getOtp() == null) {
            return "Email and OTP are required!";
        }

        String email = normalizeEmail(request.getEmail());
        String otp = normalizeOtp(request.getOtp());

        if (email.isEmpty()) {
            return "Email is required!";
        }

        if (!isValidOtp(otp)) {
            return "OTP must contain exactly 6 digits!";
        }

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            return "User not found!";
        }

        if (user.isEmailVerified()) {
            return "Email is already verified!";
        }

        if (user.getOtpCode() == null) {
            return "No OTP found. Please request a new OTP!";
        }

        if (user.getOtpExpiry() == null ||
                LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            return "OTP expired! Please request a new OTP.";
        }

        if (!user.getOtpCode().equals(otp)) {
            return "Invalid OTP!";
        }

        user.setEmailVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiry(null);

        userRepository.saveAndFlush(user);

        return "Account verified successfully!";
    }

    // ==========================================
    // RESEND OTP
    // ==========================================

    @Transactional
    public String resendOtp(String email) {

        if (email == null || email.trim().isEmpty()) {
            return "Email is required!";
        }

        String normalizedEmail = normalizeEmail(email);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElse(null);

        if (user == null) {
            return "User not found!";
        }

        if (user.isEmailVerified()) {
            return "Email is already verified!";
        }

        String otp = generateOtp();

        user.setOtpCode(otp);
        user.setOtpExpiry(
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );

        userRepository.save(user);

        emailService.sendVerificationOtp(
                user.getEmail(),
                otp
        );

        return "New OTP sent successfully!";
    }

    // ==========================================
    // LOGIN
    // ==========================================

    @Transactional
    public String login(LoginRequest request) {

        if (request == null ||
                request.getEmail() == null ||
                request.getEmail().trim().isEmpty()) {
            return "Email is required!";
        }

        if (request.getPassword() == null ||
                request.getPassword().isEmpty()) {
            return "Password is required!";
        }

        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            return "Invalid email or password!";
        }

        // Email verification must happen before login.
        if (!user.isEmailVerified()) {
            return "Please verify your email first!";
        }

        String storedPassword = user.getPassword();

        if (storedPassword == null || storedPassword.isEmpty()) {
            return "Invalid email or password!";
        }

        boolean passwordMatches;

        // BCrypt password verification.
        if (storedPassword.startsWith("$2a$") ||
                storedPassword.startsWith("$2b$") ||
                storedPassword.startsWith("$2y$")) {

            passwordMatches = passwordEncoder.matches(
                    request.getPassword(),
                    storedPassword
            );

        } else {

            // Legacy plain-text password compatibility.
            // Successful legacy login upgrades the password to BCrypt.

            passwordMatches = storedPassword.equals(
                    request.getPassword()
            );

            if (passwordMatches) {
                user.setPassword(
                        passwordEncoder.encode(request.getPassword())
                );

                userRepository.save(user);
            }
        }

        if (!passwordMatches) {
            return "Invalid email or password!";
        }

        // Generate JWT.
        String token = jwtService.generateToken(
                user.getUserId(),
                user.getEmail()
        );

        if (token == null || token.trim().isEmpty()) {
            throw new IllegalStateException(
                    "JWT generation failed."
            );
        }

        return token;
    }

    // ==========================================
    // FORGOT PASSWORD
    // ==========================================

    @Transactional
    public String forgotPassword(ForgotPasswordRequest request) {

        if (request == null ||
                request.getEmail() == null ||
                request.getEmail().trim().isEmpty()) {
            return "Email is required!";
        }

        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            return "Email not found!";
        }

        if (!user.isEmailVerified()) {
            return "Please verify your account first!";
        }

        String otp = generateOtp();

        user.setResetOtp(otp);

        user.setResetOtpExpiry(
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );

        user.setResetOtpVerified(false);

        userRepository.save(user);

        emailService.sendPasswordResetOtp(
                user.getEmail(),
                otp
        );

        return "Password reset OTP sent!";
    }

    // ==========================================
    // VERIFY RESET OTP
    // ==========================================

    @Transactional
    public String verifyResetOtp(VerifyOtpRequest request) {

        if (request == null ||
                request.getEmail() == null ||
                request.getOtp() == null) {
            return "Email and OTP are required!";
        }

        String email = normalizeEmail(request.getEmail());
        String otp = normalizeOtp(request.getOtp());

        if (email.isEmpty()) {
            return "Email is required!";
        }

        if (!isValidOtp(otp)) {
            return "OTP must contain exactly 6 digits!";
        }

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            return "User not found!";
        }

        if (user.getResetOtp() == null) {
            return "No reset OTP found!";
        }

        if (user.getResetOtpExpiry() == null ||
                LocalDateTime.now().isAfter(user.getResetOtpExpiry())) {
            return "OTP expired! Please request a new OTP.";
        }

        if (!user.getResetOtp().equals(otp)) {
            return "Invalid OTP!";
        }

        user.setResetOtpVerified(true);
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);

        userRepository.save(user);

        return "OTP verified successfully!";
    }

    // ==========================================
    // RESET PASSWORD
    // ==========================================

    @Transactional
    public String resetPassword(ResetPasswordRequest request) {

        if (request == null ||
                request.getEmail() == null ||
                request.getEmail().trim().isEmpty()) {
            return "Email is required!";
        }

        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            return "User not found!";
        }

        if (!user.isResetOtpVerified()) {
            return "Please verify OTP first!";
        }

        if (request.getNewPassword() == null ||
                request.getNewPassword().length() < 6) {
            return "Password must be at least 6 characters!";
        }

        user.setPassword(
                passwordEncoder.encode(request.getNewPassword())
        );

        user.setResetOtpVerified(false);
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);

        userRepository.save(user);

        return "Password reset successfully!";
    }

    // ==========================================
    // GENERATE SIX-DIGIT OTP
    // ==========================================

    private String generateOtp() {

        return String.format(
                "%06d",
                random.nextInt(1_000_000)
        );
    }

    // ==========================================
    // NORMALIZE EMAIL
    // ==========================================

    private String normalizeEmail(String email) {

        return email == null
                ? ""
                : email.trim().toLowerCase(Locale.ROOT);
    }

    // ==========================================
    // NORMALIZE OTP
    // ==========================================

    private String normalizeOtp(String otp) {

        return otp == null
                ? ""
                : otp.trim();
    }

    // ==========================================
    // VALIDATE OTP
    // ==========================================

    private boolean isValidOtp(String otp) {

        return otp != null && otp.matches("\\d{6}");
    }
}
