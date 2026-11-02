export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
export const AUTH_TOKEN_KEY = "jwtToken";

export const getToken = () => String(localStorage.getItem(AUTH_TOKEN_KEY) || "").trim();

export const saveToken = (token) => {
  const normalizedToken = String(token || "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^"|"$/g, "")
    .trim();

  if (!normalizedToken) throw new Error("The backend did not return a JWT token.");

  localStorage.setItem(AUTH_TOKEN_KEY, normalizedToken);
  localStorage.setItem("isLoggedIn", "true");
  return normalizedToken;
};

export const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("itineraryUser");
};

export const getAuthHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getJsonAuthHeaders = () => getAuthHeaders();

export const readApiError = async (response, text = "") => {
  const responseText = text || (await response.text());
  if (response.status === 401 || response.status === 403) {
    clearAuthStorage();
    return "Your login session is missing or expired. Please login again.";
  }

  try {
    const data = JSON.parse(responseText);
    return data?.message || data?.error || data?.detail || responseText || `Request failed (${response.status})`;
  } catch {
    return responseText || `Request failed (${response.status})`;
  }
};

export const apiRequest = async (endpoint, options = {}) => {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });

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
    const error = new Error(await readApiError(response, text));
    error.status = response.status;
    error.endpoint = endpoint;
    error.responseData = data;
    throw error;
  }

  return data;
};

export const getCurrentWeather = async (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Valid latitude and longitude are required.");
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error("Latitude and longitude are outside the valid range.");
  }

  return apiRequest(
    `/weather/current?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`
  );
};

export const getNamedLocation = async (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Valid latitude and longitude are required.");
  }

  return apiRequest(
    `/weather/location?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`
  );
};