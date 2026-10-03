import { useEffect, useState } from "react";
import Trips from "./Trips";

function Profile({
  onBack,
  onLogout,
}) {
  const defaultPreferences = {
    travelType: "Solo",
    budget: "Mid-Range",
    climate: "Any",
    activities: [],
    accommodation: "Hotel",
    pace: "Balanced",
  };

  const [profileView, setProfileView] = useState("profile");

  const [loggedInUser, setLoggedInUser] = useState({
    name: "Traveler",
    email: "",
  });

  const [preferences, setPreferences] =
    useState(defaultPreferences);

  const [savedPreferences, setSavedPreferences] =
    useState(defaultPreferences);

  const [preferencesSaved, setPreferencesSaved] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmNewPassword, setShowConfirmNewPassword] =
    useState(false);

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem("itineraryUser");

      if (storedUser) {
        const parsedUser =
          JSON.parse(storedUser);

        setLoggedInUser({
          name:
            parsedUser.name ||
            parsedUser.fullName ||
            "Traveler",
          email:
            parsedUser.email || "",
        });
      }

      const storedPreferences =
        localStorage.getItem(
          "itineraryPreferences"
        );

      if (storedPreferences) {
        const parsedPreferences =
          JSON.parse(storedPreferences);

        const mergedPreferences = {
          ...defaultPreferences,
          ...parsedPreferences,
          activities: Array.isArray(
            parsedPreferences.activities
          )
            ? parsedPreferences.activities
            : [],
        };

        setPreferences(
          mergedPreferences
        );

        setSavedPreferences(
          mergedPreferences
        );
      }
    } catch (error) {
      console.error(
        "Unable to load profile information:",
        error
      );
    }
  }, []);

  const profileInitial = loggedInUser.name
    ? loggedInUser.name
        .charAt(0)
        .toUpperCase()
    : "U";

  const updatePreference = (
    key,
    value
  ) => {
    setPreferences(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );

    setPreferencesSaved(false);
  };

  const toggleActivity = (
    activity
  ) => {
    setPreferences(
      (previous) => {
        const current =
          previous.activities || [];

        const exists =
          current.includes(activity);

        return {
          ...previous,
          activities: exists
            ? current.filter(
                (item) =>
                  item !== activity
              )
            : [
                ...current,
                activity,
              ],
        };
      }
    );

    setPreferencesSaved(false);
  };

  const savePreferences = () => {
    localStorage.setItem(
      "itineraryPreferences",
      JSON.stringify(preferences)
    );

    setSavedPreferences(
      preferences
    );

    setPreferencesSaved(true);
  };

  const handlePasswordChange = (
    event
  ) => {
    event.preventDefault();

    if (newPassword.length < 6) {
      alert(
        "New password must contain at least 6 characters."
      );
      return;
    }

    if (
      newPassword !==
      confirmNewPassword
    ) {
      alert(
        "New passwords do not match."
      );
      return;
    }

    alert(
      "Password details are valid. Connect the change-password backend endpoint to update your password."
    );

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");

    setProfileView("profile");
  };

  const handleBackToProfile = () => {
    setProfileView("profile");
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    setLoggedInUser({
      name: "Traveler",
      email: "",
    });

    localStorage.removeItem(
      "itineraryUser"
    );

    localStorage.removeItem(
      "itineraryToken"
    );

    localStorage.removeItem(
      "jwtToken"
    );

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "isLoggedIn"
    );

    if (onBack) {
      onBack();
    }
  };

  if (profileView === "profile") {
    return (
      <main className="profile-page">
        <button
          type="button"
          className="profile-back-button"
          onClick={onBack}
        >
          ← Back to Weather
        </button>

        <section className="profile-card">
          <div className="profile-eyebrow">
            YOUR ACCOUNT
          </div>

          <h2>
            Welcome,{" "}
            {loggedInUser.name ||
              "Traveler"}
            !
          </h2>

          <p className="profile-subtitle">
            Manage your travel profile and
            preferences from one place.
          </p>

          <div className="profile-picture">
            {profileInitial}
          </div>

          <div className="profile-details">
            <div className="profile-detail">
              <span>Name</span>

              <strong>
                {loggedInUser.name ||
                  "Traveler"}
              </strong>
            </div>

            <div className="profile-detail">
              <span>Email</span>

              <strong>
                {loggedInUser.email ||
                  "Not available"}
              </strong>
            </div>
          </div>

          <div className="profile-preferences-summary">
            <h3>
              ✈️ Travel Preferences
            </h3>

            <div className="preference-summary-grid">
              <div>
                <span>
                  Travel Type
                </span>

                <strong>
                  {savedPreferences.travelType ||
                    "Not selected"}
                </strong>
              </div>

              <div>
                <span>Budget</span>

                <strong>
                  {savedPreferences.budget ||
                    "Not selected"}
                </strong>
              </div>

              <div>
                <span>Climate</span>

                <strong>
                  {savedPreferences.climate ||
                    "Not selected"}
                </strong>
              </div>

              <div>
                <span>Pace</span>

                <strong>
                  {savedPreferences.pace ||
                    "Not selected"}
                </strong>
              </div>

              <div>
                <span>
                  Accommodation
                </span>

                <strong>
                  {savedPreferences.accommodation ||
                    "Not selected"}
                </strong>
              </div>

              <div>
                <span>Activities</span>

                <strong>
                  {savedPreferences
                    .activities?.length
                    ? savedPreferences.activities.join(
                        ", "
                      )
                    : "Not selected"}
                </strong>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button
              type="button"
              onClick={() =>
                setProfileView(
                  "preferences"
                )
              }
            >
              ✈️ Manage Preferences
            </button>

            <button
              type="button"
              onClick={() =>
                setProfileView(
                  "password"
                )
              }
            >
              🔐 Change Password
            </button>

            <button
              type="button"
              onClick={() =>
                setProfileView(
                  "trips"
                )
              }
            >
              ✈️ My Trips
            </button>

            <button
              type="button"
              onClick={() =>
                setProfileView(
                  "trips"
                )
              }
            >
              🗺️ Smart Route Planner
            </button>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (profileView === "preferences") {
    const travelTypes = [
      "Solo",
      "Couple",
      "Family",
      "Friends",
    ];

    const budgets = [
      "Budget",
      "Economy",
      "Mid-Range",
      "Luxury",
    ];

    const climates = [
      "Any",
      "Warm",
      "Cool",
      "Cold",
      "Tropical",
    ];

    const accommodations = [
      "Hotel",
      "Resort",
      "Homestay",
      "Hostel",
    ];

    const paces = [
      "Relaxed",
      "Balanced",
      "Fast-Paced",
    ];

    const activities = [
      "Adventure",
      "History",
      "Nature",
      "Food",
      "Shopping",
      "Art",
      "Beaches",
      "Mountains",
    ];

    return (
      <main className="profile-page">
        <button
          type="button"
          className="profile-back-button"
          onClick={onBack}
        >
          ← Back to Weather
        </button>

        <section className="profile-card">
          <button
            type="button"
            className="inner-back-button"
            onClick={
              handleBackToProfile
            }
          >
            ← Back to Profile
          </button>

          <div className="profile-eyebrow">
            PERSONALIZE
          </div>

          <h2>
            Travel Preferences
          </h2>

          <p className="profile-subtitle">
            Select your travel style so
            we can create better
            itinerary recommendations.
          </p>

          <div className="preference-section">
            <span className="preference-title">
              🧳 What type of travel do you
              prefer?
            </span>

            <div className="preference-options">
              {travelTypes.map(
                (option) => (
                  <button
                    type="button"
                    key={option}
                    className={
                      preferences.travelType ===
                      option
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      updatePreference(
                        "travelType",
                        option
                      )
                    }
                  >
                    {preferences.travelType ===
                      option &&
                      "✓ "}
                    {option}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="preference-section">
            <span className="preference-title">
              💰 What is your preferred
              budget?
            </span>

            <div className="preference-options">
              {budgets.map(
                (option) => (
                  <button
                    type="button"
                    key={option}
                    className={
                      preferences.budget ===
                      option
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      updatePreference(
                        "budget",
                        option
                      )
                    }
                  >
                    {preferences.budget ===
                      option &&
                      "✓ "}
                    {option}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="preference-section">
            <span className="preference-title">
              🌤️ Which climate do you
              prefer?
            </span>

            <div className="preference-options">
              {climates.map(
                (option) => (
                  <button
                    type="button"
                    key={option}
                    className={
                      preferences.climate ===
                      option
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      updatePreference(
                        "climate",
                        option
                      )
                    }
                  >
                    {preferences.climate ===
                      option &&
                      "✓ "}
                    {option}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="preference-section">
            <span className="preference-title">
              🏨 What accommodation do you
              prefer?
            </span>

            <div className="preference-options">
              {accommodations.map(
                (option) => (
                  <button
                    type="button"
                    key={option}
                    className={
                      preferences.accommodation ===
                      option
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      updatePreference(
                        "accommodation",
                        option
                      )
                    }
                  >
                    {preferences.accommodation ===
                      option &&
                      "✓ "}
                    {option}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="preference-section">
            <span className="preference-title">
              ⚡ What pace do you prefer?
            </span>

            <div className="preference-options">
              {paces.map(
                (option) => (
                  <button
                    type="button"
                    key={option}
                    className={
                      preferences.pace ===
                      option
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      updatePreference(
                        "pace",
                        option
                      )
                    }
                  >
                    {preferences.pace ===
                      option &&
                      "✓ "}
                    {option}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="preference-section">
            <span className="preference-title">
              🎯 What activities interest
              you?
            </span>

            <div className="preference-options">
              {activities.map(
                (activity) => (
                  <button
                    type="button"
                    key={activity}
                    className={
                      preferences.activities?.includes(
                        activity
                      )
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      toggleActivity(
                        activity
                      )
                    }
                  >
                    {preferences.activities?.includes(
                      activity
                    ) && "✓ "}
                    {activity}
                  </button>
                )
              )}
            </div>
          </div>

          <div
            className={`save-preferences-box ${
              preferencesSaved
                ? "saved"
                : ""
            }`}
          >
            <div>
              <strong>
                {preferencesSaved
                  ? "✓ Preferences Saved"
                  : "Ready to save your preferences?"}
              </strong>

              <span>
                {preferencesSaved
                  ? "Your travel preferences are stored on this device."
                  : "Your selections will be remembered when you return to your profile."}
              </span>
            </div>

            <button
              type="button"
              className="save-preferences-button"
              onClick={
                savePreferences
              }
            >
              💾 Save Changes
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (profileView === "password") {
    return (
      <main className="profile-page">
        <button
          type="button"
          className="profile-back-button"
          onClick={onBack}
        >
          ← Back to Weather
        </button>

        <section className="profile-card">
          <button
            type="button"
            className="inner-back-button"
            onClick={
              handleBackToProfile
            }
          >
            ← Back to Profile
          </button>

          <div className="profile-eyebrow">
            SECURITY
          </div>

          <h2>Change Password</h2>

          <p className="profile-subtitle">
            Update your account password
            securely.
          </p>

          <form
            onSubmit={
              handlePasswordChange
            }
          >
            <div className="form-group">
              <label>
                Current Password
              </label>

              <div className="password-wrapper">
                <input
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    currentPassword
                  }
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter current password"
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
                >
                  {showCurrentPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>
                New Password
              </label>

              <div className="password-wrapper">
                <input
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter new password"
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
                >
                  {showNewPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>
                Confirm New Password
              </label>

              <div className="password-wrapper">
                <input
                  type={
                    showConfirmNewPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmNewPassword
                  }
                  onChange={(event) =>
                    setConfirmNewPassword(
                      event.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmNewPassword(
                      !showConfirmNewPassword
                    )
                  }
                >
                  {showConfirmNewPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            <div className="profile-form-actions">
              <button type="submit">
                🔐 Update Password
              </button>

              <button
                type="button"
                onClick={
                  handleBackToProfile
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  if (profileView === "trips") {
    return (
      <main className="profile-page">
        <button
          type="button"
          className="profile-back-button"
          onClick={onBack}
        >
          ← Back to Weather
        </button>

        
          <button
            type="button"
            className="inner-back-button"
            onClick={
              handleBackToProfile
            }
          >
            ← Back to Profile
          </button>

          <Trips />
      
      </main>
    );
  }

  return null;
}

export default Profile;