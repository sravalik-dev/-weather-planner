import { useEffect, useMemo, useState } from "react";
import {
  getDestinations,
  addDestination,
  removeDestination,
  reorderDestinations,
  calculateDistance,
  calculateEta,
} from "../services/routeService";

const ITINERARY_STORAGE_PREFIX =
  "weather_planner_itinerary_module6_";

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
  id: activity?.id || createActivityId(),
  day: Number(activity?.day) || day,
  time: activity?.time || "09:00",
  title: activity?.title || "Untitled Activity",
  location: activity?.location || "",
  duration: activity?.duration || "60",
  notes: activity?.notes || "",
  locked: Boolean(activity?.locked),
});

const normalizeItinerary = (value, days) => {
  const source = Array.isArray(value) ? value : [];

  return Array.from({ length: days }, (_, index) => {
    const dayNumber = index + 1;

    const existingDay = source.find(
      (item) => Number(item?.day) === dayNumber
    );

    return {
      day: dayNumber,
      activities: Array.isArray(existingDay?.activities)
        ? existingDay.activities.map((activity) =>
            normalizeActivity(activity, dayNumber)
          )
        : [],
    };
  });
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

  const [removingId, setRemovingId] =
    useState(null);

  const [reorderingId, setReorderingId] =
    useState(null);

  const [distance, setDistance] =
    useState(null);

  const [eta, setEta] =
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

  useEffect(() => {
    let cancelled = false;

    const loadRouteSummary = async () => {
      if (
        !tripId ||
        destinations.length < 2
      ) {
        setDistance(null);
        setEta(null);
        setRouteSummaryLoading(false);
        return;
      }

      setRouteSummaryLoading(true);
      setRouteSummaryError("");

      try {
        const [
          distanceResponse,
          etaResponse,
        ] = await Promise.all([
          calculateDistance(tripId),
          calculateEta(tripId),
        ]);

        if (cancelled) return;

        setDistance(
          distanceResponse?.distance ??
            distanceResponse?.totalDistance ??
            distanceResponse?.value ??
            distanceResponse
        );

        setEta(
          etaResponse?.eta ??
            etaResponse?.duration ??
            etaResponse?.totalDuration ??
            etaResponse?.value ??
            etaResponse
        );
      } catch (error) {
        if (!cancelled) {
          setRouteSummaryError(
            error?.message ||
              "Unable to calculate route summary."
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
  }, [tripId, destinations.length]);

  // =====================================================
  // LOAD ITINERARY
  // =====================================================

  useEffect(() => {
    if (!tripId) {
      setItinerary(
        createEmptyItinerary(tripDays)
      );
      setItineraryLoading(false);
      return;
    }

    setItineraryLoading(true);

    try {
      const key =
        `${ITINERARY_STORAGE_PREFIX}${tripId}`;

      const saved =
        localStorage.getItem(key);

      if (saved) {
        setItinerary(
          normalizeItinerary(
            JSON.parse(saved),
            tripDays
          )
        );
      } else {
        setItinerary(
          createEmptyItinerary(tripDays)
        );
      }
    } catch (error) {
      console.error(
        "Failed to load itinerary",
        error
      );

      setItinerary(
        createEmptyItinerary(tripDays)
      );
    } finally {
      setItineraryLoading(false);
    }
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
          name: result.name,
          latitude: result.latitude,
          longitude: result.longitude,
          country:
            result.country || "",
          state:
            result.admin1 || "",
          destinationOrder:
            destinations.length + 1,
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

  const moveDestination = async (
    index,
    direction
  ) => {
    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >=
        destinations.length ||
      !tripId
    ) {
      return;
    }

    const current =
      [...destinations];

    const [moved] =
      current.splice(index, 1);

    current.splice(
      targetIndex,
      0,
      moved
    );

    setDestinations(current);

    const destinationIds =
      current
        .map(getDestinationId)
        .filter(Boolean);

    setReorderingId(
      getDestinationId(moved)
    );

    try {
      await reorderDestinations(
        tripId,
        destinationIds
      );
    } catch (error) {
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

  const storageKey = useMemo(
    () =>
      `${ITINERARY_STORAGE_PREFIX}${tripId}`,
    [tripId]
  );

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

  const generateItinerary =
    async () => {
      setItineraryGenerating(true);
      setItineraryError("");
      setItineraryMessage("");

      try {
        const names =
          getTripDestinationNames();

        setItinerary((current) => {
          const generated =
            createEmptyItinerary(
              tripDays
            );

          const locked =
            current.flatMap(
              (day) =>
                day.activities
                  .filter(
                    (item) =>
                      item.locked
                  )
                  .map((item) => ({
                    ...item,
                    day: day.day,
                  }))
            );

          const templates = [
            [
              "09:00",
              "Morning Exploration",
              "120",
            ],
            [
              "11:30",
              "Sightseeing & Local Experience",
              "90",
            ],
            [
              "13:30",
              "Lunch Break",
              "60",
            ],
            [
              "16:00",
              "Afternoon Discovery",
              "120",
            ],
            [
              "19:00",
              "Evening Leisure",
              "120",
            ],
          ];

          generated.forEach(
            (day, index) => {
              const destination =
                names[
                  index %
                    names.length
                ];

              const lockedForDay =
                locked.filter(
                  (item) =>
                    Number(item.day) ===
                    day.day
                );

              day.activities =
                [...lockedForDay];

              templates.forEach(
                (
                  [
                    time,
                    title,
                    duration,
                  ]
                ) => {
                  if (
                    day.activities
                      .length >= 5
                  ) {
                    return;
                  }

                  if (
                    day.activities.some(
                      (item) =>
                        item.time ===
                        time
                    )
                  ) {
                    return;
                  }

                  day.activities.push(
                    {
                      id:
                        createActivityId(),
                      day: day.day,
                      time,
                      title:
                        title ===
                        "Morning Exploration"
                          ? `${title} — ${destination}`
                          : title,
                      location:
                        destination,
                      duration,
                      notes:
                        "Plan this activity around your route and travel time.",
                      locked: false,
                    }
                  );
                }
              );
            }
          );

          return generated;
        });

        setItineraryMessage(
          "Itinerary generated successfully. Locked activities were preserved."
        );
      } finally {
        setItineraryGenerating(
          false
        );
      }
    };

  // =====================================================
  // SAVE
  // =====================================================

  const saveItinerary = () => {
    if (!tripId) {
      setItineraryError(
        "No trip is selected."
      );
      return;
    }

    setItinerarySaving(true);

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(
          itinerary
        )
      );

      setItineraryMessage(
        "Itinerary saved successfully on this device."
      );
    } catch {
      setItineraryError(
        "Unable to save itinerary."
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

  const handleActivitySubmit =
    (event) => {
      event.preventDefault();

      if (
        !activityForm.title.trim()
      ) {
        setItineraryError(
          "Activity title is required."
        );
        return;
      }

      const selectedDay =
        Math.min(
          tripDays,
          Math.max(
            1,
            Number(
              activityForm.day
            ) || 1
          )
        );

      if (editingActivity) {
        let movedActivity =
          null;

        setItinerary(
          (current) => {
            const without =
              current.map(
                (day) => ({
                  ...day,
                  activities:
                    day.activities.filter(
                      (activity) => {
                        if (
                          activity.id ===
                          editingActivity.id
                        ) {
                          movedActivity =
                            {
                              ...activity,
                              day:
                                selectedDay,
                              time:
                                activityForm.time,
                              title:
                                activityForm.title.trim(),
                              location:
                                activityForm.location.trim(),
                              duration:
                                activityForm.duration,
                              notes:
                                activityForm.notes.trim(),
                            };

                          return false;
                        }

                        return true;
                      }
                    ),
                })
              );

            if (!movedActivity) {
              return current;
            }

            return without.map(
              (day) =>
                day.day ===
                selectedDay
                  ? {
                      ...day,
                      activities:
                        [
                          ...day.activities,
                          movedActivity,
                        ],
                    }
                  : day
            );
          }
        );
      } else {
        const activity = {
          id: createActivityId(),
          day: selectedDay,
          time: activityForm.time,
          title:
            activityForm.title.trim(),
          location:
            activityForm.location.trim(),
          duration:
            activityForm.duration,
          notes:
            activityForm.notes.trim(),
          locked: false,
        };

        updateItinerary(
          (current) =>
            current.map(
              (day) =>
                day.day ===
                selectedDay
                  ? {
                      ...day,
                      activities: [
                        ...day.activities,
                        activity,
                      ],
                    }
                  : day
            )
        );
      }

      closeActivityModal();
    };

  // =====================================================
  // ACTIVITY ACTIONS
  // =====================================================

  const removeActivity = (
    dayNumber,
    activityId
  ) => {
    const activity =
      itinerary
        .find(
          (day) =>
            day.day ===
            dayNumber
        )
        ?.activities.find(
          (item) =>
            item.id ===
            activityId
        );

    if (!activity) {
      return;
    }

    if (activity.locked) {
      setItineraryError(
        "Unlock this activity before removing it."
      );
      return;
    }

    updateItinerary(
      (current) =>
        current.map(
          (day) =>
            day.day ===
            dayNumber
              ? {
                  ...day,
                  activities:
                    day.activities.filter(
                      (item) =>
                        item.id !==
                        activityId
                    ),
                }
              : day
        )
    );
  };

  const toggleActivityLock =
    (
      dayNumber,
      activityId
    ) => {
      updateItinerary(
        (current) =>
          current.map(
            (day) =>
              day.day ===
              dayNumber
                ? {
                    ...day,
                    activities:
                      day.activities.map(
                        (activity) =>
                          activity.id ===
                          activityId
                            ? {
                                ...activity,
                                locked:
                                  !activity.locked,
                              }
                            : activity
                      ),
                  }
                : day
          )
      );
    };

  const moveActivity = (
    dayNumber,
    index,
    direction
  ) => {
    const day =
      itinerary.find(
        (item) =>
          item.day ===
          dayNumber
      );

    if (!day) return;

    const target =
      index + direction;

    if (
      target < 0 ||
      target >=
        day.activities.length
    ) {
      return;
    }

    if (
      day.activities[index]
        .locked ||
      day.activities[target]
        .locked
    ) {
      setItineraryError(
        "Unlock the activities before rearranging them."
      );
      return;
    }

    updateItinerary(
      (current) =>
        current.map(
          (item) => {
            if (
              item.day !==
              dayNumber
            ) {
              return item;
            }

            const activities =
              [...item.activities];

            const [
              moved,
            ] =
              activities.splice(
                index,
                1
              );

            activities.splice(
              target,
              0,
              moved
            );

            return {
              ...item,
              activities,
            };
          }
        )
    );
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

  const handleDrop = (
    event,
    targetDay,
    targetId = null
  ) => {
    event.preventDefault();

    if (!draggedActivity) {
      return;
    }

    const sourceDay =
      draggedActivity.day;

    const sourceId =
      draggedActivity.id;

    updateItinerary(
      (current) => {
        let moved = null;

        const without =
          current.map(
            (day) => ({
              ...day,
              activities:
                day.activities.filter(
                  (activity) => {
                    if (
                      day.day ===
                        sourceDay &&
                      activity.id ===
                        sourceId
                    ) {
                      moved = {
                        ...activity,
                        day: targetDay,
                      };

                      return false;
                    }

                    return true;
                  }
                ),
            })
          );

        if (!moved) {
          return current;
        }

        return without.map(
          (day) => {
            if (
              day.day !==
              targetDay
            ) {
              return day;
            }

            const activities =
              [...day.activities];

            if (!targetId) {
              activities.push(
                moved
              );
            } else {
              const index =
                activities.findIndex(
                  (item) =>
                    item.id ===
                    targetId
                );

              if (
                index >= 0
              ) {
                activities.splice(
                  index,
                  0,
                  moved
                );
              } else {
                activities.push(
                  moved
                );
              }
            }

            return {
              ...day,
              activities,
            };
          }
        );
      }
    );

    handleDragEnd();
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

  const travelerCount =
    trip?.travelers ??
    trip?.numberOfTravelers ??
    trip?.travellers ??
    "--";

  const budget =
    trip?.budget ??
    trip?.totalBudget ??
    trip?.estimatedBudget ??
    "--";

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
    <div className="route-planner-page">
      <div className="route-planner-shell">

        {/* HEADER */}

        <button
          type="button"
          className="route-back-button"
          onClick={onBack}
        >
          ← Back to My Trips
        </button>

        <header className="route-planner-header">
          <div>
            <span className="route-eyebrow">
              SMART TRAVEL WORKSPACE
            </span>

            <h1>
              Smart Route Planner
            </h1>

            <p>
              Plan, customize, reorder
              and optimize your
              multi-destination journey
              with smart route insights.
            </p>
          </div>

          <div className="route-header-icon">
            🧭
          </div>
        </header>

        {/* TRIP SUMMARY */}

        <section className="route-trip-banner">
          <div>
            <span>
              SELECTED TRIP
            </span>

            <strong>
              {tripTitle}
            </strong>
          </div>

          <div>
            <span>
              TRIP ID
            </span>

            <strong>
              {tripId}
            </strong>
          </div>

          <div>
            <span>
              TRAVELERS
            </span>

            <strong>
              {travelerCount}
            </strong>
          </div>

          <div>
            <span>
              BUDGET
            </span>

            <strong>
              {budget === "--"
                ? "--"
                : `₹${budget}`}
            </strong>
          </div>
        </section>

        {/* METRICS */}

        <div className="route-metrics">
          <div className="route-stat-card">
            <span>
              DESTINATIONS
            </span>

            <strong>
              {destinations.length}
            </strong>
          </div>

          <div className="route-stat-card">
            <span>
              TOTAL DISTANCE
            </span>

            <strong>
              {routeSummaryLoading
                ? "..."
                : formatDistance(
                    distance
                  )}
            </strong>
          </div>

          <div className="route-stat-card">
            <span>
              ESTIMATED TIME
            </span>

            <strong>
              {routeSummaryLoading
                ? "..."
                : formatDuration(
                    eta
                  )}
            </strong>
          </div>

          <div className="route-stat-card">
            <span>
              AVG. SPEED
            </span>

            <strong>
              50 km/h
            </strong>
          </div>
        </div>

        {/* ALERTS */}

        {listError && (
          <div className="route-alert route-error">
            ⚠️ {listError}

            <button
              type="button"
              onClick={() =>
                setListError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {routeSummaryError && (
          <div className="route-alert route-error">
            ⚠️ {routeSummaryError}

            <button
              type="button"
              onClick={() =>
                setRouteSummaryError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* ADD DESTINATION */}

        <section className="route-control-card">
          <div className="route-card-title">
            <div>
              <span>
                ADD DESTINATION
              </span>

              <h2>
                Build your route
              </h2>

              <p>
                Add places to your trip
                and arrange them in the
                order you want to visit.
              </p>
            </div>

            <span className="route-section-icon">
              📍
            </span>
          </div>

          <form
            className="route-add-form"
            onSubmit={
              handleAddDestination
            }
          >
            <input
              type="text"
              value={
                destinationInput
              }
              onChange={(event) =>
                setDestinationInput(
                  event.target.value
                )
              }
              placeholder="Search city or destination..."
              disabled={adding}
            />

            <button
              type="submit"
              disabled={
                adding ||
                geocoding
              }
            >
              {geocoding
                ? "Finding..."
                : adding
                ? "Adding..."
                : "Add Destination"}
            </button>
          </form>

          {addError && (
            <div className="route-inline-error">
              {addError}
            </div>
          )}
        </section>

        {/* YOUR ROUTE */}

        <section className="route-main-card">
          <div className="route-section-heading">
            <div>
              <span>
                ROUTE PLANNER
              </span>

              <h2>
                📍 Your Route
              </h2>

              <p>
                Drag destinations or use
                the controls to change
                their order.
              </p>
            </div>

            <span className="route-count-badge">
              {destinations.length} stops
            </span>
          </div>

          {loading ? (
            <div className="route-loading">
              Loading destinations...
            </div>
          ) : destinations.length ===
            0 ? (
            <div className="route-empty-state">
              <div>
                📍
              </div>

              <h3>
                No destinations yet
              </h3>

              <p>
                Add your first destination
                above.
              </p>
            </div>
          ) : (
            <div className="destination-list">
              {destinations.map(
                (
                  destination,
                  index
                ) => {
                  const id =
                    getDestinationId(
                      destination
                    );

                  return (
                    <div
                      className="destination-item"
                      key={
                        id ||
                        `${getDestinationName(
                          destination
                        )}-${index}`
                      }
                    >
                      <div className="destination-number">
                        {index + 1}
                      </div>

                      <div className="destination-content">
                        <strong>
                          {getDestinationName(
                            destination
                          )}
                        </strong>

                        <span>
                          {displayValue(
                            getDestinationField(
                              destination,
                              "country",
                              "state"
                            )
                          )}
                        </span>
                      </div>

                      <div className="destination-actions">
                        <button
                          type="button"
                          onClick={() =>
                            moveDestination(
                              index,
                              -1
                            )
                          }
                          disabled={
                            index === 0 ||
                            reorderingId !==
                              null
                          }
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moveDestination(
                              index,
                              1
                            )
                          }
                          disabled={
                            index ===
                              destinations.length -
                                1 ||
                            reorderingId !==
                              null
                          }
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveDestination(
                              destination
                            )
                          }
                          disabled={
                            removingId ===
                            id
                          }
                        >
                          {removingId ===
                          id
                            ? "..."
                            : "×"}
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ROUTE SUMMARY */}

        <section className="route-result-card">
          <div>
            <span>
              ROUTE STATUS
            </span>

            <strong>
              {destinations.length >=
              2
                ? "Ready"
                : "Add another stop"}
            </strong>
          </div>

          <div>
            <span>
              DISTANCE
            </span>

            <strong>
              {formatDistance(
                distance
              )}
            </strong>
          </div>

          <div>
            <span>
              ESTIMATED TIME
            </span>

            <strong>
              {formatDuration(
                eta
              )}
            </strong>
          </div>

          <div>
            <span>
              STOPS
            </span>

            <strong>
              {destinations.length}
            </strong>
          </div>
        </section>

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
                  MODULE 6
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
                  MODULE 6
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