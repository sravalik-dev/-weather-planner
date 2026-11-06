
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

  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
    }),
  });
};

// VERIFY REGISTRATION OTP
export const verifyOtp = async (email, otp) => {
  return apiRequest("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: String(otp).trim(),
    }),
  });
};

// RESEND OTP
export const resendOtp = async (email) => {
  return apiRequest(
    `/auth/resend-otp?email=${encodeURIComponent(
      email.trim().toLowerCase()
    )}`,
    {
      method: "POST",
    }
  );
};

// FORGOT PASSWORD
export const forgotPassword = async (email) => {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });
};

// VERIFY PASSWORD RESET OTP
export const verifyResetOtp = async (email, otp) => {
  return apiRequest("/auth/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: String(otp).trim(),
    }),
  });
};

// RESET PASSWORD
export const resetPassword = async (email, newPassword) => {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      newPassword,
    }),
  });
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
