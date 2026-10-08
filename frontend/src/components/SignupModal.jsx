function SignupModal({
  showSignup,
  closeSignup,
  registerUsername,
  registerEmail,
  registerPassword,
  confirmPassword,
  showRegisterPassword,
  showConfirmPassword,
  accountCreated,
  signupError,
  setRegisterUsername,
  setRegisterEmail,
  setRegisterPassword,
  setConfirmPassword,
  setShowRegisterPassword,
  setShowConfirmPassword,
  onSubmit,
}) {
  if (!showSignup) {
    return null;
  }

  return (
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
          Create Your Account
        </h2>

        <p className="signup-description">
          Join us and start creating
          unforgettable travel memories.
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>
              Username
            </label>

            <input
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

          <div className="form-group">
            <label>
              Email
            </label>

            <input
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

          <div className="form-group">
            <label>
              Password
            </label>

            <div className="password-wrapper">
              <input
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
              >
                {showRegisterPassword
                  ? "🙈"
                  : "👁️"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>
              Confirm Password
            </label>

            <div className="password-wrapper">
              <input
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
              >
                {showConfirmPassword
                  ? "🙈"
                  : "👁️"}
              </button>
            </div>
          </div>

          {signupError && (
            <div className="signup-error">
              ⚠️ {signupError}
            </div>
          )}

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
  );
}

export default SignupModal;