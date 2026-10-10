import { useEffect, useMemo, useState } from "react";
import {
  addAccommodationToTrip,
  getAccommodation,
  getAccommodationHistory,
  getAccommodationHistoryByTrip,
  getAccommodations,
  selectAccommodation,
  viewAccommodation,
} from "../services/accommodationService";
import { getTrips } from "../services/tripService";
import "../styles/Accommodation.css";

/*
 * Accommodation categories displayed in the frontend.
 *
 * These are UI categories. Actual accommodation records
 * still come from the backend.
 */
const ACCOMMODATION_TYPES = [
  {
    value: "HOTEL",
    label: "Hotel Suggestions",
  },
  {
    value: "BUDGET_HOTEL",
    label: "Budget Hotels",
  },
  {
    value: "LUXURY_HOTEL",
    label: "Luxury Hotels",
  },
  {
    value: "HOMESTAY",
    label: "Homestays",
  },
  {
    value: "RESORT",
    label: "Resorts",
  },
  {
    value: "HOSTEL",
    label: "Hostels",
  },
];

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

function Accommodation({ onBack }) {
  const [accommodations, setAccommodations] =
    useState([]);

  const [trips, setTrips] = useState([]);

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  const [tripsLoading, setTripsLoading] =
    useState(false);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [typeFilter, setTypeFilter] =
    useState("ALL");

  const [selectedCategory, setSelectedCategory] =
    useState("ALL");

  const [poolFilter, setPoolFilter] =
    useState("ALL");

  const [beachFilter, setBeachFilter] =
    useState("ALL");

  const [ratingFilter, setRatingFilter] =
    useState("ALL");

  const [availableOnly, setAvailableOnly] =
    useState(false);

  const [
    selectedAccommodation,
    setSelectedAccommodation,
  ] = useState(null);

  const [selectedTripId, setSelectedTripId] =
    useState("");

  const [modalLoading, setModalLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  const [feedbackError, setFeedbackError] =
    useState("");

  /*
   * Load all accommodations.
   */
  const loadAccommodations = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAccommodations();

      setAccommodations(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Unable to load accommodations:",
        err
      );

      setError(
        err?.message ||
          "Unable to load accommodations."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Load the user's existing trips.
   */
  const loadTrips = async () => {
    try {
      setTripsLoading(true);

      const data = await getTrips();

      const list = Array.isArray(data)
        ? data
        : [];

      setTrips(list);

      if (
        !selectedTripId &&
        list.length > 0
      ) {
        setSelectedTripId(
          String(
            list[0]?.tripId ??
              list[0]?.id ??
              ""
          )
        );
      }
    } catch (err) {
      console.error(
        "Unable to load trips:",
        err
      );
    } finally {
      setTripsLoading(false);
    }
  };

  /*
   * Load global accommodation history.
   */
  const loadHistory = async () => {
    try {
      setHistoryLoading(true);

      const data =
        await getAccommodationHistory();

      setHistory(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Unable to load accommodation history:",
        err
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadAccommodations();
    loadTrips();
    loadHistory();
  }, []);

  /*
   * Get only the accommodation types that actually
   * exist in the backend response.
   *
   * This is used for counts, not for the dropdown.
   */
  const backendAccommodationTypes =
    useMemo(() => {
      return [
        ...new Set(
          accommodations
            .map(
              (item) =>
                item?.accommodationType
            )
            .filter(Boolean)
        ),
      ].sort();
    }, [accommodations]);

  /*
   * Pool types are taken from the actual backend.
   */
  const poolTypes = useMemo(() => {
    return [
      ...new Set(
        accommodations
          .map(
            (item) => item?.poolType
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [accommodations]);

  /*
   * Category counts are based on real backend records.
   */
  const categoryCounts = useMemo(() => {
    const counts = {};

    ACCOMMODATION_CATEGORIES.forEach(
      (category) => {
        counts[category.id] =
          accommodations.filter(
            (item) =>
              String(
                item?.accommodationType ||
                  ""
              ).toUpperCase() ===
              category.id
          ).length;
      }
    );

    return counts;
  }, [accommodations]);

  /*
   * Apply frontend filters to the backend results.
   */
  const filteredAccommodations =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      return accommodations.filter(
        (item) => {
          const searchable = [
            item?.name,
            item?.destination,
            item?.address,
            item?.description,
            item?.accommodationType,
            item?.poolType,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (
            term &&
            !searchable.includes(term)
          ) {
            return false;
          }

          /*
           * Category filtering.
           */
          if (
            selectedCategory !==
              "ALL" &&
            String(
              item?.accommodationType ||
                ""
            ).toUpperCase() !==
              selectedCategory
          ) {
            return false;
          }

          /*
           * Dropdown accommodation type filtering.
           */
          if (
            typeFilter !== "ALL" &&
            String(
              item?.accommodationType ||
                ""
            ).toUpperCase() !==
              typeFilter
          ) {
            return false;
          }

          /*
           * Pool filters.
           */
          if (poolFilter !== "ALL") {
            if (
              poolFilter ===
                "REQUIRED" &&
              item?.swimmingPool !== true
            ) {
              return false;
            }

            if (
              poolFilter ===
                "PRIVATE" &&
              item?.privatePool !== true
            ) {
              return false;
            }

            if (
              poolFilter === "KIDS" &&
              item?.kidsPool !== true
            ) {
              return false;
            }

            if (
              poolFilter.startsWith(
                "TYPE:"
              ) &&
              item?.poolType !==
                poolFilter.slice(5)
            ) {
              return false;
            }
          }

          /*
           * Beach filters.
           */
          if (beachFilter !== "ALL") {
            if (
              beachFilter ===
                "ACCESS" &&
              item?.beachAccess !== true
            ) {
              return false;
            }

            if (
              beachFilter === "VIEW" &&
              item?.beachView !== true
            ) {
              return false;
            }

            if (
              beachFilter ===
                "BEACHFRONT" &&
              item?.beachfront !== true
            ) {
              return false;
            }

            if (
              beachFilter === "NEAR" &&
              item?.nearBeach !== true
            ) {
              return false;
            }

            if (
              beachFilter ===
                "PARTIAL_SEA" &&
              item?.partialSeaView !== true
            ) {
              return false;
            }

            if (
              beachFilter === "SEA" &&
              item?.seaView !== true
            ) {
              return false;
            }
          }

          /*
           * Rating filter.
           */
          if (ratingFilter !== "ALL") {
            const minimumRating =
              Number(ratingFilter);

            if (
              !Number.isFinite(
                Number(item?.rating)
              ) ||
              Number(item.rating) <
                minimumRating
            ) {
              return false;
            }
          }

          /*
           * Availability filter.
           */
          if (
            availableOnly &&
            item?.availability !== true
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      accommodations,
      search,
      selectedCategory,
      typeFilter,
      poolFilter,
      beachFilter,
      ratingFilter,
      availableOnly,
    ]);

  const clearFeedback = () => {
    setFeedback("");
    setFeedbackError("");
  };

  /*
   * Select one of the six accommodation categories.
   */
  const handleCategorySelect = (
    categoryId
  ) => {
    clearFeedback();

    if (categoryId === "ALL") {
      setSelectedCategory("ALL");
      setTypeFilter("ALL");
      return;
    }

    setSelectedCategory(categoryId);

    /*
     * The category is always available in the UI.
     * If there are no backend records for that type,
     * the result correctly becomes empty.
     */
    setTypeFilter(categoryId);
  };

  /*
   * Open accommodation details.
   */
  const openDetails = async (item) => {
    clearFeedback();

    setSelectedAccommodation(item);

    setModalLoading(true);

    try {
      /*
       * Backend records the VIEWED action.
       */
      await viewAccommodation(
        item.accommodationId
      );

      /*
       * Fetch the latest complete record.
       */
      const details =
        await getAccommodation(
          item.accommodationId
        );

      setSelectedAccommodation(
        details || item
      );

      await loadHistory();
    } catch (err) {
      console.error(
        "Unable to open accommodation details:",
        err
      );

      setFeedbackError(
        err?.message ||
          "Unable to load accommodation details."
      );
    } finally {
      setModalLoading(false);
    }
  };

  /*
   * Select accommodation through backend.
   */
  const handleSelect = async (item) => {
    try {
      clearFeedback();

      setActionLoading(
        `select-${item.accommodationId}`
      );

      await selectAccommodation(
        item.accommodationId
      );

      setFeedback(
        `${
          item.name ||
          "Accommodation"
        } selected successfully.`
      );

      await loadHistory();
    } catch (err) {
      console.error(
        "Unable to select accommodation:",
        err
      );

      setFeedbackError(
        err?.message ||
          "Unable to select accommodation."
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
   * Add accommodation to an existing trip.
   */
  const handleAddToTrip = async () => {
    if (!selectedAccommodation) {
      return;
    }

    if (!selectedTripId) {
      setFeedbackError(
        "Please select an existing trip first."
      );

      return;
    }

    try {
      clearFeedback();

      setActionLoading("add-trip");

      await addAccommodationToTrip(
        selectedAccommodation.accommodationId,
        selectedTripId
      );

      setFeedback(
        "Accommodation added to the selected trip successfully."
      );

      await loadHistory();
    } catch (err) {
      console.error(
        "Unable to add accommodation to trip:",
        err
      );

      setFeedbackError(
        err?.message ||
          "Unable to add accommodation to trip."
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
   * Load accommodation history for a selected trip.
   */
  const loadTripHistory = async () => {
    if (!selectedTripId) {
      return;
    }

    try {
      clearFeedback();

      setHistoryLoading(true);

      const data =
        await getAccommodationHistoryByTrip(
          selectedTripId
        );

      setHistory(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Unable to load trip accommodation history:",
        err
      );

      setFeedbackError(
        err?.message ||
          "Unable to load trip history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  /*
   * Reset all filters.
   */
  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setTypeFilter("ALL");
    setPoolFilter("ALL");
    setBeachFilter("ALL");
    setRatingFilter("ALL");
    setAvailableOnly(false);
  };

  return (
    <section className="accommodation-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="accommodation-header">
        <div>
          <h1>Accommodation</h1>

          <p>
            Find accommodation options
            for your trip and add your
            selected stay to an existing
            trip.
          </p>
        </div>

        {onBack && (
          <button
            type="button"
            className="accommodation-back-button"
            onClick={onBack}
          >
            ← Back
          </button>
        )}
      </div>

      {/* =====================================================
          ACCOMMODATION CATEGORIES
      ===================================================== */}

      <div className="accommodation-category-section">
        <div className="accommodation-category-heading">
          <div>
            <h2>Choose Your Stay</h2>

            <p>
              Explore accommodation
              categories for your trip.
            </p>
          </div>

          <span>
            {accommodations.length}{" "}
            backend records
          </span>
        </div>

        <div className="accommodation-category-grid">
          {ACCOMMODATION_CATEGORIES.map(
            (category) => {
              const count =
                categoryCounts[
                  category.id
                ] || 0;

              const active =
                selectedCategory ===
                category.id;

              return (
                <button
                  type="button"
                  key={category.id}
                  className={`accommodation-category-card ${
                    active
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleCategorySelect(
                      category.id
                    )
                  }
                >
                  <span className="accommodation-category-icon">
                    {category.icon}
                  </span>

                  <span className="accommodation-category-title">
                    {category.title}
                  </span>

                  <span className="accommodation-category-subtitle">
                    {category.subtitle}
                  </span>

                  <span className="accommodation-category-count">
                    {count}{" "}
                    {count === 1
                      ? "option"
                      : "options"}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {selectedCategory !==
          "ALL" && (
          <button
            type="button"
            className="accommodation-category-clear"
            onClick={() =>
              handleCategorySelect(
                "ALL"
              )
            }
          >
            View all accommodation
            categories
          </button>
        )}
      </div>

      {/* =====================================================
          SEARCH AND FILTERS
      ===================================================== */}

      <div className="accommodation-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search name, destination, address..."
          aria-label="Search accommodations"
        />

        <select
          value={typeFilter}
          onChange={(event) => {
            const value =
              event.target.value;

            setTypeFilter(value);

            /*
             * Keep the category cards and
             * dropdown synchronized.
             */
            setSelectedCategory(
              value === "ALL"
                ? "ALL"
                : value
            );
          }}
          aria-label="Accommodation type"
        >
          <option value="ALL">
            All accommodation types
          </option>

          {ACCOMMODATION_TYPES.map(
            (type) => (
              <option
                key={type.value}
                value={type.value}
              >
                {type.label}
              </option>
            )
          )}
        </select>

        <select
          value={beachFilter}
          onChange={(event) =>
            setBeachFilter(
              event.target.value
            )
          }
          aria-label="Beach filter"
        >
          <option value="ALL">
            Any beach option
          </option>

          <option value="ACCESS">
            Beach access
          </option>

          <option value="VIEW">
            Beach view
          </option>

          <option value="BEACHFRONT">
            Beachfront
          </option>

          <option value="NEAR">
            Near beach
          </option>

          <option value="PARTIAL_SEA">
            Partial sea view
          </option>

          <option value="SEA">
            Sea view
          </option>
        </select>

        <select
          value={poolFilter}
          onChange={(event) =>
            setPoolFilter(
              event.target.value
            )
          }
          aria-label="Pool filter"
        >
          <option value="ALL">
            Any pool option
          </option>

          <option value="REQUIRED">
            Swimming pool
          </option>

          <option value="PRIVATE">
            Private pool
          </option>

          <option value="KIDS">
            Kids pool
          </option>

          {poolTypes.map((type) => (
            <option
              key={type}
              value={`TYPE:${type}`}
            >
              {labelize(type)} pool
            </option>
          ))}
        </select>

        <select
          value={ratingFilter}
          onChange={(event) =>
            setRatingFilter(
              event.target.value
            )
          }
          aria-label="Minimum rating"
        >
          <option value="ALL">
            Any rating
          </option>

          <option value="4">
            4.0+ rating
          </option>

          <option value="4.5">
            4.5+ rating
          </option>
        </select>

        <div className="accommodation-toolbar-checks">
          <label className="accommodation-check">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) =>
                setAvailableOnly(
                  event.target.checked
                )
              }
            />

            Available only
          </label>

          <button
            type="button"
            className="accommodation-button"
            onClick={resetFilters}
          >
            Clear filters
          </button>

          <button
            type="button"
            className="accommodation-button"
            onClick={() => {
              loadAccommodations();
              loadHistory();
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* =====================================================
          RESULTS
      ===================================================== */}

      {error ? (
        <div className="accommodation-message error">
          {error}
        </div>
      ) : loading ? (
        <div className="accommodation-message">
          Loading accommodations...
        </div>
      ) : filteredAccommodations.length ===
        0 ? (
        <div className="accommodation-empty">
          <h2>
            No accommodations found
          </h2>

          <p>
            {selectedCategory !==
            "ALL"
              ? `There are currently no backend accommodation records for ${labelize(
                  selectedCategory
                )}.`
              : "Try changing the filters or search text."}
          </p>
        </div>
      ) : (
        <>
          <p className="accommodation-count">
            Showing{" "}
            {
              filteredAccommodations.length
            }{" "}
            of {accommodations.length}{" "}
            accommodations
          </p>

          <div className="accommodation-grid">
            {filteredAccommodations.map(
              (item) => (
                <article
                  className="accommodation-card"
                  key={
                    item.accommodationId
                  }
                >
                  <div className="accommodation-card-top">
                    <div>
                      <h2>
                        {item.name ||
                          "Unnamed accommodation"}
                      </h2>

                      <div className="accommodation-location">
                        {item.destination ||
                          "Destination unavailable"}
                      </div>

                      <div className="accommodation-address">
                        {item.address ||
                          "Address unavailable"}
                      </div>
                    </div>

                    <span className="accommodation-type">
                      {labelize(
                        item.accommodationType
                      )}
                    </span>
                  </div>

                  <p className="accommodation-description">
                    {item.description ||
                      "No description provided by the backend."}
                  </p>

                  <div className="accommodation-price-row">
                    <span className="accommodation-price">
                      {formatMoney(
                        item.pricePerNight
                      )}

                      <small>
                        {" "}
                        / night
                      </small>
                    </span>

                    <span className="accommodation-rating">
                      ★{" "}
                      {item.rating ??
                        "—"}
                    </span>
                  </div>

                  <div className="accommodation-meta">
                    <span>
                      {item.maxGuests ??
                        "—"}{" "}
                      guests
                    </span>

                    <span>
                      {item.availability
                        ? "Available"
                        : "Unavailable"}
                    </span>

                    {item.distanceKm !==
                      null &&
                      item.distanceKm !==
                        undefined && (
                        <span>
                          {
                            item.distanceKm
                          }{" "}
                          km
                        </span>
                      )}
                  </div>

                  <div className="accommodation-amenities">
                    {item.beachAccess && (
                      <span className="available">
                        Beach access
                      </span>
                    )}

                    {item.beachView && (
                      <span className="available">
                        Beach view
                      </span>
                    )}

                    {item.beachfront && (
                      <span className="available">
                        Beachfront
                      </span>
                    )}

                    {item.nearBeach && (
                      <span className="available">
                        Near beach
                      </span>
                    )}

                    {item.swimmingPool && (
                      <span className="available">
                        Pool
                      </span>
                    )}

                    {item.privatePool && (
                      <span className="available">
                        Private pool
                      </span>
                    )}

                    {item.wifi && (
                      <span className="available">
                        Wi-Fi
                      </span>
                    )}

                    {item.parking && (
                      <span className="available">
                        Parking
                      </span>
                    )}

                    {item.breakfastIncluded && (
                      <span className="available">
                        Breakfast
                      </span>
                    )}
                  </div>

                  <div className="accommodation-actions">
                    <button
                      type="button"
                      className="accommodation-button primary"
                      onClick={() =>
                        openDetails(
                          item
                        )
                      }
                    >
                      View details
                    </button>

                    <button
                      type="button"
                      className="accommodation-button"
                      onClick={() =>
                        handleSelect(
                          item
                        )
                      }
                      disabled={
                        actionLoading ===
                        `select-${item.accommodationId}`
                      }
                    >
                      {actionLoading ===
                      `select-${item.accommodationId}`
                        ? "Selecting..."
                        : "Select"}
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        </>
      )}

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