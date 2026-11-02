import { apiRequest, clearAuthStorage, getToken, saveToken } from "../utils/apiUtils";

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
    const message = typeof data === "string"
      ? data
      : data?.message || data?.error || data?.detail || "Authentication request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.responseData = data;
    throw error;
  }

  return data;
};

export const loginUser = async (email, password) => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await parseAuthResponse(response);
  const token = typeof data === "string" ? data : data?.token;
  if (!token || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("Login succeeded, but the backend did not return a valid JWT token.");
  }
  return saveToken(token);
};

export const registerUser = async (fullName, email, password) =>
  apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName, email: email.trim(), password }),
  });

export const verifyOtp = async (email, otp) =>
  apiRequest("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email: email.trim(), otp }) });

export const resendOtp = async (email) =>
  apiRequest(`/auth/resend-otp?email=${encodeURIComponent(email.trim())}`, { method: "POST" });

export const forgotPassword = async (email) =>
  apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: email.trim() }) });

export const verifyResetOtp = async (email, otp) =>
  apiRequest("/auth/verify-reset-otp", { method: "POST", body: JSON.stringify({ email: email.trim(), otp }) });

export const resetPassword = async (email, newPassword) =>
  apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify({ email: email.trim(), newPassword }) });

export const logoutUser = () => clearAuthStorage();
export const isAuthenticated = () => Boolean(getToken());
export const checkAuthentication = async () => {
  await apiRequest("/trips");
  return true;
};
