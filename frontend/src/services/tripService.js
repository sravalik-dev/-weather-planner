const API_URL = "http://localhost:8080/api/trips";

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
  const headers = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("jwtToken");

  if (!token) {
    throw new Error("Please log in to continue.");
  }

  headers.Authorization = `Bearer ${token}`;
  return headers;
};

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
      return "The backend server is currently unavailable. Please try again.";
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
    const message =
      data?.message ||
      data?.error ||
      (typeof data === "string" && data ? data : null) ||
      statusFallbackMessage(response.status);

    throw new Error(message);
  }

  return data;
};

const request = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    return handleResponse(response);
  } catch (error) {
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
  const response = await fetch(API_URL, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/*
  GET one trip
  GET /api/trips/{tripId}
*/
export const getTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/*
  CREATE trip
  POST /api/trips
*/
export const createTrip = async (tripData) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });

  return handleResponse(response);
};

/*
  SAVE draft
  POST /api/trips/draft
*/
export const saveDraft = async (tripData) => {
  const response = await fetch(`${API_URL}/draft`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });

  return handleResponse(response);
};

/*
  UPDATE trip
  PUT /api/trips/{tripId}
*/
export const updateTrip = async (tripId, tripData) => {
  const response = await fetch(`${API_URL}/${tripId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });

  return handleResponse(response);
};

/*
  DELETE trip
  DELETE /api/trips/{tripId}
*/
export const deleteTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/*
  DUPLICATE trip
  POST /api/trips/{tripId}/duplicate
*/
export const duplicateTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}/duplicate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/*
  ARCHIVE trip
  PUT /api/trips/{tripId}/archive
*/
export const archiveTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}/archive`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};