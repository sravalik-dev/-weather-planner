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
import "../styles/Food.css";

const RECOMMENDATION_TYPES = [
  { value: "LOCAL_FOOD", label: "Local Food", icon: "🍛" },
  { value: "TRADITIONAL_DISH", label: "Traditional Dishes", icon: "🥘" },
  { value: "NEARBY_FOOD", label: "Nearby Food", icon: "📍" },
  { value: "MEAL_TIME", label: "Meal Time", icon: "🕒" },
  { value: "FOOD_PREFERENCE", label: "Food Preference", icon: "❤️" },
  { value: "DIETARY", label: "Dietary", icon: "🥗" },
  { value: "BUDGET", label: "Budget", icon: "💰" },
  { value: "POPULAR_LOCAL_FOOD", label: "Popular Local Food", icon: "⭐" },
  { value: "FOOD_PLACE", label: "Food Places", icon: "🏪" },
  { value: "BAR", label: "Bars", icon: "🍹" },
  { value: "RESTROBAR", label: "Restrobars", icon: "🍸" },
  { value: "FOOD_AND_BEVERAGE", label: "Food + Beverage", icon: "🍽️" },
];

const FOOD_TYPES = [
  "Vegetarian",
  "Non-vegetarian",
  "Vegan",
  "Egg-free",
  "Dairy-free",
  "Gluten-free",
  "Other",
];

const CATEGORIES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Dessert",
  "Street Food",
  "Traditional Specialty",
  "Beverage",
];

const MEAL_PERIODS = ["Morning", "Afternoon", "Evening", "Night"];
const SPICE_LEVELS = ["Mild", "Medium", "Spicy"];

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
  const [trips, setTrips] = useState([]);
  const [destinations, setDestinations] = useState([]);

  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedDestinationId, setSelectedDestinationId] = useState("");

  const [foods, setFoods] = useState([]);
  const [foodPlaces, setFoodPlaces] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);

  const [activeSection, setActiveSection] = useState("recommendations");
  const [selectedType, setSelectedType] = useState("LOCAL_FOOD");

  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("");

  const [filters, setFilters] = useState({
    foodType: "",
    category: "",
    mealPeriod: "",
    cuisine: "",
    spiceLevel: "",
    dietaryPreference: "",
    foodPreference: "",
    budgetRange: "",
    maxDistanceKm: "",
    placeType: "",
    includeBars: false,
    includeRestrobars: false,
    includeLocalDrinks: false,
    includeFoodAndBeverage: false,
  });

  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const updateFilter = (name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const buildRequest = (overrideType = selectedType) => {
    const recommendationType =
      filters.includeFoodAndBeverage && overrideType === "FOOD_PLACE"
        ? "FOOD_AND_BEVERAGE"
        : overrideType;

    const request = {
      destinationId: Number(selectedDestinationId),
      plannedDate,
      plannedTime,
      recommendationType,
      includeBars: Boolean(filters.includeBars),
      includeRestrobars: Boolean(filters.includeRestrobars),
      includeLocalDrinks: Boolean(filters.includeLocalDrinks),
      includeFoodAndBeverage: Boolean(filters.includeFoodAndBeverage),
    };

    const optionalTextFields = [
      ["foodType", filters.foodType],
      ["category", filters.category],
      ["mealPeriod", filters.mealPeriod],
      ["cuisine", filters.cuisine],
      ["spiceLevel", filters.spiceLevel],
      ["dietaryPreference", filters.dietaryPreference],
      ["foodPreference", filters.foodPreference],
      ["budgetRange", filters.budgetRange],
      ["placeType", filters.placeType],
    ];

    optionalTextFields.forEach(([key, value]) => {
      const normalized = String(value ?? "").trim();
      if (normalized) {
        request[key] = normalized;
      }
    });

    if (String(filters.maxDistanceKm ?? "").trim()) {
      const distance = Number(filters.maxDistanceKm);
      if (Number.isFinite(distance) && distance > 0) {
        request.maxDistanceKm = distance;
      }
    }

    return request;
  };

  const hasFoodCatalogData = foods.length > 0;
  const hasFoodPlaceData = foodPlaces.length > 0;

  const handleGenerate = async (type = selectedType) => {
    setError("");
    setMessage("");

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

    if (type === "LOCAL_FOOD" && !hasFoodCatalogData) {
      setError(
        `No local food records are available for ${getDestinationName(
          selectedDestination
        )}. Select another destination or use Food Places if establishments are available.`
      );
      return;
    }

    if (type === "FOOD_PLACE" && !hasFoodPlaceData) {
      setError(
        `No food-place records are available for ${getDestinationName(
          selectedDestination
        )}. Select another destination.`
      );
      return;
    }

    if (type === "BAR" && !filters.includeBars) {
      setError("Enable “Include Bars” before requesting bar recommendations.");
      return;
    }

    if (type === "RESTROBAR" && !filters.includeRestrobars) {
      setError(
        "Enable “Include Restrobars” before requesting restrobar recommendations."
      );
      return;
    }

    if (type === "FOOD_AND_BEVERAGE" && !filters.includeFoodAndBeverage) {
      setError(
        "Enable “Include Food + Beverage” before requesting this option."
      );
      return;
    }

    setSelectedType(type);
    setLoadingRecommendations(true);

    try {
      await generateFoodRecommendations(
        selectedTripId,
        buildRequest(type)
      );

      const [recommendationData, historyData] = await Promise.all([
        getFoodRecommendations(selectedTripId),
        getFoodRecommendationHistory(selectedTripId),
      ]);

      setRecommendations(
        normalizeArray(recommendationData, [
          "recommendations",
          "foodRecommendations",
          "content",
        ])
      );

      setHistory(normalizeArray(historyData, ["history", "content"]));

      setMessage(
        `${RECOMMENDATION_TYPES.find((item) => item.value === type)?.label || "Food"} recommendations generated successfully.`
      );
      setActiveSection("recommendations");
    } catch (requestError) {
      console.error("Food recommendation generation error:", requestError);
      const message = String(requestError?.message || "");

      if (
        message.includes("No local food recommendations") ||
        message.includes("No food options match")
      ) {
        setError(
          "The backend has no matching food recommendations for this destination and these filters. Clear optional filters or choose another destination and try again."
        );
      } else {
        setError(
          message ||
            "Unable to generate food recommendations. Please try again."
        );
      }
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleTypeFilter = async (type) => {
    setSelectedType(type);
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

  const quickRecommendations = RECOMMENDATION_TYPES.filter(
    (item) =>
      item.value !== "BAR" &&
      item.value !== "RESTROBAR" &&
      item.value !== "FOOD_AND_BEVERAGE"
  );

  const placeRecommendations = recommendations.filter(
    (item) =>
      item?.foodPlaceId !== null &&
      item?.foodPlaceId !== undefined
  );

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

        {message && (
          <div className="food-alert food-alert-success" role="status">
            <span>✓</span>
            <p>{message}</p>
          </div>
        )}

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
                        <h2>Recommendation types</h2>
                        <p>
                          Generate recommendations using the selected trip,
                          destination, date, time and preferences.
                        </p>
                      </div>
                    </div>

                    <div className="food-quick-grid">
                      {quickRecommendations.map((item) => (
                        <button
                          type="button"
                          key={item.value}
                          className={
                            selectedType === item.value
                              ? "food-quick-card active"
                              : "food-quick-card"
                          }
                          onClick={() => handleGenerate(item.value)}
                          disabled={
                            loadingRecommendations ||
                            !selectedTripId ||
                            !selectedDestinationId ||
                            (item.value === "LOCAL_FOOD" && !hasFoodCatalogData)
                          }
                        >
                          <span>{item.icon}</span>
                          <strong>{item.label}</strong>
                          <small>Generate now</small>
                        </button>
                      ))}
                    </div>

                    <div className="food-filter-panel">
                      <div className="food-filter-heading">
                        <div>
                          <span className="food-eyebrow">PERSONALIZE</span>
                          <h3>Food preferences & filters</h3>
                        </div>
                        <span className="food-filter-icon">⚙️</span>
                      </div>

                      <div className="food-filter-grid">
                        <label>
                          Food type
                          <select
                            value={filters.foodType}
                            onChange={(event) =>
                              updateFilter("foodType", event.target.value)
                            }
                          >
                            <option value="">Any</option>
                            {FOOD_TYPES.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Category
                          <select
                            value={filters.category}
                            onChange={(event) =>
                              updateFilter("category", event.target.value)
                            }
                          >
                            <option value="">Any</option>
                            {CATEGORIES.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Meal period
                          <select
                            value={filters.mealPeriod}
                            onChange={(event) =>
                              updateFilter("mealPeriod", event.target.value)
                            }
                          >
                            <option value="">Any</option>
                            {MEAL_PERIODS.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Spice level
                          <select
                            value={filters.spiceLevel}
                            onChange={(event) =>
                              updateFilter("spiceLevel", event.target.value)
                            }
                          >
                            <option value="">Any</option>
                            {SPICE_LEVELS.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Cuisine
                          <input
                            type="text"
                            value={filters.cuisine}
                            onChange={(event) =>
                              updateFilter("cuisine", event.target.value)
                            }
                            placeholder="e.g. Andhra"
                          />
                        </label>

                        <label>
                          Dietary preference
                          <input
                            type="text"
                            value={filters.dietaryPreference}
                            onChange={(event) =>
                              updateFilter(
                                "dietaryPreference",
                                event.target.value
                              )
                            }
                            placeholder="e.g. vegetarian"
                          />
                        </label>

                        <label>
                          Food preference
                          <input
                            type="text"
                            value={filters.foodPreference}
                            onChange={(event) =>
                              updateFilter(
                                "foodPreference",
                                event.target.value
                              )
                            }
                            placeholder="e.g. spicy food"
                          />
                        </label>

                        <label>
                          Budget range
                          <input
                            type="text"
                            value={filters.budgetRange}
                            onChange={(event) =>
                              updateFilter("budgetRange", event.target.value)
                            }
                            placeholder="Backend-supported value"
                          />
                        </label>

                        <label>
                          Max distance (km)
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={filters.maxDistanceKm}
                            onChange={(event) =>
                              updateFilter(
                                "maxDistanceKm",
                                event.target.value
                              )
                            }
                            placeholder="e.g. 5"
                          />
                        </label>

                        <label>
                          Place type
                          <input
                            type="text"
                            value={filters.placeType}
                            onChange={(event) =>
                              updateFilter("placeType", event.target.value)
                            }
                            placeholder="Restaurant / Cafe..."
                          />
                        </label>
                      </div>

                      <div className="food-opt-in-row">
                        <label className="food-check">
                          <input
                            type="checkbox"
                            checked={filters.includeBars}
                            onChange={(event) =>
                              updateFilter(
                                "includeBars",
                                event.target.checked
                              )
                            }
                          />
                          <span>Include Bars</span>
                        </label>

                        <label className="food-check">
                          <input
                            type="checkbox"
                            checked={filters.includeRestrobars}
                            onChange={(event) =>
                              updateFilter(
                                "includeRestrobars",
                                event.target.checked
                              )
                            }
                          />
                          <span>Include Restrobars</span>
                        </label>

                        <label className="food-check">
                          <input
                            type="checkbox"
                            checked={filters.includeLocalDrinks}
                            onChange={(event) =>
                              updateFilter(
                                "includeLocalDrinks",
                                event.target.checked
                              )
                            }
                          />
                          <span>Include Local Drinks</span>
                        </label>

                        <label className="food-check">
                          <input
                            type="checkbox"
                            checked={filters.includeFoodAndBeverage}
                            onChange={(event) =>
                              updateFilter(
                                "includeFoodAndBeverage",
                                event.target.checked
                              )
                            }
                          />
                          <span>Include Food + Beverage</span>
                        </label>
                      </div>

                      <div className="food-optional-actions">
                        <button
                          type="button"
                          onClick={() => handleGenerate("BAR")}
                          disabled={
                            loadingRecommendations ||
                            !filters.includeBars ||
                            !selectedDestinationId
                          }
                        >
                          🍹 Generate Bars
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGenerate("RESTROBAR")}
                          disabled={
                            loadingRecommendations ||
                            !filters.includeRestrobars ||
                            !selectedDestinationId
                          }
                        >
                          🍸 Generate Restrobars
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGenerate("FOOD_AND_BEVERAGE")}
                          disabled={
                            loadingRecommendations ||
                            !filters.includeFoodAndBeverage ||
                            !selectedDestinationId
                          }
                        >
                          🍽️ Food + Beverage
                        </button>
                      </div>
                    </div>

                    <div className="food-results-toolbar">
                      <div>
                        <span className="food-eyebrow">RESULTS</span>
                        <h3>Recommendations</h3>
                      </div>

                      <div className="food-result-filters">
                        <button
                          type="button"
                          className={!selectedType ? "active" : ""}
                          onClick={() => handleTypeFilter("ALL")}
                        >
                          All
                        </button>

                        {RECOMMENDATION_TYPES.map((item) => (
                          <button
                            type="button"
                            key={item.value}
                            className={
                              selectedType === item.value ? "active" : ""
                            }
                            onClick={() => handleTypeFilter(item.value)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {loadingRecommendations ? (
                      <div className="food-state-card compact">
                        <div className="food-spinner" />
                        <h3>Finding the best food options...</h3>
                        <p>
                          Using your trip, destination, date and preferences.
                        </p>
                      </div>
                    ) : recommendations.length === 0 ? (
                      <div className="food-empty-card">
                        <div>🍽️</div>
                        <h3>
                          {!selectedDestinationId
                            ? "Select a destination first"
                            : "No food recommendations yet"}
                        </h3>
                        <p>
                          {!selectedDestinationId
                            ? "Choose a destination from the trip above. Its food availability will be loaded before you generate recommendations."
                            : "Generate a recommendation above to see dishes and food places for your selected destination."}
                        </p>
                      </div>
                    ) : (
                      <div className="food-recommendation-grid">
                        {recommendations.map((item, index) => (
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

  const isPlace =
    item?.foodPlaceId !== null &&
    item?.foodPlaceId !== undefined;

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

        <h3>{title}</h3>

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

        <div className="food-card-actions">
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
        </div>
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
