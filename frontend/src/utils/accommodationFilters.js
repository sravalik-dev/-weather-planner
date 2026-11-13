/* =========================================================
   ACCOMMODATION FILTERS

   Builds the JSON body for the EXISTING backend endpoint
       POST /api/accommodations/search
   (AccommodationSearchRequest.java). Option values are the exact strings
   the backend accepts (see AccommodationService beach/pool filter
   switch statements), so no filter can be silently ignored.

   No React in this file, so it can be tested on its own.
========================================================= */

export const ACCOMMODATION_TYPE_OPTIONS = [
  { value: "HOTEL", label: "Hotel" },
  { value: "BUDGET_HOTEL", label: "Budget hotel" },
  { value: "LUXURY_HOTEL", label: "Luxury hotel" },
  { value: "HOMESTAY", label: "Homestay" },
  { value: "RESORT", label: "Resort" },
  { value: "HOSTEL", label: "Hostel" },
];

/* beachFilter: ANY | BEACH_VIEW | BEACH_ACCESS | BEACHFRONT | SEA_VIEW |
                PARTIAL_SEA_VIEW | NEAR_BEACH */
export const BEACH_OPTIONS = [
  { value: "ANY", label: "Any" },
  { value: "BEACH_ACCESS", label: "Beach access" },
  { value: "BEACH_VIEW", label: "Beach view" },
  { value: "BEACHFRONT", label: "Beachfront" },
  { value: "NEAR_BEACH", label: "Near the beach" },
  { value: "SEA_VIEW", label: "Sea view" },
  { value: "PARTIAL_SEA_VIEW", label: "Partial sea view" },
];

/* poolFilter: ANY | POOL_REQUIRED | PRIVATE_POOL | OUTDOOR_POOL |
               INDOOR_POOL | INFINITY_POOL | KIDS_POOL */
export const POOL_OPTIONS = [
  { value: "ANY", label: "Any" },
  { value: "POOL_REQUIRED", label: "Has a swimming pool" },
  { value: "PRIVATE_POOL", label: "Private pool" },
  { value: "OUTDOOR_POOL", label: "Outdoor pool" },
  { value: "INDOOR_POOL", label: "Indoor pool" },
  { value: "INFINITY_POOL", label: "Infinity pool" },
  { value: "KIDS_POOL", label: "Kids pool" },
];

/* Boolean facilities sent as `true` only when ticked (null = no preference). */
export const FACILITY_OPTIONS = [
  { key: "familyFriendly", label: "Family-friendly" },
  { key: "accessibility", label: "Accessibility" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "parking", label: "Parking" },
  { key: "breakfastIncluded", label: "Breakfast included" },
  { key: "restaurant", label: "Restaurant" },
];

export const DEFAULT_ACC_FILTERS = {
  accommodationType: "",
  minPricePerNight: "",
  maxPricePerNight: "",
  beachFilter: "ANY",
  poolFilter: "ANY",
  familyFriendly: false,
  accessibility: false,
  wifi: false,
  parking: false,
  breakfastIncluded: false,
  restaurant: false,
  guests: "",
  checkInDate: "",
  checkOutDate: "",
  maxDistanceKm: "",
  destinationText: "",
  onlyThisDestination: false,
};

const label = (list, value) =>
  list.find((item) => item.value === value)?.label || value;

const isBlank = (value) => String(value ?? "").trim() === "";

/* Returns [{ level: "error" | "warning", message, field }]. Errors block
   Apply, mirroring (and pre-empting) the backend's own validation. */
export const validateAccFilters = (filters, { hasCoordinates } = {}) => {
  const issues = [];
  const add = (level, field, message) => issues.push({ level, field, message });

  const min = isBlank(filters.minPricePerNight) ? null : Number(filters.minPricePerNight);
  const max = isBlank(filters.maxPricePerNight) ? null : Number(filters.maxPricePerNight);

  if (min !== null && (!Number.isFinite(min) || min < 0)) {
    add("error", "minPricePerNight", "Minimum price must be 0 or more.");
  }
  if (max !== null && (!Number.isFinite(max) || max < 0)) {
    add("error", "maxPricePerNight", "Maximum price must be 0 or more.");
  }
  if (min !== null && max !== null && Number.isFinite(min) && Number.isFinite(max) && min > max) {
    add("error", "minPricePerNight", "Minimum price cannot be higher than maximum price.");
  }

  if (!isBlank(filters.guests)) {
    const guests = Number(filters.guests);
    if (!Number.isInteger(guests) || guests < 1) {
      add("error", "guests", "Guests must be a whole number of at least 1.");
    }
  }

  if (filters.checkInDate && filters.checkOutDate && filters.checkOutDate <= filters.checkInDate) {
    add("error", "checkOutDate", "Check-out date must be after the check-in date.");
  }
  if ((filters.checkInDate && !filters.checkOutDate) || (!filters.checkInDate && filters.checkOutDate)) {
    add("warning", "checkInDate", "Enter both check-in and check-out dates for the date filter to be used.");
  }

  if (!isBlank(filters.maxDistanceKm)) {
    const distance = Number(filters.maxDistanceKm);
    if (!Number.isFinite(distance) || distance <= 0) {
      add("error", "maxDistanceKm", "Maximum distance must be greater than 0 km.");
    } else if (!hasCoordinates) {
      add("error", "maxDistanceKm", "Choose a destination with a saved location to use the distance filter.");
    }
  }

  return issues;
};

/* Builds the request body. Only fields the user actually set are sent. */
export const buildSearchRequest = (filters, context = {}) => {
  const request = {};

  if (filters.accommodationType) request.accommodationType = filters.accommodationType;

  if (!isBlank(filters.minPricePerNight)) request.minPricePerNight = Number(filters.minPricePerNight);
  if (!isBlank(filters.maxPricePerNight)) request.maxPricePerNight = Number(filters.maxPricePerNight);

  if (filters.beachFilter && filters.beachFilter !== "ANY") request.beachFilter = filters.beachFilter;
  if (filters.poolFilter && filters.poolFilter !== "ANY") request.poolFilter = filters.poolFilter;

  FACILITY_OPTIONS.forEach(({ key }) => {
    if (filters[key]) request[key] = true;
  });

  if (!isBlank(filters.guests)) request.guests = Number(filters.guests);

  /* The backend uses both dates together. */
  if (filters.checkInDate && filters.checkOutDate) {
    request.checkInDate = filters.checkInDate;
    request.checkOutDate = filters.checkOutDate;
  }

  /* Distance is measured from the selected destination's coordinates. */
  if (context.latitude != null && context.longitude != null) {
    if (!isBlank(filters.maxDistanceKm)) {
      request.latitude = Number(context.latitude);
      request.longitude = Number(context.longitude);
      request.maxDistanceKm = Number(filters.maxDistanceKm);
    } else if (context.sendCoordinates) {
      /* coordinates alone make the backend return distanceKm for each hotel */
      request.latitude = Number(context.latitude);
      request.longitude = Number(context.longitude);
    }
  }

  /* Typed destination text wins; otherwise the selected trip destination
     when "only this destination" is ticked. Backend does a contains match. */
  const typed = String(filters.destinationText || "").trim();
  if (typed) {
    request.destination = typed;
  } else if (filters.onlyThisDestination && context.destinationName) {
    request.destination = context.destinationName;
  }
  if (context.tripId) request.tripId = Number(context.tripId);

  return request;
};

/* Chips describing what is selected right now. */
export const getActiveAccFilters = (filters) => {
  const chips = [];
  const push = (key, name, value) => chips.push({ key, label: name, value });

  if (filters.accommodationType) {
    push("accommodationType", "Type", label(ACCOMMODATION_TYPE_OPTIONS, filters.accommodationType));
  }
  if (!isBlank(filters.minPricePerNight)) push("minPricePerNight", "Min price", `₹${filters.minPricePerNight}`);
  if (!isBlank(filters.maxPricePerNight)) push("maxPricePerNight", "Max price", `₹${filters.maxPricePerNight}`);
  if (filters.beachFilter !== "ANY") push("beachFilter", "Beach", label(BEACH_OPTIONS, filters.beachFilter));
  if (filters.poolFilter !== "ANY") push("poolFilter", "Pool", label(POOL_OPTIONS, filters.poolFilter));
  FACILITY_OPTIONS.forEach(({ key, label: name }) => {
    if (filters[key]) push(key, name, "Yes");
  });
  if (!isBlank(filters.guests)) push("guests", "Guests", filters.guests);
  if (filters.checkInDate && filters.checkOutDate) {
    push("checkInDate", "Dates", `${filters.checkInDate} → ${filters.checkOutDate}`);
  }
  if (!isBlank(filters.maxDistanceKm)) push("maxDistanceKm", "Within", `${filters.maxDistanceKm} km`);
  if (!isBlank(filters.destinationText)) push("destinationText", "Destination", filters.destinationText.trim());
  if (filters.onlyThisDestination && isBlank(filters.destinationText)) push("onlyThisDestination", "Destination", "Only this destination");
  return chips;
};

/* Removing a chip resets that filter (the date chip clears both dates). */
export const clearAccFilter = (filters, key) => {
  const next = { ...filters };
  if (key === "checkInDate") {
    next.checkInDate = "";
    next.checkOutDate = "";
  } else {
    next[key] = DEFAULT_ACC_FILTERS[key];
  }
  return next;
};

/* The backend answers 400 when a valid search simply has no matches. */
export const isNoMatchError = (error) => {
  const text = String(error?.message || "").toLowerCase();
  return (
    text.includes("no accommodation") ||
    text.includes("no matching") ||
    text.includes("does not match") ||
    text.includes("no accommodations")
  );
};

export const SORT_OPTIONS = [
  { value: "best", label: "Best match" },
  { value: "rating", label: "Rating: high to low" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "distance", label: "Nearest first" },
];

/* Sorting only reorders the results; it never removes any. */
export const sortAccommodations = (list, mode) => {
  const num = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && value !== null && value !== "" ? n : fallback;
  };
  const items = [...list];
  switch (mode) {
    case "rating":
      return items.sort((a, b) => num(b.rating, -1) - num(a.rating, -1));
    case "priceAsc":
      return items.sort((a, b) => num(a.pricePerNight, Infinity) - num(b.pricePerNight, Infinity));
    case "priceDesc":
      return items.sort((a, b) => num(b.pricePerNight, -1) - num(a.pricePerNight, -1));
    case "distance":
      return items.sort((a, b) => num(a.distanceKm, Infinity) - num(b.distanceKm, Infinity));
    default:
      return items.sort((a, b) => num(b.matchScore, 0) - num(a.matchScore, 0));
  }
};
