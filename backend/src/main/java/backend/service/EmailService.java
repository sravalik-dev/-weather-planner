
package backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    // ==========================================
    // SEND REGISTRATION OTP
    // ==========================================

    public void sendVerificationOtp(String email, String otp) {

        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Recipient email is required."
            );
        }

        if (otp == null || !otp.matches("\\d{6}")) {
            throw new IllegalArgumentException(
                    "Verification OTP must contain exactly 6 digits."
            );
        }

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("Verify Your Account - Weyvora");

        message.setText(
                "Hello!\n\n" +
                "Welcome to Weyvora - Where journeys become memories.\n\n" +
                "Your 6-digit verification code is:\n\n" +
                otp + "\n\n" +
                "This OTP will expire in 5 minutes.\n\n" +
                "Please do not share this code with anyone.\n\n" +
                "If you did not create this account, please ignore this email.\n\n" +
                "Weyvora Team"
        );

        mailSender.send(message);
    }

    // ==========================================
    // SEND PASSWORD RESET OTP
    // ==========================================

    public void sendPasswordResetOtp(String email, String otp) {

        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Recipient email is required."
            );
        }

        if (otp == null || !otp.matches("\\d{6}")) {
            throw new IllegalArgumentException(
                    "Password reset OTP must contain exactly 6 digits."
            );
        }

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("Password Reset OTP - Weyvora");

        message.setText(
                "Hello!\n\n" +
                "We received a request to reset your Weyvora password.\n\n" +
                "Your 6-digit password reset code is:\n\n" +
                otp + "\n\n" +
                "This OTP will expire in 5 minutes.\n\n" +
                "Please do not share this code with anyone.\n\n" +
                "If you did not request a password reset, please ignore this email.\n\n" +
                "Weyvora Team"
        );

        mailSender.send(message);
    }
}
