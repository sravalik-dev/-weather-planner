const API_BASE_URL = "http://localhost:8080/api";

export const getAuthHeaders = () => {
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

export const fallbackStatusMessage = (status) => {
  switch (status) {
    case 400:
      return "The request is invalid. Please check the form values.";
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This action conflicts with the current state of the data.";
    case 500:
      return "The backend server is currently unavailable. Please try again.";
    default:
      return "Request failed. Please check the backend connection.";
  }
};

export const handleResponse = async (response) => {
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
    const message =
      data?.message ||
      data?.error ||
      data?.detail ||
      (typeof data === "string" && data ? data : null) ||
      fallbackStatusMessage(response.status);

    throw new Error(message);
  }

  return data;
};

export const request = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
    });
    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot connect to backend at http://localhost:8080. Please make sure Spring Boot is running."
      );
    }

    throw error;
  }
};

export { API_BASE_URL };
