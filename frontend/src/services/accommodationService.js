import { apiRequest } from "../utils/apiUtils";

/*
 * Accommodation API service.
 * Uses the application's existing authenticated apiRequest helper.
 */

export const getAccommodations = async () => {
  const data = await apiRequest("/api/accommodations", {
    method: "GET",
  });

  return Array.isArray(data) ? data : [];
};

export const getAccommodation = async (accommodationId) => {
  if (!accommodationId) {
    throw new Error("Accommodation ID is required.");
  }

  return apiRequest(`/api/accommodations/${accommodationId}`, {
    method: "GET",
  });
};

export const viewAccommodation = async (accommodationId) => {
  if (!accommodationId) {
    throw new Error("Accommodation ID is required.");
  }

  return apiRequest(`/api/accommodations/${accommodationId}/view`, {
    method: "POST",
  });
};

export const selectAccommodation = async (accommodationId) => {
  if (!accommodationId) {
    throw new Error("Accommodation ID is required.");
  }

  return apiRequest(`/api/accommodations/${accommodationId}/select`, {
    method: "POST",
  });
};

export const addAccommodationToTrip = async (
  accommodationId,
  tripId
) => {
  if (!accommodationId || !tripId) {
    throw new Error("Accommodation ID and trip ID are required.");
  }

  return apiRequest(
    `/api/accommodations/${accommodationId}/add-to-trip?tripId=${encodeURIComponent(tripId)}`,
    {
      method: "POST",
    }
  );
};

export const getAccommodationHistory = async () => {
  const data = await apiRequest("/api/accommodations/history", {
    method: "GET",
  });

  return Array.isArray(data) ? data : [];
};

export const getAccommodationHistoryByTrip = async (tripId) => {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  const data = await apiRequest(
    `/api/accommodations/history/trip/${tripId}`,
    {
      method: "GET",
    }
  );

  return Array.isArray(data) ? data : [];
};
