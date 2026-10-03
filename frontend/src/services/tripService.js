const API_BASE_URL = "http://localhost:8080/api";
const API_URL = `${API_BASE_URL}/trips`;

/*
  Get the JWT token used by the application.

  The login code stores the token as "itineraryToken".
  The other keys are included as fallbacks so older sessions
  will still work.
*/
const getToken = () => {
  return (
    localStorage.getItem("itineraryToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("token")
  );
};

/*
  Create authentication headers.
*/
const getAuthHeaders = () => {
  const token = getToken();

  if (!token) {
    throw new Error("Please log in to continue.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

/*
  Remove all known token keys when the session is invalid.
*/
const clearTokens = () => {
  localStorage.removeItem("itineraryToken");
  localStorage.removeItem("jwtToken");
  localStorage.removeItem("token");
};

/*
  Friendly messages for HTTP status codes.
*/
const statusFallbackMessage = (status) => {
  switch (status) {
    case 400:
      return "The trip request is invalid. Please check the form values.";

    case 401:
      return "Your session expired. Please log in again.";

    case 403:
      return "You are not authorized to perform this action.";

    case 404:
      return "The requested trip endpoint was not found.";

    case 409:
      return "The trip data conflicts with the current state on the server.";

    case 500:
      return "The backend server encountered an error.";

    default:
      return "Request failed. Please check the backend connection.";
  }
};

/*
  Handle the backend response.
*/
const handleResponse = async (response) => {
  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearTokens();
    }

    const message =
      data?.message ||
      data?.error ||
      (typeof data === "string" && data.trim()
        ? data
        : null) ||
      statusFallbackMessage(response.status);

    throw new Error(message);
  }

  return data;
};

/*
  Common fetch function.
*/
const request = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);

    return await handleResponse(response);
  } catch (error) {
    /*
      TypeError normally means the browser could not connect
      to the backend.
    */
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot connect to backend at http://localhost:8080. Please make sure Spring Boot is running."
      );
    }

    throw error;
  }
};

/*
  GET all trips
  GET /api/trips
*/
export const getTrips = async () => {
  return request(API_URL, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

/*
  GET one trip
  GET /api/trips/{tripId}
*/
export const getTrip = async (tripId) => {
  return request(`${API_URL}/${tripId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

/*
  CREATE trip
  POST /api/trips
*/
export const createTrip = async (tripData) => {
  return request(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });
};

/*
  SAVE draft
  POST /api/trips/draft
*/
export const saveDraft = async (tripData) => {
  return request(`${API_URL}/draft`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });
};

/*
  UPDATE trip
  PUT /api/trips/{tripId}
*/
export const updateTrip = async (tripId, tripData) => {
  return request(`${API_URL}/${tripId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });
};

/*
  DELETE trip
  DELETE /api/trips/{tripId}
*/
export const deleteTrip = async (tripId) => {
  return request(`${API_URL}/${tripId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
};

/*
  DUPLICATE trip
  POST /api/trips/{tripId}/duplicate
*/
export const duplicateTrip = async (tripId) => {
  return request(`${API_URL}/${tripId}/duplicate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
};

/*
  ARCHIVE trip
  PUT /api/trips/{tripId}/archive
*/
export const archiveTrip = async (tripId) => {
  return request(`${API_URL}/${tripId}/archive`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
};

