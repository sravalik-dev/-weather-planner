import { useEffect, useMemo, useState } from "react";

import {
  generateRecommendations,
  getRecommendations,
  getRecommendationsByType,
  getRecommendationHistory,
  recordRecommendationAction,
  RECOMMENDATION_TYPES,
} from "../services/recommendationService";

import { getTrip } from "../services/tripService";

import "../styles/RecommendationEngine.css";

function RecommendationEngine({ tripId, onBack }) {
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);

  const [selectedType, setSelectedType] = useState("ALL");

  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeRecommendation, setActiveRecommendation] =
    useState(null);

  const [showHistory, setShowHistory] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);

  /*
   * =========================================================
   * SELECTED TRIP
   * =========================================================
   */

  const [trip, setTrip] = useState(null);
  const [tripLoading, setTripLoading] = useState(false);

  /*
   * =========================================================
   * NORMALIZE DATE
   * =========================================================
   */

  const normalizeDate = (value) => {
    if (!value) {
      return "";
    }

    const text = String(value);

    /*
     * Backend may return:
     *
     * 2026-09-15
     * 2026-09-15T00:00:00
     * 2026-09-15T00:00:00.000Z
     *
     * For the HTML date input we only need:
     *
     * YYYY-MM-DD
     */

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    const match = text.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

    if (match) {
      return match[1];
    }

    try {
      const date = new Date(text);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      const year = date.getFullYear();
      const month = String(
        date.getMonth() + 1
      ).padStart(2, "0");
      const day = String(
        date.getDate()
      ).padStart(2, "0");

      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  /*
   * =========================================================
   * LOAD SELECTED TRIP
   * =========================================================
   */

  const loadTrip = async () => {
    if (!tripId) {
      setTrip(null);
      return;
    }

    try {
      setTripLoading(true);
      setError("");

      const data = await getTrip(tripId);

      setTrip(data || null);

      /*
       * If no planned date has been selected yet,
       * automatically use the trip start date.
       *
       * This prevents the user from accidentally
       * generating recommendations outside the trip.
       */
      const tripStartDate = normalizeDate(
        data?.startDate
      );

      if (tripStartDate) {
        setPlannedDate((previous) => {
          return previous || tripStartDate;
        });
      }
    } catch (err) {
      console.error(
        "Trip loading error:",
        err
      );

      setTrip(null);

      setError(
        err?.message ||
          "Unable to load the selected trip."
      );
    } finally {
      setTripLoading(false);
    }
  };

  /*
   * =========================================================
   * TRIP DATE RANGE
   * =========================================================
   */

  const tripStartDate = useMemo(() => {
    return normalizeDate(trip?.startDate);
  }, [trip]);

  const tripEndDate = useMemo(() => {
    return normalizeDate(trip?.endDate);
  }, [trip]);

  /*
   * =========================================================
   * VALIDATE PLANNED DATE
   * =========================================================
   */

  const validatePlannedDate = () => {
    if (!plannedDate) {
      return {
        valid: true,
        message: "",
      };
    }

    /*
     * If the trip dates could not be loaded,
     * do not incorrectly block the request here.
     * The backend remains the final authority.
     */
    if (!tripStartDate || !tripEndDate) {
      return {
        valid: true,
        message: "",
      };
    }

    if (
      plannedDate < tripStartDate ||
      plannedDate > tripEndDate
    ) {
      return {
        valid: false,
        message:
          `Planned date must be within the trip dates: ` +
          `${tripStartDate} to ${tripEndDate}.`,
      };
    }

    return {
      valid: true,
      message: "",
    };
  };

  /*
   * =========================================================
   * LOAD EXISTING RECOMMENDATIONS
   * =========================================================
   */

  const loadRecommendations = async () => {
    if (!tripId) {
      setRecommendations([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      let data;

      if (selectedType === "ALL") {
        data = await getRecommendations(
          tripId
        );
      } else {
        data =
          await getRecommendationsByType(
            tripId,
            selectedType
          );
      }

      setRecommendations(
        normalizeRecommendations(data)
      );
    } catch (err) {
      console.error(
        "Recommendation loading error:",
        err
      );

      setRecommendations([]);

      setError(
        err?.message ||
          "Unable to load recommendations."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * LOAD HISTORY
   * =========================================================
   */

  const loadHistory = async () => {
    if (!tripId) {
      setHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);

      const data =
        await getRecommendationHistory(
          tripId
        );

      setHistory(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Recommendation history error:",
        err
      );

      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  /*
   * =========================================================
   * NORMALIZE BACKEND RESPONSE
   * =========================================================
   */

  const normalizeRecommendations = (
    data
  ) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (
      data &&
      Array.isArray(
        data.recommendations
      )
    ) {
      return data.recommendations;
    }

    if (
      data &&
      Array.isArray(data.data)
    ) {
      return data.data;
    }

    return [];
  };

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */

  useEffect(() => {
    if (!tripId) {
      setTrip(null);
      setRecommendations([]);
      setHistory([]);
      setPlannedDate("");
      return;
    }

    loadTrip();
    loadRecommendations();
    loadHistory();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  /*
   * =========================================================
   * TYPE FILTER
   * =========================================================
   */

  useEffect(() => {
    if (!tripId) {
      return;
    }

    loadRecommendations();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  /*
   * =========================================================
   * GENERATE RECOMMENDATIONS
   * =========================================================
   */

  const handleGenerate = async () => {
    if (!tripId) {
      setError(
        "Please select a trip before generating recommendations."
      );
      return;
    }

    /*
     * Validate the planned date BEFORE sending
     * the request to Spring Boot.
     */
    const validation =
      validatePlannedDate();

    if (!validation.valid) {
      setError(validation.message);
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const result =
        await generateRecommendations(
          tripId,
          plannedDate,
          plannedTime
        );

      const generated =
        normalizeRecommendations(
          result
        );

      /*
       * Reload persisted recommendations.
       */
      await loadRecommendations();

      await loadHistory();

      if (
        generated.length > 0 ||
        result
      ) {
        setSuccess(
          "Recommendations generated successfully."
        );
      } else {
        setSuccess(
          "Recommendation generation completed."
        );
      }
    } catch (err) {
      console.error(
        "Recommendation generation error:",
        err
      );

      setError(
        err?.message ||
          "Unable to generate recommendations."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * ACTION
   * =========================================================
   */

  const handleAction = async (
    recommendation,
    action
  ) => {
    const recommendationId =
      recommendation?.recommendationId;

    if (!recommendationId) {
      setError(
        "Recommendation ID is missing."
      );
      return;
    }

    try {
      setActionLoading(
        `${recommendationId}-${action}`
      );

      setError("");
      setSuccess("");

      await recordRecommendationAction(
        recommendationId,
        tripId,
        action
      );

      await loadHistory();

      setSuccess(
        `Recommendation marked as ${action.toLowerCase()}.`
      );
    } catch (err) {
      console.error(
        "Recommendation action error:",
        err
      );

      setError(
        err?.message ||
          "Unable to record recommendation action."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /*
   * =========================================================
   * DISPLAY HELPERS
   * =========================================================
   */

  const getTypeInfo = (type) => {
    const normalized =
      String(type || "").toUpperCase();

    return (
      RECOMMENDATION_TYPES.find(
        (item) =>
          item.value === normalized
      ) || {
        value: normalized,
        label:
          normalized ||
          "Recommendation",
        icon: "✨",
      }
    );
  };

  const getRecommendationIcon = (
    type
  ) => {
    return getTypeInfo(type).icon;
  };

  const formatType = (type) => {
    return getTypeInfo(type).label;
  };

  const formatTime = (value) => {
    if (!value) {
      return "Flexible";
    }

    const text = String(value);

    if (
      text.length >= 5 &&
      /^\d{2}:\d{2}/.test(text)
    ) {
      return text.slice(0, 5);
    }

    return text;
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "Recently";
    }

    try {
      const date = new Date(value);

      if (
        Number.isNaN(date.getTime())
      ) {
        return String(value);
      }

      return date.toLocaleString();
    } catch {
      return String(value);
    }
  };

  const formatScore = (score) => {
    if (
      score === null ||
      score === undefined ||
      score === ""
    ) {
      return "—";
    }

    const number = Number(score);

    if (!Number.isFinite(number)) {
      return String(score);
    }

    return `${number.toFixed(0)}%`;
  };

  const getScoreClass = (score) => {
    const number = Number(score);

    if (!Number.isFinite(number)) {
      return "recommendation-score-neutral";
    }

    if (number >= 75) {
      return "recommendation-score-high";
    }

    if (number >= 50) {
      return "recommendation-score-medium";
    }

    return "recommendation-score-low";
  };

  const getCrowdClass = (level) => {
    const normalized =
      String(level || "").toLowerCase();

    if (normalized === "low") {
      return "crowd-low";
    }

    if (normalized === "high") {
      return "crowd-high";
    }

    if (
      normalized === "very_high" ||
      normalized === "very high"
    ) {
      return "crowd-very-high";
    }

    return "crowd-moderate";
  };

  /*
   * =========================================================
   * SUMMARY
   * =========================================================
   */

  const summary = useMemo(() => {
    const items =
      Array.isArray(recommendations)
        ? recommendations
        : [];

    const typeCounts = {
      WEATHER: 0,
      NEARBY: 0,
      CROWD: 0,
      SEASONAL: 0,
      TIME: 0,
    };

    items.forEach((item) => {
      const type =
        String(
          item?.recommendationType || ""
        ).toUpperCase();

      if (
        Object.prototype.hasOwnProperty.call(
          typeCounts,
          type
        )
      ) {
        typeCounts[type] += 1;
      }
    });

    return {
      total: items.length,
      weather: typeCounts.WEATHER,
      nearby: typeCounts.NEARBY,
      crowd: typeCounts.CROWD,
      seasonal: typeCounts.SEASONAL,
      time: typeCounts.TIME,
    };
  }, [recommendations]);

  /*
   * =========================================================
   * NO TRIP
   * =========================================================
   */

  if (!tripId) {
    return (
      <section className="recommendation-page">
        <div className="recommendation-shell">
          {onBack && (
            <button
              type="button"
              className="recommendation-back-button"
              onClick={onBack}
            >
              ← Back to Profile
            </button>
          )}

          <div className="recommendation-empty-page">
            <div className="recommendation-empty-icon">
              ✨
            </div>

            <h2>
              Select a trip first
            </h2>

            <p>
              Open a trip to generate
              personalized recommendations
              based on weather, nearby
              attractions, crowd levels,
              season, and available time.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /*
   * =========================================================
   * MAIN UI
   * =========================================================
   */

  return (
    <section className="recommendation-page">
      <div className="recommendation-shell">

        {onBack && (
          <button
            type="button"
            className="recommendation-back-button"
            onClick={onBack}
          >
            ← Go Back
          </button>
        )}

        {/* HEADER */}

        <header className="recommendation-header">
          <div>
            <h1>
              Dynamic Recommendations
            </h1>

            <p>
              Personalized activities and
              destinations based on weather,
              distance, crowd conditions,
              season, and available time.
            </p>
          </div>

          <div className="recommendation-header-icon">
            ✨
          </div>
        </header>

        {/* CONTROL CARD */}

        <div className="recommendation-control-card">

          <div className="recommendation-control-heading">
            <div>
              <span className="recommendation-section-label">
                RECOMMENDATION ENGINE
              </span>

              <h2>
                Generate recommendations
              </h2>
            </div>

            <span className="recommendation-trip-badge">
              Trip #{tripId}
            </span>
          </div>

          {tripLoading ? (
            <p className="recommendation-control-note">
              Loading trip dates...
            </p>
          ) : (
            <>
              <div className="recommendation-control-grid">

                <label className="recommendation-field">
                  <span>
                    Planned Date
                  </span>

                  <input
                    type="date"
                    value={plannedDate}
                    min={tripStartDate || undefined}
                    max={tripEndDate || undefined}
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      setPlannedDate(value);

                      /*
                       * Immediate frontend validation.
                       */
                      if (
                        tripStartDate &&
                        tripEndDate &&
                        value &&
                        (
                          value <
                            tripStartDate ||
                          value >
                            tripEndDate
                        )
                      ) {
                        setError(
                          `Please select a date between ${tripStartDate} and ${tripEndDate}.`
                        );
                      } else {
                        setError("");
                      }
                    }}
                  />
                </label>

                <label className="recommendation-field">
                  <span>
                    Planned Time
                  </span>

                  <input
                    type="time"
                    value={plannedTime}
                    onChange={(event) =>
                      setPlannedTime(
                        event.target.value
                      )
                    }
                  />
                </label>

                <button
                  type="button"
                  className="recommendation-generate-button"
                  onClick={handleGenerate}
                  disabled={
                    loading ||
                    tripLoading
                  }
                >
                  {loading
                    ? "Generating..."
                    : "✨ Generate Recommendations"}
                </button>
              </div>

              <p className="recommendation-control-note">
                {tripStartDate &&
                tripEndDate
                  ? `Trip dates: ${tripStartDate} to ${tripEndDate}. Planned date must be within this range.`
                  : "Leave date or time empty to let the recommendation engine use the trip defaults."}
              </p>
            </>
          )}
        </div>

        {/* MESSAGES */}

        {error && (
          <div className="recommendation-message recommendation-error">
            <span>⚠️</span>

            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="recommendation-message recommendation-success">
            <span>✓</span>

            <span>{success}</span>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* SUMMARY */}

        <div className="recommendation-summary-grid">

          <div className="recommendation-summary-card">
            <span className="summary-icon">
              ✨
            </span>

            <div>
              <span>
                Total
              </span>

              <strong>
                {summary.total}
              </strong>
            </div>
          </div>

          <div className="recommendation-summary-card">
            <span className="summary-icon">
              🌦️
            </span>

            <div>
              <span>
                Weather
              </span>

              <strong>
                {summary.weather}
              </strong>
            </div>
          </div>

          <div className="recommendation-summary-card">
            <span className="summary-icon">
              📍
            </span>

            <div>
              <span>
                Nearby
              </span>

              <strong>
                {summary.nearby}
              </strong>
            </div>
          </div>

          <div className="recommendation-summary-card">
            <span className="summary-icon">
              👥
            </span>

            <div>
              <span>
                Crowd
              </span>

              <strong>
                {summary.crowd}
              </strong>
            </div>
          </div>

          <div className="recommendation-summary-card">
            <span className="summary-icon">
              🌤️
            </span>

            <div>
              <span>
                Seasonal
              </span>

              <strong>
                {summary.seasonal}
              </strong>
            </div>
          </div>

          <div className="recommendation-summary-card">
            <span className="summary-icon">
              🕐
            </span>

            <div>
              <span>
                Time
              </span>

              <strong>
                {summary.time}
              </strong>
            </div>
          </div>

        </div>

        {/* FILTERS */}

        <div className="recommendation-filter-card">

          <div className="recommendation-filter-header">
            <div>
              <span className="recommendation-section-label">
                SMART FILTERS
              </span>

              <h2>
                Recommendation types
              </h2>
            </div>

            <button
              type="button"
              className="recommendation-refresh-button"
              onClick={() => {
                loadRecommendations();
                loadHistory();
              }}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="recommendation-type-tabs">
            {RECOMMENDATION_TYPES.map(
              (type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`recommendation-type-tab ${
                    selectedType ===
                    type.value
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedType(
                      type.value
                    )
                  }
                >
                  <span>
                    {type.icon}
                  </span>

                  {type.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* RECOMMENDATIONS */}

        <div className="recommendation-section-card">

          <div className="recommendation-section-heading">
            <div>
              <span className="recommendation-section-label">
                PERSONALIZED RESULTS
              </span>

              <h2>
                Recommended for your trip
              </h2>
            </div>

            <span className="recommendation-count">
              {recommendations.length} results
            </span>
          </div>

          {loading &&
          recommendations.length === 0 ? (
            <div className="recommendation-loading">
              <div className="recommendation-spinner" />

              <h3>
                Analyzing trip conditions...
              </h3>

              <p>
                Checking weather, distance,
                crowd conditions, season and
                available time.
              </p>
            </div>
          ) : recommendations.length ===
            0 ? (
            <div className="recommendation-empty">
              <div className="recommendation-empty-icon">
                🔎
              </div>

              <h3>
                No recommendations found
              </h3>

              <p>
                No recommendations match the
                current conditions. Try
                generating recommendations
                again or select another filter.
              </p>

              <button
                type="button"
                className="recommendation-secondary-button"
                onClick={handleGenerate}
                disabled={
                  loading ||
                  tripLoading
                }
              >
                Generate Recommendations
              </button>
            </div>
          ) : (
            <div className="recommendation-list">
              {recommendations.map(
                (
                  recommendation,
                  index
                ) => {
                  const type =
                    recommendation?.recommendationType;

                  const typeInfo =
                    getTypeInfo(type);

                  const id =
                    recommendation?.recommendationId ||
                    `${type}-${index}`;

                  return (
                    <article
                      key={id}
                      className="recommendation-card"
                    >

                      <div className="recommendation-card-top">

                        <div className="recommendation-card-type">
                          <span className="recommendation-card-icon">
                            {getRecommendationIcon(
                              type
                            )}
                          </span>

                          <div>
                            <span className="recommendation-card-type-label">
                              {typeInfo.label}
                            </span>

                            <h3>
                              {recommendation?.destinationName ||
                                recommendation?.destination?.destinationName ||
                                recommendation?.destination?.name ||
                                "Recommended destination"}
                            </h3>
                          </div>
                        </div>

                        <div
                          className={`recommendation-score ${getScoreClass(
                            recommendation?.score
                          )}`}
                        >
                          <span>
                            Relevance
                          </span>

                          <strong>
                            {formatScore(
                              recommendation?.score
                            )}
                          </strong>
                        </div>

                      </div>

                      <div className="recommendation-reason">
                        <span className="reason-icon">
                          💡
                        </span>

                        <p>
                          {recommendation?.reason ||
                            "This recommendation matches the current trip conditions."}
                        </p>
                      </div>

                      <div className="recommendation-details">

                        <div className="recommendation-detail">
                          <span>
                            📍 Distance
                          </span>

                          <strong>
                            {recommendation?.distance !==
                              null &&
                            recommendation?.distance !==
                              undefined
                              ? `${recommendation.distance} km`
                              : "—"}
                          </strong>
                        </div>

                        <div className="recommendation-detail">
                          <span>
                            🌦️ Weather
                          </span>

                          <strong>
                            {recommendation?.weatherCondition ||
                              "—"}
                          </strong>
                        </div>

                        <div className="recommendation-detail">
                          <span>
                            👥 Crowd
                          </span>

                          <strong
                            className={getCrowdClass(
                              recommendation?.crowdLevel
                            )}
                          >
                            {recommendation?.crowdLevel ||
                              "—"}
                          </strong>
                        </div>

                        <div className="recommendation-detail">
                          <span>
                            🕐 Suggested Time
                          </span>

                          <strong>
                            {formatTime(
                              recommendation?.recommendedTime
                            )}
                          </strong>
                        </div>

                        <div className="recommendation-detail">
                          <span>
                            🌤️ Season
                          </span>

                          <strong>
                            {recommendation?.season ||
                              "—"}
                          </strong>
                        </div>

                      </div>

                      <div className="recommendation-card-footer">

                        <button
                          type="button"
                          className="recommendation-view-button"
                          onClick={() =>
                            setActiveRecommendation(
                              recommendation
                            )
                          }
                        >
                          View Details
                        </button>

                        <div className="recommendation-action-buttons">

                          <button
                            type="button"
                            className="recommendation-action-button recommendation-accept"
                            disabled={
                              actionLoading ===
                              `${recommendation?.recommendationId}-Accepted`
                            }
                            onClick={() =>
                              handleAction(
                                recommendation,
                                "Accepted"
                              )
                            }
                          >
                            ✓ Accept
                          </button>

                          <button
                            type="button"
                            className="recommendation-action-button recommendation-reject"
                            disabled={
                              actionLoading ===
                              `${recommendation?.recommendationId}-Rejected`
                            }
                            onClick={() =>
                              handleAction(
                                recommendation,
                                "Rejected"
                              )
                            }
                          >
                            × Reject
                          </button>

                          <button
                            type="button"
                            className="recommendation-action-button recommendation-use"
                            disabled={
                              actionLoading ===
                              `${recommendation?.recommendationId}-Used in Itinerary`
                            }
                            onClick={() =>
                              handleAction(
                                recommendation,
                                "Used in Itinerary"
                              )
                            }
                          >
                            + Itinerary
                          </button>

                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* HISTORY */}

        <div className="recommendation-history-card">

          <div className="recommendation-history-header">

            <div>
              <span className="recommendation-section-label">
                ACTIVITY LOG
              </span>

              <h2>
                Recommendation History
              </h2>
            </div>

            <button
              type="button"
              className="recommendation-history-toggle"
              onClick={() => {
                setShowHistory(
                  (previous) =>
                    !previous
                );

                if (!showHistory) {
                  loadHistory();
                }
              }}
            >
              {showHistory
                ? "Hide History"
                : "View History"}
            </button>
          </div>

          {showHistory && (
            <div className="recommendation-history-content">

              {historyLoading ? (
                <div className="recommendation-history-loading">
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <div className="recommendation-history-empty">
                  No recommendation history
                  available for this trip yet.
                </div>
              ) : (
                <div className="recommendation-history-list">
                  {history.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        className="recommendation-history-item"
                        key={
                          item?.historyId ||
                          index
                        }
                      >
                        <div className="history-item-icon">
                          {getRecommendationIcon(
                            item?.recommendationType
                          )}
                        </div>

                        <div className="history-item-main">
                          <strong>
                            {formatType(
                              item?.recommendationType
                            )}
                          </strong>

                          <span>
                            {item?.action ||
                              "Recommendation activity"}
                          </span>

                          {item?.reason && (
                            <p>
                              {item.reason}
                            </p>
                          )}
                        </div>

                        <time>
                          {formatDateTime(
                            item?.createdAt
                          )}
                        </time>
                      </div>
                    )
                  )}
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* DETAILS MODAL */}

      {activeRecommendation && (
        <div
          className="recommendation-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setActiveRecommendation(
                null
              );
            }
          }}
        >
          <div className="recommendation-modal">

            <div className="recommendation-modal-header">
              <div>
                <span className="recommendation-section-label">
                  RECOMMENDATION DETAILS
                </span>

                <h2>
                  {activeRecommendation?.destinationName ||
                    activeRecommendation?.destination?.destinationName ||
                    activeRecommendation?.destination?.name ||
                    "Recommended Destination"}
                </h2>
              </div>

              <button
                type="button"
                className="recommendation-modal-close"
                onClick={() =>
                  setActiveRecommendation(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="recommendation-modal-type">
              <span>
                {getRecommendationIcon(
                  activeRecommendation?.recommendationType
                )}
              </span>

              {formatType(
                activeRecommendation?.recommendationType
              )}
            </div>

            <div className="recommendation-modal-reason">
              <span>
                Why this was recommended
              </span>

              <p>
                {activeRecommendation?.reason ||
                  "No recommendation reason was provided."}
              </p>
            </div>

            <div className="recommendation-modal-grid">

              <div>
                <span>
                  Relevance
                </span>

                <strong>
                  {formatScore(
                    activeRecommendation?.score
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Distance
                </span>

                <strong>
                  {activeRecommendation?.distance !==
                    null &&
                  activeRecommendation?.distance !==
                    undefined
                    ? `${activeRecommendation.distance} km`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  Weather
                </span>

                <strong>
                  {activeRecommendation?.weatherCondition ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Crowd
                </span>

                <strong>
                  {activeRecommendation?.crowdLevel ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Recommended Time
                </span>

                <strong>
                  {formatTime(
                    activeRecommendation?.recommendedTime
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Season
                </span>

                <strong>
                  {activeRecommendation?.season ||
                    "—"}
                </strong>
              </div>

            </div>

            <div className="recommendation-modal-actions">

              <button
                type="button"
                className="recommendation-action-button recommendation-accept"
                onClick={() => {
                  handleAction(
                    activeRecommendation,
                    "Accepted"
                  );

                  setActiveRecommendation(
                    null
                  );
                }}
              >
                ✓ Accept
              </button>

              <button
                type="button"
                className="recommendation-action-button recommendation-use"
                onClick={() => {
                  handleAction(
                    activeRecommendation,
                    "Used in Itinerary"
                  );

                  setActiveRecommendation(
                    null
                  );
                }}
              >
                + Add to Itinerary
              </button>

            </div>

          </div>
        </div>
      )}

    </section>
  );
}

export default RecommendationEngine;