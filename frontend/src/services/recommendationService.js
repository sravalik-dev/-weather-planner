import {
  API_BASE_URL,
  getAuthHeaders,
  readApiError,
} from "../utils/apiUtils";

const BASE_URL = `${API_BASE_URL}/api/recommendations`;

const request = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
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
 * =========================================================
 * MODULE 8 — DYNAMIC RECOMMENDATION ENGINE
 * =========================================================
 */

/*
 * Generate all recommendations.
 *
 * POST
 * /api/recommendations/trips/{tripId}/generate
 *
 * Optional:
 * ?plannedDate=YYYY-MM-DD&plannedTime=HH:mm
 */
export const generateRecommendations = async (
  tripId,
  plannedDate = "",
  plannedTime = ""
) => {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  const params = new URLSearchParams();

  if (plannedDate) {
    params.set("plannedDate", plannedDate);
  }

  if (plannedTime) {
    params.set("plannedTime", plannedTime);
  }

  const query = params.toString();

  return request(
    `${BASE_URL}/trips/${encodeURIComponent(
      tripId
    )}/generate${query ? `?${query}` : ""}`,
    {
      method: "POST",
    }
  );
};

/*
 * Get all recommendations for a trip.
 *
 * GET
 * /api/recommendations/trips/{tripId}
 */
export const getRecommendations = async (tripId) => {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  return request(
    `${BASE_URL}/trips/${encodeURIComponent(tripId)}`
  );
};

/*
 * Get recommendations by type.
 *
 * WEATHER
 * NEARBY
 * CROWD
 * SEASONAL
 * TIME
 */
export const getRecommendationsByType = async (
  tripId,
  type
) => {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  if (!type) {
    throw new Error(
      "Recommendation type is required."
    );
  }

  return request(
    `${BASE_URL}/trips/${encodeURIComponent(
      tripId
    )}/type/${encodeURIComponent(
      type.toUpperCase()
    )}`
  );
};

/*
 * Get recommendation history.
 *
 * GET
 * /api/recommendations/trips/{tripId}/history
 */
export const getRecommendationHistory = async (
  tripId
) => {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  return request(
    `${BASE_URL}/trips/${encodeURIComponent(
      tripId
    )}/history`
  );
};

/*
 * Record a recommendation action.
 *
 * POST
 * /api/recommendations/{recommendationId}/action
 *
 * Actions supported by backend:
 * Viewed
 * Accepted
 * Rejected
 * Used in Itinerary
 */
export const recordRecommendationAction = async (
  recommendationId,
  tripId,
  action
) => {
  if (!recommendationId) {
    throw new Error(
      "Recommendation ID is required."
    );
  }

  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  if (!action) {
    throw new Error(
      "Recommendation action is required."
    );
  }

  const params = new URLSearchParams();

  params.set("tripId", tripId);
  params.set("action", action);

  return request(
    `${BASE_URL}/${encodeURIComponent(
      recommendationId
    )}/action?${params.toString()}`,
    {
      method: "POST",
    }
  );
};

export const RECOMMENDATION_TYPES = [
  {
    value: "ALL",
    label: "All Recommendations",
    icon: "✨",
  },
  {
    value: "WEATHER",
    label: "Weather",
    icon: "🌦️",
  },
  {
    value: "NEARBY",
    label: "Nearby",
    icon: "📍",
  },
  {
    value: "CROWD",
    label: "Crowd",
    icon: "👥",
  },
  {
    value: "SEASONAL",
    label: "Seasonal",
    icon: "🌤️",
  },
  {
    value: "TIME",
    label: "Time Based",
    icon: "🕐",
  },
];

export const RECOMMENDATION_ACTIONS = {
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  USED: "Used in Itinerary",
};