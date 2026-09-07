import { useEffect, useState } from "react";

const emptyTrip = {
  tripName: "",
  origin: "",
  destination: "",
  startDate: "",
  endDate: "",
  noOfDays: 1,
  noOfTravelers: 1,
  budget: "",
  pace: "Moderate",
  features: "",
};

function TripForm({ trip, onCreate, onUpdate, onDraft, onCancel }) {
  const [form, setForm] = useState(emptyTrip);

  useEffect(() => {
    if (trip) {
      setForm({
        tripName: trip.tripName || "",
        origin: trip.origin || "",
        destination: trip.destination || "",
        startDate: trip.startDate || "",
        endDate: trip.endDate || "",
        noOfDays: trip.noOfDays || 1,
        noOfTravelers: trip.noOfTravelers || 1,
        budget: trip.budget || "",
        pace: trip.pace || "Moderate",
        features: trip.features || "",
      });
    } else {
      setForm(emptyTrip);
    }
  }, [trip]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleStartDateChange = (e) => {
    const startDate = e.target.value;

    setForm((previous) => {
      let days = previous.noOfDays;

      if (startDate && previous.endDate) {
        const start = new Date(startDate);
        const end = new Date(previous.endDate);

        if (end >= start) {
          days =
            Math.ceil(
              (end - start) / (1000 * 60 * 60 * 24)
            ) + 1;
        }
      }

      return {
        ...previous,
        startDate,
        noOfDays: days,
      };
    });
  };

  const handleEndDateChange = (e) => {
    const endDate = e.target.value;

    setForm((previous) => {
      let days = previous.noOfDays;

      if (previous.startDate && endDate) {
        const start = new Date(previous.startDate);
        const end = new Date(endDate);

        if (end >= start) {
          days =
            Math.ceil(
              (end - start) / (1000 * 60 * 60 * 24)
            ) + 1;
        }
      }

      return {
        ...previous,
        endDate,
        noOfDays: days,
      };
    });
  };

  const validate = () => {
    if (!form.tripName.trim()) {
      alert("Please enter a trip name.");
      return false;
    }

    if (!form.origin.trim()) {
      alert("Please enter your origin.");
      return false;
    }

    if (!form.destination.trim()) {
      alert("Please enter your destination.");
      return false;
    }

    if (!form.startDate || !form.endDate) {
      alert("Please select both dates.");
      return false;
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      alert("End date cannot be before start date.");
      return false;
    }

    if (Number(form.noOfTravelers) < 1) {
      alert("Number of travelers must be at least 1.");
      return false;
    }

    if (Number(form.budget) < 0) {
      alert("Budget cannot be negative.");
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = {
      ...form,
      noOfDays: Number(form.noOfDays),
      noOfTravelers: Number(form.noOfTravelers),
      budget: Number(form.budget),
    };

    if (trip) {
      onUpdate(trip.tripId, payload);
    } else {
      onCreate(payload);
    }
  };

  const handleDraft = () => {
    if (!form.tripName.trim()) {
      alert("Please enter a trip name before saving a draft.");
      return;
    }

    const payload = {
      ...form,
      noOfDays: Number(form.noOfDays || 1),
      noOfTravelers: Number(form.noOfTravelers || 1),
      budget: Number(form.budget || 0),
    };

    onDraft(payload);
  };

  return (
    <div className="trip-form-wrapper">
      <div className="trip-form-header">
        <div>
          <p className="trip-form-eyebrow">
            {trip ? "EDIT YOUR JOURNEY" : "PLAN YOUR JOURNEY"}
          </p>

          <h2>
            {trip ? "Update your trip" : "Create a new trip"}
          </h2>

          <p>
            Add the details below and build your perfect travel plan.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            className="trip-cancel-top"
            onClick={onCancel}
          >
            ×
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="trip-form">
        <div className="trip-form-grid">
          <div className="trip-field full-width">
            <label>Trip Name</label>
            <input
              type="text"
              name="tripName"
              value={form.tripName}
              onChange={handleChange}
              placeholder="e.g. Summer Escape to Goa"
              required
            />
          </div>

          <div className="trip-field">
            <label>Origin</label>
            <input
              type="text"
              name="origin"
              value={form.origin}
              onChange={handleChange}
              placeholder="Where are you starting?"
              required
            />
          </div>

          <div className="trip-field">
            <label>Destination</label>
            <input
              type="text"
              name="destination"
              value={form.destination}
              onChange={handleChange}
              placeholder="Where are you going?"
              required
            />
          </div>

          <div className="trip-field">
            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleStartDateChange}
              required
            />
          </div>

          <div className="trip-field">
            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleEndDateChange}
              required
            />
          </div>

          <div className="trip-field">
            <label>No. of Days</label>
            <input
              type="number"
              name="noOfDays"
              value={form.noOfDays}
              min="1"
              readOnly
            />
            <small>
              Automatically calculated from your dates.
            </small>
          </div>

          <div className="trip-field">
            <label>No. of Travelers</label>

            <div className="traveler-counter">
              <button
                type="button"
                onClick={() =>
                  setForm((previous) => ({
                    ...previous,
                    noOfTravelers: Math.max(
                      1,
                      Number(previous.noOfTravelers) - 1
                    ),
                  }))
                }
              >
                −
              </button>

              <span>{form.noOfTravelers}</span>

              <button
                type="button"
                onClick={() =>
                  setForm((previous) => ({
                    ...previous,
                    noOfTravelers:
                      Number(previous.noOfTravelers) + 1,
                  }))
                }
              >
                +
              </button>
            </div>
          </div>

          <div className="trip-field">
            <label>Budget</label>

            <div className="budget-input">
              <span>₹</span>

              <input
                type="number"
                name="budget"
                value={form.budget}
                onChange={handleChange}
                min="0"
                placeholder="25000"
                required
              />
            </div>
          </div>

          <div className="trip-field">
            <label>Pace</label>

            <select
              name="pace"
              value={form.pace}
              onChange={handleChange}
            >
              <option value="Relaxed">Relaxed</option>
              <option value="Moderate">Moderate</option>
              <option value="Fast">Fast</option>
            </select>
          </div>

          <div className="trip-field full-width">
            <label>Features</label>

            <textarea
              name="features"
              value={form.features}
              onChange={handleChange}
              placeholder="Optional notes or special requirements..."
              rows="4"
            />
          </div>
        </div>

        <div className="trip-form-actions">
          <button
            type="button"
            className="trip-secondary-button"
            onClick={handleDraft}
          >
            💾 Save Draft
          </button>

          {onCancel && (
            <button
              type="button"
              className="trip-outline-button"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="trip-primary-button"
          >
            {trip ? "✓ Update Trip" : "✈ Create Trip"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TripForm;
