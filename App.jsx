import { useEffect, useState } from "react";
import "./App.css";

/* =========================================
   WEATHER HELPERS
========================================= */

const getWeatherType = (code) => {
  if (code === 0) return "clear";

  if ([1, 2].includes(code)) {
    return "partly-cloudy";
  }

  if ([3, 45, 48].includes(code)) {
    return "cloudy";
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return "drizzle";
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rain";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }

  if ([95, 96, 99].includes(code)) {
    return "storm";
  }

  return "clear";
};

const getWeatherLabel = (type) => {
  const labels = {
    clear: "Clear",
    "partly-cloudy": "Partly Cloudy",
    cloudy: "Cloudy",
    drizzle: "Drizzle",
    rain: "Rainy",
    snow: "Snowy",
    storm: "Thunderstorm",
  };

  return labels[type] || "Clear";
};

const getWeatherIcon = (type, isDay) => {
  if (!isDay && type === "clear") {
    return "🌙";
  }

  const icons = {
    clear: "☀️",
    "partly-cloudy": "🌤️",
    cloudy: "☁️",
    drizzle: "🌦️",
    rain: "🌧️",
    snow: "❄️",
    storm: "⛈️",
  };

  return icons[type] || "🌤️";
};

/* =========================================
   APP
========================================= */

function App() {
  /* =========================================
     LOGIN STATE
  ========================================= */

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* =========================================
     SIGNUP STATE
  ========================================= */

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showRegisterPassword, setShowRegisterPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [accountCreated, setAccountCreated] = useState(false);
  const [signupError, setSignupError] = useState("");

  /* =========================================
     MODAL STATE
  ========================================= */

  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  /* =========================================
     WEATHER STATE
  ========================================= */

  const [weather, setWeather] = useState({
    type: "clear",
    temperature: null,
    isDay: true,
    location: "Detecting location...",
    humidity: null,
    wind: null,
    loading: true,
    error: "",
  });

  /* =========================================
     GET WEATHER
  ========================================= */

  useEffect(() => {
    const getWeather = async (latitude, longitude) => {
      try {
        /* =========================================
           WEATHER API
        ========================================= */

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m&timezone=auto`;

        const weatherResponse = await fetch(weatherUrl);

        if (!weatherResponse.ok) {
          throw new Error("Unable to fetch weather");
        }

        const weatherData = await weatherResponse.json();

        const current = weatherData.current;

        /* =========================================
           GET CITY NAME
        ========================================= */

        let locationName = "Your location";

        try {
          const locationUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`;

          const locationResponse = await fetch(locationUrl);

          if (locationResponse.ok) {
            const locationData = await locationResponse.json();

            if (locationData && locationData.name) {
              locationName = locationData.name;

              if (locationData.country) {
                locationName += `, ${locationData.country}`;
              }
            }
          }
        } catch (locationError) {
          console.log("Location name unavailable");
        }

        /* =========================================
           UPDATE WEATHER
        ========================================= */

        setWeather({
          type: getWeatherType(current.weather_code),

          temperature: Math.round(current.temperature_2m),

          isDay: current.is_day === 1,

          location: locationName,

          humidity: current.relative_humidity_2m,

          wind: current.wind_speed_10m,

          loading: false,

          error: "",
        });
      } catch (error) {
        console.error("Weather error:", error);

        setWeather((previous) => ({
          ...previous,
          loading: false,
          error: "Unable to load live weather.",
        }));
      }
    };

    /* =========================================
       CHECK GEOLOCATION
    ========================================= */

    if (!navigator.geolocation) {
      setWeather((previous) => ({
        ...previous,
        loading: false,
        error: "Location is not supported by your browser.",
      }));

      return;
    }

    /* =========================================
       GET USER LOCATION
    ========================================= */

    navigator.geolocation.getCurrentPosition(
      (position) => {
        getWeather(
          position.coords.latitude,
          position.coords.longitude
        );
      },

      (error) => {
        console.error("Location permission error:", error);

        setWeather((previous) => ({
          ...previous,
          loading: false,
          error: "Please allow location access for live weather.",
        }));
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  /* =========================================
     LOGIN
  ========================================= */

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:8080/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      );

      const result = await response.text();

      if (response.ok) {
        alert(result);

        console.log("Login successful:", result);
      } else {
        alert("Login failed: " + result);
      }
    } catch (error) {
      console.error("Login error:", error);

      alert(
        "Cannot connect to backend. Check if Spring Boot is running."
      );
    }
  };

  /* =========================================
     OPEN SIGNUP
  ========================================= */

  const openSignup = () => {
    setShowSignup(true);
    setAccountCreated(false);
    setSignupError("");
  };

  /* =========================================
     CLOSE SIGNUP
  ========================================= */

  const closeSignup = () => {
    setShowSignup(false);
    setSignupError("");
  };

  /* =========================================
     CREATE ACCOUNT
  ========================================= */

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    setSignupError("");

    /* =========================================
       PASSWORD CHECK
    ========================================= */

    if (registerPassword !== confirmPassword) {
      setSignupError("Passwords do not match.");
      setAccountCreated(false);
      return;
    }

    /* =========================================
       PASSWORD LENGTH
    ========================================= */

    if (registerPassword.length < 6) {
      setSignupError(
        "Password must contain at least 6 characters."
      );

      setAccountCreated(false);
      return;
    }

    /* =========================================
       REGISTER ACCOUNT
    ========================================= */

    try {
      const response = await fetch(
        "http://localhost:8080/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            fullName: registerUsername,
            email: registerEmail,
            password: registerPassword,
          }),
        }
      );

      const result = await response.text();

      if (response.ok) {
        setAccountCreated(true);
        setSignupError("");
      } else {
        setAccountCreated(false);
        setSignupError(result || "Registration failed.");
      }
    } catch (error) {
      console.error("Registration error:", error);

      setAccountCreated(false);

      setSignupError(
        "Cannot connect to backend. Check if Spring Boot is running."
      );
    }
  };

  /* =========================================
     WEATHER UI VALUES
  ========================================= */

  const weatherIcon = getWeatherIcon(
    weather.type,
    weather.isDay
  );

  const weatherLabel = getWeatherLabel(weather.type);

  /* =========================================
     CLOSE MODALS
  ========================================= */

  const closeAbout = () => {
    setShowAbout(false);
  };

  const closeContact = () => {
    setShowContact(false);
  };

  /* =========================================
     RETURN
  ========================================= */

  return (
    <div
      className={`
        app
        weather-${weather.type}
        ${weather.isDay ? "day" : "night"}
      `}
    >
      {/* =========================================
          WEATHER BACKGROUND
      ========================================= */}

      <div
        className="weather-background"
        aria-hidden="true"
      >
        {/* DAY SUN */}

        <div className="sun-glow"></div>

        {/* NIGHT MOON */}

        <div className="moon-glow">🌙</div>

        {/* CLOUDS */}

        <div className="cloud cloud-one">☁️</div>

        <div className="cloud cloud-two">☁️</div>

        <div className="cloud cloud-three">☁️</div>

        {/* =========================================
            RAIN
        ========================================= */}

        <div className="rain-layer">
          {Array.from({ length: 45 }).map((_, index) => (
            <span
              key={index}
              className="rain-drop"
            ></span>
          ))}
        </div>

        {/* =========================================
            SNOW
        ========================================= */}

        <div className="snow-layer">
          {Array.from({ length: 35 }).map((_, index) => (
            <span
              key={index}
              className="snowflake"
            >
              ❄
            </span>
          ))}
        </div>

        {/* =========================================
            STARS
        ========================================= */}

        <div className="stars">
          {Array.from({ length: 35 }).map((_, index) => (
            <span key={index}>✦</span>
          ))}
        </div>
      </div>

      {/* =========================================
          HEADER
      ========================================= */}

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
            onClick={() => setShowAbout(true)}
          >
            About
          </button>

          <button
            type="button"
            onClick={() => setShowContact(true)}
          >
            Contact
          </button>
        </nav>
      </header>

      {/* =========================================
          MAIN
      ========================================= */}

      <main className="main-content">
        {/* LIVE WEATHER */}

        <div className="live-weather">
          <span className="live-dot"></span>

          <span>
            {weather.loading
              ? "Detecting live weather..."
              : weather.error
              ? weather.error
              : `Live weather • ${weatherLabel}`}
          </span>
        </div>

        {/* WEATHER ICON */}

        <div className="weather-icon">
          {weatherIcon}
        </div>

        {/* WEATHER INFORMATION */}

        {!weather.loading &&
          weather.temperature !== null && (
            <div className="weather-info">
              <div className="temperature">
                {weather.temperature}°C
              </div>

              <div className="location">
                📍 {weather.location}
              </div>

              {weather.humidity !== null && (
                <div className="weather-details">
                  <span>
                    💧 {weather.humidity}%
                  </span>

                  <span>
                    💨 {Math.round(weather.wind)} km/h
                  </span>
                </div>
              )}
            </div>
          )}

        {/* =========================================
            MAIN HEADING
        ========================================= */}

        <h1>
          Plan smarter.
          <br />
          Travel better.
        </h1>

        {/* DESCRIPTION */}

        <p className="description">
          Your intelligent travel companion
          that adapts your itinerary based
          on real-time weather conditions.
        </p>

        {/* WEATHER ICONS */}

        <div className="weather-icons">
          <span>☀️</span>
          <span>🌤️</span>
          <span>🌧️</span>
          <span>⛈️</span>
        </div>

        {/* =========================================
            LOGIN
        ========================================= */}

        <section className="login-container">
          <div className="login-header">
            <h2>Welcome Back!</h2>

            <p>
              Login to continue planning
              your perfect trip.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            {/* EMAIL */}

            <div className="form-group">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />
            </div>

            {/* PASSWORD */}

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <div className="password-wrapper">
                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  aria-label="Show or hide password"
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            {/* FORGOT PASSWORD */}

            <div className="forgot-container">
              <button
                type="button"
                className="forgot-button"
                onClick={() =>
                  alert(
                    "Password reset will send an OTP to your registered email after the backend is connected."
                  )
                }
              >
                Forgot Password?
              </button>
            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="login-button"
            >
              Login
            </button>
          </form>

          {/* OR */}

          <div className="divider">
            <span></span>

            <p>OR</p>

            <span></span>
          </div>

          {/* SIGNUP */}

          <p className="signup-text">
            Don't have an account?

            <button
              type="button"
              className="signup-button"
              onClick={openSignup}
            >
              Sign Up
            </button>
          </p>
        </section>
      </main>

      {/* =========================================
          ABOUT MODAL
      ========================================= */}

      {showAbout && (
        <div
          className="info-overlay"
          onClick={closeAbout}
        >
          <div
            className="info-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={closeAbout}
              aria-label="Close About"
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
              Itinerary Planner is a smart
              travel planning platform designed
              to make trips easier, safer,
              and more enjoyable.
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
      )}

      {/* =========================================
          CONTACT MODAL
      ========================================= */}

      {showContact && (
        <div
          className="info-overlay"
          onClick={closeContact}
        >
          <div
            className="info-modal contact-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={closeContact}
              aria-label="Close Contact"
            >
              ×
            </button>

            <div className="modal-icon">
              📞
            </div>

            <h2>
              Contact Us
            </h2>

            <p>
              Have a question, suggestion,
              or feedback?
              We'd love to hear from you.
            </p>

            <div className="contact-details">
              {/* EMAIL */}

              <div className="contact-item">
                <span>📧</span>

                <div>
                  <small>Email</small>

                  <a href="mailto:weathervsks@gmail.com">
                    weathervsks@gmail.com
                  </a>
                </div>
              </div>

              {/* PHONE */}

              <div className="contact-item">
                <span>📱</span>

                <div>
                  <small>Phone</small>

                  <a href="tel:9095050274">
                    9095050274
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          SIGNUP / CREATE ACCOUNT MODAL
      ========================================= */}

      {showSignup && (
        <div
          className="info-overlay signup-overlay"
          onClick={closeSignup}
        >
          <div
            className="info-modal signup-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* CLOSE */}

            <button
              className="modal-close"
              onClick={closeSignup}
              aria-label="Close Sign Up"
            >
              ×
            </button>

            {/* ICON */}

            <div className="signup-modal-icon">
              ✈️
            </div>

            {/* TITLE */}

            <h2>
              Create Your Account
            </h2>

            <p className="signup-description">
              Join us and start creating
              unforgettable travel memories.
            </p>

            {/* =========================================
                SIGNUP FORM
            ========================================= */}

            <form
              onSubmit={handleCreateAccount}
            >
              {/* USERNAME */}

              <div className="form-group">
                <label htmlFor="register-username">
                  Username
                </label>

                <input
                  id="register-username"
                  type="text"
                  placeholder="Enter your username"
                  value={registerUsername}
                  onChange={(e) =>
                    setRegisterUsername(
                      e.target.value
                    )
                  }
                  disabled={accountCreated}
                  required
                />
              </div>

              {/* EMAIL */}

              <div className="form-group">
                <label htmlFor="register-email">
                  Email
                </label>

                <input
                  id="register-email"
                  type="email"
                  placeholder="Enter your email"
                  value={registerEmail}
                  onChange={(e) =>
                    setRegisterEmail(
                      e.target.value
                    )
                  }
                  disabled={accountCreated}
                  required
                />
              </div>

              {/* PASSWORD */}

              <div className="form-group">
                <label htmlFor="register-password">
                  Password
                </label>

                <div className="password-wrapper">
                  <input
                    id="register-password"
                    type={
                      showRegisterPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a password"
                    value={registerPassword}
                    onChange={(e) =>
                      setRegisterPassword(
                        e.target.value
                      )
                    }
                    disabled={accountCreated}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowRegisterPassword(
                        !showRegisterPassword
                      )
                    }
                    aria-label="Show or hide password"
                  >
                    {showRegisterPassword
                      ? "🙈"
                      : "👁️"}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}

              <div className="form-group">
                <label htmlFor="confirm-password">
                  Confirm Password
                </label>

                <div className="password-wrapper">
                  <input
                    id="confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    disabled={accountCreated}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    aria-label="Show or hide confirm password"
                  >
                    {showConfirmPassword
                      ? "🙈"
                      : "👁️"}
                  </button>
                </div>
              </div>

              {/* ERROR */}

              {signupError && (
                <div className="signup-error">
                  ⚠️ {signupError}
                </div>
              )}

              {/* CREATE ACCOUNT */}

              <button
                type="submit"
                className={`create-account-button ${
                  accountCreated
                    ? "account-created-button"
                    : ""
                }`}
                disabled={accountCreated}
              >
                {accountCreated
                  ? "✓ Account Created"
                  : "Create Account"}
              </button>

              {/* SUCCESS MESSAGE */}

              {accountCreated && (
                <div className="account-success">
                  <div className="success-check">
                    ✓
                  </div>

                  <div className="success-title">
                    Account created successfully!
                  </div>

                  <div className="success-message">
                    Your account has been created.
                    You can now login.
                  </div>
                </div>
              )}

              {/* LOGIN LINK */}

              <p className="already-account">
                Already have an account?

                <button
                  type="button"
                  className="signup-button"
                  onClick={closeSignup}
                >
                  Login
                </button>
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
