
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api"
).replace(/\/$/, "");

export const AUTH_TOKEN_KEY = "jwtToken";

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

export const getToken = () =>
  String(localStorage.getItem(AUTH_TOKEN_KEY) || "").trim();

export const saveToken = (token) => {
  const normalizedToken = String(token || "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^"|"$/g, "")
    .trim();

  if (!normalizedToken) {
    throw new Error("The backend did not return a JWT token.");
  }

  localStorage.setItem(AUTH_TOKEN_KEY, normalizedToken);
  localStorage.setItem("isLoggedIn", "true");

  return normalizedToken;
};

export const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("itineraryUser");
};

// --------------------------------------------------
// AUTHENTICATION HEADERS
// --------------------------------------------------

export const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getJsonAuthHeaders = () => getAuthHeaders();

// --------------------------------------------------
// API ERROR HANDLING
// --------------------------------------------------

export const readApiError = async (response, text = "") => {
  const responseText = text || (await response.text());

  try {
    const data = JSON.parse(responseText);

    return (
      data?.message ||
      data?.error ||
      data?.detail ||
      responseText ||
      `Request failed (${response.status})`
    );
  } catch {
    return responseText || `Request failed (${response.status})`;
  }
};

// --------------------------------------------------
// COMMON API REQUEST
// --------------------------------------------------

export const apiRequest = async (endpoint, options = {}) => {
  const path = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
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
    const error = new Error(
      await readApiError(response, text)
    );

    error.status = response.status;
    error.endpoint = endpoint;
    error.responseData = data;

    if (response.status === 401 || response.status === 403) {
      clearAuthStorage();
    }

    throw error;
  }

  return data;
};

// --------------------------------------------------
// CURRENT WEATHER
// --------------------------------------------------

export const getCurrentWeather = async (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(
      "Valid latitude and longitude are required."
    );
  }

  if (
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    throw new Error(
      "Latitude and longitude are outside the valid range."
    );
  }

  return apiRequest(
    `/weather/current?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`
  );
};

// --------------------------------------------------
// SEARCH LOCATIONS BY NAME
// --------------------------------------------------

export const searchLocations = async (name) => {
  const searchName = String(name || "").trim();

  if (!searchName) {
    throw new Error("Please enter a destination name.");
  }

  const results = await apiRequest(
    `/weather/search?name=${encodeURIComponent(searchName)}`
  );

  return Array.isArray(results) ? results : [];
};

// --------------------------------------------------
// GET LOCATION NAME USING COORDINATES
// --------------------------------------------------

export const getNamedLocation = async (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(
      "Valid latitude and longitude are required."
    );
  }

  if (
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    throw new Error(
      "Latitude and longitude are outside the valid range."
    );
  }

  return apiRequest(
    `/weather/location?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`
  );
};
