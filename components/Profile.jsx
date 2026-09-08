import { useEffect, useState } from "react";
import {
  changePassword,
  getProfile,
  updatePreferences,
  updateProfile,
} from "../profileService";

function Profile({ onBack }) {
  const [profile, setProfile] = useState({
    fullName: "Your Name",
    email: "your@email.com",
    mobile: "",
    gender: "",
    dateOfBirth: "",
    profilePicture: "",
  });

  const [page, setPage] = useState("view");

  const [preferences, setPreferences] = useState({
    budget: "",
    transport: [],
    accommodation: [],
    food: "",
    interests: [],
    pace: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getProfile();

        setProfile({
          fullName: data.fullName || "",
          email: data.email || "",
          mobile: data.mobileNumber || "",
          gender: data.gender || "",
          dateOfBirth: data.dateOfBirth || "",
          profilePicture: data.profilePicture || "",
        });

        setPreferences({
          budget: data.budget || "",
          transport: data.transport
            ? data.transport.split(",").filter(Boolean)
            : [],
          accommodation: data.accommodation
            ? data.accommodation.split(",").filter(Boolean)
            : [],
          food: data.foodPreferences || "",
          interests: data.interests
            ? data.interests.split(",").filter(Boolean)
            : [],
          pace: data.travelPace || "",
        });
      } catch (loadError) {
        console.error("Error loading profile:", loadError);
        setError(loadError.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateProfileField = (field, value) => {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await updateProfile({
        fullName: profile.fullName,
        mobileNumber: profile.mobile,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth || null,
        profilePicture: profile.profilePicture,
      });

      setPage("view");
    } catch (saveError) {
      console.error("Error updating profile:", saveError);
      setError(saveError.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await updatePreferences({
        budget: preferences.budget,
        transport: preferences.transport.join(","),
        accommodation: preferences.accommodation.join(","),
        foodPreferences: preferences.food,
        interests: preferences.interests.join(","),
        travelPace: preferences.pace,
      });

      setPage("view");
    } catch (saveError) {
      console.error("Error updating preferences:", saveError);
      setError(saveError.message || "Unable to update preferences.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    const password = passwordData.newPassword;

    if (password.length < 8) {
      alert("New password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      alert("New password must contain at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(password)) {
      alert("New password must contain at least one lowercase letter.");
      return;
    }

    if (!/[0-9]/.test(password)) {
      alert("New password must contain at least one number.");
      return;
    }

    if (!/[!@#$%^&*]/.test(password)) {
      alert(
        "New password must contain at least one special character."
      );
      return;
    }

    if (password !== passwordData.confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await changePassword(passwordData);

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPage("view");
    } catch (saveError) {
      console.error("Error changing password:", saveError);
      setError(saveError.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="profile-page">
        <div className="profile-card">
          <h2>Loading profile...</h2>
        </div>
      </section>
    );
  }

  if (page === "view") {
    return (
      <section className="profile-page">
        {error && <div className="trip-error">{error}</div>}

        <button
          type="button"
          className="profile-back-button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <div className="profile-card">
          <h2>My Profile</h2>

          <div className="profile-picture">
            {profile.profilePicture ? (
              <img src={profile.profilePicture} alt="Profile" />
            ) : (
              "👤"
            )}
          </div>

          <div className="profile-details">
            <div className="profile-detail">
              <span>Full Name</span>
              <strong>{profile.fullName}</strong>
            </div>

            <div className="profile-detail">
              <span>Email</span>
              <strong>{profile.email}</strong>
            </div>

            <div className="profile-detail">
              <span>Mobile Number</span>
              <strong>{profile.mobile || "Not provided"}</strong>
            </div>

            <div className="profile-detail">
              <span>Gender</span>
              <strong>{profile.gender || "Not provided"}</strong>
            </div>

            <div className="profile-detail">
              <span>Date of Birth</span>
              <strong>
                {profile.dateOfBirth || "Not provided"}
              </strong>
            </div>
          </div>

          <div className="profile-preferences-summary">
            <h3>Travel Preferences</h3>

            <p>
              Budget: {preferences.budget || "Not selected"}
            </p>

            <p>
              Pace: {preferences.pace || "Not selected"}
            </p>
          </div>

          <div className="profile-actions">
            <button
              type="button"
              onClick={() => setPage("edit")}
            >
              Edit Profile
            </button>

            <button
              type="button"
              onClick={() => setPage("preferences")}
            >
              Manage Preferences
            </button>

            <button
              type="button"
              onClick={() => setPage("password")}
            >
              Change Password
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (page === "edit") {
    return (
      <section className="profile-page">
        {error && <div className="trip-error">{error}</div>}

        <div className="profile-card">
          <h2>Edit Profile</h2>

          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label>Profile Picture</label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) {
                    const imageUrl = URL.createObjectURL(file);

                    updateProfileField(
                      "profilePicture",
                      imageUrl
                    );
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label>Full Name</label>

              <input
                type="text"
                value={profile.fullName}
                onChange={(e) =>
                  updateProfileField(
                    "fullName",
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                value={profile.email}
                disabled
              />
            </div>

            <div className="form-group">
              <label>Mobile Number</label>

              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={profile.mobile}
                onChange={(e) =>
                  updateProfileField(
                    "mobile",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>Gender</label>

              <select
                value={profile.gender}
                onChange={(e) =>
                  updateProfileField(
                    "gender",
                    e.target.value
                  )
                }
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">
                  Prefer not to say
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Date of Birth</label>

              <input
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) =>
                  updateProfileField(
                    "dateOfBirth",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="profile-form-actions">
              <button
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => setPage("view")}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  if (page === "preferences") {
    return (
      <section className="profile-page">
        {error && <div className="trip-error">{error}</div>}

        <div className="profile-card">
          <h2>Travel Preferences</h2>

          <form onSubmit={handlePreferencesSave}>
            <div className="form-group">
              <label>Budget</label>

              <select
                value={preferences.budget}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    budget: e.target.value,
                  })
                }
                required
              >
                <option value="">Select Budget</option>
                <option value="Budget">Budget</option>
                <option value="Economy">Economy</option>
                <option value="Mid-Range">Mid-Range</option>
                <option value="Luxury">Luxury</option>
              </select>
            </div>

            <div className="form-group">
              <label>Preferred Transport</label>

              <select
                value={preferences.transport?.[0] || ""}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    transport: e.target.value
                      ? [e.target.value]
                      : [],
                  })
                }
                required
              >
                <option value="">
                  Select Transport
                </option>
                <option value="Flight">Flight</option>
                <option value="Train">Train</option>
                <option value="Bus">Bus</option>
                <option value="Car">Car</option>
                <option value="Rental">Rental</option>
              </select>
            </div>

            <div className="form-group">
              <label>Accommodation Type</label>

              <select
                value={
                  preferences.accommodation?.[0] || ""
                }
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    accommodation: e.target.value
                      ? [e.target.value]
                      : [],
                  })
                }
                required
              >
                <option value="">
                  Select Accommodation
                </option>
                <option value="Hotel">Hotel</option>
                <option value="Resort">Resort</option>
                <option value="Homestay">Homestay</option>
                <option value="Hostel">Hostel</option>
              </select>
            </div>

            <div className="form-group">
              <label>Food Preference</label>

              <select
                value={preferences.food}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    food: e.target.value,
                  })
                }
                required
              >
                <option value="">
                  Select Food Preference
                </option>
                <option value="Vegetarian">
                  Vegetarian
                </option>
                <option value="Non-Vegetarian">
                  Non-Vegetarian
                </option>
                <option value="Vegan">Vegan</option>
                <option value="Halal">Halal</option>
                <option value="Kosher">Kosher</option>
              </select>
            </div>

            <div className="form-group">
              <label>Interests</label>

              <select
                value={preferences.interests?.[0] || ""}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    interests: e.target.value
                      ? [e.target.value]
                      : [],
                  })
                }
                required
              >
                <option value="">
                  Select Interest
                </option>
                <option value="Adventure">Adventure</option>
                <option value="History">History</option>
                <option value="Nature">Nature</option>
                <option value="Food">Food</option>
                <option value="Shopping">Shopping</option>
                <option value="Art">Art</option>
                <option value="Beaches">Beaches</option>
                <option value="Mountains">Mountains</option>
              </select>
            </div>

            <div className="form-group">
              <label>Trip Pace</label>

              <select
                value={preferences.pace}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    pace: e.target.value,
                  })
                }
                required
              >
                <option value="">
                  Select Trip Pace
                </option>
                <option value="Relaxed">Relaxed</option>
                <option value="Moderate">Moderate</option>
                <option value="Fast-Paced">
                  Fast-Paced
                </option>
              </select>
            </div>

            <div className="profile-form-actions">
              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Preferences"}
              </button>

              <button
                type="button"
                onClick={() => setPage("view")}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  if (page === "password") {
    return (
      <section className="profile-page">
        {error && <div className="trip-error">{error}</div>}

        <div className="profile-card">
          <h2>Change Password</h2>

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Current Password</label>

              <div className="password-wrapper">
                <input
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    passwordData.currentPassword
                  }
                  onChange={(e) =>
                    handlePasswordChange(
                      "currentPassword",
                      e.target.value
                    )
                  }
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowCurrentPassword(
                      !showCurrentPassword
                    )
                  }
                  aria-label="Show or hide current password"
                >
                  {showCurrentPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>

              <div className="password-wrapper">
                <input
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    handlePasswordChange(
                      "newPassword",
                      e.target.value
                    )
                  }
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowNewPassword(
                      !showNewPassword
                    )
                  }
                  aria-label="Show or hide new password"
                >
                  {showNewPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>

              <div className="password-wrapper">
                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    passwordData.confirmPassword
                  }
                  onChange={(e) =>
                    handlePasswordChange(
                      "confirmPassword",
                      e.target.value
                    )
                  }
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  aria-label="Show or hide confirm password"
                >
                  {showConfirmPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            <div className="profile-form-actions">
              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Changing..."
                  : "Change Password"}
              </button>

              <button
                type="button"
                onClick={() => setPage("view")}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  return null;
}

export default Profile;
