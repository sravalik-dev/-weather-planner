import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  generateRecommendations,
  getRecommendations,
  getRecommendationHistory,
  recordRecommendationAction,
  RECOMMENDATION_TYPES,
} from "../services/recommendationService";

import { getTrip } from "../services/tripService";

import "../styles/RecommendationEngine.css";
import "../styles/RecommendationRedesign.css";

/* =========================================================
   DYNAMIC RECOMMENDATIONS (prefix rx-)

   - Loads the latest generation once and filters by type in the
     browser (instant, and no request-order races).
   - Each card shows the user's latest decision, read from history.
   - Shows which weather the backend used (forecast / today / unavailable).
========================================================= */

const TYPE_BY_VALUE = Object.fromEntries(
  RECOMMENDATION_TYPES.map((type) => [type.value, type])
);

const ACTION_BADGES = {
  accepted: { label: "Accepted", tone: "good" },
  rejected: { label: "Rejected", tone: "bad" },
  "used in itinerary": { label: "In itinerary", tone: "info" },
  viewed: { label: "Viewed", tone: "muted" },
};

const SORT_OPTIONS = [
  { value: "score", label: "Best match" },
  { value: "distance", label: "Nearest first" },
  { value: "name", label: "Destination A–Z" },
];

const isGeneratedAction = (action) =>
  /generated|recommended$/i.test(String(action || "")) &&
  !/^recommendation (viewed|accepted|rejected|used)/i.test(String(action || ""));

const normalizeDate = (value) => {
  if (!value) return "";
  const text = String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.recommendations)) return data.recommendations;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

const typeInfo = (type) => {
  const key = String(type || "").toUpperCase();
  return TYPE_BY_VALUE[key] || { value: key, label: key || "Recommendation", icon: "✨" };
};

/* "Recommendation Accepted" -> "accepted" ; unknown actions -> "" */
const statusKey = (action) => {
  const text = String(action || "").toLowerCase().replace(/^recommendation\s+/, "").trim();
  return ACTION_BADGES[text] ? text : "";
};

const formatTime = (value) => {
  if (!value) return "Flexible";
  const text = String(value);
  return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : text;
};

const formatDateTime = (value) => {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const formatDay = (value) => {
  const iso = normalizeDate(value);
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const scoreNumber = (score) => {
  const n = Number(score);
  return score === null || score === undefined || score === "" || !Number.isFinite(n) ? null : n;
};

const scoreTone = (score) => {
  const n = scoreNumber(score);
  if (n === null) return "neutral";
  if (n >= 75) return "high";
  if (n >= 50) return "medium";
  return "low";
};

const crowdTone = (level) => {
  const text = String(level || "").toLowerCase().replace(/_/g, " ");
  if (text === "low") return "low";
  if (text === "high") return "high";
  if (text === "very high") return "very-high";
  return "moderate";
};

const prettyLevel = (level) =>
  level ? String(level).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—";

const distanceText = (item) => {
  const value = item?.distanceKm ?? item?.distance;
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) return "—";
  return n === 0 ? "At the stop" : `${n.toFixed(1)} km`;
};

const destinationName = (item) =>
  item?.destinationName ||
  item?.destination?.destinationName ||
  item?.destination?.name ||
  "Recommended destination";

function RecommendationEngine({ tripId, onBack }) {
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [trip, setTrip] = useState(null);

  const [selectedType, setSelectedType] = useState("ALL");
  const [sortMode, setSortMode] = useState("score");
  const [includePrevious, setIncludePrevious] = useState(false);

  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generationInfo, setGenerationInfo] = useState(null);

  const [activeRecommendation, setActiveRecommendation] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hideGenerated, setHideGenerated] = useState(true);

  /* Ignore answers that arrive after a newer request was started. */
  const listRequest = useRef(0);
  const historyRequest = useRef(0);
  const generatingRef = useRef(false);

  const tripStartDate = useMemo(() => normalizeDate(trip?.startDate), [trip]);
  const tripEndDate = useMemo(() => normalizeDate(trip?.endDate), [trip]);

  /* ---------------- loading ---------------- */

  const loadRecommendations = useCallback(
    async (previous = includePrevious) => {
      if (!tripId) {
        setRecommendations([]);
        return;
      }
      const requestId = ++listRequest.current;
      try {
        setLoading(true);
        const data = await getRecommendations(tripId, previous);
        if (requestId !== listRequest.current) return;
        setRecommendations(toList(data));
      } catch (err) {
        if (requestId !== listRequest.current) return;
        console.error("Recommendation loading error:", err);
        setRecommendations([]);
        setError(err?.message || "Unable to load recommendations.");
      } finally {
        if (requestId === listRequest.current) setLoading(false);
      }
    },
    [tripId, includePrevious]
  );

  const loadHistory = useCallback(async () => {
    if (!tripId) {
      setHistory([]);
      return;
    }
    const requestId = ++historyRequest.current;
    try {
      setHistoryLoading(true);
      const data = await getRecommendationHistory(tripId);
      if (requestId !== historyRequest.current) return;
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      if (requestId !== historyRequest.current) return;
      console.error("Recommendation history error:", err);
      setHistory([]);
    } finally {
      if (requestId === historyRequest.current) setHistoryLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    let cancelled = false;

    setSelectedType("ALL");
    setGenerationInfo(null);
    setError("");
    setSuccess("");
    setActiveRecommendation(null);

    if (!tripId) {
      setTrip(null);
      setRecommendations([]);
      setHistory([]);
      setPlannedDate("");
      return undefined;
    }

    (async () => {
      try {
        setTripLoading(true);
        const data = await getTrip(tripId);
        if (cancelled) return;
        setTrip(data || null);
        /* default to the trip start date so the date is always inside the trip */
        setPlannedDate(normalizeDate(data?.startDate));
      } catch (err) {
        if (cancelled) return;
        console.error("Trip loading error:", err);
        setTrip(null);
        setPlannedDate("");
        setError(err?.message || "Unable to load the selected trip.");
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    })();

    loadRecommendations();
    loadHistory();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  /* close the details dialog with Escape */
  useEffect(() => {
    if (!activeRecommendation) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setActiveRecommendation(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeRecommendation]);

  /* ---------------- derived data ---------------- */

  /* latest decision per recommendation, from history (newest first) */
  const statusById = useMemo(() => {
    const map = {};
    const ordered = [...history].sort(
      (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
    );
    ordered.forEach((row) => {
      const id = row?.recommendationId;
      const key = statusKey(row?.action);
      if (id == null || !key) return;
      /* a real decision (accept/reject/itinerary) outranks "viewed" */
      const existing = map[id];
      if (!existing || (existing === "viewed" && key !== "viewed")) {
        map[id] = key;
      }
    });
    return map;
  }, [history]);

  const counts = useMemo(() => {
    const result = { ALL: recommendations.length };
    RECOMMENDATION_TYPES.forEach((type) => {
      if (type.value !== "ALL") result[type.value] = 0;
    });
    recommendations.forEach((item) => {
      const key = String(item?.recommendationType || "").toUpperCase();
      if (key in result) result[key] += 1;
    });
    return result;
  }, [recommendations]);

  const visible = useMemo(() => {
    const filtered =
      selectedType === "ALL"
        ? recommendations
        : recommendations.filter(
            (item) => String(item?.recommendationType || "").toUpperCase() === selectedType
          );
    const list = [...filtered];
    const num = (value, fallback) => {
      const n = Number(value);
      return value === null || value === undefined || value === "" || !Number.isFinite(n) ? fallback : n;
    };
    if (sortMode === "distance") {
      list.sort(
        (a, b) => num(a?.distanceKm ?? a?.distance, Infinity) - num(b?.distanceKm ?? b?.distance, Infinity)
      );
    } else if (sortMode === "name") {
      list.sort((a, b) => destinationName(a).localeCompare(destinationName(b)));
    } else {
      list.sort((a, b) => num(b?.score, -1) - num(a?.score, -1));
    }
    return list;
  }, [recommendations, selectedType, sortMode]);

  const decisionCounts = useMemo(() => {
    const result = { accepted: 0, rejected: 0, "used in itinerary": 0 };
    recommendations.forEach((item) => {
      const key = statusById[item?.recommendationId];
      if (key && key in result) result[key] += 1;
    });
    return result;
  }, [recommendations, statusById]);

  const nameById = useMemo(() => {
    const map = {};
    recommendations.forEach((item) => {
      map[item?.recommendationId] = destinationName(item);
    });
    return map;
  }, [recommendations]);

  const historyRows = useMemo(
    () => (hideGenerated ? history.filter((row) => !isGeneratedAction(row?.action)) : history),
    [history, hideGenerated]
  );

  /* ---------------- actions ---------------- */

  const dateProblem = useMemo(() => {
    if (!plannedDate || !tripStartDate || !tripEndDate) return "";
    if (plannedDate < tripStartDate || plannedDate > tripEndDate) {
      return `Choose a date between ${formatDay(tripStartDate)} and ${formatDay(tripEndDate)}.`;
    }
    return "";
  }, [plannedDate, tripStartDate, tripEndDate]);

  const handleGenerate = async () => {
    if (!tripId) {
      setError("Please select a trip before generating recommendations.");
      return;
    }
    if (generatingRef.current) return;
    if (dateProblem) {
      setError(dateProblem);
      setSuccess("");
      return;
    }

    generatingRef.current = true;
    try {
      setGenerating(true);
      setError("");
      setSuccess("");

      const result = await generateRecommendations(tripId, plannedDate, plannedTime);

      setGenerationInfo(result && typeof result === "object" && !Array.isArray(result) ? result : null);
      setSelectedType("ALL");
      setIncludePrevious(false);

      await Promise.all([loadRecommendations(false), loadHistory()]);

      const count = Number(result?.recommendationCount ?? toList(result).length);
      setSuccess(
        count > 0
          ? `${count} fresh recommendation${count === 1 ? "" : "s"} generated${
              plannedDate ? ` for ${formatDay(plannedDate)}` : ""
            }.`
          : "Generation finished, but nothing suitable was found for those conditions."
      );
    } catch (err) {
      console.error("Recommendation generation error:", err);
      setError(err?.message || "Unable to generate recommendations.");
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  };

  const handleAction = async (recommendation, action) => {
    const recommendationId = recommendation?.recommendationId;
    if (!recommendationId) {
      setError("Recommendation ID is missing.");
      return;
    }
    try {
      setActionLoading(`${recommendationId}-${action}`);
      setError("");
      setSuccess("");
      await recordRecommendationAction(recommendationId, tripId, action);
      await loadHistory();
      const done = { Accepted: "accepted", Rejected: "rejected", "Used in Itinerary": "added to your itinerary" }[action];
      setSuccess(`${destinationName(recommendation)} ${done || action.toLowerCase()}.`);
    } catch (err) {
      console.error("Recommendation action error:", err);
      setError(err?.message || "Unable to record recommendation action.");
    } finally {
      setActionLoading(null);
    }
  };

  /* Opening details counts as "viewed", unless a decision was already made. */
  const openDetails = (recommendation) => {
    setActiveRecommendation(recommendation);
    const id = recommendation?.recommendationId;
    if (id && !statusById[id]) {
      recordRecommendationAction(id, tripId, "Viewed")
        .then(loadHistory)
        .catch(() => {});
    }
  };

  const toggleIncludePrevious = () => {
    const next = !includePrevious;
    setIncludePrevious(next);
    loadRecommendations(next);
  };

  /* ---------------- no trip ---------------- */

  if (!tripId) {
    return (
      <section className="rx-page">
        <div className="rx-shell">
          {onBack && (
            <button type="button" className="rx-back" onClick={onBack}>
              ← Back
            </button>
          )}
          <div className="rx-empty">
            <div className="rx-empty-icon" aria-hidden="true">✨</div>
            <h2>Select a trip first</h2>
            <p>
              Pick a trip to get ideas based on weather, nearby places, crowd levels, season and time of day.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const busy = loading || generating || tripLoading;
  const basis = generationInfo?.weatherBasis;
  const noteTone =
    basis === "UNAVAILABLE" || (generationInfo?.weatherUnavailableFor || []).length > 0
      ? "warn"
      : basis === "CURRENT_FALLBACK"
      ? "warn"
      : "info";

  return (
    <section className="rx-page">
      <div className="rx-shell">
        {onBack && (
          <button type="button" className="rx-back" onClick={onBack}>
            ← Go back
          </button>
        )}

        {/* ---------- HERO ---------- */}
        <header className="rx-hero">
          <div className="rx-hero-text">
            <span className="rx-eyebrow">Dynamic Recommendations</span>
            <h1>{trip?.tripName ? `Ideas for ${trip.tripName}` : "Ideas for your trip"}</h1>
            <p>
              Suggestions that react to the weather on your travel day, how far each place is, how busy it is
              likely to be, the season and the time you plan to go.
            </p>
          </div>
          <dl className="rx-hero-facts">
            <div>
              <dt>Trip dates</dt>
              <dd>
                {tripStartDate && tripEndDate
                  ? `${formatDay(tripStartDate)} – ${formatDay(tripEndDate)}`
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt>Travelers</dt>
              <dd>{trip?.noOfTravelers ?? "—"}</dd>
            </div>
            <div>
              <dt>Showing</dt>
              <dd>{includePrevious ? "All generations" : "Latest generation"}</dd>
            </div>
          </dl>
        </header>

        {/* ---------- GENERATE ---------- */}
        <section className="rx-card rx-controls" aria-labelledby="rx-gen-title">
          <div className="rx-card-head">
            <div>
              <span className="rx-label">Step 1</span>
              <h2 id="rx-gen-title">Choose when you will go</h2>
            </div>
          </div>

          <div className="rx-control-grid">
            <label className="rx-field">
              <span>Planned date</span>
              <input
                type="date"
                value={plannedDate}
                min={tripStartDate || undefined}
                max={tripEndDate || undefined}
                disabled={tripLoading}
                onChange={(event) => {
                  setPlannedDate(event.target.value);
                  setError("");
                }}
                aria-invalid={dateProblem ? "true" : "false"}
              />
            </label>

            <label className="rx-field">
              <span>Planned time</span>
              <input
                type="time"
                value={plannedTime}
                disabled={tripLoading}
                onChange={(event) => setPlannedTime(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="rx-primary"
              onClick={handleGenerate}
              disabled={busy || Boolean(dateProblem)}
            >
              {generating ? "Generating…" : "✨ Generate recommendations"}
            </button>
          </div>

          <p className={`rx-hint ${dateProblem ? "rx-hint-bad" : ""}`}>
            {dateProblem ||
              "Leave the time empty to let the engine pick the best time of day. Generating again replaces the previous suggestions you have not acted on."}
          </p>
        </section>

        {/* ---------- MESSAGES ---------- */}
        {error && (
          <div className="rx-banner rx-banner-bad" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="rx-banner rx-banner-good" role="status">
            <span aria-hidden="true">✓</span>
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}

        {generationInfo?.weatherNote && (
          <div className={`rx-banner rx-banner-${noteTone}`} role="note" data-testid="rx-weather-note">
            <span aria-hidden="true">{noteTone === "warn" ? "🌦️" : "☀️"}</span>
            <span>{generationInfo.weatherNote}</span>
          </div>
        )}

        {/* ---------- SUMMARY ---------- */}
        <div className="rx-stats" aria-label="Summary">
          <div className="rx-stat">
            <strong>{counts.ALL}</strong>
            <span>Suggestions</span>
          </div>
          <div className="rx-stat">
            <strong>{decisionCounts.accepted}</strong>
            <span>Accepted</span>
          </div>
          <div className="rx-stat">
            <strong>{decisionCounts["used in itinerary"]}</strong>
            <span>In itinerary</span>
          </div>
          <div className="rx-stat">
            <strong>{decisionCounts.rejected}</strong>
            <span>Rejected</span>
          </div>
        </div>

        {/* ---------- RESULTS ---------- */}
        <section className="rx-card" aria-labelledby="rx-results-title">
          <div className="rx-card-head">
            <div>
              <span className="rx-label">Step 2</span>
              <h2 id="rx-results-title">Recommended for your trip</h2>
            </div>
            <button
              type="button"
              className="rx-ghost"
              onClick={() => {
                loadRecommendations();
                loadHistory();
              }}
              disabled={busy}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="rx-tabs" role="tablist" aria-label="Recommendation type">
            {RECOMMENDATION_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                role="tab"
                aria-selected={selectedType === type.value}
                className={`rx-tab ${selectedType === type.value ? "is-active" : ""}`}
                onClick={() => setSelectedType(type.value)}
              >
                <span aria-hidden="true">{type.icon}</span>
                {type.value === "ALL" ? "All" : type.label}
                <em>{counts[type.value] ?? 0}</em>
              </button>
            ))}
          </div>

          <div className="rx-toolbar">
            <label className="rx-sort">
              <span>Sort by</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="rx-check">
              <input type="checkbox" checked={includePrevious} onChange={toggleIncludePrevious} />
              <span>Include older suggestions I acted on</span>
            </label>

            <span className="rx-count" aria-live="polite">
              {visible.length} result{visible.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading && recommendations.length === 0 ? (
            <div className="rx-state" role="status">
              <div className="rx-spinner" aria-hidden="true" />
              <h3>Analysing trip conditions…</h3>
              <p>Checking weather, distance, crowds, season and time.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rx-state">
              <div className="rx-empty-icon" aria-hidden="true">🔎</div>
              <h3>
                {recommendations.length === 0
                  ? "No recommendations yet"
                  : `No ${typeInfo(selectedType).label.toLowerCase()} suggestions`}
              </h3>
              <p>
                {recommendations.length === 0
                  ? "Pick a date above and generate suggestions for this trip."
                  : "Try another type, or generate again."}
              </p>
              {recommendations.length === 0 ? (
                <button type="button" className="rx-primary" onClick={handleGenerate} disabled={busy || Boolean(dateProblem)}>
                  ✨ Generate recommendations
                </button>
              ) : (
                <button type="button" className="rx-ghost" onClick={() => setSelectedType("ALL")}>
                  Show all types
                </button>
              )}
            </div>
          ) : (
            <ul className="rx-list">
              {visible.map((item, index) => {
                const info = typeInfo(item?.recommendationType);
                const id = item?.recommendationId;
                const status = statusById[id];
                const badge = status ? ACTION_BADGES[status] : null;
                const tone = scoreTone(item?.score);
                const score = scoreNumber(item?.score);
                const busyKey = (action) => actionLoading === `${id}-${action}`;

                return (
                  <li key={id ?? `${info.value}-${index}`} className={`rx-item ${status ? `is-${status.replace(/ /g, "-")}` : ""}`}>
                    <div className="rx-item-top">
                      <span className="rx-type-icon" aria-hidden="true">{info.icon}</span>
                      <div className="rx-item-title">
                        <span className="rx-type-label">{info.label}</span>
                        <h3>{destinationName(item)}</h3>
                      </div>
                      {badge && <span className={`rx-badge rx-badge-${badge.tone}`}>{badge.label}</span>}
                      <div className={`rx-score rx-score-${tone}`} aria-label={`Relevance ${score === null ? "unknown" : Math.round(score) + " percent"}`}>
                        <strong>{score === null ? "—" : `${Math.round(score)}%`}</strong>
                        <span>match</span>
                      </div>
                    </div>

                    <p className="rx-reason">{item?.reason || "This suggestion matches your trip conditions."}</p>

                    <dl className="rx-facts">
                      <div>
                        <dt>Distance</dt>
                        <dd>{distanceText(item)}</dd>
                      </div>
                      <div>
                        <dt>Weather</dt>
                        <dd>{item?.weatherCondition || "—"}</dd>
                      </div>
                      <div>
                        <dt>Crowd</dt>
                        <dd className={`rx-crowd rx-crowd-${crowdTone(item?.crowdLevel)}`}>{prettyLevel(item?.crowdLevel)}</dd>
                      </div>
                      <div>
                        <dt>Best time</dt>
                        <dd>{formatTime(item?.recommendedTime)}</dd>
                      </div>
                      <div>
                        <dt>Season</dt>
                        <dd>{item?.season || "—"}</dd>
                      </div>
                    </dl>

                    <div className="rx-item-actions">
                      <button type="button" className="rx-ghost" onClick={() => openDetails(item)}>
                        View details
                      </button>
                      <div className="rx-decisions">
                        <button
                          type="button"
                          className="rx-act rx-act-good"
                          disabled={busyKey("Accepted") || status === "accepted"}
                          onClick={() => handleAction(item, "Accepted")}
                        >
                          ✓ Accept
                        </button>
                        <button
                          type="button"
                          className="rx-act rx-act-bad"
                          disabled={busyKey("Rejected") || status === "rejected"}
                          onClick={() => handleAction(item, "Rejected")}
                        >
                          × Reject
                        </button>
                        <button
                          type="button"
                          className="rx-act rx-act-info"
                          disabled={busyKey("Used in Itinerary") || status === "used in itinerary"}
                          onClick={() => handleAction(item, "Used in Itinerary")}
                        >
                          + Itinerary
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------- HISTORY ---------- */}
        <section className="rx-card" aria-labelledby="rx-history-title">
          <div className="rx-card-head">
            <div>
              <span className="rx-label">Activity</span>
              <h2 id="rx-history-title">Your decisions</h2>
            </div>
            <button
              type="button"
              className="rx-ghost"
              aria-expanded={showHistory}
              onClick={() => {
                if (!showHistory) loadHistory();
                setShowHistory((previous) => !previous);
              }}
            >
              {showHistory ? "Hide history" : "View history"}
            </button>
          </div>

          {showHistory && (
            <div className="rx-history">
              <label className="rx-check">
                <input type="checkbox" checked={hideGenerated} onChange={() => setHideGenerated((v) => !v)} />
                <span>Hide automatic “generated” entries</span>
              </label>

              {historyLoading && history.length === 0 ? (
                <p className="rx-hint">Loading history…</p>
              ) : historyRows.length === 0 ? (
                <p className="rx-hint">
                  {history.length === 0
                    ? "No activity for this trip yet."
                    : "No decisions yet. Accept, reject or add a suggestion to see it here."}
                </p>
              ) : (
                <ol className="rx-timeline">
                  {historyRows.map((row, index) => {
                    const key = statusKey(row?.action);
                    const badge = key ? ACTION_BADGES[key] : null;
                    return (
                      <li key={row?.historyId ?? index}>
                        <span className="rx-type-icon" aria-hidden="true">{typeInfo(row?.recommendationType).icon}</span>
                        <div className="rx-tl-main">
                          <strong>
                            {nameById[row?.recommendationId] || typeInfo(row?.recommendationType).label}
                          </strong>
                          <span className="rx-tl-action">
                            {badge ? <span className={`rx-badge rx-badge-${badge.tone}`}>{badge.label}</span> : row?.action || "Activity"}
                          </span>
                          {row?.reason && <p>{row.reason}</p>}
                        </div>
                        <time>{formatDateTime(row?.createdAt)}</time>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ---------- DETAILS DIALOG ---------- */}
      {activeRecommendation && (
        <div
          className="rx-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveRecommendation(null);
          }}
        >
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="rx-dialog-title">
            <div className="rx-dialog-head">
              <div>
                <span className="rx-label">
                  {typeInfo(activeRecommendation?.recommendationType).icon}{" "}
                  {typeInfo(activeRecommendation?.recommendationType).label}
                </span>
                <h2 id="rx-dialog-title">{destinationName(activeRecommendation)}</h2>
              </div>
              <button
                type="button"
                className="rx-close"
                onClick={() => setActiveRecommendation(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="rx-why">
              <span>Why this was recommended</span>
              <p>{activeRecommendation?.reason || "No reason was provided."}</p>
            </div>

            <dl className="rx-dialog-grid">
              <div>
                <dt>Match</dt>
                <dd>
                  {scoreNumber(activeRecommendation?.score) === null
                    ? "—"
                    : `${Math.round(scoreNumber(activeRecommendation.score))}%`}
                </dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd>{distanceText(activeRecommendation)}</dd>
              </div>
              <div>
                <dt>Weather</dt>
                <dd>{activeRecommendation?.weatherCondition || "—"}</dd>
              </div>
              <div>
                <dt>Crowd</dt>
                <dd>{prettyLevel(activeRecommendation?.crowdLevel)}</dd>
              </div>
              <div>
                <dt>Best time</dt>
                <dd>{formatTime(activeRecommendation?.recommendedTime)}</dd>
              </div>
              <div>
                <dt>Season</dt>
                <dd>{activeRecommendation?.season || "—"}</dd>
              </div>
              <div className="rx-dialog-wide">
                <dt>Generated</dt>
                <dd>{formatDateTime(activeRecommendation?.createdAt)}</dd>
              </div>
            </dl>

            <div className="rx-dialog-actions">
              <button
                type="button"
                className="rx-act rx-act-good"
                onClick={() => {
                  handleAction(activeRecommendation, "Accepted");
                  setActiveRecommendation(null);
                }}
              >
                ✓ Accept
              </button>
              <button
                type="button"
                className="rx-act rx-act-bad"
                onClick={() => {
                  handleAction(activeRecommendation, "Rejected");
                  setActiveRecommendation(null);
                }}
              >
                × Reject
              </button>
              <button
                type="button"
                className="rx-act rx-act-info"
                onClick={() => {
                  handleAction(activeRecommendation, "Used in Itinerary");
                  setActiveRecommendation(null);
                }}
              >
                + Add to itinerary
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default RecommendationEngine;
