import { apiRequest } from "../utils/apiUtils";

export const getProfile = () => apiRequest("/profile");

export const updateProfile = (profile) =>
  apiRequest("/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });

export const updatePreferences = (preferences) =>
  apiRequest("/profile/preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });

export const changePassword = (passwordData) =>
  apiRequest("/profile/change-password", {
    method: "PUT",
    body: JSON.stringify(passwordData),
  });