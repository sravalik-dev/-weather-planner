import { getNamedLocation } from "./apiUtils";

const formatDisplayName = (city, admin1) => {
  const name = String(city || "").trim();
  const region = String(admin1 || "").trim();
  if (name && region && name.toLowerCase() !== region.toLowerCase()) {
    return `${name}, ${region}`;
  }
  return name || region || "";
};

export const resolveLocationName = async (latitude, longitude) => {
  try {
    const data = await getNamedLocation(latitude, longitude);
    const display = String(data?.displayName || "").trim();
    if (display) return display;
    const fallback = formatDisplayName(data?.city, data?.admin1);
    if (fallback) return fallback;
  } catch {
    /* try public geocoder next */
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&language=en&format=json`
    );
    if (response.ok) {
      const data = await response.json();
      const first = Array.isArray(data?.results) ? data.results[0] : null;
      const display = formatDisplayName(first?.name, first?.admin1 || first?.admin2);
      if (display) return display;
    }
  } catch {
    /* no fake location */
  }

  return "";
};