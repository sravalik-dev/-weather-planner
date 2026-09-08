import { useEffect, useState } from "react";
import {
  getTrips,
  createTrip,
  saveDraft,
  updateTrip,
  deleteTrip,
} from "../services/tripService";

function Trips() {
  const [showForm, setShowForm] = useState(false);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingTripId, setEditingTripId] = useState(null);document
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

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getTrips();
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading trips:", err);
      setError(err.message || "Unable to load trips.");
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
          Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

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

 const handleCreateTrip = async (e) => {
  e.preventDefault();

  try {
    setSubmitting(true);
    setError("");

    if (editingTripId) {
      const updatedTrip = await updateTrip(
        editingTripId,
        prepareTripData()
      );

      setTrips((previous) =>
        previous.map((trip) =>
          trip.tripId === editingTripId ? updatedTrip : trip
        )
      );

      setEditingTripId(null);
      resetForm();
      setShowForm(false);
    } else {
      const trip = await createTrip(prepareTripData());

      setTrips((previous) => [trip, ...previous]);
      resetForm();
      setShowForm(false);
    }
  } catch (err) {
    console.error("Error saving trip:", err);
    setError(err.message || "Unable to save trip.");
  } finally {
    setSubmitting(false);
  }
};

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true);
      setError("");

      const draft = await saveDraft(prepareTripData());

      setTrips((previous) => [draft, ...previous]);
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Error saving draft:", err);
      setError(err.message || "Unable to save draft.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="trips-page">
      <div className="trips-header">
        <div>
          <p className="trips-subtitle">YOUR JOURNEYS</p>
          <h1>My Trips</h1>
          <p>Plan, organize and manage your travel adventures.</p>
        </div>

        <button
          className="create-trip-btn"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
        >
          + Create New Trip
        </button>
      </div>

      {error && (
        <div className="trip-error">
          {error}
        </div>
      )}

      {showForm ? (
        <div className="trip-form-container">
          <div className="trip-form-top">
            <div>
              <p className="trips-subtitle">PLAN YOUR JOURNEY</p>
              <h2>Create a New Trip</h2>
            </div>

            <button
              className="close-trip-btn"
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
            >
              ×
            </button>
          </div>

          <form className="trip-form" onSubmit={handleCreateTrip}>
            <div className="form-group full-width">
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

            <div className="form-group">
              <label>Origin</label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                placeholder="Where are you starting?"
                required
              />
            </div>

            <div className="form-group">
              <label>Destination</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="Where are you going?"
                required
              />
            </div>

            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>No. of Days</label>
              <input
                type="number"
                name="noOfDays"
                value={formData.noOfDays}
                onChange={handleChange}
                min="1"
                placeholder="5"
                required
              />
            </div>

            <div className="form-group">
              <label>No. of Travelers</label>
              <input
                type="number"
                name="noOfTravelers"
                value={formData.noOfTravelers}
                onChange={handleChange}
                min="1"
                placeholder="2"
                required
              />
            </div>

            <div className="form-group">
              <label>Budget</label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                min="0"
                placeholder="25000"
                required
              />
            </div>

            <div className="form-group">
              <label>Pace</label>
              <select
                name="pace"
                value={formData.pace}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select pace
                </option>
                <option value="Relaxed">Relaxed</option>
                <option value="Moderate">Moderate</option>
                <option value="Fast">Fast</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Features</label>
              <textarea
                name="features"
                value={formData.features}
                onChange={handleChange}
                rows="4"
                placeholder="Add any special requirements or preferences..."
              />
            </div>

            <div className="trip-form-actions">
              <button
                type="button"
                className="draft-btn"
                onClick={handleSaveDraft}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                  setError("");
                }}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="submit-trip-btn"
                disabled={submitting}
              >
                {submitting
  ? editingTripId
    ? "Updating..."
    : "Creating..."
  : editingTripId
    ? "Update Trip"
    : "Create Trip"}
              </button>
            </div>
          </form>
        </div>
      ) : loading ? (
        <div className="empty-trips">
          <h2>Loading your trips...</h2>
        </div>
      ) : trips.length === 0 ? (
        <div className="empty-trips">
          <div className="empty-trip-icon">🗺️</div>

          <h2>No trips yet</h2>

          <p>
            Start planning your next adventure by creating
            your first trip.
          </p>

          <button
            className="create-trip-btn"
            onClick={() => {
              setError("");
              setShowForm(true);
            }}
          >
            + Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="trips-list">
          {trips.map((trip) => (
            <div className="trip-card" key={trip.tripId}>
              <div>
                <p className="trips-subtitle">{trip.status}</p>
                <h2>{trip.tripName}</h2>
                <p>
                  {trip.origin} → {trip.destination}
                </p>
              </div>

              <div>
                <p>
                  {trip.startDate} to {trip.endDate}
                </p>
                <p>
                  {trip.noOfDays} days · {trip.noOfTravelers} travelers
                </p>
                <p>Budget: ₹{trip.budget}</p>
              </div>
             <div className="trip-card-actions">
              <button
  className="delete-trip-btn"
  onClick={async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this trip?"
    );

    if (!confirmed) return;

    try {
      await deleteTrip(trip.tripId);

      setTrips((previous) =>
        previous.filter((item) => item.tripId !== trip.tripId)
      );
    } catch (err) {
      console.error("Error deleting trip:", err);
      setError(err.message || "Unable to delete trip.");
    }
  }}
>
  🗑️ Delete Trip
</button>
  <button
    className="edit-trip-btn"
    onClick={() => {
      setEditingTripId(trip.tripId);

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

      setShowForm(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }}
  >
    ✏️ Edit Trip
  </button>
</div> 
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Trips;
