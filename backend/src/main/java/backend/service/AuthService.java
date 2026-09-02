package backend.service;

import java.time.LocalDateTime;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import org.springframework.security.crypto.password.PasswordEncoder;
=======
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
>>>>>>> Stashed changes
=======
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
>>>>>>> Stashed changes
=======
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
>>>>>>> Stashed changes
import org.springframework.stereotype.Service;

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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    private EmailService emailService;

    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    private final Random random = new Random();


    // ==========================================
    // REGISTER
    // ==========================================
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

    public String register(RegisterRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
                .orElse(null);


        if (user != null && user.isEmailVerified()) {

            return "Email already exists!";
        }

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
        User user = new User();

        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());

        // Store password securely using BCrypt
        user.setPassword(
                passwordEncoder.encode(
                        request.getPassword()
                )
        );
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

        String otp = generateOtp();


        if (user == null) {

            user = new User();

            user.setFullName(request.getFullName());

            user.setEmail(request.getEmail());

            user.setPassword(
                    passwordEncoder.encode(
                            request.getPassword()
                    )
            );
        }


        user.setOtpCode(otp);

        user.setOtpExpiry(
                LocalDateTime.now().plusMinutes(5)
        );

        user.setEmailVerified(false);

<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

        userRepository.save(user);


        emailService.sendVerificationOtp(
                user.getEmail(),
                otp
        );


        return "OTP sent to your email!";
    }

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    public String login(LoginRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
                .orElse(null);
=======

=======

>>>>>>> Stashed changes
=======

>>>>>>> Stashed changes
    // ==========================================
    // VERIFY REGISTRATION OTP
    // ==========================================

    public String verifyOtp(VerifyOtpRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
                .orElse(null);

<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

        if (user == null) {

            return "User not found!";
        }

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
        String storedPassword =
                user.getPassword();

        boolean passwordMatches;

        // BCrypt password
        if (storedPassword.startsWith("$2a$")
                || storedPassword.startsWith("$2b$")
                || storedPassword.startsWith("$2y$")) {

            passwordMatches =
                    passwordEncoder.matches(
                            request.getPassword(),
                            storedPassword
                    );

        } else {

            // Temporary support for existing plain-text passwords
            passwordMatches =
                    storedPassword.equals(
                            request.getPassword()
                    );

            // Automatically upgrade old password
            // to BCrypt after successful login
            if (passwordMatches) {

                user.setPassword(
                        passwordEncoder.encode(
                                request.getPassword()
                        )
                );

                userRepository.save(user);
            }
        }

        if (!passwordMatches) {
            return "Invalid password!";
        }

        String token =
                jwtService.generateToken(
                        user.getUserId(),
                        user.getEmail()
                );

        return token;
    }
}

=======

        if (user.isEmailVerified()) {

            return "Email is already verified!";
        }


        if (user.getOtpCode() == null) {

            return "No OTP found. Please request a new OTP!";
        }


        if (user.getOtpExpiry() == null ||
                LocalDateTime.now()
                        .isAfter(user.getOtpExpiry())) {

            return "OTP expired!";
        }


        if (!user.getOtpCode()
                .equals(request.getOtp())) {

            return "Invalid OTP!";
        }


        user.setEmailVerified(true);

        user.setOtpCode(null);

        user.setOtpExpiry(null);


        userRepository.save(user);


        return "Account verified successfully!";
    }


    // ==========================================
    // RESEND OTP
    // ==========================================

    public String resendOtp(String email) {

        User user = userRepository
                .findByEmail(email)
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
                LocalDateTime.now().plusMinutes(5)
        );


        userRepository.save(user);


        emailService.sendVerificationOtp(
                email,
                otp
        );


        return "New OTP sent successfully!";
    }


    // ==========================================
    // LOGIN
    // ==========================================

    public String login(LoginRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
                .orElse(null);


        if (user == null) {

            return "User not found!";
        }


        if (!user.isEmailVerified()) {

            return "Please verify your email first!";
        }


        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {

            return "Invalid password!";
        }

=======

        if (user.isEmailVerified()) {

            return "Email is already verified!";
        }


        if (user.getOtpCode() == null) {

            return "No OTP found. Please request a new OTP!";
        }


        if (user.getOtpExpiry() == null ||
                LocalDateTime.now()
                        .isAfter(user.getOtpExpiry())) {

            return "OTP expired!";
        }


        if (!user.getOtpCode()
                .equals(request.getOtp())) {

            return "Invalid OTP!";
        }


        user.setEmailVerified(true);

        user.setOtpCode(null);

        user.setOtpExpiry(null);


        userRepository.save(user);


        return "Account verified successfully!";
    }


    // ==========================================
    // RESEND OTP
    // ==========================================

    public String resendOtp(String email) {

        User user = userRepository
                .findByEmail(email)
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
                LocalDateTime.now().plusMinutes(5)
        );


        userRepository.save(user);


        emailService.sendVerificationOtp(
                email,
                otp
        );


        return "New OTP sent successfully!";
    }


    // ==========================================
    // LOGIN
    // ==========================================

    public String login(LoginRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
                .orElse(null);


        if (user == null) {

            return "User not found!";
        }


        if (!user.isEmailVerified()) {

            return "Please verify your email first!";
        }


        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {

            return "Invalid password!";
        }

>>>>>>> Stashed changes
=======

        if (user.isEmailVerified()) {

            return "Email is already verified!";
        }


        if (user.getOtpCode() == null) {

            return "No OTP found. Please request a new OTP!";
        }


        if (user.getOtpExpiry() == null ||
                LocalDateTime.now()
                        .isAfter(user.getOtpExpiry())) {

            return "OTP expired!";
        }


        if (!user.getOtpCode()
                .equals(request.getOtp())) {

            return "Invalid OTP!";
        }


        user.setEmailVerified(true);

        user.setOtpCode(null);

        user.setOtpExpiry(null);


        userRepository.save(user);


        return "Account verified successfully!";
    }


    // ==========================================
    // RESEND OTP
    // ==========================================

    public String resendOtp(String email) {

        User user = userRepository
                .findByEmail(email)
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
                LocalDateTime.now().plusMinutes(5)
        );


        userRepository.save(user);


        emailService.sendVerificationOtp(
                email,
                otp
        );


        return "New OTP sent successfully!";
    }


    // ==========================================
    // LOGIN
    // ==========================================

    public String login(LoginRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
                .orElse(null);


        if (user == null) {

            return "User not found!";
        }


        if (!user.isEmailVerified()) {

            return "Please verify your email first!";
        }


        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {

            return "Invalid password!";
        }

>>>>>>> Stashed changes

        return "Login successful!";
    }


    // ==========================================
    // FORGOT PASSWORD
    // ==========================================

    public String forgotPassword(
            ForgotPasswordRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
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
                LocalDateTime.now().plusMinutes(5)
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

    public String verifyResetOtp(
            VerifyOtpRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
                .orElse(null);


        if (user == null) {

            return "User not found!";
        }


        if (user.getResetOtp() == null) {

            return "No reset OTP found!";
        }


        if (user.getResetOtpExpiry() == null ||
                LocalDateTime.now()
                        .isAfter(user.getResetOtpExpiry())) {

            return "OTP expired!";
        }


        if (!user.getResetOtp()
                .equals(request.getOtp())) {

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

    public String resetPassword(
            ResetPasswordRequest request) {

        User user = userRepository
                .findByEmail(request.getEmail())
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
                passwordEncoder.encode(
                        request.getNewPassword()
                )
        );


        user.setResetOtpVerified(false);


        userRepository.save(user);


        return "Password reset successfully!";
    }


    // ==========================================
    // GENERATE 4 DIGIT OTP
    // ==========================================

    private String generateOtp() {

        return String.format(
                "%04d",
                random.nextInt(10000)
        );
    }
<<<<<<< Updated upstream
<<<<<<< Updated upstream
}
>>>>>>> Stashed changes
=======
}
>>>>>>> Stashed changes
=======
}
>>>>>>> Stashed changes
