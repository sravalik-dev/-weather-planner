import { useEffect, useState } from "react";
import {
  getTrips,
  createTrip,
  saveDraft,
  updateTrip,
  duplicateTrip,
  archiveTrip,
  deleteTrip,
} from "../services/tripService";
import RoutePlanner from "./RoutePlanner";

function Trips({ onBack }) {
  const [showForm, setShowForm] = useState(false);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [editingTrip, setEditingTrip] = useState(null);
  const [routeTrip, setRouteTrip] = useState(null);

  const [formData, setFormData] = useState({
    tripName: "",
    origin: "",
    destination: "",
    startDate: "",
    endDate: "",
    noOfDays: "",
    noOfTravelers: "",
    budget: "",
    pace: "",
    features: "",
  });

  const getToken = () => {
    return (
      localStorage.getItem("itineraryToken") ||
      localStorage.getItem("jwtToken") ||
      localStorage.getItem("token")
    );
  };

  const clearTokens = () => {
    localStorage.removeItem("itineraryToken");
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("token");
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const token = getToken();

      if (!token) {
        setTrips([]);
        setError("Please log in to view your trips.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const data = await getTrips();

      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading trips:", err);

      const message = err?.message || "";

      if (
        message.includes("Please log in") ||
        message.includes("expired") ||
        message.includes("401") ||
        message.includes("not authorized") ||
        message.includes("Unauthorized")
      ) {
        clearTokens();
        setError("Your session expired. Please log in again.");
      } else {
        setError(message || "Unable to load trips.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      };

      if (
        (name === "startDate" || name === "endDate") &&
        updated.startDate &&
        updated.endDate
      ) {
        const start = new Date(updated.startDate);
        const end = new Date(updated.endDate);

        const difference =
          Math.ceil(
            (end.getTime() - start.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;

        updated.noOfDays = difference > 0 ? difference : "";
      }

      return updated;
    });
  };

  const resetForm = () => {
    setFormData({
      tripName: "",
      origin: "",
      destination: "",
      startDate: "",
      endDate: "",
      noOfDays: "",
      noOfTravelers: "",
      budget: "",
      pace: "",
      features: "",
    });

    setEditingTrip(null);
  };

  const prepareTripData = () => {
    return {
      tripName: formData.tripName,
      origin: formData.origin,
      destination: formData.destination,
      startDate: formData.startDate,
      endDate: formData.endDate,
      noOfDays: Number(formData.noOfDays),
      noOfTravelers: Number(formData.noOfTravelers),
      budget: Number(formData.budget),
      pace: formData.pace,
      features: formData.features,
    };
  };

  const openCreateForm = () => {
    resetForm();
    setError("");
    setShowForm(true);
  };

  const openEditForm = (trip) => {
    setEditingTrip(trip);

    setFormData({
      tripName: trip.tripName || "",
      origin: trip.origin || "",
      destination: trip.destination || "",
      startDate: trip.startDate || "",
      endDate: trip.endDate || "",
      noOfDays: trip.noOfDays || "",
      noOfTravelers: trip.noOfTravelers || "",
      budget: trip.budget || "",
      pace: trip.pace || "",
      features: trip.features || "",
    });

    setError("");
    setShowForm(true);
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();

    try {
      const token = getToken();

      if (!token) {
        setError("Please log in to create a trip.");
        return;
      }

      setSubmitting(true);
      setError("");

      if (editingTrip) {
        const updatedTrip = await updateTrip(
          editingTrip.tripId,
          prepareTripData()
        );

        setTrips((previous) =>
          previous.map((trip) =>
            trip.tripId === editingTrip.tripId
              ? updatedTrip
              : trip
          )
        );
      } else {
        const trip = await createTrip(prepareTripData());

        setTrips((previous) => [trip, ...previous]);
      }

      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Error saving trip:", err);

      const message = err?.message || "";

      if (
        message.includes("Please log in") ||
        message.includes("expired") ||
        message.includes("401") ||
        message.includes("not authorized") ||
        message.includes("Unauthorized")
      ) {
        clearTokens();
        setError("Your session expired. Please log in again.");
      } else {
        setError(message || "Unable to save trip.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const token = getToken();

      if (!token) {
        setError("Please log in to save a draft.");
        return;
      }

      setSubmitting(true);
      setError("");

      const draft = await saveDraft(prepareTripData());

      setTrips((previous) => [draft, ...previous]);

      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Error saving draft:", err);

      setError(err?.message || "Unable to save draft.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDuplicate = async (trip) => {
    try {
      setError("");

      const duplicated = await duplicateTrip(trip.tripId);

      setTrips((previous) => [
        duplicated,
        ...previous,
      ]);
    } catch (err) {
      console.error("Error duplicating trip:", err);
      setError(err?.message || "Unable to duplicate trip.");
    }
  };

  const handleArchive = async (trip) => {
    try {
      setError("");

      const archived = await archiveTrip(trip.tripId);

      setTrips((previous) =>
        previous.map((item) =>
          item.tripId === trip.tripId
            ? archived
            : item
        )
      );
    } catch (err) {
      console.error("Error archiving trip:", err);
      setError(err?.message || "Unable to archive trip.");
    }
  };

  const handleDelete = async (trip) => {
    const confirmed = window.confirm(
      `Delete "${trip.tripName}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteTrip(trip.tripId);

      setTrips((previous) =>
        previous.filter(
          (item) => item.tripId !== trip.tripId
        )
      );
    } catch (err) {
      console.error("Error deleting trip:", err);
      setError(err?.message || "Unable to delete trip.");
    }
  };

  if (routeTrip) {
    return (
      <RoutePlanner
        trip={routeTrip}
        onBack={() => setRouteTrip(null)}
      />
    );
  }

  return (
    <section className="trip-manager-page">
      <div className="trip-manager-card">
        <div className="trip-page-top">
          <button
            type="button"
            className="page-back-button"
            onClick={onBack}
          >
            ← Back to Profile
          </button>
        </div>

        <div className="trip-hero">
          <div>
            <div className="page-eyebrow">
              MY JOURNEYS
            </div>

            <h1>
              <span>✈️</span> Trip Manager
            </h1>

            <p>
              Create, organize and manage all your
              journeys in one place.
            </p>
          </div>

          <div className="trip-hero-icon">
            🗺️
          </div>
        </div>

        <div className="trip-toolbar">
          <button
            type="button"
            className="primary-trip-button"
            onClick={openCreateForm}
          >
            <span>＋</span>
            Create Trip
          </button>

          <div className="trip-count">
            <span>{trips.length}</span>
            <small>Saved Trips</small>
          </div>
        </div>

        {error && (
          <div className="modern-trip-error">
            ⚠️ {error}
          </div>
        )}

        {showForm ? (
          <div className="modern-trip-form">
            <div className="form-heading">
              <div>
                <div className="page-eyebrow">
                  {editingTrip
                    ? "EDIT JOURNEY"
                    : "NEW JOURNEY"}
                </div>

                <h2>
                  {editingTrip
                    ? "Edit Trip"
                    : "Create a New Trip"}
                </h2>
              </div>

              <button
                type="button"
                className="close-page-button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                  setError("");
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTrip}>
              <div className="modern-trip-grid">
                <div className="modern-form-group full">
                  <label>Trip Name</label>
                  <input
                    type="text"
                    name="tripName"
                    value={formData.tripName}
                    onChange={handleChange}
                    placeholder="e.g. Goa Summer Escape"
                    required
                  />
                </div>

                <div className="modern-form-group">
                  <label>Starting From</label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    placeholder="Bangalore"
                    required
                  />
                </div>

                <div className="modern-form-group">
                  <label>Destination</label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    placeholder="Goa"
                    required
                  />
                </div>

                <div className="modern-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="modern-form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="modern-form-group">
                  <label>Days</label>
                  <input
                    type="number"
                    name="noOfDays"
                    value={formData.noOfDays}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>

                <div className="modern-form-group">
                  <label>Travelers</label>
                  <input
                    type="number"
                    name="noOfTravelers"
                    value={formData.noOfTravelers}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>

                <div className="modern-form-group">
                  <label>Budget ₹</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </div>

                <div className="modern-form-group">
                  <label>Travel Pace</label>
                  <select
                    name="pace"
                    value={formData.pace}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select pace
                    </option>
                    <option value="Relaxed">
                      Relaxed
                    </option>
                    <option value="Moderate">
                      Moderate
                    </option>
                    <option value="Fast">
                      Fast
                    </option>
                  </select>
                </div>

                <div className="modern-form-group full">
                  <label>Features & Preferences</label>
                  <textarea
                    name="features"
                    value={formData.features}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Sightseeing, Nature, Adventure, Food..."
                  />
                </div>
              </div>

              <div className="modern-form-actions">
                <button
                  type="button"
                  className="secondary-trip-button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                    setError("");
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>

                {!editingTrip && (
                  <button
                    type="button"
                    className="draft-trip-button"
                    onClick={handleSaveDraft}
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : "Save Draft"}
                  </button>
                )}

                <button
                  type="submit"
                  className="primary-trip-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingTrip
                    ? "Save Changes"
                    : "Create Trip"}
                </button>
              </div>
            </form>
          </div>
        ) : loading ? (
          <div className="trip-loading">
            <div className="loading-icon">✈️</div>
            <h2>Loading your journeys...</h2>
            <p>
              Getting your saved trips from the server.
            </p>
          </div>
        ) : trips.length === 0 ? (
          <div className="modern-empty-trips">
            <div className="empty-map-icon">
              🗺️
            </div>

            <h2>No trips yet</h2>

            <p>
              Your next adventure starts here.
              Create your first trip and begin
              building your itinerary.
            </p>

            <button
              type="button"
              className="primary-trip-button"
              onClick={openCreateForm}
            >
              ＋ Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="modern-trip-list">
            {trips.map((trip, index) => (
              <article
                className="modern-trip-card"
                key={trip.tripId}
              >
                <div className="trip-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="modern-trip-main">
                  <div className="trip-card-top">
                    <span
                      className={`trip-status ${
                        String(
                          trip.status || ""
                        ).toLowerCase() === "draft"
                          ? "draft"
                          : "active"
                      }`}
                    >
                      {trip.status || "ACTIVE"}
                    </span>

                    <span className="trip-date">
                      {trip.startDate} →{" "}
                      {trip.endDate}
                    </span>
                  </div>

                  <h2>{trip.tripName}</h2>

                  <div className="trip-route-line">
                    <span>📍</span>
                    <strong>{trip.origin}</strong>
                    <span className="route-arrow">
                      →
                    </span>
                    <strong>
                      {trip.destination}
                    </strong>
                  </div>

                  <div className="trip-meta">
                    <span>
                      📅 {trip.noOfDays} days
                    </span>

                    <span>
                      👥 {trip.noOfTravelers} travelers
                    </span>

                    <span>
                      💰 ₹{trip.budget}
                    </span>
                  </div>

                  {trip.features && (
                    <div className="trip-features">
                      <span>✨</span>
                      {trip.features}
                    </div>
                  )}

                  <div className="trip-card-actions">
                    <button
                      type="button"
                      className="route-action-button"
                      onClick={() =>
                        setRouteTrip(trip)
                      }
                    >
                      🗺️ Manage Route
                    </button>

                    <button
                      type="button"
                      className="edit-action-button"
                      onClick={() =>
                        openEditForm(trip)
                      }
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDuplicate(trip)
                      }
                    >
                      📋 Duplicate
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleArchive(trip)
                      }
                    >
                      📦 Archive
                    </button>

                    <button
                      type="button"
                      className="delete-action-button"
                      onClick={() =>
                        handleDelete(trip)
                      }
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Trips;