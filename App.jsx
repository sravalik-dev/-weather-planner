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
  };

  return (
    <div className="login-page">
      <div className="login-box">

        <div className="logo">☀️</div>

        <h1>
          Dynamic Weather Adaptive
          <br />
          Itinerary Planner
        </h1>

        <p className="welcome">Welcome Back!</p>

        <form onSubmit={handleLogin}>

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>

          <div className="password-box">

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>

          </div>

          <button type="submit" className="login-button">
            Login
          </button>

        </form>

        <button className="forgot">
          Forgot Password?
        </button>

        <div className="or">
          <span></span>
          <p>OR</p>
          <span></span>
        </div>

        <p className="signup">
          Don't have an account?

          <button>
            Sign Up
          </button>
        </p>

      </div>
    </div>
  );
}

export default App;
