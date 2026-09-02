package backend.service;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import backend.dto.ChangePasswordRequest;
import backend.dto.PreferenceUpdateRequest;
import backend.dto.ProfileResponse;
import backend.dto.ProfileUpdateRequest;
import backend.entity.User;
import backend.entity.UserPreference;
import backend.repository.UserPreferenceRepository;
import backend.repository.UserRepository;

@Service
public class ProfileService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserPreferenceRepository userPreferenceRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public ProfileResponse getProfile(Integer userId) {

        Optional<User> userOptional =
                userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return null;
        }

        User user = userOptional.get();

        ProfileResponse response =
                new ProfileResponse();

        response.setUserId(user.getUserId());
        response.setFullName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setMobileNumber(user.getMobileNumber());
        response.setGender(user.getGender());
        response.setDateOfBirth(user.getDateOfBirth());
        response.setProfilePicture(user.getProfilePicture());

        Optional<UserPreference> preferenceOptional =
                userPreferenceRepository.findByUserId(userId);

        if (preferenceOptional.isPresent()) {

            UserPreference preference =
                    preferenceOptional.get();

            response.setBudget(preference.getBudget());
            response.setTransport(preference.getTransport());
            response.setAccommodation(
                    preference.getAccommodation()
            );
            response.setFoodPreferences(
                    preference.getFoodPreferences()
            );
            response.setInterests(
                    preference.getInterests()
            );
            response.setTravelPace(
                    preference.getTravelPace()
            );
        }

        return response;
    }

    public String updateProfile(
            Integer userId,
            ProfileUpdateRequest request) {

        Optional<User> userOptional =
                userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return "User not found!";
        }

        if (request.getFullName() == null
                || request.getFullName().trim().isEmpty()) {
            return "Full name is required!";
        }

        String fullName =
                request.getFullName().trim();

        if (fullName.length() < 2) {
            return "Full name must contain at least 2 characters!";
        }

        if (!fullName.matches("[a-zA-Z ]+")) {
            return "Full name can contain only alphabets and spaces!";
        }

        if (request.getMobileNumber() != null
                && !request.getMobileNumber().trim().isEmpty()) {

            String mobile =
                    request.getMobileNumber().trim();

            if (!mobile.matches("\\d{10}")) {
                return "Mobile number must contain exactly 10 digits!";
            }
        }

        if (request.getDateOfBirth() != null) {

            if (!request.getDateOfBirth()
                    .isBefore(LocalDate.now())) {

                return "Date of birth must be a past date!";
            }
        }

        User user =
                userOptional.get();

        user.setFullName(fullName);

        user.setMobileNumber(
                cleanValue(request.getMobileNumber())
        );

        user.setGender(
                cleanValue(request.getGender())
        );

        user.setDateOfBirth(
                request.getDateOfBirth()
        );

        user.setProfilePicture(
                cleanValue(request.getProfilePicture())
        );

        userRepository.save(user);

        return "Profile updated successfully!";
    }

    public String updatePreferences(
            Integer userId,
            PreferenceUpdateRequest request) {

        Optional<User> userOptional =
                userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return "User not found!";
        }

        if (request.getBudget() == null
                || request.getBudget().trim().isEmpty()) {
            return "Budget is required!";
        }

        String budget =
                request.getBudget().trim();

        if (!budget.equals("Budget")
                && !budget.equals("Economy")
                && !budget.equals("Mid-Range")
                && !budget.equals("Luxury")) {

            return "Invalid budget!";
        }

        if (request.getTravelPace() == null
                || request.getTravelPace().trim().isEmpty()) {
            return "Travel pace is required!";
        }

        String travelPace =
                request.getTravelPace().trim();

        if (!travelPace.equals("Relaxed")
                && !travelPace.equals("Moderate")
                && !travelPace.equals("Fast-Paced")) {

            return "Invalid travel pace!";
        }

        if (request.getTransport() != null
                && request.getTransport().trim().isEmpty()) {

            return "At least one transport option must be selected!";
        }

        if (request.getAccommodation() != null
                && request.getAccommodation().trim().isEmpty()) {

            return "At least one accommodation option must be selected!";
        }

        UserPreference preference;

        Optional<UserPreference> preferenceOptional =
                userPreferenceRepository.findByUserId(userId);

        if (preferenceOptional.isPresent()) {

            preference =
                    preferenceOptional.get();

        } else {

            preference =
                    new UserPreference();

            preference.setUserId(userId);
        }

        preference.setBudget(budget);

        preference.setTransport(
                cleanValue(request.getTransport())
        );

        preference.setAccommodation(
                cleanValue(request.getAccommodation())
        );

        preference.setFoodPreferences(
                cleanValue(request.getFoodPreferences())
        );

        preference.setInterests(
                cleanValue(request.getInterests())
        );

        preference.setTravelPace(travelPace);

        userPreferenceRepository.save(preference);

        return "Preferences updated successfully!";
    }

    public String changePassword(
            Integer userId,
            ChangePasswordRequest request) {

        Optional<User> userOptional =
                userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return "User not found!";
        }

        User user =
                userOptional.get();

        if (request.getCurrentPassword() == null
                || request.getCurrentPassword().trim().isEmpty()) {

            return "Current password is required!";
        }

        if (request.getNewPassword() == null
                || request.getNewPassword().trim().isEmpty()) {

            return "New password is required!";
        }

        if (request.getConfirmPassword() == null
                || request.getConfirmPassword().trim().isEmpty()) {

            return "Confirm password is required!";
        }

        if (!request.getNewPassword()
                .equals(request.getConfirmPassword())) {

            return "New password and confirm password do not match!";
        }

        if (request.getNewPassword()
                .equals(request.getCurrentPassword())) {

            return "New password must be different from current password!";
        }

        String password =
                request.getNewPassword();

        if (password.length() < 8) {
            return "Password must be at least 8 characters!";
        }

        if (!password.matches(".*[A-Z].*")) {
            return "Password must contain an uppercase letter!";
        }

        if (!password.matches(".*[a-z].*")) {
            return "Password must contain a lowercase letter!";
        }

        if (!password.matches(".*\\d.*")) {
            return "Password must contain a number!";
        }

        if (!password.matches(".*[^a-zA-Z0-9].*")) {
            return "Password must contain a special character!";
        }

        boolean currentPasswordMatches;

        if (user.getPassword().startsWith("$2a$")
                || user.getPassword().startsWith("$2b$")
                || user.getPassword().startsWith("$2y$")) {

            currentPasswordMatches =
                    passwordEncoder.matches(
                            request.getCurrentPassword(),
                            user.getPassword()
                    );

        } else {

            currentPasswordMatches =
                    user.getPassword().equals(
                            request.getCurrentPassword()
                    );
        }

        if (!currentPasswordMatches) {
            return "Current password is incorrect!";
        }

        user.setPassword(
                passwordEncoder.encode(
                        request.getNewPassword()
                )
        );

        userRepository.save(user);

        return "Password changed successfully!";
    }

    private String cleanValue(String value) {

        if (value == null) {
            return null;
        }

        String cleaned =
                value.trim();

        if (cleaned.isEmpty()) {
            return null;
        }

        return cleaned;
    }
}

