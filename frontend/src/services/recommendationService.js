import { apiRequest } from "../utils/apiUtils";

const BASE_URL = "/recommendations";
const request = (endpoint, options = {}) => apiRequest(`${BASE_URL}${endpoint}`, options);

export const generateRecommendations = (tripId, plannedDate = "", plannedTime = "") => {
  if (!tripId) throw new Error("Trip ID is required.");
  const params = new URLSearchParams();
  if (plannedDate) params.set("plannedDate", plannedDate);
  if (plannedTime) params.set("plannedTime", plannedTime);
  return request(`/trips/${encodeURIComponent(tripId)}/generate${params.size ? `?${params}` : ""}`, { method: "POST" });
};
export const getRecommendations = (tripId) => request(`/trips/${encodeURIComponent(tripId)}`);
export const getRecommendationsByType = (tripId, type) => request(`/trips/${encodeURIComponent(tripId)}/type/${encodeURIComponent(type.toUpperCase())}`);
export const getRecommendationHistory = (tripId) => request(`/trips/${encodeURIComponent(tripId)}/history`);
export const recordRecommendationAction = (recommendationId, tripId, action) => request(`/${encodeURIComponent(recommendationId)}/action?tripId=${encodeURIComponent(tripId)}&action=${encodeURIComponent(action)}`, { method: "POST" });
export const RECOMMENDATION_TYPES = [{ value: "ALL", label: "All Recommendations", icon: "✨" }, { value: "WEATHER", label: "Weather", icon: "🌦️" }, { value: "NEARBY", label: "Nearby", icon: "📍" }, { value: "CROWD", label: "Crowd", icon: "👥" }, { value: "SEASONAL", label: "Seasonal", icon: "🌤️" }, { value: "TIME", label: "Time Based", icon: "🕐" }];
export const RECOMMENDATION_ACTIONS = { VIEWED: "Viewed", ACCEPTED: "Accepted", REJECTED: "Rejected", USED: "Used in Itinerary" };
