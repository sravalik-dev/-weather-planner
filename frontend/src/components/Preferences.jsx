import { useEffect, useState } from "react";
import { defaultPreferences } from "../constants/preferences";

const preferenceOptions = {
  travelType: [
    "Leisure",
    "Adventure",
    "Business",
    "Family",
    "Solo",
    "Romantic",
  ],
  budget: [
    "Budget",
    "Moderate",
    "Premium",
    "Luxury",
  ],
  climate: [
    "Pleasant",
    "Warm",
    "Cool",
    "Cold",
    "Any",
  ],
  activities: [
    "Sightseeing",
    "Nature",
    "Beach",
    "Adventure",
    "Food",
    "Shopping",
    "Culture",
    "Nightlife",
  ],
  accommodation: [
    "Hotel",
    "Resort",
    "Hostel",
    "Apartment",
    "Guest House",
  ],
  pace: [
    "Relaxed",
    "Balanced",
    "Packed",
  ],
};

function Preferences({ onBack }) {
  const [preferences, setPreferences] =
    useState(defaultPreferences);

  const [preferencesSaved, setPreferencesSaved] =
    useState(false);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(
          "itineraryPreferences"
        );

      if (stored) {
        setPreferences({
          ...defaultPreferences,
          ...JSON.parse(stored),
        });
      }
    } catch (error) {
      console.error(
        "Unable to load preferences:",
        error
      );
    }
  }, []);

  const updatePreference = (key, value) => {
    setPreferences((previous) => ({
      ...previous,
      [key]: value,
    }));

    setPreferencesSaved(false);
  };

  const toggleActivity = (activity) => {
    setPreferences((previous) => {
      const current =
        previous.activities || [];

      const exists =
        current.includes(activity);

      return {
        ...previous,
        activities: exists
          ? current.filter(
              (item) => item !== activity
            )
          : [...current, activity],
      };
    });

    setPreferencesSaved(false);
  };

  const savePreferences = () => {
    localStorage.setItem(
      "itineraryPreferences",
      JSON.stringify(preferences)
    );

    setPreferencesSaved(true);
  };

  const renderChoiceGroup = (
    title,
    hint,
    key
  ) => {
    return (
      <div className="preference-modern-section">
        <div className="preference-section-heading">
          <h3>{title}</h3>
          <p>{hint}</p>
        </div>

        <div className="modern-choice-grid">
          {preferenceOptions[key].map(
            (option) => (
              <button
                type="button"
                key={option}
                className={`modern-choice ${
                  preferences[key] === option
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  updatePreference(
                    key,
                    option
                  )
                }
              >
                {preferences[key] === option && (
                  <span>✓</span>
                )}
                {option}
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="preferences-page">
      <div className="preferences-card">
        <button
          type="button"
          className="page-back-button"
          onClick={onBack}
        >
          ← Back to Profile
        </button>

        <div className="preferences-hero">
          <div>
            <div className="page-eyebrow">
              PERSONALIZE YOUR JOURNEYS
            </div>

            <h1>
              ✈️ Travel Preferences
            </h1>

            <p>
              Tell us how you like to travel so
              your future trips can match your
              style.
            </p>
          </div>

          <div className="preferences-icon">
            ⚙️
          </div>
        </div>

        <div className="preferences-content">
          {renderChoiceGroup(
            "What type of travel do you prefer?",
            "Choose one travel style",
            "travelType"
          )}

          {renderChoiceGroup(
            "What is your travel budget?",
            "Choose your preferred budget",
            "budget"
          )}

          {renderChoiceGroup(
            "Which climate do you prefer?",
            "Choose the weather you enjoy",
            "climate"
          )}

          <div className="preference-modern-section">
            <div className="preference-section-heading">
              <h3>
                What activities do you enjoy?
              </h3>

              <p>
                Select all that apply
              </p>
            </div>

            <div className="modern-choice-grid">
              {preferenceOptions.activities.map(
                (activity) => {
                  const selected =
                    preferences.activities?.includes(
                      activity
                    );

                  return (
                    <button
                      type="button"
                      key={activity}
                      className={`modern-choice ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        toggleActivity(
                          activity
                        )
                      }
                    >
                      {selected && (
                        <span>✓</span>
                      )}
                      {activity}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {renderChoiceGroup(
            "Where do you prefer to stay?",
            "Choose your accommodation",
            "accommodation"
          )}

          {renderChoiceGroup(
            "How do you like to travel?",
            "Choose your preferred pace",
            "pace"
          )}
        </div>

        <div
          className={`preferences-save-box ${
            preferencesSaved
              ? "saved"
              : ""
          }`}
        >
          <div>
            <span className="save-icon">
              {preferencesSaved
                ? "✓"
                : "💾"}
            </span>

            <div>
              <strong>
                {preferencesSaved
                  ? "Preferences Saved"
                  : "Ready to save?"}
              </strong>

              <p>
                {preferencesSaved
                  ? "Your travel preferences are stored on this device."
                  : "Your selections will be remembered when you return."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="save-preferences-modern"
            onClick={savePreferences}
          >
            💾 Save Changes
          </button>
        </div>
      </div>
    </section>
  );
}

export default Preferences;