import { apiRequest } from "../utils/apiUtils";

export const getDestinations = (tripId) => apiRequest(`/trips/${encodeURIComponent(tripId)}/destinations`);
export const addDestination = (tripId, destinationData) => apiRequest(`/trips/${encodeURIComponent(tripId)}/destinations`, { method: "POST", body: JSON.stringify(destinationData) });
export const removeDestination = (tripId, destinationId) => apiRequest(`/trips/${encodeURIComponent(tripId)}/destinations/${encodeURIComponent(destinationId)}`, { method: "DELETE" });
export const reorderDestinations = (tripId, destinationIds) => apiRequest(`/trips/${encodeURIComponent(tripId)}/destinations/reorder`, { method: "PUT", body: JSON.stringify({ destinationIds }) });
export const calculateDistance = (tripId) => apiRequest(`/trips/${encodeURIComponent(tripId)}/route/distance`);
export const calculateEta = (tripId) => apiRequest(`/trips/${encodeURIComponent(tripId)}/route/eta`);
