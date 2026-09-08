const API_BASE_URL = "http://localhost:8080/api";
const API_URL = `${API_BASE_URL}/trips`;

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

const handleResponse = async (response) => {
  const text = await response.text();

  let data;

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

export const getTrips = async () => {
  return request(API_URL, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const getTrip = async (tripId) => {
  return request(`${API_URL}/${tripId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const createTrip = async (tripData) => {
  return request(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });
};

export const saveDraft = async (tripData) => {
  return request(`${API_URL}/draft`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });
};

export const updateTrip = async (tripId, tripData) => {
  return request(`${API_URL}/${tripId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });
};

export const deleteTrip = async (tripId) => {
  return request(`${API_URL}/${tripId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
};

export const duplicateTrip = async (tripId) => {
  return request(`${API_URL}/${tripId}/duplicate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
};

export const archiveTrip = async (tripId) => {
  return request(`${API_URL}/${tripId}/archive`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
};