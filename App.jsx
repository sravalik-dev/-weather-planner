import { useState } from "react";
import "./App.css";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    alert("Login button clicked!");

    console.log("Login button clicked!");
    console.log("Email:", email);
    console.log("Password:", password);

    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const message = await response.text();

      alert(message);

      console.log("Response:", message);

      if (message === "Login successful!") {
        alert("Welcome!");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      alert("Cannot connect to backend");
    }
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

      {/* ================= MAIN ================= */}
      <main className="main-container">
        {/* LEFT */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="weather-icon">🌤️</div>

            <h1>
              Plan smarter.
              <br />
              Travel better.
            </h1>

            <p className="hero-description">
              Your intelligent travel companion that adapts your itinerary
              based on real-time weather conditions.
            </p>

            <div className="weather-icons">
              <span>☀️</span>
              <span>🌤️</span>
              <span>🌧️</span>
              <span>⛈️</span>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="login-section">
          <div className="login-container">
            <div className="login-header">
              <h2>Welcome Back!</h2>

              <p>Login to continue planning your perfect trip.</p>
            </div>

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label>Password</label>

                <div className="password-wrapper">
                  <input
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
                <button type="button" className="forgot-button">
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="login-button"
              >
                Login
              </button>
            </form>

            <div className="divider">
              <span></span>
              <p>OR</p>
              <span></span>
            </div>

            <p className="signup-text">
              Don't have an account?

              <button
                type="button"
                className="signup-button"
                onClick={() => alert("Registration page not added yet")}
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