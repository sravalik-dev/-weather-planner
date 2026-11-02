import { apiRequest } from "../utils/apiUtils";

const request = (endpoint, options = {}) => apiRequest(endpoint, options);

export const getTripsForFood = () => request("/trips");
export const getTripDestinationsForFood = (tripId) => request(`/trips/${encodeURIComponent(tripId)}/destinations`);
export const createFood = (foodData) => request("/foods", { method: "POST", body: JSON.stringify(foodData) });
export const getFoodsByDestination = (destinationId) => request(`/foods/destination/${encodeURIComponent(destinationId)}`);
export const createFoodPlace = (foodPlaceData) => request("/foods/places", { method: "POST", body: JSON.stringify(foodPlaceData) });
export const getFoodPlacesByDestination = (destinationId) => request(`/foods/places/destination/${encodeURIComponent(destinationId)}`);
export const generateFoodRecommendations = (tripId, requestData) => request(`/food-recommendations/trips/${encodeURIComponent(tripId)}/generate`, { method: "POST", body: JSON.stringify(requestData) });
export const getFoodRecommendations = (tripId) => request(`/food-recommendations/trips/${encodeURIComponent(tripId)}`);
export const getFoodRecommendationsByType = (tripId, type) => request(`/food-recommendations/trips/${encodeURIComponent(tripId)}/type/${encodeURIComponent(type.toUpperCase())}`);
export const getFoodRecommendationHistory = (tripId) => request(`/food-recommendations/trips/${encodeURIComponent(tripId)}/history`);
export const recordFoodRecommendationAction = (foodRecommendationId, tripId, action) => request(`/food-recommendations/${encodeURIComponent(foodRecommendationId)}/action?tripId=${encodeURIComponent(tripId)}`, { method: "POST", body: JSON.stringify({ action }) });
