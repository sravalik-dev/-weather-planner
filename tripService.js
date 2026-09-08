const API_URL = "http://localhost:8080/api/trips";

const getAuthHeaders = () => {
  const token = localStorage.getItem("jwtToken");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
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
    throw new Error(
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data : "Request failed")
    );
  }

  return data;
};

export const getTrips = async () => {
  const response = await fetch(API_URL, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

export const getTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

export const createTrip = async (tripData) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });

  return handleResponse(response);
};

export const saveDraft = async (tripData) => {
  const response = await fetch(`${API_URL}/draft`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });

  return handleResponse(response);
};

export const updateTrip = async (tripId, tripData) => {
  const response = await fetch(`${API_URL}/${tripId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(tripData),
  });

  return handleResponse(response);
};

export const deleteTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

export const duplicateTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}/duplicate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

export const archiveTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}/archive`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};
