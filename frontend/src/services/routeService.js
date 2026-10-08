const API_BASE_URL = "http://localhost:8080/api";
const BASE_URL = `${API_BASE_URL}/trips`;

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
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This action conflicts with the current state of the data.";
    case 500:
      return "Something went wrong on the server. Please try again.";
    default:
      return "Request failed.";
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

export const getDestinations = async (tripId) => {
  return request(`${BASE_URL}/${tripId}/destinations`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const addDestination = async (tripId, destinationData) => {
  return request(`${BASE_URL}/${tripId}/destinations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(destinationData),
  });
};

export const removeDestination = async (tripId, destinationId) => {
  return request(`${BASE_URL}/${tripId}/destinations/${destinationId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
};

export const reorderDestinations = async (tripId, destinationIds) => {
  return request(`${BASE_URL}/${tripId}/destinations/reorder`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ destinationIds }),
  });
};

export const calculateDistance = async (tripId) => {
  return request(`${BASE_URL}/${tripId}/route/distance`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const calculateEta = async (tripId) => {
  return request(`${BASE_URL}/${tripId}/route/eta`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};