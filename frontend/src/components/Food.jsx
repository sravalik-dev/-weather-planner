import { useEffect, useMemo, useState } from "react";
import {
  getTripsForFood,
  getTripDestinationsForFood,
  getFoodsByDestination,
  getFoodPlacesByDestination,
  generateFoodRecommendations,
  getFoodRecommendations,
  getFoodRecommendationsByType,
  getFoodRecommendationHistory,
  recordFoodRecommendationAction,
} from "../services/foodService";
import {
  BUDGET_OPTIONS,
  CATEGORY_OPTIONS,
  DEFAULT_FILTERS,
  DIETARY_OPTIONS,
  FOOD_TYPE_OPTIONS,
  MEAL_PERIOD_OPTIONS,
  RECOMMENDATION_TYPES,
  SPICE_LEVEL_OPTIONS,
  applyExternalFilters,
  buildFoodRequest,
  getActiveFilters,
  getApplicability,
  getPlaceTypeOptions,
  getTypeKind,
  getTypeLabel,
  isExternalResult,
  reconcile,
  validateFilters,
} from "../utils/foodFilters";
import Toast from "./Toast";
import "../styles/Food.css";
import "../styles/FoodFilters.css";
import NearbyPlacesPanel from "./NearbyPlacesPanel";

/* Filters are kept in sessionStorage so they survive leaving and returning
   to this page, until the user changes or clears them. */
const FILTER_STORAGE_KEY = "weatherPlanner.foodFilters.v1";

const loadSavedFilters = () => {
  try {
    const raw = window.sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      filters: { ...DEFAULT_FILTERS, ...(parsed.filters || {}) },
      type: RECOMMENDATION_TYPES.some((t) => t.value === parsed.type)
        ? parsed.type
        : "LOCAL_FOOD",
    };
  } catch {
    return null;
  }
};

const ACTIONS = [
  "Food Recommendation Viewed",
  "Food Recommendation Selected",
  "Food Recommendation Rejected",
  "Food Added to Itinerary",
];

const safeText = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return "";
  }

  return String(value);
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return safeText(value);
  }

  return `₹${number.toLocaleString("en-IN")}`;
};

const normalizeArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
};

const getTripId = (trip) => trip?.tripId ?? trip?.id ?? "";
const getTripName = (trip) =>
  safeText(
    trip?.tripName ?? trip?.name ?? trip?.title,
    `Trip ${getTripId(trip)}`
  );

const getDestinationId = (destination) =>
  destination?.destinationId ?? destination?.id ?? "";

const getDestinationName = (destination) =>
  safeText(
    destination?.destinationName ??
      destination?.name ??
      destination?.title,
    "Destination"
  );

const getTripDateRange = (trip) => {
  const start = safeText(trip?.startDate);
  const end = safeText(trip?.endDate);

  return {
    start,
    end,
  };
};

const isDateInsideTrip = (dateValue, trip) => {
  if (!dateValue || !trip) return false;

  const { start, end } = getTripDateRange(trip);

  if (!start || !end) return true;

  return dateValue >= start.slice(0, 10) && dateValue <= end.slice(0, 10);
};

const getDefaultPlannedDate = (trip) => {
  const start = safeText(trip?.startDate);

  if (start) {
    return start.slice(0, 10);
  }

  const today = new Date();
  return today.toISOString().slice(0, 10);
};

const getDefaultPlannedTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const getRecommendationTitle = (item) =>
  safeText(
    item?.dishName ??
      item?.foodPlaceName ??
      item?.name ??
      item?.foodName,
    "Food recommendation"
  );

const getRecommendationSubtitle = (item) =>
  safeText(
    item?.foodPlaceName ??
      item?.dishName ??
      item?.destinationName,
    ""
  );


function Food({ onBack }) {
  const savedFilters = useMemo(() => loadSavedFilters(), []);

  const [trips, setTrips] = useState([]);
  const [destinations, setDestinations] = useState([]);

  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedDestinationId, setSelectedDestinationId] = useState("");

  const [foods, setFoods] = useState([]);
  const [foodPlaces, setFoodPlaces] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);

  const [activeSection, setActiveSection] = useState("recommendations");
  const [selectedType, setSelectedType] = useState(
    savedFilters?.type || "LOCAL_FOOD"
  );

  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("");

  const [filters, setFilters] = useState(
    savedFilters?.filters || { ...DEFAULT_FILTERS }
  );

  /* What was actually sent with the last successful "Generate". */
  const [applied, setApplied] = useState(null);
  /* "generated" = response of the last Generate; "saved" = stored results. */
  const [resultsSource, setResultsSource] = useState("generated");
  const [viewingSaved, setViewingSaved] = useState("");
  const [noMatch, setNoMatch] = useState(false);
  const [filterNotices, setFilterNotices] = useState([]);

  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* Persist the filter choices (not the results). */
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({ filters, type: selectedType })
      );
    } catch {
      /* storage may be unavailable (private mode); the page still works */
    }
  }, [filters, selectedType]);

  const selectedTrip = useMemo(
    () =>
      trips.find(
        (trip) => String(getTripId(trip)) === String(selectedTripId)
      ) || null,
    [trips, selectedTripId]
  );

  const selectedDestination = useMemo(
    () =>
      destinations.find(
        (destination) =>
          String(getDestinationId(destination)) ===
          String(selectedDestinationId)
      ) || null,
    [destinations, selectedDestinationId]
  );

  const loadTrips = async () => {
    setLoadingTrips(true);
    setError("");

    try {
      const data = await getTripsForFood();
      const items = normalizeArray(data);

      setTrips(items);

      if (items.length > 0) {
        const firstTripId = getTripId(items[0]);
        setSelectedTripId(String(firstTripId));
      } else {
        setSelectedTripId("");
        setError("No trips found. Create a trip before using Food & Dining.");
      }
    } catch (requestError) {
      console.error("Food trip loading error:", requestError);
      setError(
        requestError?.message ||
          "Unable to load your trips. Please try again."
      );
    } finally {
      setLoadingTrips(false);
    }
  };

  const loadDestinations = async (tripId) => {
    if (!tripId) {
      setDestinations([]);
      setSelectedDestinationId("");
      return;
    }

    setLoadingDestinations(true);
    setError("");
    setMessage("");
    setSelectedDestinationId("");
    setFoods([]);
    setFoodPlaces([]);
    setRecommendations([]);

    try {
      const data = await getTripDestinationsForFood(tripId);
      const items = normalizeArray(data);

      setDestinations(items);

      // Do not silently choose the first destination. Food availability is
      // destination-specific, so the user must explicitly choose one.
      setSelectedDestinationId("");
      setFoods([]);
      setFoodPlaces([]);
      setRecommendations([]);

      if (items.length === 0) {
        setError(
          "The selected trip has no destinations. Add a destination before requesting food recommendations."
        );
      }
    } catch (requestError) {
      console.error("Food destination loading error:", requestError);
      setDestinations([]);
      setSelectedDestinationId("");
      setError(
        requestError?.message ||
          "Unable to load destinations for this trip."
      );
    } finally {
      setLoadingDestinations(false);
    }
  };

  const loadFoodData = async (destinationId) => {
    if (!destinationId) {
      setFoods([]);
      setFoodPlaces([]);
      return;
    }

    setLoadingData(true);

    try {
      const [foodData, placeData] = await Promise.all([
        getFoodsByDestination(destinationId),
        getFoodPlacesByDestination(destinationId),
      ]);

      setFoods(normalizeArray(foodData, ["foods", "content"]));
      setFoodPlaces(
        normalizeArray(placeData, ["places", "foodPlaces", "content"])
      );
    } catch (requestError) {
      console.error("Food data loading error:", requestError);
      setError(
        requestError?.message ||
          "Unable to load local food information."
      );
    } finally {
      setLoadingData(false);
    }
  };

  const loadRecommendations = async (tripId) => {
    if (!tripId) {
      setRecommendations([]);
      return;
    }

    setLoadingRecommendations(true);

    try {
      const data = await getFoodRecommendations(tripId);
      setRecommendations(
        normalizeArray(data, ["recommendations", "foodRecommendations", "content"])
      );
    } catch (requestError) {
      console.error("Food recommendation loading error:", requestError);

      if (!String(requestError?.message || "").includes("404")) {
        setError(
          requestError?.message ||
            "Unable to load food recommendations."
        );
      }

      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadHistory = async (tripId) => {
    if (!tripId) {
      setHistory([]);
      return;
    }

    setLoadingHistory(true);

    try {
      const data = await getFoodRecommendationHistory(tripId);
      setHistory(normalizeArray(data, ["history", "content"]));
    } catch (requestError) {
      console.error("Food history loading error:", requestError);
      setError(
        requestError?.message ||
          "Unable to load food recommendation history."
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (!selectedTripId) return;

    const trip = trips.find(
      (item) => String(getTripId(item)) === String(selectedTripId)
    );

    if (!trip) return;

    setPlannedDate(getDefaultPlannedDate(trip));
    setPlannedTime(getDefaultPlannedTime());
    loadDestinations(selectedTripId);
    loadRecommendations(selectedTripId);
    loadHistory(selectedTripId);
  }, [selectedTripId]);

  useEffect(() => {
    if (!selectedDestinationId) {
      setFoods([]);
      setFoodPlaces([]);
      return;
    }

    loadFoodData(selectedDestinationId);
  }, [selectedDestinationId]);


  const handleDestinationChange = (event) => {
    const destinationId = event.target.value;

    setSelectedDestinationId(destinationId);
    setFoods([]);
    setFoodPlaces([]);
    setRecommendations([]);
    setError("");
    setMessage("");
  };


  /* ---------------- Filter handling ---------------- */

  const applicability = useMemo(
    () => getApplicability(selectedType),
    [selectedType]
  );

  const activeFilters = useMemo(
    () => getActiveFilters(filters, selectedType),
    [filters, selectedType]
  );

  const issues = useMemo(
    () => validateFilters(filters, selectedType),
    [filters, selectedType]
  );
  const blockingIssues = issues.filter((issue) => issue.level === "error");

  const placeTypeOptions = useMemo(
    () => getPlaceTypeOptions(selectedType),
    [selectedType]
  );

  /* Every control goes through here so related controls stay consistent. */
  const updateFilter = (name, value) => {
    const result = reconcile({ ...filters, [name]: value }, selectedType, name);
    setFilters(result.filters);
    setSelectedType(result.type);
    setFilterNotices(result.notices);
  };

  const chooseType = (type) => {
    const result = reconcile(filters, type, "type");
    setFilters(result.filters);
    setSelectedType(result.type);
    setFilterNotices(result.notices);
  };

  const clearFilter = (key) => {
    const empty =
      typeof DEFAULT_FILTERS[key] === "boolean" ? false : DEFAULT_FILTERS[key];
    updateFilter(key, empty);
  };

  const clearAllFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setFilterNotices([]);
    setError("");
    setMessage("Filters cleared. Choose a result type and generate again.");
  };

  /* Has the user changed anything since the results on screen were made? */
  const filtersChanged = useMemo(() => {
    if (!applied || resultsSource !== "generated") return false;
    return (
      JSON.stringify([selectedType, activeFilters]) !==
      JSON.stringify([applied.type, applied.active])
    );
  }, [applied, resultsSource, selectedType, activeFilters]);

  const hasFoodCatalogData = foods.length > 0;
  const hasFoodPlaceData = foodPlaces.length > 0;

  /* ---------------- Generate (Apply filters) ---------------- */

  const handleGenerate = async (typeOverride) => {
    setError("");
    setMessage("");
    setNoMatch(false);

    if (!selectedTrip) {
      setError("Select a trip before generating food recommendations.");
      return;
    }

    if (!selectedDestinationId) {
      setError("Select a destination before generating food recommendations.");
      return;
    }

    if (!plannedDate) {
      setError("Select a planned date.");
      return;
    }

    if (!isDateInsideTrip(plannedDate, selectedTrip)) {
      const { start, end } = getTripDateRange(selectedTrip);

      setError(
        `Planned date must be within the trip dates (${start || "start date"} to ${
          end || "end date"
        }).`
      );
      return;
    }

    if (!plannedTime) {
      setError("Select a planned time.");
      return;
    }

    /* A type chosen from outside the filter panel (e.g. the Food Places
       tab) still goes through the same consistency rules. */
    let useFilters = filters;
    let useType = selectedType;
    if (typeof typeOverride === "string" && typeOverride !== selectedType) {
      const result = reconcile(filters, typeOverride, "type");
      useFilters = result.filters;
      useType = result.type;
      setFilters(result.filters);
      setSelectedType(result.type);
      setFilterNotices(result.notices);
    }

    const problems = validateFilters(useFilters, useType).filter(
      (issue) => issue.level === "error"
    );
    if (problems.length > 0) {
      setError(problems[0].message);
      return;
    }

    const request = buildFoodRequest({
      filters: useFilters,
      type: useType,
      destinationId: selectedDestinationId,
      plannedDate,
      plannedTime,
    });

    const snapshot = {
      type: useType,
      filters: { ...useFilters },
      active: getActiveFilters(useFilters, useType),
    };

    setLoadingRecommendations(true);

    try {
      const generatedData = await generateFoodRecommendations(
        selectedTripId,
        request
      );

      const generatedRecommendations = normalizeArray(generatedData, [
        "recommendations",
        "foodRecommendations",
        "content",
      ]);

      const historyData = await getFoodRecommendationHistory(selectedTripId);

      // The live OpenStreetMap fallback is returned directly and is not stored
      // as a fake Food/FoodPlace database row. Keep the returned results visible.
      if (generatedRecommendations.length > 0) {
        setRecommendations(generatedRecommendations);
      } else {
        const recommendationData = await getFoodRecommendations(selectedTripId);
        setRecommendations(normalizeArray(recommendationData, [
          "recommendations", "foodRecommendations", "content",
        ]));
      }

      setApplied(snapshot);
      setResultsSource("generated");
      setViewingSaved("");
      setHistory(normalizeArray(historyData, ["history", "content"]));
      setMessage(`${getTypeLabel(useType)} recommendations updated.`);
      setActiveSection("recommendations");
    } catch (requestError) {
      const text = String(requestError?.message || "");

      if (
        text.includes("No local food recommendations") ||
        text.includes("No food options match") ||
        text.includes("No food recommendations")
      ) {
        /* A valid search with zero matches is not an application error. */
        setRecommendations([]);
        setApplied(snapshot);
        setResultsSource("generated");
        setViewingSaved("");
        setNoMatch(true);
        setActiveSection("recommendations");
      } else {
        console.error("Food recommendation generation error:", requestError);
        setError(
          text || "Unable to generate food recommendations. Please try again."
        );
      }
    } finally {
      setLoadingRecommendations(false);
    }
  };

  /* Results shown on screen. For live OpenStreetMap results the server only
     applies the distance limit, so we apply what the data supports and say
     plainly what could not be checked. */
  const external = useMemo(() => {
    if (resultsSource !== "generated" || !applied) return null;
    if (!isExternalResult(recommendations)) return null;
    return applyExternalFilters(recommendations, applied.filters, applied.type);
  }, [recommendations, applied, resultsSource]);

  const displayedRecommendations = external
    ? external.items
    : recommendations;

  const handleTypeFilter = async (type) => {
    setResultsSource("saved");
    setViewingSaved(type === "ALL" ? "" : type);
    setNoMatch(false);
    setError("");
    setMessage("");

    if (!selectedTripId) {
      setRecommendations([]);
      return;
    }

    if (type === "ALL") {
      await loadRecommendations(selectedTripId);
      return;
    }

    setLoadingRecommendations(true);

    try {
      const data = await getFoodRecommendationsByType(
        selectedTripId,
        type
      );

      setRecommendations(
        normalizeArray(data, [
          "recommendations",
          "foodRecommendations",
          "content",
        ])
      );
    } catch (requestError) {
      console.error("Food recommendation filter error:", requestError);
      setError(
        requestError?.message ||
          "Unable to filter food recommendations."
      );
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAction = async (recommendation, action) => {
    const recommendationId =
      recommendation?.foodRecommendationId ??
      recommendation?.recommendationId ??
      recommendation?.id;

    if (!recommendationId || !selectedTripId) {
      setError("This recommendation cannot record an action yet.");
      return;
    }

    const key = `${recommendationId}-${action}`;
    setActionLoading(key);
    setError("");
    setMessage("");

    try {
      await recordFoodRecommendationAction(
        recommendationId,
        selectedTripId,
        action
      );

      const historyData = await getFoodRecommendationHistory(
        selectedTripId
      );

      setHistory(normalizeArray(historyData, ["history", "content"]));
      setMessage(`${action} recorded successfully.`);
    } catch (requestError) {
      console.error("Food recommendation action error:", requestError);
      setError(
        requestError?.message ||
          "Unable to record the recommendation action."
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <section className="food-module">
      <div className="food-shell">
        <div className="food-topbar">
          <button
            type="button"
            className="food-back-button"
            onClick={onBack}
          >
            ← Back
          </button>

          <div>
            <div className="food-eyebrow">MODULE 9 • LOCAL AUTHENTIC FOOD</div>
            <h1>Food & Dining</h1>
            <p>
              Discover local dishes, food places and recommendations that match
              your trip.
            </p>
          </div>
        </div>

        {error && (
          <div className="food-alert food-alert-error" role="alert">
            <span>⚠️</span>
            <div>
              <strong>Something needs attention</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={loadTrips}>
              Retry
            </button>
          </div>
        )}

        <Toast message={message} onClose={() => setMessage("")} />

        {loadingTrips ? (
          <div className="food-state-card">
            <div className="food-spinner" />
            <h2>Loading your food planner...</h2>
            <p>Finding your saved trips.</p>
          </div>
        ) : (
          <>
            <div className="food-trip-panel">
              <div className="food-trip-panel-main">
                <div className="food-panel-icon">🧳</div>
                <div>
                  <span className="food-field-label">CURRENT TRIP</span>
                  <select
                    value={selectedTripId}
                    onChange={(event) => {
                      setSelectedTripId(event.target.value);
                      setSelectedDestinationId("");
                      setDestinations([]);
                      setFoods([]);
                      setFoodPlaces([]);
                      setRecommendations([]);
                      setMessage("");
                      setError("");
                    }}
                  >
                    <option value="">Select a trip</option>
                    {trips.map((trip) => {
                      const tripId = getTripId(trip);
                      return (
                        <option key={tripId} value={tripId}>
                          {getTripName(trip)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="food-trip-summary">
                <div>
                  <span>Destination</span>
                  <strong>
                    {selectedDestination
                      ? getDestinationName(selectedDestination)
                      : selectedTrip?.destination || "Select a destination"}
                  </strong>
                </div>

                <div>
                  <span>Trip dates</span>
                  <strong>
                    {selectedTrip?.startDate
                      ? `${formatDate(selectedTrip.startDate)} → ${formatDate(
                          selectedTrip.endDate
                        )}`
                      : "Not available"}
                  </strong>
                </div>
              </div>
            </div>

            {selectedTrip && (
              <div className="food-planning-bar">
                <div className="food-date-fields">
                  <label>
                    Planned date
                    <input
                      type="date"
                      value={plannedDate}
                      min={selectedTrip.startDate?.slice?.(0, 10)}
                      max={selectedTrip.endDate?.slice?.(0, 10)}
                      onChange={(event) =>
                        setPlannedDate(event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Planned time
                    <input
                      type="time"
                      value={plannedTime}
                      onChange={(event) =>
                        setPlannedTime(event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Destination
                    <select
                      value={selectedDestinationId}
                      onChange={handleDestinationChange}
                      disabled={loadingDestinations}
                    >
                      <option value="">
                        {loadingDestinations
                          ? "Loading destinations..."
                          : "Select destination"}
                      </option>

                      {destinations.map((destination) => {
                        const id = getDestinationId(destination);
                        return (
                          <option key={id} value={id}>
                            {getDestinationName(destination)}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              </div>
            )}

            {selectedDestinationId && !loadingData && (
              <div className="food-destination-availability">
                <span>
                  {hasFoodCatalogData
                    ? `🍛 ${foods.length} local dish${foods.length === 1 ? "" : "es"}`
                    : "🍛 No local dish records"}
                </span>
                <span>
                  {hasFoodPlaceData
                    ? `🏪 ${foodPlaces.length} food place${foodPlaces.length === 1 ? "" : "s"}`
                    : "🏪 No food places"}
                </span>
              </div>
            )}

            {!selectedDestinationId && !loadingDestinations && destinations.length > 0 && (
              <div className="food-destination-selection-note">
                Select a destination to load its food availability and recommendations.
              </div>
            )}

            <div className="food-layout">
              <aside className="food-sidebar">
                <div className="food-sidebar-heading">
                  <span>🍴</span>
                  <div>
                    <strong>Food Discovery</strong>
                    <small>Choose what you want to explore</small>
                  </div>
                </div>

                <button
                  type="button"
                  className={activeSection === "recommendations" ? "active" : ""}
                  onClick={() => setActiveSection("recommendations")}
                >
                  ✨ Recommendations
                </button>

                <button
                  type="button"
                  className={activeSection === "places" ? "active" : ""}
                  onClick={() => setActiveSection("places")}
                >
                  🏪 Food Places
                </button>

                <button
                  type="button"
                  className={activeSection === "history" ? "active" : ""}
                  onClick={() => setActiveSection("history")}
                >
                  🕘 Food History
                </button>
              </aside>

              <main className="food-content">
                {activeSection === "recommendations" && (
                  <>
                    <div className="food-section-heading">
                      <div>
                        <span className="food-eyebrow">DISCOVER</span>
                        <h2>What are you in the mood for?</h2>
                        <p>
                          Pick a result type, set any filters, then press
                          “Generate recommendations”. Nothing is requested until
                          you do.
                        </p>
                      </div>
                    </div>

                    {/* ---------- Step 1: result type ---------- */}
                    <div
                      className="fd-type-grid"
                      role="radiogroup"
                      aria-label="Recommendation type"
                    >
                      {RECOMMENDATION_TYPES.map((item) => (
                        <button
                          type="button"
                          key={item.value}
                          role="radio"
                          aria-checked={selectedType === item.value}
                          className={`fd-type ${
                            selectedType === item.value ? "is-selected" : ""
                          }`}
                          onClick={() => chooseType(item.value)}
                        >
                          <span aria-hidden="true">{item.icon}</span>
                          <strong>{item.label}</strong>
                          <small>
                            {item.kind === "dish"
                              ? "Dishes"
                              : item.kind === "place"
                                ? "Places"
                                : "Dishes + places"}
                          </small>
                        </button>
                      ))}
                    </div>

                    {/* ---------- Step 2: filters ---------- */}
                    <div className="fd-panel">
                      <div className="fd-panel-head">
                        <div>
                          <span className="food-eyebrow">PERSONALIZE</span>
                          <h3>Food preferences &amp; filters</h3>
                        </div>
                        <button
                          type="button"
                          className="fd-btn fd-btn-outline"
                          onClick={clearAllFilters}
                          disabled={
                            activeFilters.length === 0 &&
                            !filters.includeFoodAndBeverage
                          }
                        >
                          Clear all filters
                        </button>
                      </div>

                      <div className="fd-groups">
                        <fieldset className="fd-group">
                          <legend>🥗 Food &amp; diet</legend>
                          <div className="fd-fields">
                            <FilterSelect
                              id="fd-foodType"
                              label="Food type"
                              value={filters.foodType}
                              options={FOOD_TYPE_OPTIONS}
                              state={applicability.foodType}
                              onChange={(v) => updateFilter("foodType", v)}
                            />
                            <FilterSelect
                              id="fd-category"
                              label="Food category"
                              value={filters.category}
                              options={CATEGORY_OPTIONS}
                              state={applicability.category}
                              onChange={(v) => updateFilter("category", v)}
                            />
                            <FilterSelect
                              id="fd-dietary"
                              label="Dietary preference"
                              value={filters.dietaryPreference}
                              options={DIETARY_OPTIONS}
                              state={applicability.dietaryPreference}
                              onChange={(v) =>
                                updateFilter("dietaryPreference", v)
                              }
                            />
                            <FilterSelect
                              id="fd-spice"
                              label="Spice level"
                              value={filters.spiceLevel}
                              options={SPICE_LEVEL_OPTIONS}
                              state={applicability.spiceLevel}
                              onChange={(v) => updateFilter("spiceLevel", v)}
                            />
                            <FilterText
                              id="fd-cuisine"
                              label="Cuisine"
                              placeholder="e.g. Goan, South Indian"
                              value={filters.cuisine}
                              state={applicability.cuisine}
                              onChange={(v) => updateFilter("cuisine", v)}
                            />
                            <FilterText
                              id="fd-pref"
                              label="Food preference"
                              placeholder="e.g. seafood, sweets"
                              value={filters.foodPreference}
                              state={applicability.foodPreference}
                              onChange={(v) =>
                                updateFilter("foodPreference", v)
                              }
                            />
                          </div>
                        </fieldset>

                        <fieldset className="fd-group">
                          <legend>🕒 Timing &amp; budget</legend>
                          <div className="fd-fields">
                            <FilterSelect
                              id="fd-meal"
                              label="Meal period"
                              value={filters.mealPeriod}
                              options={MEAL_PERIOD_OPTIONS}
                              state={applicability.mealPeriod}
                              onChange={(v) => updateFilter("mealPeriod", v)}
                            />
                            <FilterSelect
                              id="fd-budget"
                              label="Budget range"
                              value={filters.budgetRange}
                              options={BUDGET_OPTIONS}
                              state={applicability.budgetRange}
                              onChange={(v) => updateFilter("budgetRange", v)}
                            />
                          </div>
                        </fieldset>

                        <fieldset className="fd-group">
                          <legend>📍 Places &amp; distance</legend>
                          <div className="fd-fields">
                            <FilterSelect
                              id="fd-place"
                              label="Restaurant / place type"
                              value={filters.placeType}
                              options={placeTypeOptions}
                              state={applicability.placeType}
                              onChange={(v) => updateFilter("placeType", v)}
                            />
                            <FilterText
                              id="fd-distance"
                              label="Maximum distance (km)"
                              placeholder="e.g. 5"
                              type="number"
                              min="0.1"
                              max="50"
                              step="0.5"
                              value={filters.maxDistanceKm}
                              state={applicability.maxDistanceKm}
                              onChange={(v) =>
                                updateFilter("maxDistanceKm", v)
                              }
                            />
                          </div>
                        </fieldset>

                        <fieldset className="fd-group">
                          <legend>🍹 Drinks &amp; nightlife (optional)</legend>
                          <div className="fd-toggles">
                            <FilterToggle
                              id="fd-bars"
                              label="Include Bars"
                              checked={filters.includeBars}
                              state={applicability.includeBars}
                              onChange={(v) => updateFilter("includeBars", v)}
                            />
                            <FilterToggle
                              id="fd-restrobars"
                              label="Include Restrobars"
                              checked={filters.includeRestrobars}
                              state={applicability.includeRestrobars}
                              onChange={(v) =>
                                updateFilter("includeRestrobars", v)
                              }
                            />
                            <FilterToggle
                              id="fd-fnb"
                              label="Include Food + Beverage"
                              checked={filters.includeFoodAndBeverage}
                              state={applicability.includeFoodAndBeverage}
                              onChange={(v) =>
                                updateFilter("includeFoodAndBeverage", v)
                              }
                            />
                            <FilterToggle
                              id="fd-drinks"
                              label="Include Local Drinks"
                              checked={filters.includeLocalDrinks}
                              state={applicability.includeLocalDrinks}
                              onChange={(v) =>
                                updateFilter("includeLocalDrinks", v)
                              }
                            />
                          </div>
                        </fieldset>
                      </div>

                      {filterNotices.length > 0 && (
                        <ul className="fd-notices" role="status">
                          {filterNotices.map((notice) => (
                            <li key={notice}>ℹ️ {notice}</li>
                          ))}
                        </ul>
                      )}

                      {issues.length > 0 && (
                        <ul className="fd-issues">
                          {issues.map((issue) => (
                            <li
                              key={issue.message}
                              className={`fd-issue-${issue.level}`}
                              role={issue.level === "error" ? "alert" : undefined}
                            >
                              {issue.level === "error" ? "⛔" : "⚠️"}{" "}
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="fd-apply-bar">
                        <p>
                          {!selectedDestinationId
                            ? "Select a destination above to continue."
                            : `${getTypeLabel(selectedType)} · ${
                                activeFilters.length
                              } filter${activeFilters.length === 1 ? "" : "s"} selected`}
                        </p>
                        <button
                          type="button"
                          className="fd-btn fd-btn-primary"
                          onClick={() => handleGenerate()}
                          disabled={
                            loadingRecommendations ||
                            !selectedTripId ||
                            !selectedDestinationId ||
                            blockingIssues.length > 0
                          }
                        >
                          {loadingRecommendations
                            ? "Searching…"
                            : applied
                              ? "Apply filters & refresh"
                              : "Generate recommendations"}
                        </button>
                      </div>
                    </div>

                    {/* ---------- Results ---------- */}
                    <div className="fd-results-head">
                      <div>
                        <span className="food-eyebrow">RESULTS</span>
                        <h3>
                          {loadingRecommendations
                            ? "Searching…"
                            : `${displayedRecommendations.length} result${
                                displayedRecommendations.length === 1 ? "" : "s"
                              }`}
                          {resultsSource === "saved" && viewingSaved && (
                            <small>
                              {" "}
                              · saved “{getTypeLabel(viewingSaved)}”
                            </small>
                          )}
                        </h3>
                      </div>

                      <label className="fd-saved-view">
                        <span>View saved results</span>
                        <select
                          value={viewingSaved}
                          onChange={(event) => {
                            const value = event.target.value;
                            setViewingSaved(value);
                            setResultsSource("saved");
                            setNoMatch(false);
                            handleTypeFilter(value || "ALL");
                          }}
                          disabled={!selectedTripId}
                        >
                          <option value="">All saved</option>
                          {RECOMMENDATION_TYPES.filter(
                            (item) => item.value !== "ALL"
                          ).map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {resultsSource === "generated" && applied && (
                      <div className="fd-active" aria-label="Filters used for these results">
                        <span className="fd-active-label">
                          {getTypeLabel(applied.type)}
                        </span>
                        {applied.active.length === 0 ? (
                          <span className="fd-chip fd-chip-muted">No filters</span>
                        ) : (
                          applied.active.map((chip) => (
                            <span className="fd-chip" key={chip.key}>
                              {chip.label}: <b>{chip.value}</b>
                            </span>
                          ))
                        )}
                        {applied.active.length > 0 && (
                          <button
                            type="button"
                            className="fd-link"
                            onClick={clearAllFilters}
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    )}

                    {resultsSource === "generated" && activeFilters.length > 0 && (
                      <div className="fd-active fd-active-editable" aria-label="Current filter selection">
                        <span className="fd-active-label">Current selection</span>
                        {activeFilters.map((chip) => (
                          <button
                            type="button"
                            key={chip.key}
                            className="fd-chip fd-chip-remove"
                            onClick={() => clearFilter(chip.key)}
                            aria-label={`Remove filter ${chip.label}: ${chip.value}`}
                          >
                            {chip.label}: <b>{chip.value}</b> ✕
                          </button>
                        ))}
                      </div>
                    )}

                    {filtersChanged && (
                      <div className="fd-banner fd-banner-info" role="status">
                        Your filters changed after these results were made.
                        Press “Apply filters &amp; refresh” to update them.
                      </div>
                    )}

                    {external && (
                      <div className="fd-banner fd-banner-warn" role="note">
                        <strong>Live OpenStreetMap results.</strong> No stored
                        food data exists for this destination, so these places
                        come from OpenStreetMap. It does not provide spice
                        level, dietary details or prices, and these cannot be
                        verified.
                        {external.applied.length > 0 && (
                          <p>
                            Applied:{" "}
                            {external.applied
                              .map((a) => `${a.label} (${a.how})`)
                              .join("; ")}
                            .
                          </p>
                        )}
                        {external.notVerified.length > 0 && (
                          <p>
                            Not applied (no data to check):{" "}
                            {external.notVerified
                              .map((a) => `${a.label}: ${a.value}`)
                              .join(", ")}
                            .
                          </p>
                        )}
                        {external.hiddenForMissingData > 0 && (
                          <p>
                            {external.hiddenForMissingData} place
                            {external.hiddenForMissingData === 1 ? " was" : "s were"}{" "}
                            hidden because OpenStreetMap lists no matching
                            cuisine or type for {external.hiddenForMissingData === 1 ? "it" : "them"}.
                          </p>
                        )}
                      </div>
                    )}

                    {loadingRecommendations ? (
                      <div className="food-state-card compact" role="status">
                        <div className="food-spinner" />
                        <h3>Finding the best food options...</h3>
                        <p>
                          Using your trip, destination, date and filters.
                        </p>
                      </div>
                    ) : displayedRecommendations.length === 0 ? (
                      <div className="food-empty-card">
                        <div>🍽️</div>
                        <h3>
                          {!selectedDestinationId
                            ? "Select a destination first"
                            : noMatch || external
                              ? "No results match these filters"
                              : "No food recommendations yet"}
                        </h3>
                        <p>
                          {!selectedDestinationId
                            ? "Choose a destination from the trip above. Its food availability will be loaded before you generate recommendations."
                            : noMatch || external
                              ? "Try removing a filter, widening the distance, or choosing a different result type."
                              : "Choose a result type, set any filters, then press “Generate recommendations”."}
                        </p>
                        {(noMatch || external) && activeFilters.length > 0 && (
                          <button
                            type="button"
                            className="fd-btn fd-btn-outline"
                            onClick={clearAllFilters}
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="food-recommendation-grid">
                        {displayedRecommendations.map((item, index) => (
                          <FoodRecommendationCard
                            key={
                              item?.foodRecommendationId ??
                              item?.recommendationId ??
                              `${getRecommendationTitle(item)}-${index}`
                            }
                            recommendation={item}
                            onAction={handleAction}
                            actionLoading={actionLoading}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeSection === "places" && (
                  <>
                  <FoodPlacesSection
                    foodPlaces={foodPlaces}
                    foods={foods}
                    loading={loadingData}
                    destinationName={
                      selectedDestination
                        ? getDestinationName(selectedDestination)
                        : selectedTrip?.destination
                    }
                    onGeneratePlaceRecommendation={() =>
                      handleGenerate("FOOD_PLACE")
                    }
                    disabled={
                      loadingRecommendations || !selectedDestinationId
                    }
                  />

                  <div className="food-nearby-places-section">
                    <NearbyPlacesPanel
                      type="food"
                      selectedDestination={selectedDestination}
                    />
                  </div>
                  </>
                )}

                {activeSection === "history" && (
                  <FoodHistorySection
                    history={history}
                    loading={loadingHistory}
                    onRetry={() => loadHistory(selectedTripId)}
                  />
                )}
              </main>
            </div>

            <div className="food-footer-note">
              <span>🍴</span>
              <p>
                Recommendations use the selected trip and destination. Optional
                bar and restrobar results are only requested when you explicitly
                enable them.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}


/* ---------------- Small filter controls ---------------- */

function FilterSelect({ id, label, value, options, state, onChange }) {
  const disabled = !state?.enabled;
  return (
    <div className={`fd-field ${disabled ? "is-disabled" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {disabled && <small>{state.reason}</small>}
    </div>
  );
}

function FilterText({
  id,
  label,
  value,
  state,
  onChange,
  placeholder,
  type = "text",
  ...rest
}) {
  const disabled = !state?.enabled;
  return (
    <div className={`fd-field ${disabled ? "is-disabled" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
      {disabled && <small>{state.reason}</small>}
    </div>
  );
}

function FilterToggle({ id, label, checked, state, onChange }) {
  const disabled = !state?.enabled;
  return (
    <div className={`fd-toggle ${disabled ? "is-disabled" : ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
      {disabled && <small>{state.reason}</small>}
    </div>
  );
}

function FoodRecommendationCard({
  recommendation,
  onAction,
  actionLoading,
}) {
  const item = recommendation || {};

  const title = getRecommendationTitle(item);
  const subtitle = getRecommendationSubtitle(item);

  const price = formatPrice(item?.price);
  const distance =
    item?.distanceKm !== null && item?.distanceKm !== undefined
      ? `${Number(item.distanceKm).toFixed(1)} km`
      : null;

  const score =
    item?.score !== null && item?.score !== undefined
      ? Number(item.score)
      : null;

  const recommendationId =
    item?.foodRecommendationId ??
    item?.recommendationId ??
    item?.id;

  const isExternalPlace = item?.externalPlace === true;
  const isPlace =
    isExternalPlace ||
    (item?.foodPlaceId !== null && item?.foodPlaceId !== undefined);
  const googleMapsUrl =
    item?.mapUrl ||
    (Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude))
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${item.latitude},${item.longitude}`)}`
      : null);

  return (
    <article className="food-recommendation-card">
      <div className="food-card-accent">
        <span>{isPlace ? "🏪" : "🍛"}</span>
        {score !== null && Number.isFinite(score) && (
          <strong>{Math.round(score)}%</strong>
        )}
      </div>

      <div className="food-card-body">
        <div className="food-card-topline">
          <span className="food-type-badge">
            {safeText(item?.recommendationType, "FOOD")}
          </span>

          {item?.currentlyOpen !== null &&
            item?.currentlyOpen !== undefined && (
              <span
                className={
                  item.currentlyOpen
                    ? "food-open-badge"
                    : "food-closed-badge"
                }
              >
                {item.currentlyOpen ? "Open now" : "Closed"}
              </span>
            )}
        </div>

        {isExternalPlace && item?.imageUrl && (
          <img src={item.imageUrl} alt={title} loading="lazy"
            style={{ width: "100%", maxHeight: 190, objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />
        )}
        <h3>{title}</h3>
        {isExternalPlace && item?.address && (
          <p className="food-card-subtitle">{item.address}</p>
        )}
        {isExternalPlace && item?.openingHoursText && (
          <p className="food-info-line">Opening hours: {item.openingHoursText}</p>
        )}

        {subtitle && subtitle !== title && (
          <p className="food-card-subtitle">{subtitle}</p>
        )}

        <div className="food-tag-row">
          {safeText(item?.cuisine) && (
            <span>🍜 {safeText(item.cuisine)}</span>
          )}
          {safeText(item?.category) && (
            <span>🏷️ {safeText(item.category)}</span>
          )}
          {safeText(item?.foodType) && (
            <span>🥗 {safeText(item.foodType)}</span>
          )}
          {safeText(item?.spiceLevel) && (
            <span>🌶️ {safeText(item.spiceLevel)}</span>
          )}
        </div>

        <div className="food-detail-grid">
          {price && (
            <div>
              <span>Price</span>
              <strong>{price}</strong>
            </div>
          )}

          {safeText(item?.priceRange) && (
            <div>
              <span>Price range</span>
              <strong>{safeText(item.priceRange)}</strong>
            </div>
          )}

          {distance && (
            <div>
              <span>Distance</span>
              <strong>{distance}</strong>
            </div>
          )}

          {item?.rating !== null &&
            item?.rating !== undefined && (
              <div>
                <span>Rating</span>
                <strong>★ {safeText(item.rating)}</strong>
              </div>
            )}

          {item?.popularity !== null &&
            item?.popularity !== undefined && (
              <div>
                <span>Popularity</span>
                <strong>{safeText(item.popularity)}</strong>
              </div>
            )}

          {safeText(item?.mealPeriod) && (
            <div>
              <span>Meal time</span>
              <strong>{safeText(item.mealPeriod)}</strong>
            </div>
          )}
        </div>

        {safeText(item?.recommendedMeal) && (
          <div className="food-info-line">
            <span>🍽️ Recommended meal</span>
            <strong>{safeText(item.recommendedMeal)}</strong>
          </div>
        )}

        {safeText(item?.openingTime) && (
          <div className="food-info-line">
            <span>🕒 Hours</span>
            <strong>
              {safeText(item.openingTime)}
              {safeText(item?.closingTime)
                ? ` – ${safeText(item.closingTime)}`
                : ""}
            </strong>
          </div>
        )}

        {item?.vegetarianAvailable !== null &&
          item?.vegetarianAvailable !== undefined && (
            <div className="food-info-line">
              <span>🥬 Vegetarian</span>
              <strong>{item.vegetarianAvailable ? "Available" : "No"}</strong>
            </div>
          )}

        {item?.veganAvailable !== null &&
          item?.veganAvailable !== undefined && (
            <div className="food-info-line">
              <span>🌱 Vegan</span>
              <strong>{item.veganAvailable ? "Available" : "No"}</strong>
            </div>
          )}

        {safeText(item?.dietaryInformation) && (
          <div className="food-info-line">
            <span>🥗 Dietary information</span>
            <strong>{safeText(item.dietaryInformation)}</strong>
          </div>
        )}

        {item?.localDrinksAvailable !== null &&
          item?.localDrinksAvailable !== undefined && (
            <div className="food-info-line">
              <span>🥤 Local drinks</span>
              <strong>
                {item.localDrinksAvailable ? "Available" : "Not available"}
              </strong>
            </div>
          )}

        {item?.alcoholAvailable !== null &&
          item?.alcoholAvailable !== undefined && (
            <div className="food-info-line">
              <span>🍹 Alcohol availability</span>
              <strong>
                {item.alcoholAvailable ? "Available" : "Not available"}
              </strong>
            </div>
          )}

        {safeText(item?.placeType) && (
          <div className="food-info-line">
            <span>🏪 Place type</span>
            <strong>{safeText(item.placeType)}</strong>
          </div>
        )}

        {safeText(item?.description) && (
          <p className="food-description">{safeText(item.description)}</p>
        )}

        {safeText(item?.ingredients) && (
          <div className="food-description-block">
            <span>Ingredients</span>
            <p>{safeText(item.ingredients)}</p>
          </div>
        )}

        {safeText(item?.reason) && (
          <div className="food-reason">
            <span>💡 Why this was recommended</span>
            <p>{safeText(item.reason)}</p>
          </div>
        )}

        <div className="food-match-row">
          {item?.budgetMatch !== null &&
            item?.budgetMatch !== undefined && (
              <span className={item.budgetMatch ? "match" : "no-match"}>
                {item.budgetMatch ? "✓" : "×"} Budget match
              </span>
            )}

          {item?.dietaryMatch !== null &&
            item?.dietaryMatch !== undefined && (
              <span className={item.dietaryMatch ? "match" : "no-match"}>
                {item.dietaryMatch ? "✓" : "×"} Dietary match
              </span>
            )}

          {item?.preferenceMatch !== null &&
            item?.preferenceMatch !== undefined && (
              <span className={item.preferenceMatch ? "match" : "no-match"}>
                {item.preferenceMatch ? "✓" : "×"} Preference match
              </span>
            )}
        </div>

        {isExternalPlace && (
          <div className="food-card-actions">
            {googleMapsUrl && <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">View Route in Google Maps</a>}
            {item?.website && <a href={item.website} target="_blank" rel="noopener noreferrer">Website</a>}
            {item?.phone && <a href={`tel:${item.phone}`}>Call</a>}
            <small>Source: {safeText(item?.source, "OpenStreetMap")}. External listings are not stored in recommendation history.</small>
          </div>
        )}
        {!isExternalPlace && <div className="food-card-actions">
          {ACTIONS.map((action) => {
            const key = `${recommendationId}-${action}`;

            return (
              <button
                type="button"
                key={action}
                onClick={() => onAction(item, action)}
                disabled={Boolean(actionLoading)}
              >
                {action === "Food Recommendation Viewed" && "👁️ View"}
                {action === "Food Recommendation Selected" && "✓ Select"}
                {action === "Food Recommendation Rejected" && "× Reject"}
                {action === "Food Added to Itinerary" && "➕ Add"}
                {actionLoading === key && " ..."}
              </button>
            );
          })}
        </div>}
      </div>
    </article>
  );
}


function FoodPlacesSection({
  foodPlaces,
  foods,
  loading,
  destinationName,
  onGeneratePlaceRecommendation,
  disabled,
}) {
  return (
    <>
      <div className="food-section-heading">
        <div>
          <span className="food-eyebrow">PLACES</span>
          <h2>Food places in {destinationName || "your destination"}</h2>
          <p>
            Explore food establishments returned by the backend for this
            destination.
          </p>
        </div>

        <button
          type="button"
          className="food-primary-button"
          onClick={onGeneratePlaceRecommendation}
          disabled={disabled}
        >
          ✨ Recommend Food Places
        </button>
      </div>

      {loading ? (
        <div className="food-state-card compact">
          <div className="food-spinner" />
          <h3>Loading food information...</h3>
        </div>
      ) : foodPlaces.length === 0 ? (
        <div className="food-empty-card">
          <div>🏪</div>
          <h3>No food places returned</h3>
          <p>
            There are no food-place records available for the selected
            destination.
          </p>
        </div>
      ) : (
        <div className="food-place-grid">
          {foodPlaces.map((place, index) => (
            <article
              className="food-place-card"
              key={place?.foodPlaceId ?? index}
            >
              <div className="food-place-icon">🏪</div>
              <span className="food-type-badge">
                {safeText(place?.placeType, "Food place")}
              </span>
              <h3>{safeText(place?.name, "Food place")}</h3>

              {safeText(place?.cuisine) && (
                <p>🍜 {safeText(place.cuisine)}</p>
              )}

              <div className="food-place-meta">
                {place?.rating !== null && place?.rating !== undefined && (
                  <span>★ {safeText(place.rating)}</span>
                )}

                {safeText(place?.priceRange) && (
                  <span>{safeText(place.priceRange)}</span>
                )}
              </div>

              {safeText(place?.openingTime) && (
                <p>
                  🕒 {safeText(place.openingTime)}
                  {safeText(place?.closingTime)
                    ? ` – ${safeText(place.closingTime)}`
                    : ""}
                </p>
              )}

              {place?.vegetarianAvailable !== null &&
                place?.vegetarianAvailable !== undefined && (
                  <p>
                    🥬 Vegetarian:{" "}
                    {place.vegetarianAvailable ? "Available" : "No"}
                  </p>
                )}

              {place?.veganAvailable !== null &&
                place?.veganAvailable !== undefined && (
                  <p>
                    🌱 Vegan: {place.veganAvailable ? "Available" : "No"}
                  </p>
                )}

              {safeText(place?.dietaryInformation) && (
                <p>🥗 {safeText(place.dietaryInformation)}</p>
              )}

              {place?.localDrinksAvailable !== null &&
                place?.localDrinksAvailable !== undefined && (
                  <p>
                    🥤 Local drinks:{" "}
                    {place.localDrinksAvailable ? "Available" : "No"}
                  </p>
                )}

              {place?.alcoholAvailable !== null &&
                place?.alcoholAvailable !== undefined && (
                  <p>
                    🍹 Alcohol availability:{" "}
                    {place.alcoholAvailable ? "Available" : "No"}
                  </p>
                )}

              {safeText(place?.description) && (
                <p className="food-place-description">
                  {safeText(place.description)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {foodPlaces.length > 0 && foods.length === 0 && (
        <div className="food-empty-card">
          <div>🍛</div>
          <h3>No local dish records for this destination</h3>
          <p>
            Food places are available, but there are no local dish records
            returned for the selected destination.
          </p>
        </div>
      )}

      {foods.length > 0 && (
        <div className="food-catalog-section">
          <div className="food-section-heading compact-heading">
            <div>
              <span className="food-eyebrow">LOCAL DISHES</span>
              <h3>Food catalog</h3>
            </div>
          </div>

          <div className="food-catalog-grid">
            {foods.map((food, index) => (
              <article
                className="food-dish-card"
                key={food?.foodId ?? index}
              >
                <span>{safeText(food?.category, "Local food")}</span>
                <h4>{safeText(food?.dishName, "Dish")}</h4>
                {safeText(food?.cuisine) && <p>🍜 {food.cuisine}</p>}
                {safeText(food?.foodType) && <p>🥗 {food.foodType}</p>}
                {safeText(food?.spiceLevel) && <p>🌶️ {food.spiceLevel}</p>}
                {food?.price !== null && food?.price !== undefined && (
                  <strong>{formatPrice(food.price)}</strong>
                )}
                {safeText(food?.recommendedMeal) && (
                  <p>🍽️ {food.recommendedMeal}</p>
                )}
                {safeText(food?.description) && (
                  <p className="food-dish-description">{food.description}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function FoodHistorySection({ history, loading, onRetry }) {
  return (
    <>
      <div className="food-section-heading">
        <div>
          <span className="food-eyebrow">HISTORY</span>
          <h2>Food recommendation history</h2>
          <p>
            Track food recommendation events and actions for the selected trip.
          </p>
        </div>

        <button type="button" className="food-secondary-button" onClick={onRetry}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="food-state-card compact">
          <div className="food-spinner" />
          <h3>Loading food history...</h3>
        </div>
      ) : history.length === 0 ? (
        <div className="food-empty-card">
          <div>🕘</div>
          <h3>No food history yet</h3>
          <p>
            Generated recommendations and recorded food actions will appear
            here.
          </p>
        </div>
      ) : (
        <div className="food-history-list">
          {history.map((item, index) => (
            <article
              className="food-history-item"
              key={item?.historyId ?? `${item?.createdAt}-${index}`}
            >
              <div className="food-history-dot">🍴</div>
              <div className="food-history-body">
                <div className="food-history-top">
                  <strong>
                    {safeText(item?.action, "Food recommendation event")}
                  </strong>
                  <span>{formatDate(item?.createdAt)}</span>
                </div>

                <div className="food-history-tags">
                  {safeText(item?.recommendationType) && (
                    <span>{item.recommendationType}</span>
                  )}
                  {safeText(item?.dishName) && <span>🍛 {item.dishName}</span>}
                  {safeText(item?.foodPlaceName) && (
                    <span>🏪 {item.foodPlaceName}</span>
                  )}
                </div>

                {safeText(item?.reason) && <p>{item.reason}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}


export default Food;
