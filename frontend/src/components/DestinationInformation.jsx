function DestinationInformation({
  destinations = [],
  onEdit,
  onDelete,
}) {
  const displayValue = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return value;
  };

  return (
    <section className="module5-panel">
      <div className="route-section">
        <div className="route-section-header">
          <div>
            <h3>
              📍 Destination Information
            </h3>

            <div className="module5-note">
              Detailed information for each
              destination in your route.
            </div>
          </div>
        </div>

        {destinations.length === 0 ? (
          <div className="route-empty">
            No destination information available.
          </div>
        ) : (
          <div className="destination-info-table-wrapper">
            <table className="destination-info-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Destination</th>
                  <th>Category</th>
                  <th>Best Time</th>
                  <th>Opening</th>
                  <th>Closing</th>
                  <th>Ticket</th>
                  <th>Duration</th>
                  <th>Popularity</th>
                  <th>Type</th>
                  <th>Family</th>
                  <th>Wheelchair</th>
                  <th>Kids</th>

                  {(onEdit || onDelete) && (
                    <th>Actions</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {destinations.map(
                  (destination) => (
                    <tr
                      key={
                        destination.destinationId
                      }
                    >
                      <td>
                        {displayValue(
                          destination.destinationOrder,
                        )}
                      </td>

                      <td>
                        <strong>
                          {displayValue(
                            destination.destinationName,
                          )}
                        </strong>
                      </td>

                      <td>
                        {displayValue(
                          destination.category,
                        )}
                      </td>

                      <td>
                        {displayValue(
                          destination.bestTime,
                        )}
                      </td>

                      <td>
                        {displayValue(
                          destination.openingTime,
                        )}
                      </td>

                      <td>
                        {displayValue(
                          destination.closingTime,
                        )}
                      </td>

                      <td>
                        {destination.ticketPrice !=
                          null &&
                        destination.ticketPrice !==
                          ""
                          ? `₹${Number(
                              destination.ticketPrice,
                            ).toLocaleString(
                              "en-IN",
                            )}`
                          : "—"}
                      </td>

                      <td>
                        {destination.expectedDuration !=
                          null &&
                        destination.expectedDuration !==
                          ""
                          ? `${destination.expectedDuration} min`
                          : "—"}
                      </td>

                      <td>
                        {destination.popularity !=
                          null &&
                        destination.popularity !==
                          ""
                          ? (
                              <span className="module5-rating">
                                ⭐{" "}
                                {
                                  destination.popularity
                                }
                              </span>
                            )
                          : "—"}
                      </td>

                      <td>
                        {displayValue(
                          destination.indoorOutdoor,
                        )}
                      </td>

                      <td>
                        {destination.familyFriendly ===
                        true
                          ? "Yes"
                          : destination.familyFriendly ===
                            false
                          ? "No"
                          : "—"}
                      </td>

                      <td>
                        {destination.wheelchairFriendly ===
                        true
                          ? "Yes"
                          : destination.wheelchairFriendly ===
                            false
                          ? "No"
                          : "—"}
                      </td>

                      <td>
                        {destination.kidsFriendly ===
                        true
                          ? "Yes"
                          : destination.kidsFriendly ===
                            false
                          ? "No"
                          : "—"}
                      </td>

                      {(onEdit || onDelete) && (
                        <td>
                          <div className="route-actions">
                            {onEdit && (
                              <button
                                type="button"
                                className="route-button route-button-secondary"
                                onClick={() =>
                                  onEdit(
                                    destination,
                                  )
                                }
                              >
                                Edit
                              </button>
                            )}

                            {onDelete && (
                              <button
                                type="button"
                                className="route-button route-button-danger"
                                onClick={() =>
                                  onDelete(
                                    destination.destinationId,
                                  )
                                }
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default DestinationInformation;