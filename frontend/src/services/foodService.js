const API_BASE_URL = "http://localhost:8080/api";

const getToken = () => {
  return (
    localStorage.getItem("itineraryToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    ""
  )
    .replace(/^Bearer\s+/i, "")
    .replace(/^"|"$/g, "")
    .trim();
};

const clearTokens = () => {
  localStorage.removeItem("itineraryToken");
  localStorage.removeItem("jwtToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("isLoggedIn");
};

const getAuthHeaders = () => {
  const token = getToken();

  if (!token) {
    throw new Error("Authentication token is missing. Please login again.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const getErrorMessage = (status, data) => {
  if (data && typeof data === "object") {
    return (
      data.message ||
      data.error ||
      data.detail ||
      `Request failed with status ${status}.`
    );
  }

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  switch (status) {
    case 400:
      return "The food request is invalid. Please check the selected trip, destination, date and filters.";
    case 401:
      return "Your login session is missing or expired. Please login again.";
    case 403:
      return "You are not authorized to access this food information.";
    case 404:
      return "The requested food endpoint was not found.";
    case 409:
      return "The food recommendation conflicts with the current trip state.";
    case 500:
      return "The backend server encountered an error while processing the food request.";
    default:
      return "Unable to complete the food request. Please try again.";
  }
};

const request = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
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

      throw new Error(getErrorMessage(response.status, data));
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot connect to backend at http://localhost:8080. Please make sure Spring Boot is running."
      );
    }

    throw error;
  }
};

export const getTripsForFood = async () => {
  return request(`${API_BASE_URL}/trips`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const getTripDestinationsForFood = async (tripId) => {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  return request(`${API_BASE_URL}/trips/${tripId}/destinations`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const createFood = async (foodData) => {
  return request(`${API_BASE_URL}/foods`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(foodData),
  });
};

export const getFoodsByDestination = async (destinationId) => {
  if (!destinationId) {
    return [];
  }

  return request(`${API_BASE_URL}/foods/destination/${destinationId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const createFoodPlace = async (foodPlaceData) => {
  return request(`${API_BASE_URL}/foods/places`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(foodPlaceData),
  });
};

export const getFoodPlacesByDestination = async (destinationId) => {
  if (!destinationId) {
    return [];
  }

  return request(
    `${API_BASE_URL}/foods/places/destination/${destinationId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );
};

export const generateFoodRecommendations = async (tripId, requestData) => {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  return request(
    `${API_BASE_URL}/food-recommendations/trips/${tripId}/generate`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(requestData),
    }
  );
};

export const getFoodRecommendations = async (tripId) => {
  if (!tripId) {
    return [];
  }

  return request(`${API_BASE_URL}/food-recommendations/trips/${tripId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const getFoodRecommendationsByType = async (tripId, type) => {
  if (!tripId) {
    return [];
  }

  if (!type || type === "ALL") {
    return getFoodRecommendations(tripId);
  }

  return request(
    `${API_BASE_URL}/food-recommendations/trips/${tripId}/type/${encodeURIComponent(
      type
    )}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );
};

export const getFoodRecommendationHistory = async (tripId) => {
  if (!tripId) {
    return [];
  }

  return request(
    `${API_BASE_URL}/food-recommendations/trips/${tripId}/history`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );
};

export const recordFoodRecommendationAction = async (
  foodRecommendationId,
  tripId,
  action
) => {
  if (!foodRecommendationId) {
    throw new Error("Food recommendation ID is required.");
  }

  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  if (!action) {
    throw new Error("Food recommendation action is required.");
  }

  return request(
    `${API_BASE_URL}/food-recommendations/${foodRecommendationId}/action?tripId=${encodeURIComponent(
      tripId
    )}&action=${encodeURIComponent(action)}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action }),
    }
  );
};
