import { useEffect, useState } from "react";
import "./App.css";
import Profile from "./components/Profile";
import Trips from "./pages/Trips";

/* =========================================================
   WEATHER HELPERS
========================================================= */

const getWeatherType = (code) => {
  if (code === 0) return "clear";

  if ([1, 2].includes(code)) {
    return "partly-cloudy";
  }

  if (code === 3) {
    return "cloudy";
  }

  if ([45, 48].includes(code)) {
    return "cloudy";
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return "drizzle";
  }

  if (
    [61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  ) {
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
    storm: "Stormy",
  };

  return labels[type] || "Clear";
};


const getWeatherIcon = (type, isDay) => {
  if (type === "clear") {
    return isDay ? "☀️" : "🌙";
  }

  if (type === "partly-cloudy") {
    return isDay ? "⛅" : "☁️";
  }

  if (type === "cloudy") {
    return "☁️";
  }

  if (type === "drizzle") {
    return "🌦️";
  }

  if (type === "rain") {
    return "🌧️";
  }

  if (type === "snow") {
    return "❄️";
  }

  if (type === "storm") {
    return "⛈️";
  }

  return "🌤️";
};


/* =========================================================
   APP
========================================================= */

function App() {

  /* =======================================================
     LOGIN
  ======================================================= */

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);


  /* =======================================================
     SIGNUP
  ======================================================= */

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


  /* =======================================================
     MODALS / NAVIGATION
  ======================================================= */

  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const [showProfile, setShowProfile] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("jwtToken")
  );
  const [showTrips, setShowTrips] = useState(false);


  /* =======================================================
     WEATHER
  ======================================================= */

  const [weather, setWeather] = useState({
    type: "clear",
    temperature: null,
    isDay: true,
    location: "Loading...",
    humidity: null,
    wind: null,
  });

  const [weatherLoading, setWeatherLoading] =
    useState(true);

  const [weatherError, setWeatherError] =
    useState("");


  /* =======================================================
     GET WEATHER
  ======================================================= */

  useEffect(() => {

    if (!navigator.geolocation) {
      fetchWeather(16.5062, 80.6480);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        fetchWeather(latitude, longitude);
      },
      () => {
        // Fallback location
        fetchWeather(16.5062, 80.6480);
      }
    );

  }, []);


  const fetchWeather = async (latitude, longitude) => {

    try {

      setWeatherLoading(true);
      setWeatherError("");

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=auto`
      );

      if (!weatherResponse.ok) {
        throw new Error("Unable to fetch weather");
      }

      const weatherData = await weatherResponse.json();

      const current = weatherData.current;

      const weatherType =
        getWeatherType(current.weather_code);

      const isDay = current.is_day === 1;

      let locationName = "Your Location";

      try {

        const locationResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`
        );

        if (locationResponse.ok) {

          const locationData =
            await locationResponse.json();

          if (
            locationData.results &&
            locationData.results.length > 0
          ) {
            locationName =
              locationData.results[0].name ||
              "Your Location";
          }
        }

      } catch (error) {
        console.log(
          "Reverse geocoding unavailable"
        );
      }

      setWeather({
        type: weatherType,
        temperature: Math.round(
          current.temperature_2m
        ),
        isDay,
        location: locationName,
        humidity:
          current.relative_humidity_2m,
        wind:
          Math.round(current.wind_speed_10m),
      });

    } catch (error) {

      console.error(
        "Weather error:",
        error
      );

      setWeatherError(
        "Unable to load weather"
      );

    } finally {

      setWeatherLoading(false);

    }
  };


  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async (e) => {

    e.preventDefault();

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

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


      const resultText =
        await response.text();


      if (!response.ok) {

        let errorMessage =
          resultText ||
          "Invalid email or password.";

        /*
         * Try to extract a meaningful backend message
         * if Spring Boot returns JSON.
         */

        try {

          const errorData =
            JSON.parse(resultText);

          errorMessage =
            errorData.message ||
            errorData.error ||
            errorData.detail ||
            resultText;

        } catch {
          // Backend returned plain text
        }

        alert(
          "Login failed: " +
          errorMessage
        );

        return;
      }


      /* ===================================================
         EXTRACT JWT
      =================================================== */

      let token = null;


      /*
       * Case 1:
       * Backend returns:
       *
       * {
       *   "token": "eyJ..."
       * }
       */

      try {

        const result =
          JSON.parse(resultText);

        token =
          result.token ||
          result.jwt ||
          result.accessToken ||
          result.access_token;

      } catch {
        // Not JSON
      }


      /*
       * Case 2:
       * Backend returns the JWT directly
       */

      if (!token) {
        token = resultText.trim();
      }


      /*
       * Remove quotes if backend returns
       * a quoted JWT string.
       */

      token = token
        ?.replace(/^"|"$/g, "")
        .trim();


      if (!token) {

        alert(
          "Login successful, but JWT token was not received from the backend."
        );

        return;
      }


      /* ===================================================
         STORE JWT
      =================================================== */

      localStorage.setItem(
        "jwtToken",
        token
      );


      /*
       * Keep login state
       */

      setIsLoggedIn(true);


      /*
       * Directly open Profile
       */

      setShowProfile(true);


      /*
       * Clear login form
       */

      setPassword("");

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      alert(
        "Cannot connect to backend. Please make sure Spring Boot is running on port 8080."
      );
    }
  };


  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {

    localStorage.removeItem(
      "jwtToken"
    );

    setIsLoggedIn(false);
    setShowProfile(false);

    setEmail("");
    setPassword("");
  };


  /* =======================================================
     SIGNUP
  ======================================================= */

  const handleSignup = async (e) => {

    e.preventDefault();

    setSignupError("");
    setAccountCreated(false);


    if (!registerUsername.trim()) {

      setSignupError(
        "Please enter your name."
      );

      return;
    }


    if (!registerEmail.trim()) {

      setSignupError(
        "Please enter your email."
      );

      return;
    }


    if (registerPassword.length < 6) {

      setSignupError(
        "Password must contain at least 6 characters."
      );

      return;
    }


    if (
      registerPassword !==
      confirmPassword
    ) {

      setSignupError(
        "Passwords do not match."
      );

      return;
    }


    try {

      const response = await fetch(
        "http://localhost:8080/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            fullName:
              registerUsername,

            email:
              registerEmail,

            password:
              registerPassword,
          }),
        }
      );


      const result =
        await response.text();


      if (!response.ok) {

        let errorMessage =
          result ||
          "Unable to create account.";

        try {

          const errorData =
            JSON.parse(result);

          errorMessage =
            errorData.message ||
            errorData.error ||
            result;

        } catch {
          // Plain text response
        }

        setSignupError(
          errorMessage
        );

        return;
      }


      setAccountCreated(true);

      setRegisterUsername("");
      setRegisterEmail("");
      setRegisterPassword("");
      setConfirmPassword("");

    } catch (error) {

      console.error(
        "Signup error:",
        error
      );

      setSignupError(
        "Cannot connect to backend. Please make sure Spring Boot is running."
      );
    }
  };


  /* =======================================================
     CLOSE SIGNUP
  ======================================================= */

  const closeSignup = () => {

    setShowSignup(false);

    setSignupError("");
    setAccountCreated(false);

    setRegisterUsername("");
    setRegisterEmail("");
    setRegisterPassword("");
    setConfirmPassword("");
  };


  /* =======================================================
     PROFILE NAVIGATION
  ======================================================= */

  const openProfile = () => {

    const token =
      localStorage.getItem(
        "jwtToken"
      );

    if (!token) {

      alert(
        "Please login first."
      );

      return;
    }

    setShowProfile(true);
  };


  const closeProfile = () => {
    setShowProfile(false);
  };


  /* =======================================================
     WEATHER CLASS
  ======================================================= */

  const weatherClass =
    `app weather-${weather.type} ${
      weather.isDay
        ? "day"
        : "night"
    }`;


  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className={weatherClass}>

      {/* ===================================================
          WEATHER BACKGROUND
      =================================================== */}

      <div className="weather-background">

        {/* Sun */}

        <div className="sun-glow"></div>


        {/* Moon */}

        <div className="moon-glow">
          🌙
        </div>


        {/* Clouds */}

        <div className="cloud cloud-one">
          ☁️
        </div>

        <div className="cloud cloud-two">
          ☁️
        </div>

        <div className="cloud cloud-three">
          ☁️
        </div>


        {/* Stars */}

        <div className="stars">

          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>
          <span>✦</span>

        </div>


        {/* Rain */}

        <div className="rain-layer">

          {Array.from(
            { length: 24 },
            (_, index) => (
              <div
                className="rain-drop"
                key={index}
              />
            )
          )}

        </div>


        {/* Snow */}

        <div className="snow-layer">

          {Array.from(
            { length: 19 },
            (_, index) => (
              <div
                className="snowflake"
                key={index}
              >
                ❄
              </div>
            )
          )}

        </div>

      </div>


      {/* ===================================================
          NAVBAR
      =================================================== */}

      <nav className="navbar">

        <div className="brand">

          <div className="brand-icon">
            🌍
          </div>

          <div className="brand-name">
            Itinerary Planner
          </div>

        </div>


        <div className="nav-links">

          <button
            type="button"
            onClick={() =>
              setShowAbout(true)
            }
          >
            About
          </button>


          <button
            type="button"
            onClick={() =>
              setShowContact(true)
            }
          >
            Contact
          </button>
          {isLoggedIn && (
  <button
    type="button"
    onClick={() => {
      setShowTrips(true);
      setShowProfile(false);
    }}
  >
    Trips
  </button>
)}


          {isLoggedIn && (
            <>
              <button
                type="button"
                onClick={openProfile}
              >
                Profile
              </button>

              <button
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}

        </div>

      </nav>


      {/* ===================================================
          PROFILE
      =================================================== */}

      {showProfile ? (

        <Profile
          onBack={closeProfile}
          onLogout={handleLogout}
        />

       

) : showTrips ? (

  <Trips onBack={() => setShowTrips(false)} />

) : (

  /* =====================================================
     MAIN PAGE

        /* =================================================
           MAIN PAGE
        ================================================= */

        <main className="main-content">


          {/* Live weather */}

          <div className="live-weather">

            <span className="live-dot"></span>

            <span>
              {weatherLoading
                ? "Loading weather..."
                : "Live Weather"}
            </span>

          </div>


          {/* Weather icon */}

          <div className="weather-icon">

            {getWeatherIcon(
              weather.type,
              weather.isDay
            )}

          </div>


          {/* Weather info */}

          {!weatherLoading &&
            !weatherError && (

              <div className="weather-info">

                <div className="temperature">
                  {weather.temperature}°C
                </div>

                <div className="location">
                  {weather.location}
                </div>

                <div className="weather-details">

                  <span>
                    💧 {weather.humidity}%
                  </span>

                  <span>
                    💨 {weather.wind} km/h
                  </span>

                  <span>
                    {getWeatherLabel(
                      weather.type
                    )}
                  </span>

                </div>

              </div>

            )}


          {weatherError && (

            <div className="weather-info">

              <div className="location">
                {weatherError}
              </div>

            </div>

          )}


          {/* Main heading */}

          <h1>
            Plan Your Perfect Journey
          </h1>


          <p className="description">
            Create personalized travel
            itineraries based on your
            destination, preferences,
            budget and the weather.
          </p>


          {/* Weather icons */}

          <div className="weather-icons">

            <span>☀️</span>
            <span>🌤️</span>
            <span>🌧️</span>
            <span>❄️</span>
            <span>⛈️</span>

          </div>


          {/* =================================================
             LOGIN
          ================================================= */}

          <div className="login-container">

            <div className="login-header">

              <h2>
                Welcome Back
              </h2>

              <p>
                Login to continue planning
                your journey
              </p>

            </div>


            <form onSubmit={handleLogin}>


              {/* Email */}

              <div className="form-group">

                <label htmlFor="login-email">
                  Email
                </label>

                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  required
                />

              </div>


              {/* Password */}

              <div className="form-group">

                <label htmlFor="login-password">
                  Password
                </label>

                <div className="password-wrapper">

                  <input
                    id="login-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
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
                  >
                    {showPassword
                      ? "🙈"
                      : "👁️"}
                  </button>

                </div>

              </div>


              {/* Forgot password */}

              <div className="forgot-container">

                <button
                  type="button"
                  className="forgot-button"
                  onClick={() =>
                    alert(
                      "Please contact support to reset your password."
                    )
                  }
                >
                  Forgot Password?
                </button>

              </div>


              {/* Login */}

              <button
                type="submit"
                className="login-button"
              >
                Login
              </button>


            </form>


            {/* Divider */}

            <div className="divider">

              <span></span>

              <p>
                OR
              </p>

              <span></span>

            </div>


            {/* Signup */}

            <div className="signup-text">

              Don't have an account?

              <button
                type="button"
                className="signup-button"
                onClick={() =>
                  setShowSignup(true)
                }
              >
                Create Account
              </button>

            </div>

          </div>

        </main>

      )}


      {/* ===================================================
          ABOUT MODAL
      =================================================== */}

      {showAbout && (

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
              🌍
            </div>


            <h2>
              About Itinerary Planner
            </h2>


            <p>
              Itinerary Planner helps you
              create personalized travel
              plans based on your
              preferences, budget and
              real-time weather.
            </p>


            <p>
              Our goal is to make travel
              planning simple,
              personalized and convenient.
            </p>


            <div className="about-features">

              <div>

                <span>
                  🌦️
                </span>

                <strong>
                  Live Weather
                </strong>

                <small>
                  Real-time weather
                  information
                </small>

              </div>


              <div>

                <span>
                  🗺️
                </span>

                <strong>
                  Smart Planning
                </strong>

                <small>
                  Personalized
                  itineraries
                </small>

              </div>


              <div>

                <span>
                  💰
                </span>

                <strong>
                  Budget Friendly
                </strong>

                <small>
                  Plans based on
                  your budget
                </small>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* ===================================================
          CONTACT MODAL
      =================================================== */}

      {showContact && (

        <div
          className="info-overlay"
          onClick={() =>
            setShowContact(false)
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
                setShowContact(false)
              }
            >
              ×
            </button>


            <div className="modal-icon">
              📩
            </div>


            <h2>
              Contact Us
            </h2>


            <p>
              Have questions or feedback?
              We'd love to hear from you.
            </p>


            <div className="contact-details">

              <div className="contact-item">

                <span>
                  📧
                </span>

                <div>

                  <small>
                    Email
                  </small>

                  <a href="mailto:support@itineraryplanner.com">
                    support@itineraryplanner.com
                  </a>

                </div>

              </div>


              <div className="contact-item">

                <span>
                  💬
                </span>

                <div>

                  <small>
                    Support
                  </small>

                  <a href="mailto:support@itineraryplanner.com">
                    Contact Support
                  </a>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* ===================================================
          SIGNUP MODAL
      =================================================== */}

      {showSignup && (

        <div
          className="info-overlay"
          onClick={closeSignup}
        >

          <div
            className="info-modal signup-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="modal-close"
              onClick={closeSignup}
            >
              ×
            </button>


            <div className="signup-modal-icon">
              ✈️
            </div>


            <h2>
              Create Account
            </h2>


            <p className="signup-description">
              Create your account and
              start planning your perfect
              journey.
            </p>


            <form onSubmit={handleSignup}>


              {/* Name */}

              <div className="form-group">

                <label htmlFor="register-name">
                  Full Name
                </label>

                <input
                  id="register-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={registerUsername}
                  onChange={(e) =>
                    setRegisterUsername(
                      e.target.value
                    )
                  }
                />

              </div>


              {/* Email */}

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
                />

              </div>


              {/* Password */}

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
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowRegisterPassword(
                        !showRegisterPassword
                      )
                    }
                  >
                    {showRegisterPassword
                      ? "🙈"
                      : "👁️"}
                  </button>

                </div>

              </div>


              {/* Confirm password */}

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
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    {showConfirmPassword
                      ? "🙈"
                      : "👁️"}
                  </button>

                </div>

              </div>


              {/* Signup error */}

              {signupError && (

                <div className="signup-error">
                  {signupError}
                </div>

              )}


              {/* Create account */}

              <button
                type="submit"
                className={
                  accountCreated
                    ? "create-account-button account-created-button"
                    : "create-account-button"
                }
                disabled={accountCreated}
              >

                {accountCreated
                  ? "Account Created ✓"
                  : "Create Account"}

              </button>


              {/* Success */}

              {accountCreated && (

                <div className="account-success">

                  <div className="success-check">
                    ✓
                  </div>

                  <div className="success-title">
                    Account created successfully!
                  </div>

                  <div className="success-message">
                    You can now close this
                    window and login.
                  </div>

                </div>

              )}

            </form>


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

          </div>

        </div>

      )}

    </div>
  );
}

export default App;