function TripCard({
  trip,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
}) {
  const status = String(trip.status || "DRAFT");

  const formattedBudget = Number(trip.budget || 0).toLocaleString(
    "en-IN"
  );

  return (
    <article className="trip-card">
      <div className="trip-card-top">
        <div className="trip-card-icon">✈️</div>

        <span className={`trip-status ${status.toLowerCase()}`}>
          {status}
        </span>
      </div>

      <h3>{trip.tripName}</h3>

      <div className="trip-route">
        <span>📍 {trip.origin}</span>
        <span className="route-arrow">→</span>
        <span>📍 {trip.destination}</span>
      </div>

      <div className="trip-card-info">
        <div>
          <span>📅</span>
          <strong>{trip.noOfDays}</strong>
          <small>Days</small>
        </div>

        <div>
          <span>👥</span>
          <strong>{trip.noOfTravelers}</strong>
          <small>Travelers</small>
        </div>

        <div>
          <span>₹</span>
          <strong>{formattedBudget}</strong>
          <small>Budget</small>
        </div>
      </div>

      <div className="trip-dates">
        <span>{trip.startDate}</span>
        <span>—</span>
        <span>{trip.endDate}</span>
      </div>

      <div className="trip-card-actions">
        <button onClick={() => onEdit(trip)}>
          ✏️ Edit
        </button>

        <button onClick={() => onDuplicate(trip.tripId)}>
          📋 Duplicate
        </button>

        <button
          className="danger"
          onClick={() => onDelete(trip.tripId)}
        >
          🗑 Delete
        </button>

        <button onClick={() => onArchive(trip.tripId)}>
          📦 Archive
        </button>
      </div>
    </article>
  );
}

export default TripCard;
