const API_URL = "http://localhost:8080/api/profile";

const getAuthHeaders = () => {
  const token = localStorage.getItem("jwtToken");

  if (!token) {
    throw new Error("Please log in to continue.");
  }

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
    const message =
      data?.message ||
      data?.error ||
      (typeof data === "string" && data ? data : null) ||
      `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return data;
};

const request = async (url, options) => {
  try {
    return await handleResponse(await fetch(url, options));
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot connect to backend at http://localhost:8080. Please make sure Spring Boot is running."
      );
    }

    throw error;
  }
};

export const getProfile = () =>
  request(API_URL, {
    method: "GET",
    headers: getAuthHeaders(),
  });

export const updateProfile = (profile) =>
  request(API_URL, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(profile),
  });

export const updatePreferences = (preferences) =>
  request(`${API_URL}/preferences`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(preferences),
  });

export const changePassword = (passwordData) =>
  request(`${API_URL}/change-password`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(passwordData),
  });
