import { useEffect, useMemo, useState } from "react";
import {
  getDestinations,
  addDestination,
  updateDestination,
  removeDestination,
  reorderDestinations,
  calculateDistance,
  calculateEta,
  getRouteSummary,
} from "../services/routeService";
import "../styles/RoutePlanner.css";
import {
  addItineraryActivity,
  deleteItineraryActivity,
  generateItinerary as backendGenerateItinerary,
  getItinerary,
  reorderItineraryActivities,
  toggleItineraryActivityLock,
  updateItineraryActivity,
} from "../services/itineraryService";

const getTripId = (trip) =>
  trip?.tripId ?? trip?.id ?? trip?.tripID ?? null;

const getTripDays = (trip) => {
  const values = [
    trip?.numberOfDays,
    trip?.noOfDays,
    trip?.days,
    trip?.durationDays,
    trip?.duration,
  ];

  const value = values.find(
    (item) =>
      Number.isFinite(Number(item)) &&
      Number(item) > 0
  );

  return Math.max(1, Number(value) || 1);
};

const createEmptyItinerary = (days) =>
  Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    activities: [],
  }));

const createActivityId = () =>
  `activity_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;

const normalizeActivity = (activity, day) => ({
  id: activity?.activityId ?? activity?.id ?? null,
  day,
  activityDate: activity?.activityDate || "",
  time: activity?.startTime || "09:00",
  endTime: activity?.endTime || "",
  title: activity?.activityName || "Untitled Activity",
  location: activity?.destinationName || "",
  duration: activity?.duration || "60",
  notes: activity?.description || "",
  category: activity?.category || "",
  destinationId: activity?.destinationId ?? null,
  locked: Boolean(activity?.locked),
});

const normalizeItinerary = (value, days, startDate) => {
  const source = Array.isArray(value) ? value : [];
  const start = new Date(`${startDate}T00:00:00`);

  return Array.from({ length: days }, (_, index) => {
    const dayNumber = index + 1;
    const activityDate = new Date(start);
    activityDate.setDate(start.getDate() + index);
    const dateKey = activityDate.toISOString().slice(0, 10);
    const existingActivities = source
      .filter((item) => item?.activityDate === dateKey)
      .sort((a, b) => Number(a.orderIndex) - Number(b.orderIndex));

    return {
      day: dayNumber,
      activities: existingActivities.map((activity) =>
        normalizeActivity(activity, dayNumber)
      ),
    };
  });
};

const getActivityDate = (trip, day) => {
  const start = new Date(`${trip?.startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  start.setDate(start.getDate() + day - 1);
  return start.toISOString().slice(0, 10);
};

const formatDistance = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  if (typeof value === "object") {
    const numeric =
      value?.distance ??
      value?.totalDistance ??
      value?.value ??
      value?.km;

    if (
      numeric !== undefined &&
      numeric !== null
    ) {
      return formatDistance(numeric);
    }

    return "--";
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  if (numeric < 1) {
    return `${Math.round(numeric * 1000)} m`;
  }

  return `${numeric.toFixed(1)} km`;
};

const formatDuration = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  if (typeof value === "object") {
    const duration =
      value?.duration ??
      value?.totalDuration ??
      value?.eta ??
      value?.minutes ??
      value?.value;

    if (
      duration !== undefined &&
      duration !== null
    ) {
      return formatDuration(duration);
    }

    return "--";
  }

  if (
    typeof value === "string" &&
    value.includes(":")
  ) {
    return value;
  }

  const minutes = Number(value);

  if (Number.isNaN(minutes)) {
    return String(value);
  }

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  if (hours === 0) {
    return `${remaining} min`;
  }

  if (remaining === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remaining} min`;
};

const timeToMinutes = (time) => {
  if (!time || !String(time).includes(":")) {
    return 0;
  }

  const [hours, minutes] = String(time)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

const getDestinationName = (destination) =>
  destination?.name ||
  destination?.destinationName ||
  destination?.locationName ||
  destination?.city ||
  destination?.placeName ||
  "Destination";

const getDestinationId = (destination) =>
  destination?.destinationId ??
  destination?.id ??
  destination?.destinationID;

const getDestinationField = (
  destination,
  ...fields
) => {
  for (const field of fields) {
    const value = destination?.[field];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return "--";
};

const displayValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "--";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return "--";
  }

  return String(value);
};

function RoutePlanner({ trip, onBack }) {
  const tripId = getTripId(trip);
  const tripDays = getTripDays(trip);

  const [destinations, setDestinations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [listError, setListError] =
    useState("");

  const [destinationInput, setDestinationInput] =
    useState("");

  const [geocoding, setGeocoding] =
    useState(false);

  const [adding, setAdding] =
    useState(false);

  const [addError, setAddError] =
    useState("");

  // MODULE 5: edit destination information
  const [editingDestinationId, setEditingDestinationId] =
    useState(null);

  const [destinationEditForm, setDestinationEditForm] =
    useState({
      category: "",
      bestTime: "",
      openingTime: "",
      closingTime: "",
      ticketPrice: "",
      expectedDuration: "",
      popularity: "",
      indoorOutdoor: "",
      familyFriendly: false,
      wheelchairFriendly: false,
      kidsFriendly: false,
    });

  const [destinationEditSaving, setDestinationEditSaving] =
    useState(false);

  const [destinationEditError, setDestinationEditError] =
    useState("");

  const [removingId, setRemovingId] =
    useState(null);

  const [reorderingId, setReorderingId] =
    useState(null);

  // One summary object from the backend: totals + every leg.
  const [routeSummary, setRouteSummary] =
    useState(null);

  const [routeReloadKey, setRouteReloadKey] =
    useState(0);

  // Drag and drop / confirm-before-remove
  const [dragIndex, setDragIndex] =
    useState(null);

  const [dragOverIndex, setDragOverIndex] =
    useState(null);

  const [confirmRemoveId, setConfirmRemoveId] =
    useState(null);

  const [routeSummaryLoading, setRouteSummaryLoading] =
    useState(false);

  const [routeSummaryError, setRouteSummaryError] =
    useState("");

  // =====================================================
  // MODULE 6
  // =====================================================

  const [itinerary, setItinerary] =
    useState(() =>
      createEmptyItinerary(tripDays)
    );

  const [itineraryLoading, setItineraryLoading] =
    useState(true);

  const [itineraryGenerating, setItineraryGenerating] =
    useState(false);

  const [itinerarySaving, setItinerarySaving] =
    useState(false);

  const [itineraryMessage, setItineraryMessage] =
    useState("");

  const [itineraryError, setItineraryError] =
    useState("");

  const [activityModalOpen, setActivityModalOpen] =
    useState(false);

  const [editingActivity, setEditingActivity] =
    useState(null);

  const [activityForm, setActivityForm] =
    useState({
      day: 1,
      time: "09:00",
      title: "",
      location: "",
      duration: "60",
      notes: "",
    });

  const [draggedActivity, setDraggedActivity] =
    useState(null);

  const [dragOverTarget, setDragOverTarget] =
    useState(null);

  // =====================================================
  // LOAD DESTINATIONS
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    const loadDestinations = async () => {
      if (!tripId) {
        setDestinations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setListError("");

      try {
        const response =
          await getDestinations(tripId);

        if (cancelled) return;

        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.destinations)
          ? response.destinations
          : Array.isArray(response?.data)
          ? response.data
          : [];

        const sorted = [...list].sort(
          (a, b) =>
            Number(
              a.destinationOrder ??
                a.order ??
                0
            ) -
            Number(
              b.destinationOrder ??
                b.order ??
                0
            )
        );

        setDestinations(sorted);
      } catch (error) {
        if (!cancelled) {
          setListError(
            error?.message ||
              "Unable to load destinations."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDestinations();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // =====================================================
  // ROUTE SUMMARY
  // =====================================================

  // Recalculate only when the ORDER or COORDINATES of the stops change
  // (not when unrelated details such as ticket price are edited).
  const routeKey = destinations
    .map(
      (item) =>
        `${getDestinationId(item)}:${item?.latitude},${item?.longitude}`
    )
    .join("|");

  useEffect(() => {
    let cancelled = false;

    const loadRouteSummary = async () => {
      if (!tripId || destinations.length < 2) {
        setRouteSummary(null);
        setRouteSummaryLoading(false);
        setRouteSummaryError("");
        return;
      }

      setRouteSummaryLoading(true);
      setRouteSummaryError("");

      try {
        let summary;

        try {
          summary = await getRouteSummary(tripId);
        } catch (error) {
          // Older backend without /route/summary: use the two original
          // endpoints. The page then shows totals but no per-leg details.
          if (error?.status !== 404 && error?.status !== 405) {
            throw error;
          }

          const [distanceResponse, etaResponse] =
            await Promise.all([
              calculateDistance(tripId),
              calculateEta(tripId),
            ]);

          const hours = Number(
            etaResponse?.estimatedTravelTimeHours
          );

          summary = {
            totalDistanceKm:
              distanceResponse?.totalDistanceKm ?? null,
            totalDurationMinutes: Number.isFinite(hours)
              ? hours * 60
              : null,
            averageSpeedKmph:
              etaResponse?.averageSpeedKmph ?? null,
            approximate: false,
            source: "OSRM",
            legs: [],
          };
        }

        if (!cancelled) {
          setRouteSummary(summary);
        }
      } catch (error) {
        if (!cancelled) {
          setRouteSummary(null);

          setRouteSummaryError(
            error?.message ||
              "Unable to calculate route distance and estimated time."
          );
        }
      } finally {
        if (!cancelled) {
          setRouteSummaryLoading(false);
        }
      }
    };

    loadRouteSummary();

    return () => {
      cancelled = true;
    };
  }, [tripId, routeKey, routeReloadKey]);

  // =====================================================
  // LOAD ITINERARY
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    if (!tripId) {
      setItinerary(createEmptyItinerary(tripDays));
      setItineraryLoading(false);
      return;
    }

    const loadItinerary = async () => {
      setItineraryLoading(true);
      setItineraryError("");

      try {
        const activities = await getItinerary(tripId);
        if (!cancelled) {
          setItinerary(
            normalizeItinerary(
              activities,
              tripDays,
              trip?.startDate
            )
          );
        }
      } catch (error) {
        if (!cancelled) {
          setItineraryError(
            error?.message || "Unable to load itinerary."
          );
          setItinerary(createEmptyItinerary(tripDays));
        }
      } finally {
        if (!cancelled) setItineraryLoading(false);
      }
    };

    loadItinerary();

    return () => {
      cancelled = true;
    };
  }, [tripId, tripDays]);

  // =====================================================
  // GEOCODING
  // =====================================================

  const geocodeLocation = async (
    location
  ) => {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        location
      )}&count=1&language=en&format=json`
    );

    if (!response.ok) {
      throw new Error(
        "Location search failed."
      );
    }

    const data =
      await response.json();

    if (!data?.results?.length) {
      throw new Error(
        `Could not find "${location}".`
      );
    }

    return data.results[0];
  };

  // =====================================================
  // ADD DESTINATION
  // =====================================================

  const handleAddDestination = async (
    event
  ) => {
    event?.preventDefault();

    const location =
      destinationInput.trim();

    if (!location) {
      setAddError(
        "Please enter a destination."
      );
      return;
    }

    if (!tripId) {
      setAddError(
        "No trip is currently selected."
      );
      return;
    }

    setAdding(true);
    setGeocoding(true);
    setAddError("");

    try {
      const result =
        await geocodeLocation(location);

      await addDestination(
        tripId,
        {
          destinationName: result.name,
          latitude: Number(result.latitude),
          longitude: Number(result.longitude),
        }
      );

      const refreshed =
        await getDestinations(tripId);

      const list =
        Array.isArray(refreshed)
          ? refreshed
          : Array.isArray(
              refreshed?.destinations
            )
          ? refreshed.destinations
          : Array.isArray(
              refreshed?.data
            )
          ? refreshed.data
          : [];

      setDestinations(
        [...list].sort(
          (a, b) =>
            Number(
              a.destinationOrder ??
                a.order ??
                0
            ) -
            Number(
              b.destinationOrder ??
                b.order ??
                0
            )
        )
      );

      setDestinationInput("");
    } catch (error) {
      setAddError(
        error?.message ||
          "Unable to add this destination."
      );
    } finally {
      setGeocoding(false);
      setAdding(false);
    }
  };

  // =====================================================
  // MODULE 5: EDIT DESTINATION INFORMATION
  // =====================================================

  const handleEditDestination = (destination) => {
    const destinationId = getDestinationId(destination);

    if (destinationId === null || destinationId === undefined || destinationId === "") {
      setListError("Cannot edit this destination because its ID is missing.");
      return;
    }

    setListError("");
    setDestinationEditError("");
    setEditingDestinationId(destinationId);
    setDestinationEditForm({
      category: destination?.category ?? "",
      bestTime: destination?.bestTime ?? destination?.best_time ?? "",
      openingTime: String(destination?.openingTime ?? destination?.opening_time ?? "").slice(0, 5),
      closingTime: String(destination?.closingTime ?? destination?.closing_time ?? "").slice(0, 5),
      ticketPrice: destination?.ticketPrice ?? destination?.ticket_price ?? "",
      expectedDuration: destination?.expectedDuration ?? destination?.expected_duration ?? "",
      popularity: destination?.popularity ?? "",
      indoorOutdoor: destination?.indoorOutdoor ?? destination?.indoor_outdoor ?? "",
      familyFriendly: Boolean(destination?.familyFriendly ?? destination?.family_friendly),
      wheelchairFriendly: Boolean(destination?.wheelchairFriendly ?? destination?.wheelchair_friendly),
      kidsFriendly: Boolean(destination?.kidsFriendly ?? destination?.kids_friendly),
    });
  };

  const handleDestinationEditChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDestinationEditForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCancelDestinationEdit = () => {
    setEditingDestinationId(null);
    setDestinationEditError("");
  };

  const handleSaveDestinationEdit = async (event) => {
    event.preventDefault();

    if (!tripId || editingDestinationId === null || editingDestinationId === undefined) {
      setDestinationEditError("Trip or destination ID is missing.");
      return;
    }

    const selectedDestination = destinations.find(
      (item) => String(getDestinationId(item)) === String(editingDestinationId)
    );

    if (!selectedDestination) {
      setDestinationEditError("The selected destination could not be found. Refresh the destination list and try again.");
      return;
    }

    const ticketPrice = destinationEditForm.ticketPrice === ""
      ? null
      : Number(destinationEditForm.ticketPrice);
    const expectedDuration = destinationEditForm.expectedDuration === ""
      ? null
      : Number(destinationEditForm.expectedDuration);
    const popularity = destinationEditForm.popularity === ""
      ? null
      : Number(destinationEditForm.popularity);

    if (ticketPrice !== null && (!Number.isFinite(ticketPrice) || ticketPrice < 0)) {
      setDestinationEditError("Ticket price must be zero or greater.");
      return;
    }

    if (expectedDuration !== null && (!Number.isInteger(expectedDuration) || expectedDuration <= 0)) {
      setDestinationEditError("Expected duration must be a whole number greater than zero (minutes).");
      return;
    }

    if (popularity !== null && (!Number.isFinite(popularity) || popularity < 0 || popularity > 5)) {
      setDestinationEditError("Popularity must be between 0 and 5.");
      return;
    }

    if (destinationEditForm.openingTime && destinationEditForm.closingTime && destinationEditForm.openingTime >= destinationEditForm.closingTime) {
      setDestinationEditError("Opening time must be earlier than closing time.");
      return;
    }

    const request = {
      // The backend update service validates these Module 4 fields too.
      destinationName: getDestinationName(selectedDestination),
      latitude: Number(selectedDestination.latitude),
      longitude: Number(selectedDestination.longitude),
      category: destinationEditForm.category.trim() || null,
      bestTime: destinationEditForm.bestTime.trim() || null,
      openingTime: destinationEditForm.openingTime || null,
      closingTime: destinationEditForm.closingTime || null,
      ticketPrice,
      expectedDuration,
      popularity,
      indoorOutdoor: destinationEditForm.indoorOutdoor || null,
      familyFriendly: destinationEditForm.familyFriendly,
      wheelchairFriendly: destinationEditForm.wheelchairFriendly,
      kidsFriendly: destinationEditForm.kidsFriendly,
    };

    if (!Number.isFinite(request.latitude) || !Number.isFinite(request.longitude)) {
      setDestinationEditError("This destination is missing valid coordinates. Please remove and add it again before editing.");
      return;
    }

    setDestinationEditSaving(true);
    setDestinationEditError("");

    try {
      await updateDestination(tripId, editingDestinationId, request);

      const refreshed = await getDestinations(tripId);
      const list = Array.isArray(refreshed)
        ? refreshed
        : Array.isArray(refreshed?.destinations)
        ? refreshed.destinations
        : Array.isArray(refreshed?.data)
        ? refreshed.data
        : [];

      setDestinations(
        [...list].sort(
          (a, b) =>
            Number(a.destinationOrder ?? a.order ?? 0) -
            Number(b.destinationOrder ?? b.order ?? 0)
        )
      );
      setEditingDestinationId(null);
    } catch (error) {
      setDestinationEditError(
        error?.message || "Unable to update destination information."
      );
    } finally {
      setDestinationEditSaving(false);
    }
  };

  // =====================================================
  // REMOVE DESTINATION
  // =====================================================

  const handleRemoveDestination =
    async (destination) => {
      const destinationId =
        getDestinationId(destination);

      if (!tripId || !destinationId) {
        return;
      }

      setRemovingId(destinationId);

      try {
        await removeDestination(
          tripId,
          destinationId
        );

        setDestinations(
          (current) =>
            current.filter(
              (item) =>
                getDestinationId(
                  item
                ) !== destinationId
            )
        );
      } catch (error) {
        setListError(
          error?.message ||
            "Unable to remove destination."
        );
      } finally {
        setRemovingId(null);
      }
    };

  // =====================================================
  // REORDER DESTINATIONS
  // =====================================================

  const reorderTo = async (fromIndex, toIndex) => {
    if (
      !tripId ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= destinations.length ||
      toIndex >= destinations.length
    ) {
      return;
    }

    const previous = destinations;
    const current = [...destinations];

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    // Show the new order immediately...
    setDestinations(current);

    const destinationIds = current
      .map(getDestinationId)
      .filter(Boolean);

    setReorderingId(getDestinationId(moved));

    try {
      await reorderDestinations(tripId, destinationIds);
    } catch (error) {
      // ...but put the old order back if the server refused, so the
      // screen never disagrees with what is saved.
      setDestinations(previous);

      setListError(
        error?.message ||
          "Unable to save destination order."
      );
    } finally {
      setReorderingId(null);
    }
  };

  // =====================================================
  // ITINERARY HELPERS
  // =====================================================

  const destinationNames =
    destinations
      .map(getDestinationName)
      .filter(Boolean);

  const getTripDestinationNames =
    () => {
      if (destinationNames.length) {
        return destinationNames;
      }

      const fallback =
        trip?.destination ||
        trip?.destinationName ||
        trip?.location ||
        trip?.place ||
        trip?.city;

      return fallback
        ? [fallback]
        : ["Your destination"];
    };

  const updateItinerary = (
    updater
  ) => {
    setItinerary((current) =>
      updater(current)
    );

    setItineraryMessage("");
    setItineraryError("");
  };

  // =====================================================
  // GENERATE ITINERARY
  // =====================================================

  const generateItinerary = async () => {
    if (!tripId) {
      setItineraryError("No trip is selected.");
      return;
    }

    setItineraryGenerating(true);
    setItineraryError("");
    setItineraryMessage("");

    try {
      const activities = await backendGenerateItinerary(tripId);
      setItinerary(
        normalizeItinerary(
          activities,
          tripDays,
          trip?.startDate
        )
      );
      setItineraryMessage(
        "Itinerary generated successfully from your route."
      );
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to generate itinerary."
      );
    } finally {
      setItineraryGenerating(false);
    }
  };

  // =====================================================
  // SAVE
  // =====================================================

  const saveItinerary = async () => {
    if (!tripId) {
      setItineraryError("No trip is selected.");
      return;
    }

    setItinerarySaving(true);
    setItineraryError("");

    try {
      const activities = await getItinerary(tripId);
      setItinerary(
        normalizeItinerary(
          activities,
          tripDays,
          trip?.startDate
        )
      );
      setItineraryMessage("Itinerary refreshed from the backend.");
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to save itinerary."
      );
    } finally {
      setItinerarySaving(false);
    }
  };

  // =====================================================
  // ACTIVITY MODAL
  // =====================================================

  const openAddActivityModal = (
    day = 1
  ) => {
    setEditingActivity(null);

    setActivityForm({
      day,
      time: "09:00",
      title: "",
      location:
        getTripDestinationNames()[
          day - 1
        ] || "",
      duration: "60",
      notes: "",
    });

    setActivityModalOpen(true);
  };

  const openEditActivityModal =
    (activity, day) => {
      if (activity.locked) {
        setItineraryError(
          "Unlock this activity before editing it."
        );
        return;
      }

      setEditingActivity({
        id: activity.id,
        day,
      });

      setActivityForm({
        day,
        time:
          activity.time ||
          "09:00",
        title:
          activity.title ||
          "",
        location:
          activity.location ||
          "",
        duration:
          activity.duration ||
          "60",
        notes:
          activity.notes ||
          "",
      });

      setActivityModalOpen(true);
    };

  const closeActivityModal =
    () => {
      setActivityModalOpen(false);
      setEditingActivity(null);
    };

  const handleActivityFormChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setActivityForm(
        (current) => ({
          ...current,
          [name]: value,
        })
      );
    };

  const handleActivitySubmit = async (event) => {
    event.preventDefault();

    if (!activityForm.title.trim()) {
      setItineraryError("Activity title is required.");
      return;
    }

    if (!tripId) {
      setItineraryError("No trip is selected.");
      return;
    }

    const selectedDay = Math.min(
      tripDays,
      Math.max(1, Number(activityForm.day) || 1)
    );
    const startTime = activityForm.time || "09:00";
    const duration = Number(activityForm.duration) || 60;
    const endTime = new Date(
      `2000-01-01T${startTime}:00`
    );
    endTime.setMinutes(endTime.getMinutes() + duration);
    const endTimeValue = `${String(endTime.getHours()).padStart(2, "0")}:${String(
      endTime.getMinutes()
    ).padStart(2, "0")}`;
    const activityDate = getActivityDate(trip, selectedDay);
    const request = {
      destinationId: null,
      activityDate,
      startTime,
      endTime: endTimeValue,
      activityName: activityForm.title.trim(),
      description: activityForm.notes.trim(),
      category: "Custom",
      duration,
      locked: false,
    };

    try {
      if (editingActivity) {
        const existing = itinerary
          .find((day) => day.day === selectedDay)
          ?.activities.find((activity) => activity.id === editingActivity.id);

        if (!existing) {
          throw new Error("Activity not found.");
        }

        if (existing.locked) {
          throw new Error("Unlock this activity before editing it.");
        }

        const updated = await updateItineraryActivity(
          tripId,
          existing.id,
          request
        );
        setItinerary((current) =>
          current.map((day) =>
            day.day === selectedDay
              ? {
                  ...day,
                  activities: day.activities.map((activity) =>
                    activity.id === existing.id
                      ? {
                          ...activity,
                          ...updated,
                          day: selectedDay,
                          time: updated.startTime,
                          title: updated.activityName,
                          location: updated.destinationName || activity.location,
                          duration: updated.duration,
                          notes: updated.description,
                          locked: Boolean(updated.locked),
                        }
                      : activity
                  ),
                }
              : day
          )
        );
      } else {
        const saved = await addItineraryActivity(tripId, request);
        setItinerary((current) =>
          current.map((day) =>
            day.day === selectedDay
              ? {
                  ...day,
                  activities: [
                    ...day.activities,
                    {
                      ...saved,
                      day: selectedDay,
                      time: saved.startTime,
                      title: saved.activityName,
                      location: saved.destinationName || "",
                      duration: saved.duration,
                      notes: saved.description,
                      locked: Boolean(saved.locked),
                    },
                  ],
                }
              : day
          )
        );
      }

      setItineraryMessage(
        editingActivity ? "Activity updated." : "Activity added."
      );
      closeActivityModal();
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to save activity."
      );
    }
  };

  // =====================================================
  // ACTIVITY ACTIONS
  // =====================================================

  const removeActivity = async (dayNumber, activityId) => {
    const activity = itinerary
      .find((day) => day.day === dayNumber)
      ?.activities.find((item) => item.id === activityId);

    if (!activity) return;
    if (activity.locked) {
      setItineraryError("Unlock this activity before removing it.");
      return;
    }

    try {
      await deleteItineraryActivity(tripId, activityId);
      setItinerary((current) =>
        current.map((day) =>
          day.day === dayNumber
            ? {
                ...day,
                activities: day.activities.filter(
                  (item) => item.id !== activityId
                ),
              }
            : day
        )
      );
      setItineraryMessage("Activity deleted.");
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to delete activity."
      );
    }
  };

  const toggleActivityLock = async (dayNumber, activityId) => {
    const activity = itinerary
      .find((day) => day.day === dayNumber)
      ?.activities.find((item) => item.id === activityId);

    if (!activity) return;

    try {
      const nextLocked = !activity.locked;
      await toggleItineraryActivityLock(
        tripId,
        activityId,
        nextLocked
      );
      setItinerary((current) =>
        current.map((day) =>
          day.day === dayNumber
            ? {
                ...day,
                activities: day.activities.map((item) =>
                  item.id === activityId
                    ? { ...item, locked: nextLocked }
                    : item
                ),
              }
            : day
        )
      );
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to change activity lock."
      );
    }
  };

  const moveActivity = async (dayNumber, index, direction) => {
    const day = itinerary.find((item) => item.day === dayNumber);
    if (!day) return;

    const target = index + direction;
    if (target < 0 || target >= day.activities.length) return;
    if (
      day.activities[index].locked ||
      day.activities[target].locked
    ) {
      setItineraryError(
        "Unlock the activities before rearranging them."
      );
      return;
    }

    const reordered = [...day.activities];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);

    try {
      await reorderItineraryActivities(
        tripId,
        getActivityDate(trip, dayNumber),
        reordered.map((activity) => activity.id)
      );
      setItinerary((current) =>
        current.map((item) =>
          item.day === dayNumber
            ? { ...item, activities: reordered }
            : item
        )
      );
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to reorder activities."
      );
    }
  };

  // =====================================================
  // DRAG & DROP
  // =====================================================

  const handleDragStart =
    (
      day,
      activityId
    ) => {
      const activity =
        itinerary
          .find(
            (item) =>
              item.day === day
          )
          ?.activities.find(
            (item) =>
              item.id ===
              activityId
          );

      if (
        !activity ||
        activity.locked
      ) {
        return;
      }

      setDraggedActivity({
        day,
        id: activityId,
      });
    };

  const handleDragEnd =
    () => {
      setDraggedActivity(null);
      setDragOverTarget(null);
    };

  const handleDragOver =
    (
      event,
      day,
      id
    ) => {
      event.preventDefault();

      if (!draggedActivity) {
        return;
      }

      setDragOverTarget({
        day,
        id,
      });
    };

  const handleDrop = async (
    event,
    targetDay,
    targetId = null
  ) => {
    event.preventDefault();

    if (!draggedActivity) {
      return;
    }

    const sourceDay = draggedActivity.day;
    const sourceId = draggedActivity.id;

    if (sourceDay !== targetDay) {
      setItineraryError(
        "Activities can be reordered within the same day."
      );
      handleDragEnd();
      return;
    }

    const source = itinerary.find((day) => day.day === sourceDay);
    const sourceIndex = source?.activities.findIndex(
      (activity) => activity.id === sourceId
    );
    const targetIndex = targetId
      ? source?.activities.findIndex((activity) => activity.id === targetId)
      : source?.activities.length;

    if (
      sourceIndex === undefined ||
      sourceIndex < 0 ||
      targetIndex === undefined ||
      targetIndex < 0 ||
      source.activities[sourceIndex].locked ||
      source.activities[targetIndex]?.locked
    ) {
      setItineraryError("Unlock the activities before rearranging them.");
      handleDragEnd();
      return;
    }

    const reordered = [...source.activities];
    const [moved] = reordered.splice(sourceIndex, 1);
    const adjustedTarget = reordered.findIndex(
      (activity) => activity.id === targetId
    );
    reordered.splice(adjustedTarget >= 0 ? adjustedTarget : reordered.length, 0, moved);

    try {
      await reorderItineraryActivities(
        tripId,
        getActivityDate(trip, sourceDay),
        reordered.map((activity) => activity.id)
      );
      setItinerary((current) =>
        current.map((day) =>
          day.day === sourceDay
            ? { ...day, activities: reordered }
            : day
        )
      );
    } catch (error) {
      setItineraryError(
        error?.message || "Unable to reorder activities."
      );
    } finally {
      handleDragEnd();
    }
  };

  // =====================================================
  // STATS
  // =====================================================

  const itineraryStats =
    useMemo(() => {
      const activities =
        itinerary.flatMap(
          (day) =>
            day.activities
        );

      return {
        total:
          activities.length,
        locked:
          activities.filter(
            (item) =>
              item.locked
          ).length,
        days:
          itinerary.filter(
            (day) =>
              day.activities
                .length > 0
          ).length,
      };
    }, [itinerary]);

  const tripTitle =
    trip?.tripName ||
    trip?.name ||
    trip?.title ||
    "Your Trip";

  const routeLegs = routeSummary?.legs || [];

  const longestLegKm = Math.max(
    1,
    ...routeLegs.map((leg) => Number(leg.distanceKm) || 0)
  );

  const formatTripDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  const tripDateRange =
    trip?.startDate && trip?.endDate
      ? `${formatTripDate(trip.startDate)} – ${formatTripDate(trip.endDate)}`
      : "";

  const travelerCount =
    trip?.noOfTravelers ??
    trip?.travelers ??
    trip?.numberOfTravelers ??
    trip?.travellers ??
    "--";

  const budget =
    trip?.budget ??
    trip?.totalBudget ??
    trip?.estimatedBudget ??
    "--";

  const budgetText =
    budget === "--" || !Number.isFinite(Number(budget))
      ? "--"
      : `₹${Number(budget).toLocaleString("en-IN")}`;

  // =====================================================
  // EMPTY
  // =====================================================

  if (!trip) {
    return (
      <div className="route-planner-page">
        <div className="route-planner-shell">
          <div className="route-empty-trip">
            <h2>No trip selected</h2>

            <p>
              Select a trip to open the
              Smart Route Planner.
            </p>

            <button
              type="button"
              onClick={onBack}
              className="route-back-button"
            >
              ← Back to My Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="route-planner-page rp-page">
      <div className="route-planner-shell rp-shell">

        <button
          type="button"
          className="route-back-button rp-back"
          onClick={onBack}
        >
          ← Back to My Trips
        </button>

        {/* ===================== HERO ===================== */}

        <header className="rp-hero">
          <div className="rp-hero-text">
            <span className="rp-eyebrow">Smart travel workspace</span>
            <h1>Smart Route Planner</h1>
            <p>
              Arrange your stops, see the driving distance and time between
              each one, and keep everything in the order you will travel.
            </p>
          </div>

          <dl className="rp-trip-facts" aria-label="Selected trip">
            <div>
              <dt>Trip</dt>
              <dd>{tripTitle}</dd>
            </div>
            {tripDateRange && (
              <div>
                <dt>Dates</dt>
                <dd>{tripDateRange}</dd>
              </div>
            )}
            <div>
              <dt>Travelers</dt>
              <dd>{travelerCount}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{budgetText}</dd>
            </div>
          </dl>
        </header>

        {/* ===================== SUMMARY STRIP ===================== */}

        <section className="rp-metrics" aria-label="Route summary" aria-busy={routeSummaryLoading}>
          <div className="rp-metric">
            <span className="rp-metric-icon" aria-hidden="true">📍</span>
            <div>
              <strong>{destinations.length}</strong>
              <span>{destinations.length === 1 ? "Stop" : "Stops"}</span>
            </div>
          </div>
          <div className="rp-metric">
            <span className="rp-metric-icon" aria-hidden="true">🛣️</span>
            <div>
              <strong>
                {routeSummaryLoading ? <i className="rp-skel" /> : formatDistance(routeSummary?.totalDistanceKm)}
              </strong>
              <span>Total distance</span>
            </div>
          </div>
          <div className="rp-metric">
            <span className="rp-metric-icon" aria-hidden="true">⏱️</span>
            <div>
              <strong>
                {routeSummaryLoading ? <i className="rp-skel" /> : formatDuration(routeSummary?.totalDurationMinutes)}
              </strong>
              <span>Driving time</span>
            </div>
          </div>
          <div className="rp-metric">
            <span className="rp-metric-icon" aria-hidden="true">🚗</span>
            <div>
              <strong>
                {routeSummaryLoading
                  ? <i className="rp-skel" />
                  : routeSummary?.averageSpeedKmph
                    ? `${Math.round(routeSummary.averageSpeedKmph)} km/h`
                    : "--"}
              </strong>
              <span>Average speed</span>
            </div>
          </div>
        </section>

        {/* ===================== ALERTS ===================== */}

        {listError && (
          <div className="rp-alert rp-alert-error" role="alert">
            <span>{listError}</span>
            <button type="button" onClick={() => setListError("")} aria-label="Dismiss message">×</button>
          </div>
        )}

        {/* ===================== WORKSPACE ===================== */}

        <div className="rp-workspace">

          {/* ---------- LEFT: add stop + timeline ---------- */}

          <section className="rp-card rp-route-card" aria-labelledby="rp-route-title">
            <div className="rp-card-head">
              <div>
                <h2 id="rp-route-title">Your route</h2>
                <p>Drag a stop by its handle, or use the arrows, to change the order.</p>
              </div>
              <span className="rp-badge">{destinations.length} {destinations.length === 1 ? "stop" : "stops"}</span>
            </div>

            <form className="rp-add-form" onSubmit={handleAddDestination}>
              <label htmlFor="rp-add-input" className="rp-sr-only">Add a destination</label>
              <input
                id="rp-add-input"
                type="text"
                value={destinationInput}
                onChange={(event) => setDestinationInput(event.target.value)}
                placeholder="Search a city or place to add..."
                disabled={adding}
                autoComplete="off"
              />
              <button type="submit" disabled={adding || geocoding || !destinationInput.trim()}>
                {geocoding ? "Finding..." : adding ? "Adding..." : "+ Add stop"}
              </button>
            </form>

            {addError && <div className="rp-inline-error" role="alert">{addError}</div>}

            {loading ? (
              <div className="rp-skeleton-list" aria-busy="true" aria-label="Loading stops">
                <i /><i /><i />
              </div>
            ) : destinations.length === 0 ? (
              <div className="rp-empty">
                <span aria-hidden="true">🧭</span>
                <h3>No stops yet</h3>
                <p>Search for your first destination above. Add at least two stops to see distances and travel times.</p>
              </div>
            ) : (
              <ol className="rp-timeline">
                {destinations.map((destination, index) => {
                  const id = getDestinationId(destination);
                  const leg = routeLegs[index - 1]; // leg that arrives at this stop
                  const category = destination?.category;
                  const confirming = confirmRemoveId !== null && confirmRemoveId === id;
                  const dragging = dragIndex === index;
                  const dropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

                  return (
                    <li
                      key={id || `${getDestinationName(destination)}-${index}`}
                      className={`rp-stop-wrap ${dragging ? "is-dragging" : ""} ${dropTarget ? "is-drop-target" : ""}`}
                      onDragOver={(event) => {
                        if (dragIndex === null) return;
                        event.preventDefault();
                        if (dragOverIndex !== index) setDragOverIndex(index);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (dragIndex !== null) reorderTo(dragIndex, index);
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                    >
                      {index > 0 && (
                        <div className="rp-leg" aria-label={`From ${getDestinationName(destinations[index - 1])} to ${getDestinationName(destination)}`}>
                          <span className="rp-leg-line" aria-hidden="true" />
                          {routeSummaryLoading ? (
                            <span className="rp-leg-chip"><i className="rp-skel" /></span>
                          ) : leg ? (
                            <span className="rp-leg-chip">
                              🚗 {formatDistance(leg.distanceKm)} · {formatDuration(leg.durationMinutes)}
                              {routeSummary?.approximate && <em title="Estimated, not live road data"> ≈</em>}
                            </span>
                          ) : (
                            <span className="rp-leg-chip rp-leg-muted">Distance not available</span>
                          )}
                        </div>
                      )}

                      <div className="rp-stop">
                        <span
                          className="rp-handle"
                          draggable={reorderingId === null}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", String(index));
                            setDragIndex(index);
                          }}
                          onDragEnd={() => {
                            setDragIndex(null);
                            setDragOverIndex(null);
                          }}
                          title="Drag to reorder"
                          aria-hidden="true"
                        >
                          ⠿
                        </span>

                        <span className="rp-stop-number">{index + 1}</span>

                        <div className="rp-stop-body">
                          <strong>{getDestinationName(destination)}</strong>
                          <span>
                            {category ? category : "No category yet"}
                            {destination?.bestTime ? ` · Best: ${destination.bestTime}` : ""}
                          </span>
                        </div>

                        {confirming ? (
                          <div className="rp-stop-actions rp-confirm" role="group" aria-label="Confirm removal">
                            <span>Remove this stop?</span>
                            <button
                              type="button"
                              className="rp-danger"
                              onClick={() => {
                                setConfirmRemoveId(null);
                                handleRemoveDestination(destination);
                              }}
                            >
                              Remove
                            </button>
                            <button type="button" onClick={() => setConfirmRemoveId(null)}>Keep</button>
                          </div>
                        ) : (
                          <div className="rp-stop-actions">
                            <button
                              type="button"
                              onClick={() => handleEditDestination(destination)}
                              aria-label={`Edit details for ${getDestinationName(destination)}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => reorderTo(index, index - 1)}
                              disabled={index === 0 || reorderingId !== null}
                              aria-label={`Move ${getDestinationName(destination)} up`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => reorderTo(index, index + 1)}
                              disabled={index === destinations.length - 1 || reorderingId !== null}
                              aria-label={`Move ${getDestinationName(destination)} down`}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="rp-icon-danger"
                              onClick={() => setConfirmRemoveId(id)}
                              disabled={removingId === id}
                              aria-label={`Remove ${getDestinationName(destination)}`}
                            >
                              {removingId === id ? "…" : "×"}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* ---------- RIGHT: overview ---------- */}

          <aside className="rp-card rp-overview" aria-labelledby="rp-overview-title">
            <div className="rp-card-head">
              <div>
                <h2 id="rp-overview-title">Route overview</h2>
                <p>Distance and time for each leg of the journey.</p>
              </div>
            </div>

            {destinations.length < 2 ? (
              <div className="rp-empty rp-empty-small">
                <span aria-hidden="true">🗺️</span>
                <p>
                  {destinations.length === 0
                    ? "Add two or more stops to see your route."
                    : "Add one more stop to calculate the route."}
                </p>
              </div>
            ) : routeSummaryError ? (
              <div className="rp-alert rp-alert-error" role="alert">
                <span>{routeSummaryError}</span>
                <button type="button" className="rp-retry" onClick={() => setRouteReloadKey((value) => value + 1)}>
                  Try again
                </button>
              </div>
            ) : routeSummaryLoading ? (
              <div className="rp-skeleton-list" aria-busy="true" aria-label="Calculating route">
                <i /><i /><i />
              </div>
            ) : routeSummary ? (
              <>
                <div className={`rp-source ${routeSummary.approximate ? "is-estimate" : "is-live"}`}>
                  <strong>
                    {routeSummary.approximate ? "Approximate estimate" : "Road route"}
                  </strong>
                  <span>
                    {routeSummary.approximate
                      ? routeSummary.notice || "Live road routing is unavailable, so these numbers are estimated from straight-line distance."
                      : "Driving distance and time from the OpenStreetMap routing service. Traffic is not included."}
                  </span>
                </div>

                <div className="rp-totals">
                  <div>
                    <span>Total distance</span>
                    <strong>{formatDistance(routeSummary.totalDistanceKm)}</strong>
                  </div>
                  <div>
                    <span>Driving time</span>
                    <strong>{formatDuration(routeSummary.totalDurationMinutes)}</strong>
                  </div>
                </div>

                <ul className="rp-legs">
                  {routeLegs.map((leg, index) => (
                    <li key={`${leg.fromDestinationId}-${leg.toDestinationId}-${index}`}>
                      <div className="rp-leg-row">
                        <span className="rp-leg-names">
                          <b>{index + 1}</b> {leg.fromName} <span aria-hidden="true">→</span> {leg.toName}
                        </span>
                        <span className="rp-leg-values">
                          {formatDistance(leg.distanceKm)} · {formatDuration(leg.durationMinutes)}
                        </span>
                      </div>
                      <div className="rp-leg-bar" aria-hidden="true">
                        <i style={{ width: `${Math.max(4, Math.round((Number(leg.distanceKm) / longestLegKm) * 100))}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </aside>
        </div>

        {/* =================================================
            DESTINATION INFORMATION
        ================================================= */}

        <section className="destination-information-card">
          <div className="destination-information-header">
            <div>
              <span>
                DESTINATION DETAILS
              </span>

              <h2>
                📋 Destination Information
              </h2>

              <p>
                Detailed destination
                information for your
                selected trip.
              </p>
            </div>
          </div>

          {editingDestinationId !== null && (
            <form
              onSubmit={handleSaveDestinationEdit}
              style={{
                margin: "18px 0",
                padding: "20px",
                border: "1px solid #d9e2ec",
                borderRadius: "12px",
                background: "#f8fafc",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Edit destination details</h3>
              <p style={{ marginTop: 0 }}>
                Updating: <strong>{getDestinationName(destinations.find((item) => String(getDestinationId(item)) === String(editingDestinationId)))}</strong>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px" }}>
                <label>
                  Category
                  <input name="category" value={destinationEditForm.category} onChange={handleDestinationEditChange} placeholder="e.g. Museum, Park" />
                </label>
                <label>
                  Best time to visit
                  <input name="bestTime" value={destinationEditForm.bestTime} onChange={handleDestinationEditChange} placeholder="e.g. Morning" />
                </label>
                <label>
                  Opening time
                  <input type="time" name="openingTime" value={destinationEditForm.openingTime} onChange={handleDestinationEditChange} />
                </label>
                <label>
                  Closing time
                  <input type="time" name="closingTime" value={destinationEditForm.closingTime} onChange={handleDestinationEditChange} />
                </label>
                <label>
                  Ticket price (₹)
                  <input type="number" min="0" step="0.01" name="ticketPrice" value={destinationEditForm.ticketPrice} onChange={handleDestinationEditChange} placeholder="0" />
                </label>
                <label>
                  Expected duration (minutes)
                  <input type="number" min="1" step="1" name="expectedDuration" value={destinationEditForm.expectedDuration} onChange={handleDestinationEditChange} placeholder="e.g. 90" />
                </label>
                <label>
                  Popularity (0–5)
                  <input type="number" min="0" max="5" step="0.1" name="popularity" value={destinationEditForm.popularity} onChange={handleDestinationEditChange} placeholder="e.g. 4.5" />
                </label>
                <label>
                  Indoor / Outdoor
                  <select name="indoorOutdoor" value={destinationEditForm.indoorOutdoor} onChange={handleDestinationEditChange}>
                    <option value="">Not specified</option>
                    <option value="INDOOR">Indoor</option>
                    <option value="OUTDOOR">Outdoor</option>
                    <option value="BOTH">Both</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", margin: "16px 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <input type="checkbox" name="familyFriendly" checked={destinationEditForm.familyFriendly} onChange={handleDestinationEditChange} />
                  Family friendly
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <input type="checkbox" name="wheelchairFriendly" checked={destinationEditForm.wheelchairFriendly} onChange={handleDestinationEditChange} />
                  Wheelchair friendly
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <input type="checkbox" name="kidsFriendly" checked={destinationEditForm.kidsFriendly} onChange={handleDestinationEditChange} />
                  Kids friendly
                </label>
              </div>

              {destinationEditError && (
                <p role="alert" style={{ color: "#b42318", margin: "10px 0" }}>
                  {destinationEditError}
                </p>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button type="button" onClick={handleCancelDestinationEdit} disabled={destinationEditSaving}>
                  Cancel
                </button>
                <button type="submit" disabled={destinationEditSaving}>
                  {destinationEditSaving ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          )}

          {destinations.length ===
          0 ? (
            <div className="destination-information-empty">
              Add destinations to see
              detailed information here.
            </div>
          ) : (
            <div className="destination-table-wrapper">
              <table className="destination-table">
                <thead>
                  <tr>
                    <th>
                      ORDER
                    </th>
                    <th>
                      DESTINATION
                    </th>
                    <th>
                      CATEGORY
                    </th>
                    <th>
                      BEST TIME
                    </th>
                    <th>
                      OPENING
                    </th>
                    <th>
                      CLOSING
                    </th>
                    <th>
                      TICKET
                    </th>
                    <th>
                      DURATION
                    </th>
                    <th>
                      POPULARITY
                    </th>
                    <th>
                      TYPE
                    </th>
                    <th>
                      FAMILY
                    </th>
                    <th>
                      WHEELCHAIR
                    </th>
                    <th>
                      KIDS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {destinations.map(
                    (
                      destination,
                      index
                    ) => (
                      <tr
                        key={
                          getDestinationId(
                            destination
                          ) ||
                          index
                        }
                      >
                        <td>
                          <span className="destination-order-pill">
                            {index + 1}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {getDestinationName(
                              destination
                            )}
                          </strong>

                          <small>
                            {displayValue(
                              destination?.latitude
                            )}
                            ,{" "}
                            {displayValue(
                              destination?.longitude
                            )}
                          </small>
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "category"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "bestTime",
                              "best_time"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "openingTime",
                              "opening_time"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "closingTime",
                              "closing_time"
                            )
                          )}
                        </td>

                        <td>
                          ₹
                          {displayValue(
                            getDestinationField(
                              destination,
                              "ticketPrice",
                              "ticket_price"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "expectedDuration",
                              "expected_duration",
                              "duration"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "popularity"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "indoorOutdoor",
                              "indoor_outdoor"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "familyFriendly",
                              "family_friendly"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "wheelchairFriendly",
                              "wheelchair_friendly"
                            )
                          )}
                        </td>

                        <td>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "kidsFriendly",
                              "kids_friendly"
                            )
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* JOURNEY ORDER */}

        <section className="route-insight-card">
          <span>
            JOURNEY ORDER
          </span>

          <h2>
            Route sequence
          </h2>

          <div className="route-sequence">
            {destinations.map(
              (
                destination,
                index
              ) => (
                <div
                  className="route-sequence-item"
                  key={index}
                >
                  <span>
                    {index + 1}
                  </span>

                  <strong>
                    {getDestinationName(
                      destination
                    )}
                  </strong>

                  {index <
                    destinations.length -
                      1 && (
                    <b>
                      →
                    </b>
                  )}
                </div>
              )
            )}
          </div>
        </section>

        {/* =================================================
            MODULE 6
        ================================================= */}

        <section
          className="module6-itinerary-card"
          id="module6-itinerary"
        >
          <div className="module6-header">
            <div className="module6-header-main">
              <div className="module6-icon">
                📅
              </div>

              <div>
                <span className="module6-eyebrow">
                  DAY-BY-DAY PLAN
                </span>

                <h2>
                  Itinerary Generation Engine
                </h2>

                <p>
                  Build a complete
                  day-by-day itinerary
                  from your route.
                </p>
              </div>
            </div>

            <div className="module6-header-actions">
              <button
                type="button"
                className="module6-secondary-button"
                onClick={() =>
                  openAddActivityModal(
                    1
                  )
                }
              >
                + Add Activity
              </button>

              <button
                type="button"
                className="module6-primary-button"
                onClick={
                  generateItinerary
                }
                disabled={
                  itineraryGenerating
                }
              >
                {itineraryGenerating
                  ? "Generating..."
                  : itineraryStats.total
                  ? "↻ Regenerate"
                  : "✨ Generate Itinerary"}
              </button>

              <button
                type="button"
                className="module6-save-button"
                onClick={
                  saveItinerary
                }
              >
                {itinerarySaving
                  ? "Saving..."
                  : "💾 Save"}
              </button>
            </div>
          </div>

          <div className="module6-info-strip">
            <div>
              <span>
                ACTIVITIES
              </span>

              <strong>
                {itineraryStats.total}
              </strong>
            </div>

            <div>
              <span>
                DAYS PLANNED
              </span>

              <strong>
                {itineraryStats.days}/
                {tripDays}
              </strong>
            </div>

            <div>
              <span>
                LOCKED
              </span>

              <strong>
                {itineraryStats.locked}
              </strong>
            </div>

            <div className="module6-info-note">
              <span>
                SMART REGENERATION
              </span>

              <p>
                Locked activities
                remain protected.
              </p>
            </div>
          </div>

          {itineraryMessage && (
            <div className="module6-alert module6-success">
              ✓ {itineraryMessage}

              <button
                type="button"
                onClick={() =>
                  setItineraryMessage(
                    ""
                  )
                }
              >
                ×
              </button>
            </div>
          )}

          {itineraryError && (
            <div className="module6-alert module6-error">
              ⚠️ {itineraryError}

              <button
                type="button"
                onClick={() =>
                  setItineraryError("")
                }
              >
                ×
              </button>
            </div>
          )}

          {itineraryLoading ? (
            <div className="module6-loading">
              Loading itinerary...
            </div>
          ) : (
            <div className="module6-days">
              {itinerary.map(
                (day) => (
                  <section
                    className="module6-day-card"
                    key={day.day}
                    onDragOver={(event) =>
                      event.preventDefault()
                    }
                    onDrop={(event) =>
                      handleDrop(
                        event,
                        day.day
                      )
                    }
                  >
                    <div className="module6-day-header">
                      <div>
                        <span>
                          DAY{" "}
                          {String(
                            day.day
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <h3>
                          {day.day ===
                          1
                            ? "Day One"
                            : `Day ${day.day}`}
                        </h3>
                      </div>

                      <button
                        type="button"
                        className="module6-day-add"
                        onClick={() =>
                          openAddActivityModal(
                            day.day
                          )
                        }
                      >
                        + Add
                      </button>
                    </div>

                    {day.activities
                      .length === 0 ? (
                      <div className="module6-empty-day">
                        <strong>
                          Nothing planned yet
                        </strong>

                        <p>
                          Generate the
                          itinerary or
                          add an activity
                          manually.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            openAddActivityModal(
                              day.day
                            )
                          }
                        >
                          Add Activity
                        </button>
                      </div>
                    ) : (
                      <div className="module6-activity-list">
                        {day.activities.map(
                          (
                            activity,
                            activityIndex
                          ) => (
                            <article
                              key={
                                activity.id
                              }
                              className={`module6-activity ${
                                activity.locked
                                  ? "module6-activity-locked"
                                  : ""
                              }`}
                              draggable={
                                !activity.locked
                              }
                              onDragStart={() =>
                                handleDragStart(
                                  day.day,
                                  activity.id
                                )
                              }
                              onDragOver={(
                                event
                              ) =>
                                handleDragOver(
                                  event,
                                  day.day,
                                  activity.id
                                )
                              }
                              onDrop={(event) =>
                                handleDrop(
                                  event,
                                  day.day,
                                  activity.id
                                )
                              }
                              onDragEnd={
                                handleDragEnd
                              }
                            >
                              <div className="module6-time-column">
                                <strong>
                                  {
                                    activity.time
                                  }
                                </strong>

                                <span>
                                  {formatDuration(
                                    activity.duration
                                  )}
                                </span>
                              </div>

                              <div className="module6-activity-body">
                                <div className="module6-activity-top">
                                  <div>
                                    <div className="module6-activity-title-row">
                                      <h4>
                                        {
                                          activity.title
                                        }
                                      </h4>

                                      {activity.locked && (
                                        <span className="module6-lock-badge">
                                          🔒
                                        </span>
                                      )}
                                    </div>

                                    {activity.location && (
                                      <span className="module6-location">
                                        📍{" "}
                                        {
                                          activity.location
                                        }
                                      </span>
                                    )}
                                  </div>

                                  {!activity.locked && (
                                    <span className="module6-drag-handle">
                                      ⋮⋮
                                    </span>
                                  )}
                                </div>

                                {activity.notes && (
                                  <p className="module6-activity-notes">
                                    {
                                      activity.notes
                                    }
                                  </p>
                                )}

                                <div className="module6-activity-actions">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveActivity(
                                        day.day,
                                        activityIndex,
                                        -1
                                      )
                                    }
                                    disabled={
                                      activityIndex ===
                                        0 ||
                                      activity.locked ||
                                      day.activities[
                                        activityIndex -
                                          1
                                      ]?.locked
                                    }
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveActivity(
                                        day.day,
                                        activityIndex,
                                        1
                                      )
                                    }
                                    disabled={
                                      activityIndex ===
                                        day.activities.length -
                                          1 ||
                                      activity.locked ||
                                      day.activities[
                                        activityIndex +
                                          1
                                      ]?.locked
                                    }
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleActivityLock(
                                        day.day,
                                        activity.id
                                      )
                                    }
                                  >
                                    {activity.locked
                                      ? "🔓 Unlock"
                                      : "🔒 Lock"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditActivityModal(
                                        activity,
                                        day.day
                                      )
                                    }
                                    disabled={
                                      activity.locked
                                    }
                                  >
                                    ✏️ Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeActivity(
                                        day.day,
                                        activity.id
                                      )
                                    }
                                    disabled={
                                      activity.locked
                                    }
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            </article>
                          )
                        )}
                      </div>
                    )}
                  </section>
                )
              )}
            </div>
          )}

          <div className="module6-footer">
            <span>
              💡 Drag activities to
              rearrange them.
            </span>

            <span>
              🔒 Locked activities
              survive regeneration.
            </span>

            <span>
              💾 Save stores the
              itinerary on this device.
            </span>
          </div>
        </section>

        {/* FOOTER */}

        <div className="route-planner-footer">
          Route planning, destination
          information and itinerary
          generation are managed from
          this trip workspace.
        </div>
      </div>

      {/* =================================================
          ACTIVITY MODAL
      ================================================= */}

      {activityModalOpen && (
        <div
          className="module6-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeActivityModal();
            }
          }}
        >
          <div className="module6-modal">
            <div className="module6-modal-header">
              <div>
                <span className="module6-eyebrow">
                  DAY-BY-DAY PLAN
                </span>

                <h2>
                  {editingActivity
                    ? "Edit Activity"
                    : "Add Activity"}
                </h2>
              </div>

              <button
                type="button"
                className="module6-modal-close"
                onClick={
                  closeActivityModal
                }
              >
                ×
              </button>
            </div>

            <form
              className="module6-form"
              onSubmit={
                handleActivitySubmit
              }
            >
              <div className="module6-form-grid">
                <label>
                  <span>
                    Day
                  </span>

                  <select
                    name="day"
                    value={
                      activityForm.day
                    }
                    onChange={
                      handleActivityFormChange
                    }
                  >
                    {Array.from(
                      {
                        length:
                          tripDays,
                      },
                      (_, index) => (
                        <option
                          key={
                            index + 1
                          }
                          value={
                            index + 1
                          }
                        >
                          Day{" "}
                          {index + 1}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  <span>
                    Time
                  </span>

                  <input
                    type="time"
                    name="time"
                    value={
                      activityForm.time
                    }
                    onChange={
                      handleActivityFormChange
                    }
                  />
                </label>
              </div>

              <label>
                <span>
                  Activity Name *
                </span>

                <input
                  type="text"
                  name="title"
                  value={
                    activityForm.title
                  }
                  onChange={
                    handleActivityFormChange
                  }
                  placeholder="e.g. Visit Marina Beach"
                />
              </label>

              <label>
                <span>
                  Location
                </span>

                <input
                  type="text"
                  name="location"
                  value={
                    activityForm.location
                  }
                  onChange={
                    handleActivityFormChange
                  }
                  placeholder="e.g. Chennai"
                />
              </label>

              <label>
                <span>
                  Duration
                </span>

                <select
                  name="duration"
                  value={
                    activityForm.duration
                  }
                  onChange={
                    handleActivityFormChange
                  }
                >
                  <option value="30">
                    30 minutes
                  </option>

                  <option value="60">
                    1 hour
                  </option>

                  <option value="90">
                    1.5 hours
                  </option>

                  <option value="120">
                    2 hours
                  </option>

                  <option value="180">
                    3 hours
                  </option>

                  <option value="240">
                    4 hours
                  </option>
                </select>
              </label>

              <label>
                <span>
                  Notes
                </span>

                <textarea
                  name="notes"
                  value={
                    activityForm.notes
                  }
                  onChange={
                    handleActivityFormChange
                  }
                  placeholder="Add notes or booking information..."
                  rows="4"
                />
              </label>

              <div className="module6-modal-actions">
                <button
                  type="button"
                  className="module6-cancel-button"
                  onClick={
                    closeActivityModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="module6-primary-button"
                >
                  {editingActivity
                    ? "Save Changes"
                    : "Add Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoutePlanner;