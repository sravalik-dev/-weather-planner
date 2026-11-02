function TripSelectBar({ trips, tripId, onChange, loading, emptyText }) {
  return (
    <div className="glass-toolbar">
      <label htmlFor="shell-trip-select">Trip</label>
      <select
        id="shell-trip-select"
        value={tripId}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || !trips.length}
      >
        <option value="">{loading ? "Loading trips..." : "Select a trip"}</option>
        {trips.map((trip) => {
          const id = trip.tripId ?? trip.id;
          return (
            <option key={id} value={id}>
              {trip.tripName || trip.name || `Trip ${id}`}
            </option>
          );
        })}
      </select>
      {!loading && trips.length === 0 && (
        <p className="shell-hint">{emptyText || "Create a trip first."}</p>
      )}
    </div>
  );
}

export default TripSelectBar;