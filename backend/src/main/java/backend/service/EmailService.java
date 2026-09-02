package backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;


    public void sendVerificationOtp(String email, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("Verify Your Account - Weyvora");

        message.setText(
                "Hello!\n\n" +
                "Welcome to Weyvora - Where journeys become memories.\n\n" +
                "Your 4-digit verification code is:\n\n" +
                otp + "\n\n" +
                "This OTP will expire in 5 minutes.\n\n" +
                "If you did not create this account, please ignore this email.\n\n" +
                "Weyvora Team"
        );

        mailSender.send(message);
    }


    public void sendPasswordResetOtp(String email, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("Password Reset OTP - Weyvora");

        message.setText(
                "Hello!\n\n" +
                "We received a request to reset your Weyvora password.\n\n" +
                "Your 4-digit password reset code is:\n\n" +
                otp + "\n\n" +
                "This OTP will expire in 5 minutes.\n\n" +
                "If you did not request a password reset, please ignore this email.\n\n" +
                "Weyvora Team"
        );

        mailSender.send(message);
    }
}