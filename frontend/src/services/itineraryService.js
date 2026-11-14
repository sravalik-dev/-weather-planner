import { apiRequest } from "../utils/apiUtils";

const itineraryRequest = (tripId, endpoint, options = {}) => {
  if (tripId === null || tripId === undefined || tripId === "") {
    throw new Error("A valid trip ID is required for itinerary operations.");
  }

  return apiRequest(
    `/trips/${encodeURIComponent(tripId)}/itinerary${endpoint}`,
    options
  );
};

const requireActivityId = (activityId, action = "update") => {
  if (
    activityId === null ||
    activityId === undefined ||
    activityId === "" ||
    String(activityId).toLowerCase() === "undefined" ||
    String(activityId).toLowerCase() === "null"
  ) {
    throw new Error(`Cannot ${action} this activity because its database ID is missing. Refresh the itinerary and try again.`);
  }
  return activityId;
};

export const getItinerary = (tripId) => itineraryRequest(tripId, "");

export const generateItinerary = (tripId) =>
  itineraryRequest(tripId, "/generate", { method: "POST" });

export const addItineraryActivity = (tripId, activity) =>
  itineraryRequest(tripId, "/activities", {
    method: "POST",
    body: JSON.stringify(activity),
  });

export const updateItineraryActivity = (tripId, activityId, activity) =>
  itineraryRequest(
    tripId,
    `/activities/${encodeURIComponent(requireActivityId(activityId, "update"))}`,
    { method: "PUT",
      body: JSON.stringify(activity),
    }
  );

export const deleteItineraryActivity = (tripId, activityId) =>
  itineraryRequest(
    tripId,
    `/activities/${encodeURIComponent(requireActivityId(activityId, "delete"))}`,
    { method: "DELETE" }
  );

export const reorderItineraryActivities = (tripId, activityDate, activityIds) => {
  if (!Array.isArray(activityIds) || activityIds.some((id) =>
    id === null || id === undefined || id === "" || String(id).toLowerCase() === "undefined"
  )) {
    throw new Error("Cannot reorder activities because one or more activity IDs are missing. Refresh the itinerary and try again.");
  }

  return itineraryRequest(tripId, "/reorder", {
    method: "PUT",
    body: JSON.stringify({ activityDate, activityIds }),
  });
};

export const toggleItineraryActivityLock = (tripId, activityId, locked) =>
  itineraryRequest(
    tripId,
    `/activities/${encodeURIComponent(requireActivityId(activityId, "change the lock on"))}/lock`,
    {
      method: "PUT",
      body: JSON.stringify({ locked }),
    }
  );

export const getItineraryHistory = (tripId) =>
  itineraryRequest(tripId, "/history");
