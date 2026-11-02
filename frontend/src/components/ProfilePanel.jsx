import { useEffect, useState } from "react";
import { defaultPreferences, preferenceOptions } from "../constants/preferences";
import { changePassword, getProfile, updatePreferences, updateProfile } from "../services/profileService";

function ProfilePanel({ view = "profile", user, onUserUpdate }) {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let active = true;
    getProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setPreferences({
          travelType: data.transport || defaultPreferences.travelType,
          budget: data.budget || defaultPreferences.budget,
          climate: defaultPreferences.climate,
          activities: String(data.interests || data.foodPreferences || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          accommodation: data.accommodation || defaultPreferences.accommodation,
          pace: data.travelPace || defaultPreferences.pace,
        });
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load profile.");
      });
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateProfile({
        fullName: profile.fullName,
        mobileNumber: profile.mobileNumber,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth || null,
      });
      onUserUpdate?.({
        name: profile.fullName,
        email: profile.email,
      });
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updatePreferences({
        budget: preferences.budget,
        transport: preferences.travelType,
        accommodation: preferences.accommodation,
        foodPreferences: preferences.activities.join(", "),
        interests: preferences.activities.join(", "),
        travelPace: preferences.pace,
      });
      localStorage.setItem("itineraryPreferences", JSON.stringify(preferences));
      setMessage("Preferences updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (passwords.newPassword.length < 6) {
      setError("New password must contain at least 6 characters.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await changePassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password changed successfully.");
    } catch (err) {
      setError(err.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <div className="glass-card">{error || "Loading profile..."}</div>;
  }

  return (
    <section className="glass-card profile-panel">
      {error && <div className="shell-alert error">{error}</div>}
      {message && <div className="shell-alert success">{message}</div>}

      {view === "profile" && (
        <form onSubmit={saveProfile}>
          <h2>Your Profile</h2>
          <p>{user?.email || profile.email}</p>
          <label>
            Full name
            <input
              value={profile.fullName || ""}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              required
            />
          </label>
          <label>
            Mobile
            <input
              value={profile.mobileNumber || ""}
              onChange={(e) => setProfile({ ...profile, mobileNumber: e.target.value })}
            />
          </label>
          <label>
            Gender
            <input
              value={profile.gender || ""}
              onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
            />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              value={profile.dateOfBirth || ""}
              onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
            />
          </label>
          <button type="submit" className="primary-pill" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      )}

      {view === "preferences" && (
        <div>
          <h2>Travel Preferences</h2>
          {Object.entries(preferenceOptions).map(([key, options]) => (
            <div key={key} className="pref-block">
              <strong>{key}</strong>
              <div className="choice-grid">
                {options.map((option) => {
                  const selected = key === "activities"
                    ? preferences.activities.includes(option)
                    : preferences[key] === option;
                  return (
                    <button
                      type="button"
                      key={option}
                      className={`choice-button ${selected ? "selected" : ""}`}
                      onClick={() => {
                        if (key === "activities") {
                          setPreferences((prev) => ({
                            ...prev,
                            activities: prev.activities.includes(option)
                              ? prev.activities.filter((item) => item !== option)
                              : [...prev.activities, option],
                          }));
                        } else {
                          setPreferences((prev) => ({ ...prev, [key]: option }));
                        }
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button type="button" className="primary-pill" onClick={savePrefs} disabled={saving}>
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      )}

      {view === "password" && (
        <form onSubmit={savePassword}>
          <h2>Change Password</h2>
          <label>
            Current password
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              required
            />
          </label>
          <button type="submit" className="primary-pill" disabled={saving}>
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}
    </section>
  );
}

export default ProfilePanel;