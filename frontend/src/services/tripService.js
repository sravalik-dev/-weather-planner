import { apiRequest } from "../utils/apiUtils";

export const getTrips = () => apiRequest("/trips");
export const getTrip = (tripId) => apiRequest(`/trips/${encodeURIComponent(tripId)}`);
export const createTrip = (tripData) => apiRequest("/trips", { method: "POST", body: JSON.stringify(tripData) });
export const saveDraft = (tripData) => apiRequest("/trips/draft", { method: "POST", body: JSON.stringify(tripData) });
export const updateTrip = (tripId, tripData) => apiRequest(`/trips/${encodeURIComponent(tripId)}`, { method: "PUT", body: JSON.stringify(tripData) });
export const deleteTrip = (tripId) => apiRequest(`/trips/${encodeURIComponent(tripId)}`, { method: "DELETE" });
export const duplicateTrip = (tripId) => apiRequest(`/trips/${encodeURIComponent(tripId)}/duplicate`, { method: "POST" });
export const archiveTrip = (tripId) => apiRequest(`/trips/${encodeURIComponent(tripId)}/archive`, { method: "PUT" });
