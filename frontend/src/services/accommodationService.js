import { apiRequest } from "../utils/apiUtils";

export const getAccommodations = async () => {
  const data = await apiRequest("/accommodations");
  return Array.isArray(data) ? data : [];
};

export const getAccommodation = async (accommodationId) => {
  if (!accommodationId) throw new Error("Accommodation ID is required.");
  return apiRequest(`/accommodations/${encodeURIComponent(accommodationId)}`);
};

export const viewAccommodation = async (accommodationId) => {
  if (!accommodationId) throw new Error("Accommodation ID is required.");
  return apiRequest(`/accommodations/${encodeURIComponent(accommodationId)}/view`, {
    method: "POST",
  });
};

export const selectAccommodation = async (accommodationId, tripId) => {
  if (!accommodationId) throw new Error("Accommodation ID is required.");
  const query = tripId ? `?tripId=${encodeURIComponent(tripId)}` : "";
  return apiRequest(
    `/accommodations/${encodeURIComponent(accommodationId)}/select${query}`,
    { method: "POST" }
  );
};

export const addAccommodationToTrip = async (accommodationId, tripId) => {
  if (!accommodationId || !tripId) {
    throw new Error("Accommodation ID and trip ID are required.");
  }
  return apiRequest(
    `/accommodations/${encodeURIComponent(accommodationId)}/add-to-trip?tripId=${encodeURIComponent(tripId)}`,
    { method: "POST" }
  );
};

export const getAccommodationHistory = async () => {
  const data = await apiRequest("/accommodations/history");
  return Array.isArray(data) ? data : [];
};

export const getAccommodationHistoryByTrip = async (tripId) => {
  if (!tripId) throw new Error("Trip ID is required.");
  const data = await apiRequest(
    `/accommodations/history/trip/${encodeURIComponent(tripId)}`
  );
  return Array.isArray(data) ? data : [];
};