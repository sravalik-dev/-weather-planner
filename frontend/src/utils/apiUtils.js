export const API_BASE_URL = "http://localhost:8080";

export const getToken = () => {
  return (
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("itineraryToken") ||
    ""
  ).trim();
};

export const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

export const getJsonAuthHeaders = () => {
  return getAuthHeaders();
};

export const clearAuthStorage = () => {
  localStorage.removeItem("jwtToken");
  localStorage.removeItem("itineraryToken");
  localStorage.removeItem("isLoggedIn");
};

export const readApiError = async (response) => {
  const text = await response.text();

  if (response.status === 401) {
    return "Your login session is missing or expired. Please login again.";
  }

  if (response.status === 403) {
    return "Access denied. Please login again and make sure your JWT token is valid.";
  }

  try {
    const data = JSON.parse(text);

    return (
      data?.message ||
      data?.error ||
      data?.detail ||
      text ||
      `Request failed (${response.status})`
    );
  } catch {
    return text || `Request failed (${response.status})`;
  }
};

/**
 * Generic API request helper.
 */
export const apiRequest = async (endpoint, options = {}) => {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

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
    let message = "";

    if (
      data &&
      typeof data === "object"
    ) {
      message =
        data.message ||
        data.error ||
        data.detail ||
        data.title ||
        "";
    } else if (
      typeof data === "string"
    ) {
      message = data;
    }

    if (!message) {
      message = `Request failed with status ${response.status}`;
    }

    const error = new Error(message);

    error.status = response.status;
    error.endpoint = endpoint;
    error.responseData = data;

    throw error;
  }

  return data;
};

/**
 * Build the backend current-weather URL.
 *
 * Example:
 * /api/weather/current?latitude=16.3067&longitude=80.4365
 */
export const buildCurrentWeatherUrl = (
  latitude,
  longitude
) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    throw new Error(
      "Valid latitude and longitude are required."
    );
  }

  if (lat < -90 || lat > 90) {
    throw new Error(
      "Latitude must be between -90 and 90."
    );
  }

  if (lon < -180 || lon > 180) {
    throw new Error(
      "Longitude must be between -180 and 180."
    );
  }

  return (
    `${API_BASE_URL}/api/weather/current` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}`
  );
};

/**
 * Get current weather from YOUR Spring Boot backend.
 */
export const getCurrentWeather = async (
  latitude,
  longitude
) => {
  const url = buildCurrentWeatherUrl(
    latitude,
    longitude
  );

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
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
    let message = "";

    if (
      data &&
      typeof data === "object"
    ) {
      message =
        data.message ||
        data.error ||
        data.detail ||
        data.title ||
        "";
    } else if (
      typeof data === "string"
    ) {
      message = data;
    }

    if (!message) {
      message =
        `Weather request failed (${response.status})`;
    }

    const error = new Error(message);

    error.status = response.status;
    error.responseData = data;

    throw error;
  }

  return data;
};