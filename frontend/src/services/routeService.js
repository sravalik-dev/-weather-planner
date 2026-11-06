
import { apiRequest } from "../utils/apiUtils";

// Get all destinations for a trip
export const getDestinations = (tripId) =>
  apiRequest(
    `/trips/${encodeURIComponent(tripId)}/destinations`
  );

// Add a new destination
export const addDestination = (tripId, destinationData) =>
  apiRequest(
    `/trips/${encodeURIComponent(tripId)}/destinations`,
    {
      method: "POST",
      body: JSON.stringify(destinationData),
    }
  );

// Update destination information (Module 5)
export const updateDestination = (
  tripId,
  destinationId,
  destinationData
) =>
  apiRequest(
    `/trips/${encodeURIComponent(tripId)}/destinations/${encodeURIComponent(destinationId)}`,
    {
      method: "PUT",
      body: JSON.stringify(destinationData),
    }
  );

// Delete a destination
export const removeDestination = (tripId, destinationId) =>
  apiRequest(
    `/trips/${encodeURIComponent(tripId)}/destinations/${encodeURIComponent(destinationId)}`,
    {
      method: "DELETE",
    }
  );

// Reorder destinations
export const reorderDestinations = (tripId, destinationIds) =>
  apiRequest(
    `/trips/${encodeURIComponent(tripId)}/destinations/reorder`,
    {
      method: "PUT",
      body: JSON.stringify({ destinationIds }),
    }
  );

// Calculate total route distance
export const calculateDistance = (tripId) =>
  apiRequest(
    `/trips/${encodeURIComponent(tripId)}/route/distance`
  );

// Calculate estimated route duration
export const calculateEta = (tripId) =>
  apiRequest(
    `/trips/${encodeURIComponent(tripId)}/route/eta`
  );
