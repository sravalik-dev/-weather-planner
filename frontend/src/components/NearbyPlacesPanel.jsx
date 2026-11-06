import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../utils/apiUtils";

const getCoordinates = (destination) => {
  if (!destination) return null;

  const latitude = Number(destination.latitude ?? destination.lat);
  const longitude = Number(
    destination.longitude ?? destination.lon ?? destination.lng
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) return null;

  return { latitude, longitude };
};

const formatDistance = (meters) => {
  const value = Number(meters || 0);
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} km away`
    : `${Math.round(value)} m away`;
};

const fallbackImage = (type) =>
  type === "food"
    ? "https://placehold.co/640x400?text=Food+Place"
    : "https://placehold.co/640x400?text=Accommodation";

export default function NearbyPlacesPanel({
  type = "food",
  selectedDestination = null,
}) {
  const isFood = type === "food";
  const endpoint = isFood ? "/foods/nearby" : "/accommodations/nearby";

  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [places, setPlaces] = useState([]);
  const [radius, setRadius] = useState(isFood ? 3000 : 5000);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageErrors, setImageErrors] = useState({});

  const requestIdRef = useRef(0);
  const destinationCoordinates = useMemo(
    () => getCoordinates(selectedDestination),
    [
      selectedDestination?.latitude,
      selectedDestination?.longitude,
      selectedDestination?.lat,
      selectedDestination?.lon,
      selectedDestination?.lng,
    ]
  );

  const searchPlaces = useCallback(async (
    coordinates,
    selectedRadius = radius,
    selectedCategory = category
  ) => {
    if (!coordinates) {
      setError("Location coordinates are missing. Select a trip destination or use GPS.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        latitude: String(coordinates.latitude),
        longitude: String(coordinates.longitude),
        radius: String(selectedRadius),
        category: String(selectedCategory || "all").trim().toLowerCase(),
      });

      const result = await apiRequest(`${endpoint}?${params.toString()}`);
      const data = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.places)
            ? result.places
            : Array.isArray(result?.content)
              ? result.content
              : [];

      if (requestId !== requestIdRef.current) return;

      setPlaces(data);
      setLocation(coordinates);
      setImageErrors({});

      if (!data.length) {
        setError("No mapped places were found within this radius. Try 10 km or another location.");
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const message = err?.message || "Nearby search failed.";
      setError(`${message} Check that the backend is running and try again.`);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [endpoint, radius, category]);

  const useCurrentLocation = () => {
    setError("");

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setError("Browser location requires HTTPS or localhost.");
      return;
    }

    if (!navigator.geolocation) {
      setError("This browser does not support location detection.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocationLabel("Your current location");
        searchPlaces(coordinates);
      },
      (geoError) => {
        setLoading(false);
        if (geoError.code === 1) {
          setError("Location permission denied. Allow location access for localhost in your browser settings.");
        } else if (geoError.code === 2) {
          setError("Your current location is unavailable. Check device location services.");
        } else if (geoError.code === 3) {
          setError("GPS request timed out. Try again or use the trip destination.");
        } else {
          setError("Unable to detect your current location.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 25000,
        maximumAge: 120000,
      }
    );
  };

  const useTripDestination = () => {
    if (!destinationCoordinates) {
      setError("The selected trip destination does not have valid saved latitude and longitude.");
      return;
    }
    setLocationLabel(
      selectedDestination?.destinationName ||
      selectedDestination?.name ||
      "Selected trip destination"
    );
    searchPlaces(destinationCoordinates);
  };

  useEffect(() => {
    if (!destinationCoordinates) return;
    setLocationLabel(
      selectedDestination?.destinationName ||
      selectedDestination?.name ||
      "Selected trip destination"
    );
    searchPlaces(destinationCoordinates);
    // The coordinate pair is the trigger; searchPlaces is intentionally kept stable
    // for the current filters by the effect's explicit dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationCoordinates?.latitude, destinationCoordinates?.longitude]);

  const categories = isFood
    ? [["all", "All food"], ["restaurant", "Restaurants"], ["cafe", "Cafés"],
       ["bakery", "Bakeries"], ["fast_food", "Fast food"]]
    : [["all", "All stays"], ["hotel", "Hotels"], ["resort", "Resorts"],
       ["hostel", "Hostels"], ["guest_house", "Guest houses"],
       ["apartment", "Apartments"]];

  const handleCategoryChange = (value) => {
    setCategory(value);
    if (location) searchPlaces(location, radius, value);
  };

  const handleRadiusChange = (value) => {
    const nextRadius = Number(value);
    setRadius(nextRadius);
    if (location) searchPlaces(location, nextRadius, category);
  };

  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>Nearby {isFood ? "Food Places" : "Accommodation"}</h2>
        <p style={styles.subtitle}>
          Find places around your GPS location or selected trip destination.
        </p>
      </div>

      <div style={styles.locationActions}>
        <button type="button" style={styles.primaryButton}
          onClick={useCurrentLocation} disabled={loading}>
          {loading ? "Searching..." : "Use My Current Location"}
        </button>
        <button type="button" style={styles.secondaryButton}
          onClick={useTripDestination} disabled={loading || !destinationCoordinates}>
          Use Trip Destination
        </button>
      </div>

      {locationLabel && (
        <p style={styles.locationText}>Searching around: <strong>{locationLabel}</strong></p>
      )}

      <div style={styles.filters}>
        <label style={styles.filterLabel}>
          Category
          <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} style={styles.select}>
            {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label style={styles.filterLabel}>
          Search radius
          <select value={radius} onChange={(e) => handleRadiusChange(e.target.value)} style={styles.select}>
            <option value={1000}>1 km</option>
            <option value={3000}>3 km</option>
            <option value={5000}>5 km</option>
            <option value={10000}>10 km</option>
          </select>
        </label>
      </div>

      {loading && <p style={styles.message}>Finding nearby places...</p>}
      {error && <p role="alert" style={styles.error}>{error}</p>}
      {!location && !loading && (
        <p style={styles.message}>Choose your current location or a trip destination to begin.</p>
      )}

      <div style={styles.grid}>
        {places.map((place) => {
          const key = `${place.osmType}-${place.osmId}`;
          const imageUrl = place.imageUrl && !imageErrors[key]
            ? place.imageUrl : fallbackImage(type);

          return (
            <article key={key} style={styles.card}>
              <img src={imageUrl} alt={place.name || "Nearby place"} loading="lazy"
                onError={() => setImageErrors((old) => ({ ...old, [key]: true }))}
                style={styles.image} />
              <div style={styles.cardBody}>
                <h3 style={styles.placeName}>{place.name}</h3>
                <p style={styles.category}>{String(place.category || type).replaceAll("_", " ")}</p>
                <p style={styles.detail}><strong>Distance:</strong> {formatDistance(place.distanceMeters)}</p>
                {place.address && <p style={styles.detail}>{place.address}</p>}
                {place.phone && <p style={styles.detail}><strong>Phone:</strong> <a href={`tel:${place.phone}`}>{place.phone}</a></p>}
                {place.openingHours && <p style={styles.detail}><strong>Hours:</strong> {place.openingHours}</p>}
                {place.cuisine && <p style={styles.detail}><strong>Cuisine:</strong> {place.cuisine}</p>}
                {!isFood && <p style={styles.availability}>Room availability: Not verified by OpenStreetMap</p>}
                <div style={styles.links}>
                  {place.website && <a href={place.website} target="_blank" rel="noreferrer">Website</a>}
                  {place.bookingUrl && <a href={place.bookingUrl} target="_blank" rel="noreferrer">Booking / Contact</a>}
                  {Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude)) && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Route in Google Maps
                    </a>
                  )}
                </div>
                <small style={styles.source}>Source: {place.source || "OpenStreetMap"}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const styles = {
  panel: { width: "100%", marginTop: 24 },
  header: { marginBottom: 16 },
  title: { margin: 0, fontSize: 23, fontWeight: 800 },
  subtitle: { margin: "7px 0 0", opacity: 0.7, fontSize: 13 },
  locationActions: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  primaryButton: { border: 0, borderRadius: 10, padding: "11px 16px", background: "#2459d3", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { border: "1px solid #cbd5e1", borderRadius: 10, padding: "11px 16px", background: "#fff", color: "#172033", fontWeight: 700, cursor: "pointer" },
  locationText: { fontSize: 13, margin: "10px 0" },
  filters: { display: "flex", flexWrap: "wrap", gap: 14, margin: "16px 0" },
  filterLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 },
  select: { minWidth: 160, padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(245px, 1fr))", gap: 16 },
  card: { overflow: "hidden", border: "1px solid rgba(100, 116, 139, .22)", borderRadius: 14, background: "#fff" },
  image: { width: "100%", height: 165, objectFit: "cover", background: "#e8edf4" },
  cardBody: { padding: 14 },
  placeName: { margin: "0 0 6px", fontSize: 17 },
  category: { margin: "0 0 10px", textTransform: "capitalize", color: "#52627a", fontSize: 12 },
  detail: { fontSize: 12, lineHeight: 1.5, margin: "6px 0", overflowWrap: "anywhere" },
  availability: { fontSize: 12, fontWeight: 700, color: "#805b12" },
  links: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, fontSize: 12, fontWeight: 700 },
  source: { display: "block", marginTop: 12, color: "#64748b", fontSize: 10 },
  message: { padding: 14, background: "#f1f5f9", borderRadius: 10, fontSize: 13 },
  error: { padding: 12, background: "#fff1f2", color: "#be123c", borderRadius: 10, fontSize: 13 },
};
