import { useEffect, useState } from "react";
import "./App.css";
import "./styles/RecommendationChanges.css";
import AppShell from "./components/AppShell";
import {
  apiRequest,
  clearAuthStorage,
  getCurrentWeather,
  getToken,
} from "./utils/apiUtils";
import { resolveLocationName } from "./utils/locationUtils";
import {
  forgotPassword,
  loginUser,
  logoutUser,
  registerUser,
  resendOtp,
  resetPassword,
  verifyOtp,
  verifyResetOtp,
} from "./services/authService";
import {
  getWeatherIcon,
  getWeatherLabel,
  getWeatherType,
} from "./utils/weatherUtils";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [signupError, setSignupError] = useState("");

  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPasswordValue, setForgotPasswordValue] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState({ name: "", email: "" });

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

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      if (!getToken()) {
        clearAuthStorage();
        return;
      }

      try {
        const profile = await apiRequest("/profile");
        if (active) {
          setLoggedInUser({
            name: profile.fullName || profile.email?.split("@")[0] || "Traveler",
            email: profile.email || "",
          });
          setIsLoggedIn(true);
        }
      } catch (error) {
        if (active && /401|403|authentication/i.test(error.message)) {
          clearAuthStorage();
          setIsLoggedIn(false);
        }
      }
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadWeather = async (latitude, longitude) => {
      try {
        const weatherData = await getCurrentWeather(latitude, longitude);
        const locationName = await resolveLocationName(latitude, longitude);

        setWeather({
          type: getWeatherType(weatherData.weatherCode),
          temperature: Math.round(weatherData.temperature),
          isDay: weatherData.isDay !== false && weatherData.isDay !== 0,
          location: locationName || "",
          humidity: weatherData.humidity,
          wind: weatherData.windSpeed,
          loading: false,
          error: locationName
            ? ""
            : "Weather loaded. Named location is unavailable.",
        });
      } catch (error) {
        console.error("Weather error:", error);
        setWeather((previous) => ({
          ...previous,
          loading: false,
          location: "",
          error: "Unable to load live weather.",
        }));
      }
    };

    if (!navigator.geolocation) {
      setWeather((previous) => ({
        ...previous,
        loading: false,
        location: "",
        error: "Location is not supported by your browser.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        loadWeather(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
  let message = "Unable to detect your current location.";

  if (error.code === 1) {
    message = "Location permission denied. Please allow location access or enter a location manually.";
  } else if (error.code === 2) {
    message = "Your current location is unavailable. Please try again.";
  } else if (error.code === 3) {
    message = "Location request timed out. Please try again.";
  }

  setWeather((previous) => ({
    ...previous,
    loading: false,
    location: "",
    error: message,
  }));
},
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      alert("Please enter your email and password.");
      return;
    }

    setLoginBusy(true);
    try {
      await loginUser(email, password);
      const profile = await apiRequest("/profile");
      const user = {
        name: profile.fullName || email.trim().split("@")[0],
        email: profile.email || email.trim(),
      };

      localStorage.setItem("itineraryUser", JSON.stringify(user));
      setLoggedInUser(user);
      setIsLoggedIn(true);
      setPassword("");
    } catch (error) {
      clearAuthStorage();
      setIsLoggedIn(false);
      alert(error.message || "Login failed. Please check your email and password.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setIsLoggedIn(false);
    setLoggedInUser({ name: "", email: "" });
    setEmail("");
    setPassword("");
  };

  const openSignup = () => {
    setShowSignup(true);
    setAccountCreated(false);
    setOtp("");
    setOtpError("");
    setSignupError("");
  };

  const closeSignup = () => {
    setShowSignup(false);
    setSignupError("");
    setOtpError("");
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setSignupError("");

    if (registerPassword !== confirmPassword) {
      setSignupError("Passwords do not match.");
      setAccountCreated(false);
      return;
    }

    if (registerPassword.length < 6) {
      setSignupError("Password must contain at least 6 characters.");
      setAccountCreated(false);
      return;
    }

    try {
      await registerUser(registerUsername, registerEmail, registerPassword);
      setAccountCreated(true);
      setOtp("");
      setOtpError("");
      setSignupError("");
    } catch (error) {
      setAccountCreated(false);
      setSignupError(error.message || "Registration failed.");
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setOtpError("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError("Enter the 6-digit verification code.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const result = await verifyOtp(registerEmail, otp.trim());
      if (result !== "OTP verified successfully") {
        throw new Error(result || "Unable to verify your account.");
      }
      setAccountCreated(false);
      setOtp("");
      setShowSignup(false);
      setEmail(registerEmail);
      setPassword(registerPassword);
      setSignupError("");
      alert("Account verified. Please log in.");
    } catch (error) {
      setOtpError(error.message || "Unable to verify your account.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep("email");
    setForgotEmail(email);
    setForgotOtp("");
    setForgotPasswordValue("");
    setForgotError("");
  };

  const handleForgotEmail = async (event) => {
    event.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError("Enter the email for your account.");
      return;
    }
    setForgotBusy(true);
    try {
      await forgotPassword(forgotEmail.trim());
      setForgotStep("otp");
    } catch (error) {
      setForgotError(error.message || "Unable to send reset OTP.");
    } finally {
      setForgotBusy(false);
    }
  };

  const handleForgotOtp = async (event) => {
    event.preventDefault();
    setForgotError("");
    if (!/^\d{6}$/.test(forgotOtp.trim())) {
      setForgotError("Enter the 6-digit verification code.");
      return;
    }
    setForgotBusy(true);
    try {
      await verifyResetOtp(forgotEmail.trim(), forgotOtp.trim());
      setForgotStep("password");
    } catch (error) {
      setForgotError(error.message || "Unable to verify reset OTP.");
    } finally {
      setForgotBusy(false);
    }
  };

  const handleForgotReset = async (event) => {
    event.preventDefault();
    setForgotError("");
    if (forgotPasswordValue.length < 6) {
      setForgotError("Password must contain at least 6 characters.");
      return;
    }
    setForgotBusy(true);
    try {
      await resetPassword(forgotEmail.trim(), forgotPasswordValue);
      setShowForgot(false);
      setEmail(forgotEmail.trim());
      alert("Password reset successfully. Please log in.");
    } catch (error) {
      setForgotError(error.message || "Unable to reset password.");
    } finally {
      setForgotBusy(false);
    }
  };

  const weatherIcon = getWeatherIcon(weather.type, weather.isDay);
  const weatherLabel = getWeatherLabel(weather.type);

  const locationLine = weather.loading
    ? "Detecting location..."
    : weather.location
    ? weather.location
    : weather.error || "Location unavailable";

  if (isLoggedIn) {
    return (
      <AppShell
        user={loggedInUser}
        weather={weather}
        onLogout={handleLogout}
        onUserUpdate={setLoggedInUser}
      />
    );
  }

  return (
    <div className={`app weather-${weather.type} ${weather.isDay ? "day" : "night"}`}>
      <div className="weather-background" aria-hidden="true">
        <div className="sun-glow"></div>
        <div className="moon-glow">🌙</div>
        <div className="cloud cloud-one">☁️</div>
        <div className="cloud cloud-two">☁️</div>
        <div className="cloud cloud-three">☁️</div>
        <div className="rain-layer">
          {Array.from({ length: 45 }).map((_, index) => (
            <span key={index} className="rain-drop"></span>
          ))}
        </div>
        <div className="snow-layer">
          {Array.from({ length: 35 }).map((_, index) => (
            <span key={index} className="snowflake">❄</span>
          ))}
        </div>
        <div className="stars">
          {Array.from({ length: 35 }).map((_, index) => (
            <span key={index}>✦</span>
          ))}
        </div>
      </div>

      <header className="navbar">
        <div className="brand">
          <span className="brand-icon">{weatherIcon}</span>
          <span className="brand-name">Itinerary Planner</span>
        </div>
        <nav className="nav-links">
          <button type="button" onClick={() => setShowAbout(true)}>About</button>
          <button type="button" onClick={() => setShowContact(true)}>Contact</button>
        </nav>
      </header>

      <main className="main-content">
        <div className="live-weather">
          <span className="live-dot"></span>
          <span>
            {weather.loading
              ? "Detecting live weather..."
              : weather.error && !weather.temperature
              ? weather.error
              : `Live weather • ${weatherLabel}`}
          </span>
        </div>

        <div className="weather-icon">{weatherIcon}</div>

        {!weather.loading && weather.temperature !== null && (
          <div className="weather-info">
            <div className="temperature">{weather.temperature}°C</div>
            <div className="location">📍 {locationLine}</div>
            {weather.humidity !== null && (
              <div className="weather-details">
                <span>💧 {weather.humidity}%</span>
                <span>💨 {Math.round(weather.wind)} km/h</span>
              </div>
            )}
          </div>
        )}

        {weather.loading && (
          <div className="weather-info">
            <div className="location">📍 Detecting location...</div>
          </div>
        )}

        {!weather.loading && weather.temperature === null && (
          <div className="weather-info">
            <div className="location">📍 {locationLine}</div>
          </div>
        )}

        <h1>
          Plan smarter.
          <br />
          Travel better.
        </h1>

        <p className="description">
          Your intelligent travel companion that adapts your itinerary based on
          real-time weather conditions.
        </p>

        <div className="weather-icons">
          <span>☀️</span>
          <span>🌤️</span>
          <span>🌧️</span>
          <span>⛈️</span>
        </div>

        <section className="login-container">
          <div className="login-header">
            <h2>Welcome Back!</h2>
            <p>Login to continue planning your perfect trip.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="forgot-container">
              <button type="button" className="forgot-button" onClick={openForgot}>
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-button" disabled={loginBusy}>
              {loginBusy ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="divider">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <p className="signup-text">
            Don't have an account?
            <button type="button" className="signup-button" onClick={openSignup}>
              Sign Up
            </button>
          </p>
        </section>
      </main>

      {showAbout && (
        <div className="info-overlay" onClick={() => setShowAbout(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAbout(false)}>×</button>
            <div className="modal-icon">🌤️</div>
            <h2>About Itinerary Planner</h2>
            <p>
              Itinerary Planner is a smart travel planning platform designed to
              make trips easier, safer, and more enjoyable.
            </p>
            <p>
              The platform uses real-time weather information to help travelers
              plan their activities according to current and changing weather
              conditions.
            </p>
            <p>
              Instead of following a fixed itinerary, travelers can make better
              decisions based on weather conditions such as sunshine, rain,
              storms, and snow.
            </p>
            <div className="about-features">
              <div>
                <span>🌦️</span>
                <strong>Live Weather</strong>
                <small>Real-time weather information</small>
              </div>
              <div>
                <span>🗺️</span>
                <strong>Smart Planning</strong>
                <small>Plan activities more efficiently</small>
              </div>
              <div>
                <span>🤖</span>
                <strong>Intelligent Travel</strong>
                <small>Adapt plans to weather conditions</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContact && (
        <div className="info-overlay" onClick={() => setShowContact(false)}>
          <div className="info-modal contact-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowContact(false)}>×</button>
            <div className="modal-icon">📞</div>
            <h2>Contact Us</h2>
            <p>Have a question, suggestion, or feedback? We'd love to hear from you.</p>
            <div className="contact-details">
              <div className="contact-item">
                <span>📧</span>
                <div>
                  <small>Email</small>
                  <a href="mailto:weathervsks@gmail.com">weathervsks@gmail.com</a>
                </div>
              </div>
              <div className="contact-item">
                <span>📱</span>
                <div>
                  <small>Phone</small>
                  <a href="tel:9095050274">9095050274</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSignup && (
        <div className="info-overlay signup-overlay" onClick={closeSignup}>
          <div className="info-modal signup-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeSignup}>×</button>
            <div className="signup-modal-icon">✈️</div>
            <h2>Create Your Account</h2>
            <p className="signup-description">
              Join us and start creating unforgettable travel memories.
            </p>

            <form onSubmit={handleCreateAccount}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  disabled={accountCreated}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  disabled={accountCreated}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-wrapper">
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={accountCreated}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  >
                    {showRegisterPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="password-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={accountCreated}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {signupError && <div className="signup-error">⚠️ {signupError}</div>}

              <button
                type="submit"
                className={`create-account-button ${accountCreated ? "account-created-button" : ""}`}
                disabled={accountCreated}
              >
                {accountCreated ? "✓ Account Created" : "Create Account"}
              </button>

              <p className="already-account">
                Already have an account?
                <button type="button" className="signup-button" onClick={closeSignup}>
                  Login
                </button>
              </p>
            </form>

            {accountCreated && (
              <div className="account-success">
                <div className="success-check">✓</div>
                <div className="success-title">Account created successfully!</div>
                <div className="success-message">
                  Enter the OTP sent to your email to verify your account.
                </div>
                <form className="otp-form" onSubmit={handleVerifyOtp}>
                  <label>Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength="6"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                    disabled={verifyingOtp}
                    required
                  />
                  {otpError && <div className="signup-error">⚠️ {otpError}</div>}
                  <button type="submit" className="create-account-button" disabled={verifyingOtp}>
                    {verifyingOtp ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    className="resend-otp-button"
                    onClick={() =>
                      resendOtp(registerEmail).catch((error) =>
                        setOtpError(error.message || "Unable to resend OTP.")
                      )
                    }
                  >
                    Resend OTP
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {showForgot && (
        <div className="info-overlay" onClick={() => setShowForgot(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowForgot(false)}>×</button>
            <div className="modal-icon">🔐</div>
            <h2>Reset Password</h2>
            {forgotError && <div className="signup-error">⚠️ {forgotError}</div>}

            {forgotStep === "email" && (
              <form onSubmit={handleForgotEmail}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="login-button" disabled={forgotBusy}>
                  {forgotBusy ? "Sending..." : "Send OTP"}
                </button>
              </form>
            )}

            {forgotStep === "otp" && (
              <form onSubmit={handleForgotOtp}>
                <div className="form-group">
                  <label>Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength="6"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
                <button type="submit" className="login-button" disabled={forgotBusy}>
                  {forgotBusy ? "Verifying..." : "Verify OTP"}
                </button>
              </form>
            )}

            {forgotStep === "password" && (
              <form onSubmit={handleForgotReset}>
                <div className="form-group">
                  <label>New password</label>
                  <input
                    type="password"
                    value={forgotPasswordValue}
                    onChange={(e) => setForgotPasswordValue(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="login-button" disabled={forgotBusy}>
                  {forgotBusy ? "Saving..." : "Reset Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;