import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addAccommodationToTrip,
  getAccommodation,
  getAccommodationHistory,
  getAccommodationHistoryByTrip,
  getAccommodations,
  searchAccommodations,
  selectAccommodation,
  viewAccommodation,
} from "../services/accommodationService";
import { getTrips } from "../services/tripService";
import { getTripDestinationsForFood } from "../services/foodService";
import {
  ACCOMMODATION_TYPE_OPTIONS,
  BEACH_OPTIONS,
  DEFAULT_ACC_FILTERS,
  FACILITY_OPTIONS,
  POOL_OPTIONS,
  SORT_OPTIONS,
  buildSearchRequest,
  clearAccFilter,
  getActiveAccFilters,
  isNoMatchError,
  sortAccommodations,
  validateAccFilters,
} from "../utils/accommodationFilters";
import NearbyPlacesPanel from "./NearbyPlacesPanel";
import Toast from "./Toast";
import "../styles/Accommodation.css";
import "../styles/AccommodationFilters.css";

/*
 * Accommodation categories (UI shortcuts for the "type" filter).
 * Counts come from the real records returned by GET /api/accommodations.
 */
const ACCOMMODATION_CATEGORIES = [
  {
    id: "HOTEL",
    title: "Hotel Suggestions",
    subtitle: "Comfortable stays for your trip",
    icon: "🏨",
  },
  {
    id: "BUDGET_HOTEL",
    title: "Budget Hotels",
    subtitle: "Affordable accommodation options",
    icon: "💰",
  },
  {
    id: "LUXURY_HOTEL",
    title: "Luxury Hotels",
    subtitle: "Premium stays and services",
    icon: "✨",
  },
  {
    id: "HOMESTAY",
    title: "Homestays",
    subtitle: "Stay like a local",
    icon: "🏡",
  },
  {
    id: "RESORT",
    title: "Resorts",
    subtitle: "Relaxing destination stays",
    icon: "🌴",
  },
  {
    id: "HOSTEL",
    title: "Hostels",
    subtitle: "Simple and social stays",
    icon: "🛏️",
  },
];

const labelize = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return String(value)
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
};

const formatMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Price unavailable";
  }

  return `₹${number.toLocaleString("en-IN")}`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const valueText = (value) => {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return labelize(value);
};

const DETAIL_FIELDS = [
  ["Accommodation ID", "accommodationId"],
  ["Type", "accommodationType"],
  ["Destination", "destination"],
  ["Address", "address"],
  ["Rating", "rating"],
  ["Price / Night", "pricePerNight"],
  ["Maximum Guests", "maxGuests"],
  ["Availability", "availability"],
  ["Distance (km)", "distanceKm"],
  ["Beach Access", "beachAccess"],
  ["Beach View", "beachView"],
  ["Beachfront", "beachfront"],
  ["Near Beach", "nearBeach"],
  ["Partial Sea View", "partialSeaView"],
  ["Sea View", "seaView"],
  ["Swimming Pool", "swimmingPool"],
  ["Pool Type", "poolType"],
  ["Private Pool", "privatePool"],
  ["Kids Pool", "kidsPool"],
  ["Breakfast Included", "breakfastIncluded"],
  ["Family Friendly", "familyFriendly"],
  ["Accessibility", "accessibility"],
  ["Wi-Fi", "wifi"],
  ["Parking", "parking"],
  ["Restaurant", "restaurant"],
  ["Food Available", "foodAvailable"],
  ["Room Service", "roomService"],
  ["Fitness", "fitness"],
  ["Spa", "spa"],
  ["Garden", "garden"],
  ["Balcony", "balcony"],
  ["Kitchen", "kitchen"],
  ["Lounge", "lounge"],
  ["Recreation", "recreation"],
  ["Water Sports", "waterSports"],
  ["Check-in", "checkInTime"],
  ["Check-out", "checkOutTime"],
];

const tripId = (trip) => trip?.tripId ?? trip?.id ?? "";
const tripName = (trip) => trip?.tripName || trip?.name || `Trip ${tripId(trip)}`;
const destId = (d) => d?.destinationId ?? d?.id ?? "";
const destName = (d) =>
  d?.destinationName ?? d?.name ?? d?.title ?? `Destination ${destId(d)}`;

/* Icon + tone per type for the card header. No photos are invented. */
const TYPE_ICON = Object.fromEntries(
  ACCOMMODATION_CATEGORIES.map((c) => [c.id, c.icon])
);

function Field({ label, error, children, hint }) {
  return (
    <label className={`af-field ${error ? "has-error" : ""}`}>
      <span className="af-label">{label}</span>
      {children}
      {hint && !error && <small className="af-hint">{hint}</small>}
      {error && <small className="af-error" role="alert">{error}</small>}
    </label>
  );
}

function Accommodation({ onBack }) {
  /* ----- data ----- */
  const [allAccommodations, setAllAccommodations] = useState([]); // GET /accommodations (category counts + browse)
  const [results, setResults] = useState([]);                     // what is shown
  const [resultSource, setResultSource] = useState("browse");     // "browse" | "search"
  const [trips, setTrips] = useState([]);
  const [history, setHistory] = useState([]);
  const [destinations, setDestinations] = useState([]);

  /* ----- ui state ----- */
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [destinationsLoading, setDestinationsLoading] = useState(false);
  const [error, setError] = useState("");
  const [noMatchMessage, setNoMatchMessage] = useState("");

  /* ----- filters ----- */
  const [filters, setFilters] = useState(DEFAULT_ACC_FILTERS);
  const [applied, setApplied] = useState(null); // snapshot used for the last search
  const [sortMode, setSortMode] = useState("best");
  const [touched, setTouched] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile drawer

  /* ----- selection ----- */
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  const selectedDestination = useMemo(
    () => destinations.find((d) => String(destId(d)) === String(selectedDestinationId)) || null,
    [destinations, selectedDestinationId]
  );

  const coordinates = useMemo(() => {
    const lat = selectedDestination?.latitude ?? selectedDestination?.lat;
    const lon = selectedDestination?.longitude ?? selectedDestination?.lon ?? selectedDestination?.lng;
    if (lat == null || lon == null || lat === "" || lon === "") return null;
    const la = Number(lat);
    const lo = Number(lon);
    return Number.isFinite(la) && Number.isFinite(lo) ? { latitude: la, longitude: lo } : null;
  }, [selectedDestination]);

  const issues = useMemo(
    () => validateAccFilters(filters, { hasCoordinates: Boolean(coordinates) }),
    [filters, coordinates]
  );
  const errorFor = (field) => issues.find((i) => i.level === "error" && i.field === field)?.message;
  const hasBlockingError = issues.some((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  const activeChips = useMemo(() => getActiveAccFilters(filters), [filters]);
  const sorted = useMemo(() => sortAccommodations(results, sortMode), [results, sortMode]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    ACCOMMODATION_CATEGORIES.forEach((c) => {
      counts[c.id] = allAccommodations.filter(
        (item) => String(item?.accommodationType || "").toUpperCase() === c.id
      ).length;
    });
    return counts;
  }, [allAccommodations]);

  const clearFeedback = () => {
    setFeedback("");
    setFeedbackError("");
  };
  const closeToast = useCallback(() => setFeedback(""), []);

  /* ----- loaders (same endpoints as before) ----- */
  const loadAccommodations = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAccommodations();
      const list = Array.isArray(data) ? data : [];
      setAllAccommodations(list);
      setResults(list);
      setResultSource("browse");
      setApplied(null);
      setNoMatchMessage("");
    } catch (err) {
      console.error("Unable to load accommodations:", err);
      setError(err?.message || "Unable to load accommodations.");
    } finally {
      setLoading(false);
    }
  };

  const loadTrips = async () => {
    try {
      setTripsLoading(true);
      const data = await getTrips();
      const list = Array.isArray(data) ? data : [];
      setTrips(list);
      if (!selectedTripId && list.length > 0) setSelectedTripId(String(tripId(list[0])));
    } catch (err) {
      console.error("Unable to load trips:", err);
    } finally {
      setTripsLoading(false);
    }
  };

  const loadDestinations = async (id) => {
    if (!id) {
      setDestinations([]);
      setSelectedDestinationId("");
      return;
    }
    try {
      setDestinationsLoading(true);
      setSelectedDestinationId("");
      const data = await getTripDestinationsForFood(id);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.destinations)
          ? data.destinations
          : Array.isArray(data?.content)
            ? data.content
            : [];
      setDestinations(list);
    } catch (err) {
      console.error("Unable to load trip destinations:", err);
      setDestinations([]);
      setFeedbackError(err?.message || "Unable to load destinations for this trip.");
    } finally {
      setDestinationsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await getAccommodationHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Unable to load accommodation history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadAccommodations();
    loadTrips();
    loadHistory();
  }, []);

  useEffect(() => {
    loadDestinations(selectedTripId);
  }, [selectedTripId]);

  /* ----- filter handlers ----- */
  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  /*
   * Apply: builds the AccommodationSearchRequest and calls
   * POST /api/accommodations/search. Filtering happens on the server;
   * nothing is filtered locally any more.
   */
  const runSearch = async (nextFilters = filters) => {
    setTouched(true);
    const check = validateAccFilters(nextFilters, { hasCoordinates: Boolean(coordinates) });
    if (check.some((i) => i.level === "error")) return;

    const request = buildSearchRequest(nextFilters, {
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      sendCoordinates: Boolean(coordinates),
      destinationName: selectedDestination ? destName(selectedDestination) : "",
      tripId: selectedTripId,
    });

    setSearching(true);
    setError("");
    setNoMatchMessage("");
    clearFeedback();
    try {
      const data = await searchAccommodations(request);
      setResults(data);
      setResultSource("search");
      setApplied({ filters: nextFilters, chips: getActiveAccFilters(nextFilters) });
      setFiltersOpen(false);
    } catch (err) {
      if (isNoMatchError(err)) {
        /* Valid search, nothing matched: show an empty state, not an error. */
        setResults([]);
        setResultSource("search");
        setApplied({ filters: nextFilters, chips: getActiveAccFilters(nextFilters) });
        setNoMatchMessage(err.message);
        setFiltersOpen(false);
      } else {
        console.error("Accommodation search failed:", err);
        setError(err?.message || "Accommodation search failed. Please try again.");
      }
    } finally {
      setSearching(false);
    }
  };

  const clearAll = () => {
    setFilters(DEFAULT_ACC_FILTERS);
    setTouched(false);
    setSortMode("best");
    setNoMatchMessage("");
    setError("");
    setResults(allAccommodations);
    setResultSource("browse");
    setApplied(null);
  };

  const removeChip = (key) => {
    const next = clearAccFilter(filters, key);
    setFilters(next);
    if (applied) runSearch(next);
  };

  const chooseCategory = (id) => {
    const next = { ...filters, accommodationType: filters.accommodationType === id ? "" : id };
    setFilters(next);
    runSearch(next);
  };

  const filtersChanged =
    applied !== null &&
    JSON.stringify(applied.filters) !== JSON.stringify(filters);

  /* ----- actions (same backend calls as before) ----- */
  const openDetails = async (item) => {
    clearFeedback();
    setSelectedAccommodation(item);
    setModalLoading(true);
    try {
      await viewAccommodation(item.accommodationId);
      const details = await getAccommodation(item.accommodationId);
      /* keep search-only fields (distance, match score) on the detail view */
      setSelectedAccommodation({ ...item, ...(details || {}) });
      await loadHistory();
    } catch (err) {
      console.error("Unable to open accommodation details:", err);
      setFeedbackError(err?.message || "Unable to load accommodation details.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleSelect = async (item) => {
    try {
      clearFeedback();
      setActionLoading(`select-${item.accommodationId}`);
      await selectAccommodation(item.accommodationId, selectedTripId);
      setFeedback(`${item.name || "Accommodation"} selected successfully.`);
      await loadHistory();
    } catch (err) {
      console.error("Unable to select accommodation:", err);
      setFeedbackError(err?.message || "Unable to select accommodation.");
    } finally {
      setActionLoading("");
    }
  };

  const handleAddToTrip = async () => {
    if (!selectedAccommodation) return;
    if (!selectedTripId) {
      setFeedbackError("Please select an existing trip first.");
      return;
    }
    try {
      clearFeedback();
      setActionLoading("add-trip");
      await addAccommodationToTrip(selectedAccommodation.accommodationId, selectedTripId);
      setFeedback("Accommodation added to the selected trip successfully.");
      await loadHistory();
    } catch (err) {
      console.error("Unable to add accommodation to trip:", err);
      setFeedbackError(err?.message || "Unable to add accommodation to trip.");
    } finally {
      setActionLoading("");
    }
  };

  const loadTripHistory = async () => {
    if (!selectedTripId) return;
    try {
      clearFeedback();
      setHistoryLoading(true);
      const data = await getAccommodationHistoryByTrip(selectedTripId);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Unable to load trip accommodation history:", err);
      setFeedbackError(err?.message || "Unable to load trip history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ----- render ----- */
  const showSkeleton = loading || searching;
  const resultCount = sorted.length;

  return (
    <section className="accommodation-page">
      <div className="accommodation-header">
        <div>
          <h1>Accommodation</h1>
          <p>
            Find stays for your trip, narrow them with filters, and add your
            selected stay to an existing trip.
          </p>
        </div>
        {onBack && (
          <button type="button" className="accommodation-back-button" onClick={onBack}>
            ← Back
          </button>
        )}
      </div>

      <Toast message={!selectedAccommodation ? feedback : ""} onClose={closeToast} />

      {/* ---------- categories ---------- */}
      <div className="accommodation-category-section">
        <div className="accommodation-category-heading">
          <div>
            <h2>Choose your stay</h2>
            <p>Pick a category to search it right away, or use the filters below.</p>
          </div>
          <span>{allAccommodations.length} saved stays</span>
        </div>
        <div className="accommodation-category-grid">
          {ACCOMMODATION_CATEGORIES.map((category) => {
            const count = categoryCounts[category.id] || 0;
            const active = filters.accommodationType === category.id;
            return (
              <button
                type="button"
                key={category.id}
                className={`accommodation-category-card ${active ? "active" : ""}`}
                aria-pressed={active}
                onClick={() => chooseCategory(category.id)}
                disabled={searching}
              >
                <span className="accommodation-category-icon">{category.icon}</span>
                <span className="accommodation-category-title">{category.title}</span>
                <span className="accommodation-category-subtitle">{category.subtitle}</span>
                <span className="accommodation-category-count">
                  {count} {count === 1 ? "option" : "options"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- trip + destination ---------- */}
      <div className="af-context">
        <label className="af-field">
          <span className="af-label">Trip</span>
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            disabled={tripsLoading}
          >
            <option value="">{tripsLoading ? "Loading trips..." : "Select an existing trip"}</option>
            {trips.map((trip) => (
              <option key={tripId(trip)} value={tripId(trip)}>{tripName(trip)}</option>
            ))}
          </select>
        </label>
        <label className="af-field">
          <span className="af-label">Trip destination</span>
          <select
            value={selectedDestinationId}
            onChange={(e) => setSelectedDestinationId(e.target.value)}
            disabled={destinationsLoading || destinations.length === 0}
          >
            <option value="">
              {destinationsLoading
                ? "Loading trip destinations..."
                : destinations.length === 0
                  ? "No saved destinations for this trip"
                  : "Select a trip destination"}
            </option>
            {destinations.map((d) => (
              <option key={destId(d)} value={destId(d)}>{destName(d)}</option>
            ))}
          </select>
          <small className="af-hint">
            Used for the distance filter and the nearby search below.
          </small>
        </label>
      </div>

      {/* ---------- nearby (OpenStreetMap) ---------- */}
      <NearbyPlacesPanel type="accommodation" selectedDestination={selectedDestination} />

      {/* ---------- filters + results ---------- */}
      <div className="af-layout">
        <button
          type="button"
          className="af-drawer-toggle"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          {filtersOpen ? "Hide filters" : `Filters${activeChips.length ? ` (${activeChips.length})` : ""}`}
        </button>

        <aside className={`af-sidebar ${filtersOpen ? "open" : ""}`} aria-label="Accommodation filters">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
            noValidate
          >
            <h2 className="af-side-title">Filters</h2>

            <Field label="Destination contains" hint="Matches the stay's destination text">
              <input
                type="text"
                value={filters.destinationText}
                onChange={(e) => setFilter("destinationText", e.target.value)}
                placeholder="e.g. Goa"
              />
            </Field>
            <label className="af-check">
              <input
                type="checkbox"
                checked={filters.onlyThisDestination}
                disabled={!selectedDestination || Boolean(filters.destinationText.trim())}
                onChange={(e) => setFilter("onlyThisDestination", e.target.checked)}
              />
              Only the selected trip destination
            </label>

            <Field label="Accommodation type">
              <select
                value={filters.accommodationType}
                onChange={(e) => setFilter("accommodationType", e.target.value)}
              >
                <option value="">All types</option>
                {ACCOMMODATION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <div className="af-row">
              <Field label="Min ₹ / night" error={touched && errorFor("minPricePerNight")}>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={filters.minPricePerNight}
                  onChange={(e) => setFilter("minPricePerNight", e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Max ₹ / night" error={touched && errorFor("maxPricePerNight")}>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={filters.maxPricePerNight}
                  onChange={(e) => setFilter("maxPricePerNight", e.target.value)}
                  placeholder="Any"
                />
              </Field>
            </div>

            <div className="af-row">
              <Field label="Check-in">
                <input
                  type="date"
                  value={filters.checkInDate}
                  onChange={(e) => setFilter("checkInDate", e.target.value)}
                />
              </Field>
              <Field label="Check-out" error={touched && errorFor("checkOutDate")}>
                <input
                  type="date"
                  value={filters.checkOutDate}
                  min={filters.checkInDate || undefined}
                  onChange={(e) => setFilter("checkOutDate", e.target.value)}
                />
              </Field>
            </div>

            <div className="af-row">
              <Field label="Guests" error={touched && errorFor("guests")}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={filters.guests}
                  onChange={(e) => setFilter("guests", e.target.value)}
                  placeholder="Any"
                />
              </Field>
              <Field
                label="Max distance (km)"
                error={touched && errorFor("maxDistanceKm")}
                hint={coordinates ? "From the selected destination" : "Needs a destination with a saved location"}
              >
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={filters.maxDistanceKm}
                  onChange={(e) => setFilter("maxDistanceKm", e.target.value)}
                  placeholder="Any"
                />
              </Field>
            </div>

            <Field label="Beach">
              <select value={filters.beachFilter} onChange={(e) => setFilter("beachFilter", e.target.value)}>
                {BEACH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Swimming pool">
              <select value={filters.poolFilter} onChange={(e) => setFilter("poolFilter", e.target.value)}>
                {POOL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <fieldset className="af-facilities">
              <legend>Facilities</legend>
              {FACILITY_OPTIONS.map(({ key, label }) => (
                <label className="af-check" key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(filters[key])}
                    onChange={(e) => setFilter(key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            {warnings.map((w) => (
              <p className="af-warning" key={w.message}>{w.message}</p>
            ))}
            {touched && hasBlockingError && (
              <p className="af-error-summary" id="af-error-summary" role="alert">
                Please fix the highlighted fields before searching.
              </p>
            )}

            <div className="af-actions">
              <button
                type="submit"
                className="af-apply"
                disabled={searching}
                aria-describedby={touched && hasBlockingError ? "af-error-summary" : undefined}
              >
                {searching ? "Searching..." : "Apply filters"}
              </button>
              <button type="button" className="af-clear" onClick={clearAll} disabled={searching}>
                Clear all
              </button>
            </div>
          </form>
        </aside>

        <div className="af-results">
          <div className="af-result-head">
            <p className="af-count" aria-live="polite">
              {showSkeleton
                ? "Loading stays..."
                : resultSource === "search"
                  ? `${resultCount} ${resultCount === 1 ? "stay matches" : "stays match"} your filters`
                  : `Showing all ${resultCount} saved ${resultCount === 1 ? "stay" : "stays"}`}
            </p>
            <label className="af-sort">
              <span>Sort</span>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} aria-label="Sort results">
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="accommodation-button"
              onClick={() => {
                loadAccommodations();
                loadHistory();
              }}
              disabled={loading || searching}
            >
              Refresh
            </button>
          </div>

          {resultSource === "search" && (
            <p className="af-note">
              Search results only include stays marked available. Availability for your dates is
              not checked against real bookings; confirm with the property.
            </p>
          )}

          {activeChips.length > 0 && (
            <div className="af-chips" aria-label="Active filters">
              {activeChips.map((chip) => (
                <button
                  type="button"
                  key={chip.key}
                  className="af-chip"
                  onClick={() => removeChip(chip.key)}
                  aria-label={`Remove filter ${chip.label}: ${chip.value}`}
                >
                  <b>{chip.label}:</b> {chip.value} <span aria-hidden="true">✕</span>
                </button>
              ))}
              <button type="button" className="af-chip af-chip-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {filtersChanged && !searching && (
            <p className="af-banner">Filters changed. Press “Apply filters” to update the results.</p>
          )}

          {feedbackError && !selectedAccommodation && (
            <div className="accommodation-message error" role="alert">{feedbackError}</div>
          )}

          {error ? (
            <div className="accommodation-message error" role="alert">
              <p>{error}</p>
              <button type="button" className="accommodation-button" onClick={() => (applied ? runSearch(applied.filters) : loadAccommodations())}>
                Try again
              </button>
            </div>
          ) : showSkeleton ? (
            <div className="af-skeleton-grid" aria-busy="true" aria-label="Loading stays">
              {[0, 1, 2, 3].map((n) => (
                <div className="af-skeleton" key={n}>
                  <i /><i /><i /><i />
                </div>
              ))}
            </div>
          ) : resultCount === 0 ? (
            <div className="accommodation-empty">
              <h2>No accommodations found</h2>
              <p>
                {noMatchMessage ||
                  (resultSource === "search"
                    ? "No stay matches these filters."
                    : "There are no accommodation records saved yet.")}
              </p>
              {resultSource === "search" && (
                <button type="button" className="af-apply" onClick={clearAll}>
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="accommodation-grid">
              {sorted.map((item) => (
                <article className="accommodation-card" key={item.accommodationId}>
                  <div className="af-card-banner" aria-hidden="true">
                    <span>{TYPE_ICON[String(item.accommodationType || "").toUpperCase()] || "🏨"}</span>
                    {resultSource === "search" && item.matchScore != null && (
                      <em>Match {Math.round(Number(item.matchScore))}</em>
                    )}
                  </div>
                  <div className="accommodation-card-top">
                    <div>
                      <h2>{item.name || "Unnamed accommodation"}</h2>
                      <div className="accommodation-location">{item.destination || "Destination unavailable"}</div>
                      <div className="accommodation-address">{item.address || "Address unavailable"}</div>
                    </div>
                    <span className="accommodation-type">{labelize(item.accommodationType)}</span>
                  </div>

                  <p className="accommodation-description">
                    {item.description || "No description provided."}
                  </p>

                  <div className="accommodation-price-row">
                    <span className="accommodation-price">
                      {formatMoney(item.pricePerNight)}
                      <small> / night</small>
                    </span>
                    <span className="accommodation-rating">★ {item.rating ?? "—"}</span>
                  </div>

                  <div className="accommodation-meta">
                    <span>{item.maxGuests ?? "—"} guests</span>
                    <span>{item.availability ? "Listed as available" : "Unavailable"}</span>
                    {item.distanceKm != null && <span>{Number(item.distanceKm).toFixed(1)} km away</span>}
                  </div>

                  <div className="accommodation-amenities">
                    {item.beachAccess && <span className="available">Beach access</span>}
                    {item.beachView && <span className="available">Beach view</span>}
                    {item.beachfront && <span className="available">Beachfront</span>}
                    {item.nearBeach && <span className="available">Near beach</span>}
                    {item.seaView && <span className="available">Sea view</span>}
                    {item.swimmingPool && <span className="available">Pool</span>}
                    {item.privatePool && <span className="available">Private pool</span>}
                    {item.familyFriendly && <span className="available">Family</span>}
                    {item.accessibility && <span className="available">Accessible</span>}
                    {item.wifi && <span className="available">Wi-Fi</span>}
                    {item.parking && <span className="available">Parking</span>}
                    {item.restaurant && <span className="available">Restaurant</span>}
                    {item.breakfastIncluded && <span className="available">Breakfast</span>}
                  </div>

                  <div className="accommodation-actions">
                    <button type="button" className="accommodation-button primary" onClick={() => openDetails(item)}>
                      View details
                    </button>
                    <button
                      type="button"
                      className="accommodation-button"
                      onClick={() => handleSelect(item)}
                      disabled={actionLoading === `select-${item.accommodationId}`}
                    >
                      {actionLoading === `select-${item.accommodationId}` ? "Selecting..." : "Select"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          HISTORY
      ===================================================== */}

      <div className="accommodation-history">
        <h3>
          Accommodation History
        </h3>

        <div className="accommodation-trip-picker">
          <select
            value={selectedTripId}
            onChange={(event) =>
              setSelectedTripId(
                event.target.value
              )
            }
            disabled={tripsLoading}
          >
            <option value="">
              {tripsLoading
                ? "Loading trips..."
                : "Select an existing trip"}
            </option>

            {trips.map((trip) => {
              const id =
                trip?.tripId ??
                trip?.id;

              const name =
                trip?.tripName ||
                trip?.name ||
                `Trip ${id}`;

              return (
                <option
                  key={id}
                  value={id}
                >
                  {name}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            className="accommodation-button"
            onClick={
              loadTripHistory
            }
            disabled={
              !selectedTripId ||
              historyLoading
            }
          >
            {historyLoading
              ? "Loading..."
              : "Trip history"}
          </button>

          <button
            type="button"
            className="accommodation-button"
            onClick={loadHistory}
            disabled={
              historyLoading
            }
          >
            All history
          </button>
        </div>

        {history.length > 0 && (
          <div>
            {history
              .slice(0, 12)
              .map((entry) => (
                <div
                  className="accommodation-history-row"
                  key={
                    entry.historyId
                  }
                >
                  <div>
                    <strong>
                      {entry.accommodationName ||
                        `Accommodation #${entry.accommodationId}`}
                    </strong>

                    <small>
                      {entry.destination ||
                        "—"}{" "}
                      •{" "}
                      {formatDateTime(
                        entry.createdAt
                      )}

                      {entry.tripId
                        ? ` • Trip ${entry.tripId}`
                        : ""}
                    </small>

                    <small>
                      {entry.filterUsed ||
                        "No filter information"}
                    </small>
                  </div>

                  <div className="accommodation-history-action">
                    {labelize(
                      entry.action
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {historyLoading && (
          <p className="accommodation-count">
            Loading history...
          </p>
        )}
      </div>

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {selectedAccommodation && (
        <div
          className="accommodation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedAccommodation(
                null
              );

              clearFeedback();
            }
          }}
        >
          <div
            className="accommodation-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="accommodation-modal-head">
              <div>
                <h2>
                  {selectedAccommodation.name ||
                    "Accommodation details"}
                </h2>

                <p>
                  {selectedAccommodation.destination ||
                    "Destination unavailable"}

                  {selectedAccommodation.accommodationType
                    ? ` • ${labelize(
                        selectedAccommodation.accommodationType
                      )}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                className="accommodation-close"
                onClick={() => {
                  setSelectedAccommodation(
                    null
                  );

                  clearFeedback();
                }}
                aria-label="Close accommodation details"
              >
                ×
              </button>
            </div>

            {modalLoading ? (
              <div className="accommodation-message">
                Loading latest accommodation
                details...
              </div>
            ) : (
              <>
                <p className="accommodation-description">
                  {selectedAccommodation.description ||
                    "No description provided."}
                </p>

                <div className="accommodation-detail-grid">
                  {DETAIL_FIELDS.map(
                    ([label, key]) => {
                      const raw =
                        selectedAccommodation[
                          key
                        ];

                      let value =
                        valueText(raw);

                      if (
                        key ===
                          "pricePerNight" &&
                        raw !== null &&
                        raw !==
                          undefined
                      ) {
                        value = `${formatMoney(
                          raw
                        )} / night`;
                      }

                      if (
                        key === "rating" &&
                        raw !== null &&
                        raw !==
                          undefined
                      ) {
                        value = `★ ${raw}`;
                      }

                      return (
                        <div
                          className="accommodation-detail-item"
                          key={key}
                        >
                          <strong>
                            {label}
                          </strong>

                          <span>
                            {value}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="accommodation-trip-picker">
                  <select
                    value={
                      selectedTripId
                    }
                    onChange={(event) =>
                      setSelectedTripId(
                        event.target.value
                      )
                    }
                    disabled={
                      tripsLoading
                    }
                  >
                    <option value="">
                      Select an existing
                      trip
                    </option>

                    {trips.map(
                      (trip) => {
                        const id =
                          trip?.tripId ??
                          trip?.id;

                        const name =
                          trip?.tripName ||
                          trip?.name ||
                          `Trip ${id}`;

                        return (
                          <option
                            key={id}
                            value={id}
                          >
                            {name}
                          </option>
                        );
                      }
                    )}
                  </select>

                  <button
                    type="button"
                    className="accommodation-button success"
                    onClick={
                      handleAddToTrip
                    }
                    disabled={
                      actionLoading ===
                      "add-trip"
                    }
                  >
                    {actionLoading ===
                    "add-trip"
                      ? "Adding..."
                      : "Add to trip"}
                  </button>
                </div>

                {feedback && (
                  <div className="accommodation-feedback">
                    {feedback}
                  </div>
                )}

                {feedbackError && (
                  <div className="accommodation-feedback error">
                    {feedbackError}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default Accommodation;
