import { useState } from "react";
import "./App.css";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();

    console.log("Email:", email);
    console.log("Password:", password);

    // Backend authentication will be added later
  };

  return (
    <div className="app">

      {/* ================= HEADER ================= */}
      <header className="navbar">

        <div className="brand">
          <span className="brand-icon">☀️</span>
          <span className="brand-name">Weather Planner</span>
        </div>

        <nav className="nav-links">
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>

      </header>


      {/* ================= MAIN CONTENT ================= */}
      <main className="main-container">

        {/* ================= LEFT SECTION ================= */}
        <section className="hero-section">

          <div className="hero-content">

            <div className="weather-icon">
              🌤️
            </div>

            <h1>
              Plan smarter.
              <br />
              Travel better.
            </h1>

            <p className="hero-description">
              Your intelligent travel companion that adapts your
              itinerary based on real-time weather conditions.
            </p>

            <div className="weather-icons">
              <span>☀️</span>
              <span>🌤️</span>
              <span>🌧️</span>
              <span>⛈️</span>
            </div>

          </div>

        </section>


        {/* ================= RIGHT LOGIN SECTION ================= */}
        <section className="login-section">

          <div className="login-container">

            <div className="login-header">
              <h2>Welcome Back!</h2>

              <p>
                Login to continue planning your perfect trip.
              </p>
            </div>


            {/* ================= LOGIN FORM ================= */}
            <form onSubmit={handleLogin}>

              {/* Email */}
              <div className="form-group">

                <label htmlFor="email">
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

              </div>


              {/* Password */}
              <div className="form-group">

                <label htmlFor="password">
                  Password
                </label>

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
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    aria-label="Show or hide password"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>

                </div>

              </div>


              {/* Forgot Password */}
              <div className="forgot-container">

                <button
                  type="button"
                  className="forgot-button"
                >
                  Forgot Password?
                </button>

              </div>


              {/* Login Button */}
              <button
                type="submit"
                className="login-button"
              >
                Login
              </button>

            </form>


            {/* ================= DIVIDER ================= */}
            <div className="divider">

              <span></span>

              <p>OR</p>

              <span></span>

            </div>


            {/* ================= SIGNUP ================= */}
            <p className="signup-text">

              Don't have an account?

              <button
                type="button"
                className="signup-button"
              >
                Sign Up
              </button>

            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;
