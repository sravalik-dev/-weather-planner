function Navbar({
  weatherIcon,
  isLoggedIn,
  onProfile,
  onAbout,
  onContact,
  onWeatherMonitoring,
}) {
  return (
    <header className="navbar">
      <div className="brand">
        <span className="brand-icon">
          {weatherIcon}
        </span>

        <span className="brand-name">
          Itinerary Planner
        </span>
      </div>

      <nav className="nav-links">
        <button
          type="button"
          onClick={onAbout}
        >
          About
        </button>

        <button
          type="button"
          onClick={onContact}
        >
          Contact
        </button>

        <button
          type="button"
          onClick={onWeatherMonitoring}
        >
          Weather
        </button>

        {isLoggedIn && (
          <button
            type="button"
            onClick={onProfile}
          >
            Profile
          </button>
        )}
      </nav>
    </header>
  );
}

export default Navbar;