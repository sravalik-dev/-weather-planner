function BudgetPanel({ trips }) {
  const list = Array.isArray(trips) ? trips : [];
  const total = list.reduce((sum, trip) => sum + Number(trip.budget || 0), 0);

  return (
    <section className="glass-card">
      <h2>Budget Planner</h2>
      <p>Totals come from the budget you saved on each trip.</p>
      <div className="budget-total">₹{total.toLocaleString("en-IN")}</div>
      {list.length === 0 ? (
        <p className="empty-copy">Create a trip with a budget to track spending here.</p>
      ) : (
        <div className="budget-list">
          {list.map((trip) => (
            <div key={trip.tripId ?? trip.id} className="budget-row">
              <div>
                <strong>{trip.tripName}</strong>
                <small>{trip.origin} → {trip.destination}</small>
              </div>
              <b>₹{Number(trip.budget || 0).toLocaleString("en-IN")}</b>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default BudgetPanel;