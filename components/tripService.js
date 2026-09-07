const API_URL = "http://localhost:8080/api/trips";

const getToken = () => {
  return localStorage.getItem("token");
};

const getHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const handleResponse = async (response) => {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Something went wrong");
  }

  return text ? JSON.parse(text) : null;
};

export const createTrip = async (trip) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(trip),
  });

  return handleResponse(response);
};

export const saveDraft = async (trip) => {
  const response = await fetch(`${API_URL}/draft`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(trip),
  });

  return handleResponse(response);
};

export const getMyTrips = async () => {
  const response = await fetch(API_URL, {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse(response);
};

export const getTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}`, {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse(response);
};

export const updateTrip = async (tripId, trip) => {
  const response = await fetch(`${API_URL}/${tripId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(trip),
  });

  return handleResponse(response);
};

export const deleteTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  return response.text();
};

export const duplicateTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}/duplicate`, {
    method: "POST",
    headers: getHeaders(),
  });

  return handleResponse(response);
};

export const archiveTrip = async (tripId) => {
  const response = await fetch(`${API_URL}/${tripId}/archive`, {
    method: "PUT",
    headers: getHeaders(),
  });

  return handleResponse(response);
};
