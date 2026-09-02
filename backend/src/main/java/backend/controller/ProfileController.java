package backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import backend.dto.ChangePasswordRequest;
import backend.dto.PreferenceUpdateRequest;
import backend.dto.ProfileResponse;
import backend.dto.ProfileUpdateRequest;
import backend.service.ProfileService;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = {
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176"
})
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile(
            Authentication authentication) {

        Integer userId = (Integer) authentication.getPrincipal();

        ProfileResponse profile =
                profileService.getProfile(userId);

        return ResponseEntity.ok(profile);
    }

    @PutMapping
    public ResponseEntity<String> updateProfile(
            Authentication authentication,
            @RequestBody ProfileUpdateRequest request) {

        Integer userId = (Integer) authentication.getPrincipal();

        String result =
                profileService.updateProfile(
                        userId,
                        request
                );

        if (result.equals("Profile updated successfully!")) {
            return ResponseEntity.ok(result);
        }

        return ResponseEntity.badRequest().body(result);
    }

    @PutMapping("/preferences")
    public ResponseEntity<String> updatePreferences(
            Authentication authentication,
            @RequestBody PreferenceUpdateRequest request) {

        Integer userId = (Integer) authentication.getPrincipal();

        String result =
                profileService.updatePreferences(
                        userId,
                        request
                );

        if (result.equals("Preferences updated successfully!")) {
            return ResponseEntity.ok(result);
        }

        return ResponseEntity.badRequest().body(result);
    }

    @PutMapping("/change-password")
    public ResponseEntity<String> changePassword(
            Authentication authentication,
            @RequestBody ChangePasswordRequest request) {

        Integer userId = (Integer) authentication.getPrincipal();

        String result =
                profileService.changePassword(
                        userId,
                        request
                );

        if (result.equals("Password changed successfully!")) {
            return ResponseEntity.ok(result);
        }

        return ResponseEntity.badRequest().body(result);
    }
}
