function AboutModal({
  showAbout,
  setShowAbout,
}) {
  if (!showAbout) {
    return null;
  }

  return (
    <div
      className="info-overlay"
      onClick={() =>
        setShowAbout(false)
      }
    >
      <div
        className="info-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <button
          className="modal-close"
          onClick={() =>
            setShowAbout(false)
          }
        >
          ×
        </button>

        <div className="modal-icon">
          🌤️
        </div>

        <h2>
          About Itinerary Planner
        </h2>

        <p>
          Itinerary Planner is a smart travel
          planning platform designed to make
          trips easier, safer, and more enjoyable.
        </p>

        <p>
          The platform uses real-time weather
          information to help travelers plan
          their activities according to current
          and changing weather conditions.
        </p>

        <p>
          Instead of following a fixed itinerary,
          travelers can make better decisions
          based on weather conditions such as
          sunshine, rain, storms, and snow.
        </p>

        <div className="about-features">
          <div>
            <span>🌦️</span>
            <strong>
              Live Weather
            </strong>
            <small>
              Real-time weather information
            </small>
          </div>

          <div>
            <span>🗺️</span>
            <strong>
              Smart Planning
            </strong>
            <small>
              Plan activities more efficiently
            </small>
          </div>

          <div>
            <span>🤖</span>
            <strong>
              Intelligent Travel
            </strong>
            <small>
              Adapt plans to weather conditions
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutModal;