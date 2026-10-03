function Login({
  email,
  password,
  showPassword,
  setEmail,
  setPassword,
  setShowPassword,
  onSubmit,
  onSignup,
  onForgotPassword,
}) {
  return (
    <section className="login-container">
      <div className="login-header">
        <h2>Welcome Back!</h2>

        <p>
          Login to continue planning your perfect trip.
        </p>
      </div>

      <form onSubmit={onSubmit}>
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
            >
              {showPassword
                ? "🙈"
                : "👁️"}
            </button>
          </div>
        </div>

        <div className="forgot-container">
          <button
            type="button"
            className="forgot-button"
            onClick={onForgotPassword}
          >
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
          onClick={onSignup}
        >
          Sign Up
        </button>
      </p>
    </section>
  );
}

export default Login;