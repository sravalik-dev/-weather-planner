import { apiRequest } from "../utils/apiUtils";

const itineraryRequest = (tripId, endpoint, options = {}) =>
  apiRequest(
    `/trips/${encodeURIComponent(tripId)}/itinerary${endpoint}`,
    options
  );

export const getItinerary = (tripId) => itineraryRequest(tripId, "");

export const generateItinerary = (tripId) =>
  itineraryRequest(tripId, "/generate", { method: "POST" });

export const addItineraryActivity = (tripId, activity) =>
  itineraryRequest(tripId, "/activities", {
    method: "POST",
    body: JSON.stringify(activity),
  });

export const updateItineraryActivity = (tripId, activityId, activity) =>
  itineraryRequest(tripId, `/activities/${encodeURIComponent(activityId)}`, {
    method: "PUT",
    body: JSON.stringify(activity),
  });

export const deleteItineraryActivity = (tripId, activityId) =>
  itineraryRequest(tripId, `/activities/${encodeURIComponent(activityId)}`, {
    method: "DELETE",
  });

export const reorderItineraryActivities = (tripId, activityDate, activityIds) =>
  itineraryRequest(tripId, "/reorder", {
    method: "PUT",
    body: JSON.stringify({ activityDate, activityIds }),
  });

export const toggleItineraryActivityLock = (tripId, activityId, locked) =>
  itineraryRequest(tripId, `/activities/${encodeURIComponent(activityId)}/lock`, {
    method: "PUT",
    body: JSON.stringify({ locked }),
  });

export const getItineraryHistory = (tripId) =>
  itineraryRequest(tripId, "/history");
