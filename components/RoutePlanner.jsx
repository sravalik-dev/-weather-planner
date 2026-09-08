import { useEffect, useState } from "react";
import {
  getDestinations,
  addDestination,
  removeDestination,
  reorderDestinations,
  calculateDistance,
  calculateEta,
} from "../routeService";

function RoutePlanner({ trip, onBack }) {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [destinationInput, setDestinationInput] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [removingId, setRemovingId] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);

  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [routeSummaryLoading, setRouteSummaryLoading] = useState(false);
  const [routeSummaryError, setRouteSummaryError] = useState("");

  useEffect(() => {
    loadDestinations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.tripId]);

  useEffect(() => {
    if (destinations.length >= 2) {
      loadRouteSummary();
    } else {
      setDistance(null);
      setEta(null);
      setRouteSummaryError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinations]);

  const loadDestinations = async () => {
    try {
      setLoading(true);
      setListError("");

      const data = await getDestinations(trip.tripId);
      setDestinations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading destinations:", err);
      setListError(err.message || "Unable to load destinations.");
    } finally {
      setLoading(false);
    }
  };

  const loadRouteSummary = async () => {
    try {
      setRouteSummaryLoading(true);
      setRouteSummaryError("");

      const [distanceData, etaData] = await Promise.all([
        calculateDistance(trip.tripId),
        calculateEta(trip.tripId),
      ]);

      setDistance(distanceData);
      setEta(etaData);
    } catch (err) {
      console.error("Error calculating route:", err);
      setDistance(null);
      setEta(null);
      setRouteSummaryError(err.message || "Unable to calculate distance.");
    } finally {
      setRouteSummaryLoading(false);
    }
  };

  /*
   * Reuses the same Open-Meteo geocoding pattern already used
   * in App.jsx's weather lookup (reverse geocoding there,
   * forward geocoding here — same API, same provider).
   */
  const geocodeLocation = async (query) => {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=1&language=en&format=json`
    );

    if (!response.ok) {
      throw new Error("Unable to add destination.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("Location not found. Try a more specific place name.");
    }

    return data.results[0];
  };

  const handleAddDestination = async (e) => {
    e.preventDefault();

    const trimmedName = destinationInput.trim();

    setAddError("");

    if (!trimmedName) {
      setAddError("Destination is required.");
      return;
    }

    try {
      setGeocoding(true);

      const match = await geocodeLocation(trimmedName);

      setGeocoding(false);
      setAdding(true);

      const created = await addDestination(trip.tripId, {
        destinationName: trimmedName,
        latitude: match.latitude,
        longitude: match.longitude,
      });

      setDestinations((previous) => [...previous, created]);
      setDestinationInput("");
    } catch (err) {
      console.error("Error adding destination:", err);
      setAddError(err.message || "Unable to add destination.");
    } finally {
      setGeocoding(false);
      setAdding(false);
    }
  };

  const handleRemoveDestination = async (destinationId) => {
    setRemovingId(destinationId);
    setListError("");

    try {
      await removeDestination(trip.tripId, destinationId);

      const updated = await getDestinations(trip.tripId);
      setDestinations(Array.isArray(updated) ? updated : []);
    } catch (err) {
      console.error("Error removing destination:", err);
      setListError(err.message || "Unable to remove destination.");
    } finally {
      setRemovingId(null);
    }
  };

  const moveDestination = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= destinations.length) {
      return;
    }

    const previousOrder = destinations;
    const reordered = [...destinations];

    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setDestinations(reordered);
    setReorderingId(reordered[targetIndex].destinationId);
    setListError("");

    try {
      const destinationIds = reordered.map((d) => d.destinationId);

      const updated = await reorderDestinations(trip.tripId, destinationIds);

      setDestinations(Array.isArray(updated) ? updated : reordered);
    } catch (err) {
      console.error("Error reordering destinations:", err);
      setDestinations(previousOrder);
      setListError(err.message || "Unable to reorder destinations.");
    } finally {
      setReorderingId(null);
    }
  };

  const formatDistance = (km) => {
    if (km === null || km === undefined) return "--";
    return `${km} km`;
  };

  const formatDuration = (hours) => {
    if (hours === null || hours === undefined) return "--";

    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  };

  return (
    <section className="route-planner-page">
      <button type="button" className="profile-back-button" onClick={onBack}>
        ← Back to My Trips
      </button>

      <div className="route-planner-header">
        <p className="trips-subtitle">MULTI-DESTINATION ROUTE</p>
        <h1>{trip.tripName}</h1>
        <p>
          {trip.origin} · {trip.noOfDays} days · {trip.noOfTravelers}{" "}
          travelers
        </p>
      </div>

      <div className="route-planner-grid">
        {/* ADD DESTINATION */}
        <div className="route-card">
          <h2>Add Destination</h2>

          <form
            onSubmit={handleAddDestination}
            className="add-destination-form"
          >
            <div className="form-group full-width">
              <label>Destination</label>
              <input
                type="text"
                placeholder="e.g. Chennai, Tamil Nadu"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                disabled={geocoding || adding}
              />
            </div>

            {addError && <div className="trip-error">{addError}</div>}

            <button
              type="submit"
              className="submit-trip-btn"
              disabled={geocoding || adding}
            >
              {geocoding
                ? "Finding location..."
                : adding
                ? "Adding..."
                : "+ Add Destination"}
            </button>
          </form>
        </div>

        {/* DESTINATION LIST */}
        <div className="route-card">
          <h2>Destinations</h2>

          {listError && <div className="trip-error">{listError}</div>}

          {loading ? (
            <p className="route-empty-text">Loading destinations...</p>
          ) : destinations.length === 0 ? (
            <div className="empty-trips route-empty">
              <div className="empty-trip-icon">📍</div>
              <h2>No destinations yet</h2>
              <p>Add your first stop above to start building the route.</p>
            </div>
          ) : (
            <ul className="destination-list">
              {destinations.map((destination, index) => (
                <li
                  className="destination-item"
                  key={destination.destinationId}
                >
                  <div className="destination-order">{index + 1}</div>

                  <div className="destination-info">
                    <strong>{destination.destinationName}</strong>
                    <span>
                      {destination.latitude?.toFixed(3)},{" "}
                      {destination.longitude?.toFixed(3)}
                    </span>
                  </div>

                  <div className="destination-actions">
                    <button
                      type="button"
                      className="destination-move-btn"
                      onClick={() => moveDestination(index, "up")}
                      disabled={index === 0 || reorderingId !== null}
                      aria-label={`Move ${destination.destinationName} up`}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      className="destination-move-btn"
                      onClick={() => moveDestination(index, "down")}
                      disabled={
                        index === destinations.length - 1 ||
                        reorderingId !== null
                      }
                      aria-label={`Move ${destination.destinationName} down`}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      className="destination-remove-btn"
                      onClick={() =>
                        handleRemoveDestination(destination.destinationId)
                      }
                      disabled={removingId === destination.destinationId}
                    >
                      {removingId === destination.destinationId
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ROUTE SUMMARY */}
        <div className="route-card route-summary-card">
          <h2>Route Summary</h2>

          <div className="route-summary-grid">
            <div className="route-summary-item">
              <span>Trip</span>
              <strong>{trip.tripName}</strong>
            </div>

            <div className="route-summary-item">
              <span>Origin</span>
              <strong>{trip.origin}</strong>
            </div>

            <div className="route-summary-item">
              <span>Destinations</span>
              <strong>{destinations.length}</strong>
            </div>

            <div className="route-summary-item">
              <span>Total Distance</span>
              <strong>
                {routeSummaryLoading
                  ? "Calculating..."
                  : formatDistance(distance?.totalDistanceKm)}
              </strong>
            </div>

            <div className="route-summary-item">
              <span>Estimated Travel Time</span>
              <strong>
                {routeSummaryLoading
                  ? "Calculating..."
                  : formatDuration(eta?.estimatedTravelTimeHours)}
              </strong>
            </div>

            <div className="route-summary-item">
              <span>Average Speed</span>
              <strong>
                {eta?.averageSpeedKmph
                  ? `${eta.averageSpeedKmph} km/h`
                  : "--"}
              </strong>
            </div>
          </div>

          {destinations.length < 2 && (
            <p className="route-empty-text">
              Add at least two destinations to calculate distance and travel
              time.
            </p>
          )}

          {routeSummaryError && destinations.length >= 2 && (
            <div className="trip-error">{routeSummaryError}</div>
          )}

          {destinations.length > 0 && (
            <ol className="route-order-list">
              {destinations.map((destination) => (
                <li key={destination.destinationId}>
                  {destination.destinationName}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* ROUTE HISTORY */}
        <div className="route-card">
          <h2>Route History</h2>
          <p className="route-empty-text">
            Route history is not available yet — this feature requires
            backend support that hasn't been implemented.
          </p>
        </div>
      </div>
    </section>
  );
}

export default RoutePlanner;