import { apiRequest } from "../utils/apiUtils";

export const getDestinations = async (tripId) => {
  const destinations = await apiRequest(
    `/trips/${encodeURIComponent(tripId)}/destinations`
  );
  return Array.isArray(destinations)
    ? [...destinations].sort(
        (a, b) => Number(a.destinationOrder || 0) - Number(b.destinationOrder || 0)
      )
    : [];
};

export const addDestination = (tripId, destinationData) =>
  apiRequest(`/trips/${encodeURIComponent(tripId)}/destinations`, {
    method: "POST",
    body: JSON.stringify(destinationData),
  });

export const deleteDestination = (tripId, destinationId) =>
  apiRequest(
    `/trips/${encodeURIComponent(tripId)}/destinations/${encodeURIComponent(destinationId)}`,
    { method: "DELETE" }
  );

export const reorderDestinations = (tripId, destinationIds) =>
  apiRequest(`/trips/${encodeURIComponent(tripId)}/destinations/reorder`, {
    method: "PUT",
    body: JSON.stringify({ destinationIds }),
  });