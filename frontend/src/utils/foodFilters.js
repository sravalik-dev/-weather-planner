/* =========================================================
   FOOD FILTERS - single source of truth for the Food & Dining page.

   Every option VALUE below is the exact enum name (or keyword) that the
   backend understands (see FoodRecommendationService.java and the enums
   FoodType, FoodCategory, MealPeriod, SpiceLevel, FoodPlaceType). The
   backend silently ignores values it cannot parse, so sending a wrong
   value would make a filter "do nothing". Using fixed option lists
   guarantees the value always matches.

   This file has no React code so it can be unit-tested on its own.
========================================================= */

/* ---------------- Recommendation types ---------------- */

export const RECOMMENDATION_TYPES = [
  { value: "ALL", label: "All", icon: "✨", kind: "mixed" },
  { value: "LOCAL_FOOD", label: "Local Food", icon: "🍛", kind: "dish" },
  { value: "TRADITIONAL_DISH", label: "Traditional Dishes", icon: "🥘", kind: "dish" },
  { value: "NEARBY_FOOD", label: "Nearby Food", icon: "📍", kind: "place" },
  { value: "MEAL_TIME", label: "Meal Time", icon: "🕒", kind: "mixed" },
  { value: "FOOD_PREFERENCE", label: "Food Preference", icon: "❤️", kind: "mixed" },
  { value: "DIETARY", label: "Dietary", icon: "🥗", kind: "mixed" },
  { value: "BUDGET", label: "Budget", icon: "💰", kind: "mixed" },
  { value: "POPULAR_LOCAL_FOOD", label: "Popular Local Food", icon: "⭐", kind: "mixed" },
  { value: "FOOD_PLACE", label: "Food Places", icon: "🏪", kind: "place" },
  { value: "BAR", label: "Bars", icon: "🍹", kind: "place" },
  { value: "RESTROBAR", label: "Restrobars", icon: "🍸", kind: "place" },
  { value: "FOOD_AND_BEVERAGE", label: "Food + Beverage", icon: "🍽️", kind: "place" },
];

/* "dish"  -> backend returns only Food records
   "place" -> backend returns only FoodPlace records
   "mixed" -> both */
export const getTypeKind = (type) =>
  RECOMMENDATION_TYPES.find((item) => item.value === type)?.kind || "mixed";

export const getTypeLabel = (type) =>
  RECOMMENDATION_TYPES.find((item) => item.value === type)?.label || type;

/* ---------------- Option lists (value = backend enum) ---------------- */

export const FOOD_TYPE_OPTIONS = [
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "NON_VEGETARIAN", label: "Non-vegetarian" },
  { value: "VEGAN", label: "Vegan" },
  { value: "EGG_FREE", label: "Egg-free" },
  { value: "DAIRY_FREE", label: "Dairy-free" },
  { value: "GLUTEN_FREE", label: "Gluten-free" },
  { value: "OTHER", label: "Other" },
];

export const CATEGORY_OPTIONS = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
  { value: "DESSERT", label: "Dessert" },
  { value: "STREET_FOOD", label: "Street food" },
  { value: "TRADITIONAL_SPECIALTY", label: "Traditional specialty" },
  { value: "BEVERAGE", label: "Beverage" },
];

export const MEAL_PERIOD_OPTIONS = [
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "NIGHT", label: "Night" },
];

export const SPICE_LEVEL_OPTIONS = [
  { value: "MILD", label: "Mild" },
  { value: "MEDIUM", label: "Medium" },
  { value: "SPICY", label: "Spicy" },
];

/* The backend matches these keywords (see matchesDietaryPreference). */
export const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "egg-free", label: "Egg-free" },
  { value: "dairy-free", label: "Dairy-free" },
  { value: "gluten-free", label: "Gluten-free" },
];

/* Backend matchesBudget(): low <= 500, mid 500-1500, high > 1500 (INR). */
export const BUDGET_OPTIONS = [
  { value: "low", label: "Budget (up to ₹500)" },
  { value: "medium", label: "Mid-range (₹500 – ₹1,500)" },
  { value: "high", label: "Premium (above ₹1,500)" },
];

export const PLACE_TYPE_OPTIONS = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CAFE", label: "Café" },
  { value: "STREET_FOOD", label: "Street food" },
  { value: "FOOD_STALL", label: "Food stall" },
  { value: "BAR", label: "Bar" },
  { value: "PUB", label: "Pub" },
  { value: "BREWPUB", label: "Brewpub" },
  { value: "LOUNGE", label: "Lounge" },
  { value: "RESTROBAR", label: "Restrobar" },
  { value: "RESTAURANT_WITH_BAR", label: "Restaurant with bar" },
];

const BAR_PLACE_TYPES = ["BAR", "PUB", "BREWPUB", "LOUNGE"];
const RESTROBAR_PLACE_TYPES = ["RESTROBAR", "RESTAURANT_WITH_BAR"];

/* Backend rule (isAllowedOptionalEstablishment): bars and restrobars are
   returned only when the matching include flag is true. */
export const placeTypeNeedsBars = (value) => BAR_PLACE_TYPES.includes(value);
export const placeTypeNeedsRestrobars = (value) =>
  RESTROBAR_PLACE_TYPES.includes(value);

/* Place types that make sense for the selected recommendation type. */
export const getPlaceTypeOptions = (type) => {
  if (type === "BAR") {
    return PLACE_TYPE_OPTIONS.filter((o) => BAR_PLACE_TYPES.includes(o.value));
  }
  if (type === "RESTROBAR") {
    return PLACE_TYPE_OPTIONS.filter((o) =>
      RESTROBAR_PLACE_TYPES.includes(o.value)
    );
  }
  return PLACE_TYPE_OPTIONS;
};

/* ---------------- Defaults ---------------- */

export const DEFAULT_FILTERS = {
  foodType: "",
  category: "",
  mealPeriod: "",
  cuisine: "",
  spiceLevel: "",
  dietaryPreference: "",
  foodPreference: "",
  budgetRange: "",
  maxDistanceKm: "",
  placeType: "",
  includeBars: false,
  includeRestrobars: false,
  includeLocalDrinks: false,
  includeFoodAndBeverage: false,
};

export const FILTER_LABELS = {
  foodType: "Food type",
  category: "Category",
  mealPeriod: "Meal period",
  cuisine: "Cuisine",
  spiceLevel: "Spice level",
  dietaryPreference: "Dietary",
  foodPreference: "Preference",
  budgetRange: "Budget",
  maxDistanceKm: "Max distance",
  placeType: "Place type",
  includeBars: "Bars included",
  includeRestrobars: "Restrobars included",
  includeLocalDrinks: "Local drinks",
  includeFoodAndBeverage: "Food + Beverage",
};

const OPTION_SOURCES = {
  foodType: FOOD_TYPE_OPTIONS,
  category: CATEGORY_OPTIONS,
  mealPeriod: MEAL_PERIOD_OPTIONS,
  spiceLevel: SPICE_LEVEL_OPTIONS,
  dietaryPreference: DIETARY_OPTIONS,
  budgetRange: BUDGET_OPTIONS,
  placeType: PLACE_TYPE_OPTIONS,
};

const displayValue = (key, value) => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "maxDistanceKm") return `${value} km`;
  const option = OPTION_SOURCES[key]?.find((item) => item.value === value);
  return option ? option.label : String(value);
};

/* ---------------- Which filters apply to which result kind ---------------- */

/* Returns { key: { enabled, reason } } for every filter control. A control
   that cannot affect the chosen result type is disabled with a reason, so
   no selected filter is ever silently ignored. */
export const getApplicability = (type) => {
  const kind = getTypeKind(type);
  const dishOnly = "Applies to dishes only. Choose a dish or mixed type.";
  const placeOnly = "Applies to food places only. Choose a place or mixed type.";

  const result = {};
  const set = (key, enabled, reason = "") => {
    result[key] = { enabled, reason: enabled ? "" : reason };
  };

  set("foodType", kind !== "place", dishOnly);
  set("category", kind !== "place", dishOnly);
  set("spiceLevel", kind !== "place", dishOnly);
  set("mealPeriod", kind !== "place", dishOnly);

  set("placeType", kind !== "dish", placeOnly);
  set("maxDistanceKm", kind !== "dish", placeOnly);
  set("includeBars", kind !== "dish", placeOnly);
  set("includeRestrobars", kind !== "dish", placeOnly);
  set("includeFoodAndBeverage", kind !== "dish", placeOnly);
  set(
    "includeLocalDrinks",
    type === "FOOD_AND_BEVERAGE",
    "Local drinks are used with Food + Beverage."
  );

  set("cuisine", true);
  set("dietaryPreference", true);
  set("foodPreference", true);
  set("budgetRange", true);

  return result;
};

/* ---------------- Keeping controls consistent ---------------- */

/* Applies the cross-filter rules after any change and returns the new
   { filters, type } plus human-readable notices describing automatic
   adjustments (so the user always knows what changed and why). */
export const reconcile = (filters, type, changedKey = "") => {
  const next = { ...filters };
  let nextType = type;
  const notices = [];

  /* The chosen result type forces its opt-in switch. */
  if (changedKey === "type") {
    if (nextType === "BAR" && !next.includeBars) {
      next.includeBars = true;
      notices.push("“Include Bars” was turned on because you chose Bars.");
    }
    if (nextType === "RESTROBAR" && !next.includeRestrobars) {
      next.includeRestrobars = true;
      notices.push(
        "“Include Restrobars” was turned on because you chose Restrobars."
      );
    }
    if (nextType === "FOOD_AND_BEVERAGE" && !next.includeFoodAndBeverage) {
      next.includeFoodAndBeverage = true;
    }
    if (nextType !== "FOOD_AND_BEVERAGE") {
      if (next.includeFoodAndBeverage) next.includeFoodAndBeverage = false;
      if (next.includeLocalDrinks) {
        next.includeLocalDrinks = false;
        notices.push("Local drinks only work with Food + Beverage, so it was turned off.");
      }
    }
  }

  /* Opt-in switches steer the result type. */
  if (changedKey === "includeBars" && !next.includeBars && nextType === "BAR") {
    nextType = "FOOD_PLACE";
    notices.push("Result type changed to Food Places because Bars are no longer included.");
  }
  if (
    changedKey === "includeRestrobars" &&
    !next.includeRestrobars &&
    nextType === "RESTROBAR"
  ) {
    nextType = "FOOD_PLACE";
    notices.push(
      "Result type changed to Food Places because Restrobars are no longer included."
    );
  }
  if (changedKey === "includeFoodAndBeverage") {
    if (next.includeFoodAndBeverage) {
      nextType = "FOOD_AND_BEVERAGE";
      notices.push("Result type changed to Food + Beverage.");
    } else if (nextType === "FOOD_AND_BEVERAGE") {
      nextType = "FOOD_PLACE";
      next.includeLocalDrinks = false;
      notices.push("Result type changed to Food Places.");
    }
  }
  if (changedKey === "includeLocalDrinks" && next.includeLocalDrinks) {
    nextType = "FOOD_AND_BEVERAGE";
    next.includeFoodAndBeverage = true;
  }

  /* A bar/restrobar place type needs the matching include switch. */
  if (changedKey === "placeType") {
    if (placeTypeNeedsBars(next.placeType) && !next.includeBars) {
      next.includeBars = true;
      notices.push("“Include Bars” was turned on because that place type is a bar.");
    }
    if (placeTypeNeedsRestrobars(next.placeType) && !next.includeRestrobars) {
      next.includeRestrobars = true;
      notices.push(
        "“Include Restrobars” was turned on because that place type is a restrobar."
      );
    }
  }

  /* Place type must be valid for the chosen type. */
  if (
    next.placeType &&
    !getPlaceTypeOptions(nextType).some((o) => o.value === next.placeType)
  ) {
    next.placeType = "";
    notices.push("Place type was cleared because it does not match the chosen result type.");
  }

  return { filters: next, type: nextType, notices };
};

/* ---------------- Validation ---------------- */

const DIETARY_ALLOWED_FOOD_TYPES = {
  vegetarian: ["VEGETARIAN"],
  vegan: ["VEGAN"],
  "egg-free": ["EGG_FREE", "VEGAN"],
  "dairy-free": ["DAIRY_FREE", "VEGAN"],
  "gluten-free": ["GLUTEN_FREE", "VEGAN"],
};

/* Returns [{ level: "error" | "warning", message }]. Errors block Apply. */
export const validateFilters = (filters, type) => {
  const issues = [];
  const kind = getTypeKind(type);

  const distanceText = String(filters.maxDistanceKm ?? "").trim();
  if (distanceText) {
    const distance = Number(distanceText);
    if (!Number.isFinite(distance) || distance <= 0) {
      issues.push({
        level: "error",
        message: "Maximum distance must be a number greater than 0.",
      });
    } else if (distance > 50) {
      issues.push({
        level: "error",
        message: "Maximum distance cannot be more than 50 km.",
      });
    } else if (type === "NEARBY_FOOD" && distance > 5) {
      issues.push({
        level: "warning",
        message: "Nearby Food only returns places within 5 km, so larger distances have no extra effect.",
      });
    }
  }

  if (String(filters.cuisine || "").length > 60) {
    issues.push({ level: "error", message: "Cuisine is too long (60 characters max)." });
  }
  if (String(filters.foodPreference || "").length > 80) {
    issues.push({ level: "error", message: "Food preference is too long (80 characters max)." });
  }

  if (kind === "dish" || kind === "mixed") {
    const allowed = DIETARY_ALLOWED_FOOD_TYPES[filters.dietaryPreference];
    if (filters.foodType && allowed && !allowed.includes(filters.foodType)) {
      issues.push({
        level: kind === "dish" ? "error" : "warning",
        message:
          kind === "dish"
            ? "The selected Food type and Dietary preference cannot both be true, so no dish could match. Change one of them."
            : "The selected Food type and Dietary preference conflict, so no dishes will match. Only food places can appear.",
      });
    }
  }

  if (
    type === "TRADITIONAL_DISH" &&
    filters.category &&
    filters.category !== "TRADITIONAL_SPECIALTY"
  ) {
    issues.push({
      level: "error",
      message:
        "Traditional Dishes only includes the “Traditional specialty” category. Clear Category or choose another result type.",
    });
  }

  return issues;
};

/* ---------------- Active filters (for the chips) ---------------- */

/* Only filters that apply to the chosen type and have a value. */
export const getActiveFilters = (filters, type) => {
  const applicability = getApplicability(type);
  const active = [];

  Object.keys(DEFAULT_FILTERS).forEach((key) => {
    if (!applicability[key]?.enabled) return;
    const value = filters[key];
    const isOn = typeof DEFAULT_FILTERS[key] === "boolean" ? value === true : String(value ?? "").trim() !== "";
    if (!isOn) return;
    /* The Food + Beverage switch is already visible as the result type. */
    if (key === "includeFoodAndBeverage") return;
    active.push({
      key,
      label: FILTER_LABELS[key],
      value: displayValue(key, typeof value === "string" ? value.trim() : value),
    });
  });

  return active;
};

/* ---------------- Request payload ---------------- */

/* Builds the body for POST /api/food-recommendations/trips/{id}/generate.
   Only filters that apply to the result type are sent, and only when set. */
export const buildFoodRequest = ({
  filters,
  type,
  destinationId,
  plannedDate,
  plannedTime,
}) => {
  const applicability = getApplicability(type);
  const request = {
    destinationId: Number(destinationId),
    plannedDate,
    plannedTime,
    recommendationType: type,
    includeBars: Boolean(applicability.includeBars.enabled && filters.includeBars),
    includeRestrobars: Boolean(
      applicability.includeRestrobars.enabled && filters.includeRestrobars
    ),
    includeLocalDrinks: Boolean(
      applicability.includeLocalDrinks.enabled && filters.includeLocalDrinks
    ),
    includeFoodAndBeverage: type === "FOOD_AND_BEVERAGE",
  };

  [
    "foodType",
    "category",
    "mealPeriod",
    "cuisine",
    "spiceLevel",
    "dietaryPreference",
    "foodPreference",
    "budgetRange",
    "placeType",
  ].forEach((key) => {
    if (!applicability[key].enabled) return;
    const text = String(filters[key] ?? "").trim();
    if (text) request[key] = text;
  });

  if (applicability.maxDistanceKm.enabled) {
    const distance = Number(String(filters.maxDistanceKm ?? "").trim());
    if (Number.isFinite(distance) && distance > 0) {
      request.maxDistanceKm = distance;
    }
  }

  return request;
};

/* ---------------- OpenStreetMap (external) results ---------------- */

/* When the destination has no stored food data, the backend returns live
   OpenStreetMap places. Those only carry: name, category (amenity type),
   cuisine tag (sometimes), address, distance and opening hours text. The
   backend applies ONLY the distance limit to them. Everything below is
   done on the data that is actually present; filters that cannot be
   verified are reported, never pretended. */
const OSM_PLACE_TYPE_TO_CATEGORY = {
  RESTAURANT: "restaurant",
  CAFE: "cafe",
};

export const applyExternalFilters = (items, filters, type) => {
  const applicability = getApplicability(type);
  const active = getActiveFilters(filters, type);
  let result = [...items];
  const applied = [];
  const notVerified = [];
  let hiddenForMissingData = 0;

  active.forEach(({ key, label, value }) => {
    if (key === "maxDistanceKm") {
      applied.push({ label, value, how: "applied by the server" });
      return;
    }

    if (key === "cuisine" && applicability.cuisine.enabled) {
      const wanted = String(filters.cuisine).trim().toLowerCase();
      const before = result.length;
      result = result.filter((item) =>
        String(item.cuisine || "").toLowerCase().includes(wanted)
      );
      hiddenForMissingData += before - result.length;
      applied.push({
        label,
        value,
        how: "matched against the cuisine tag on OpenStreetMap",
      });
      return;
    }

    if (key === "placeType" && OSM_PLACE_TYPE_TO_CATEGORY[filters.placeType]) {
      const wanted = OSM_PLACE_TYPE_TO_CATEGORY[filters.placeType];
      result = result.filter(
        (item) => String(item.category || "").toLowerCase() === wanted
      );
      applied.push({ label, value, how: "matched against the place category" });
      return;
    }

    notVerified.push({ label, value });
  });

  return { items: result, applied, notVerified, hiddenForMissingData };
};

export const isExternalResult = (items) =>
  Array.isArray(items) &&
  items.length > 0 &&
  items.every((item) => item?.externalPlace === true);
