
import {
  API_BASE_URL,
  apiRequest,
  clearAuthStorage,
  getToken,
  saveToken,
} from "../utils/apiUtils";

// Handle authentication responses
const parseAuthResponse = async (response) => {
  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.message ||
          data?.detail ||
          data?.error ||
          `Authentication failed (${response.status}).`;

    const error = new Error(message);
    error.status = response.status;
    error.responseData = data;

    throw error;
  }

  return data;
};


// The backend auth endpoints answer with HTTP 200 and a plain-text message
// for BOTH success and failure ("Invalid OTP!", "Email already exists!"...).
// This guard turns a failure message into a thrown Error so the UI can
// show it instead of treating it as success.
const expectSuccess = (result, successPattern, fallback) => {
  const message =
    typeof result === "string"
      ? result.trim()
      : String(result?.message || "").trim();

  if (!successPattern.test(message)) {
    throw new Error(message || fallback);
  }

  return message;
};

// LOGIN
export const loginUser = async (email, password) => {
  if (!email?.trim() || !password) {
    throw new Error("Please enter your email and password.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  const data = await parseAuthResponse(response);

  const token =
    typeof data === "string"
      ? data
      : data?.token ||
        data?.accessToken ||
        data?.jwt;

  if (!token) {
    throw new Error(
      "Login succeeded, but the backend did not return a JWT token."
    );
  }

  // Validate JWT: header.payload.signature
  const jwtPattern =
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

  if (!jwtPattern.test(token)) {
    throw new Error("The backend returned an invalid JWT token.");
  }

  return saveToken(token);
};

// REGISTER
export const registerUser = async (fullName, email, password) => {
  if (!fullName?.trim() || !email?.trim() || !password) {
    throw new Error("Please fill in all registration fields.");
  }

  const result = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  return expectSuccess(result, /otp sent/i, "Registration failed.");
};

// VERIFY REGISTRATION OTP
export const verifyOtp = async (email, otp) => {
  const result = await apiRequest("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: String(otp).trim(),
    }),
  });

  return expectSuccess(
    result,
    /verified successfully/i,
    "Unable to verify your account."
  );
};

// RESEND OTP
export const resendOtp = async (email) => {
  const result = await apiRequest(
    `/auth/resend-otp?email=${encodeURIComponent(
      email.trim().toLowerCase()
    )}`,
    {
      method: "POST",
    }
  );

  return expectSuccess(result, /otp sent/i, "Unable to resend the OTP.");
};

// FORGOT PASSWORD
export const forgotPassword = async (email) => {
  const result = await apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  return expectSuccess(result, /otp sent/i, "Unable to send the reset OTP.");
};

// VERIFY PASSWORD RESET OTP
export const verifyResetOtp = async (email, otp) => {
  const result = await apiRequest("/auth/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: String(otp).trim(),
    }),
  });

  return expectSuccess(
    result,
    /verified successfully/i,
    "Unable to verify the reset OTP."
  );
};

// RESET PASSWORD
export const resetPassword = async (email, newPassword) => {
  const result = await apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      newPassword,
    }),
  });

  return expectSuccess(
    result,
    /reset successfully/i,
    "Unable to reset the password."
  );
};

// LOGOUT
export const logoutUser = () => {
  clearAuthStorage();
};

// CHECK LOGIN STATUS
export const isAuthenticated = () => {
  return Boolean(getToken());
};

// VERIFY AUTHENTICATED SESSION
export const checkAuthentication = async () => {
  await apiRequest("/trips");
  return true;
};
