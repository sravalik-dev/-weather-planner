
import { useEffect, useState } from "react";
import "../styles/WeatherMonitoring.css";

import {
  API_BASE_URL,
  getCurrentWeather,
} from "../utils/apiUtils";

import WeatherLocationMap from "./WeatherLocationMap";

const DEFAULT_LATITUDE = 16.3067;
const DEFAULT_LONGITUDE = 80.4365;

const formatValue = (value, suffix = "") => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return `${value}${suffix}`;
};

const getWeatherIcon = (code) => {
  if (code === null || code === undefined) return "🌤️";
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌤️";
};

const MetricCard = ({ icon, label, value, description }) => (
  <article className="wm-metric-card">
    <div className="wm-metric-icon">{icon}</div>
    <div className="wm-metric-content">
      <span className="wm-metric-label">{label}</span>
      <strong className="wm-metric-value">{value}</strong>
      {description && (
        <small className="wm-metric-description">
          {description}
        </small>
      )}
    </div>
  </article>
);

const SectionCard = ({
  title,
  icon,
  children,
  className = "",
}) => (
  <section className={`wm-section-card ${className}`}>
    <div className="wm-section-heading">
      <div className="wm-section-title">
        <span className="wm-section-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
        </div>
      </div>
    </div>
    {children}
  </section>
);

async function fetchWeatherLocation(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Location request failed (${response.status})`
    );
  }

  return response.json();
}

function WeatherMonitoring() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [weather, setWeather] = useState(null);

  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [locationName, setLocationName] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [mapPosition, setMapPosition] = useState({
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
  });

  // Load weather for the supplied coordinates.
  const loadWeather = async (customLatitude, customLongitude) => {
    const lat = Number(customLatitude);
    const lon = Number(customLongitude);

    if (
      customLatitude === "" ||
      customLongitude === "" ||
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90
    ) {
      setError("Please select a valid location.");
      return;
    }

    if (
      !Number.isFinite(lon) ||
      lon < -180 ||
      lon > 180
    ) {
      setError("Please enter a valid longitude between -180 and 180.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await getCurrentWeather(lat, lon);

      if (!data || typeof data !== "object") {
        throw new Error("The weather API returned an invalid response.");
      }

      setWeather(data);
      setSuccessMessage(
        "Weather updated successfully for the selected location."
      );
    } catch (err) {
      console.error("Weather monitoring error:", err);
      setWeather(null);
      setError(err?.message || "Unable to load current weather.");
    } finally {
      setLoading(false);
    }
  };

  // Convert coordinates into a readable location name.
  const identifyLocation = async (lat, lon) => {
    try {
      const location = await fetchWeatherLocation(
        `/weather/location?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`
      );

      const name =
        location?.displayName ||
        location?.city ||
        location?.name ||
        location?.country ||
        "Selected Location";

      setLocationName(name);
      setSelectedLocation(location);

      return location;
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      setLocationName("Selected Location");
      setSelectedLocation(null);
      return null;
    }
  };

  // Detect device location.
  const detectDeviceLocation = () => {
    setError("");
    setSuccessMessage("");

    if (!navigator.geolocation) {
      setDetectingLocation(false);
      setError(
        "Your browser does not support location detection. Search for a destination instead."
      );
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setLatitude(String(lat));
        setLongitude(String(lon));

        setMapPosition({
          latitude: lat,
          longitude: lon,
        });

        setLocationName("Your Current Location");

        await identifyLocation(lat, lon);
        await loadWeather(lat, lon);

        setDetectingLocation(false);
      },
      (geoError) => {
        console.error("Device location error:", geoError);

        setDetectingLocation(false);

        if (geoError.code === 1) {
          setError(
            "Location permission was denied. Allow location access in your browser or search for a destination."
          );
        } else if (geoError.code === 2) {
          setError(
            "Your current location is unavailable. Please search for a destination."
          );
        } else if (geoError.code === 3) {
          setError(
            "Location detection timed out. Please try again or search for a destination."
          );
        } else {
          setError(
            "Unable to detect your location. Please search for a destination."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  // Automatically detect location when this page opens.
  useEffect(() => {
    detectDeviceLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search for a destination.
  const searchLocations = async () => {
    const searchText = locationName.trim();

    if (!searchText) {
      setError("Please enter a destination name.");
      return;
    }

    setSearchingLocation(true);
    setError("");
    setSuccessMessage("");
    setLocationResults([]);

    try {
      const results = await fetchWeatherLocation(
        `/weather/search?name=${encodeURIComponent(searchText)}`
      );

      const locations = Array.isArray(results)
        ? results
        : results?.results || [];

      setLocationResults(locations);

      if (locations.length === 0) {
        setError("No locations found. Try another destination.");
      }
    } catch (err) {
      console.error("Location search error:", err);
      setError(err?.message || "Unable to search locations.");
    } finally {
      setSearchingLocation(false);
    }
  };

  // Select a search result.
  const selectLocation = async (location) => {
    const lat = Number(location.latitude);
    const lon = Number(location.longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      setError("Invalid coordinates received for this location.");
      return;
    }

    setLatitude(String(lat));
    setLongitude(String(lon));

    setMapPosition({
      latitude: lat,
      longitude: lon,
    });

    setSelectedLocation(location);

    const name =
      location.displayName ||
      location.name ||
      location.city ||
      location.country ||
      "Selected Location";

    setLocationName(name);
    setLocationResults([]);

    await loadWeather(lat, lon);
  };

  // Select a location directly on the map.
  const handleMapLocationSelect = async ({
    latitude: lat,
    longitude: lon,
  }) => {
    setLatitude(String(lat));
    setLongitude(String(lon));

    setMapPosition({
      latitude: lat,
      longitude: lon,
    });

    setSelectedLocation(null);
    setLocationResults([]);
    setError("");
    setSuccessMessage("");
    setResolvingLocation(true);

    await identifyLocation(lat, lon);

    setResolvingLocation(false);
    await loadWeather(lat, lon);
  };

  // Submit manually entered coordinates.
  const handleSubmit = async (event) => {
    event.preventDefault();

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lon) ||
      lon < -180 ||
      lon > 180
    ) {
      setError("Please enter valid latitude and longitude values.");
      return;
    }

    setMapPosition({
      latitude: lat,
      longitude: lon,
    });

    setSelectedLocation(null);

    await identifyLocation(lat, lon);
    await loadWeather(lat, lon);
  };

  const currentWeather = weather || {};

  return (
    <section className="weather-monitoring-page">
      {/* HEADER */}
      <div className="weather-monitoring-header">
        <div>
          <h1>Weather Monitoring</h1>
          <p>
            Automatically detect your current location or select any
            travel destination to view weather.
          </p>
        </div>

        <button
          type="button"
          className="wm-primary-button"
          onClick={detectDeviceLocation}
          disabled={detectingLocation || loading}
        >
          {detectingLocation
            ? "Detecting Location..."
            : "📍 My Current Location"}
        </button>
      </div>

      {detectingLocation && (
        <div className="wm-message">
          📍 Detecting your current location...
        </div>
      )}

      {/* DESTINATION SEARCH */}
      <SectionCard
        title="Search Your Travel Destination"
        icon="🌍"
      >
        <div className="wm-history-form">
          <label>
            Search city, state or country
            <input
              type="text"
              value={locationName}
              onChange={(event) => {
                setLocationName(event.target.value);
                setLocationResults([]);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  searchLocations();
                }
              }}
              placeholder="Example: Chennai, India or London"
            />
          </label>

          <button
            type="button"
            className="wm-primary-button"
            onClick={searchLocations}
            disabled={searchingLocation}
          >
            {searchingLocation
              ? "Searching..."
              : "Search Destination"}
          </button>
        </div>

        {locationResults.length > 0 && (
          <div className="wm-location-results">
            {locationResults.map((location, index) => (
              <button
                type="button"
                key={`${location.latitude}-${location.longitude}-${index}`}
                className="wm-location-result"
                onClick={() => selectLocation(location)}
              >
                <strong>
                  📍{" "}
                  {location.displayName ||
                    location.name ||
                    location.city ||
                    "Unknown location"}
                </strong>
                <small>
                  Latitude: {location.latitude} | Longitude:{" "}
                  {location.longitude}
                </small>
              </button>
            ))}
          </div>
        )}

        {selectedLocation && (
          <div className="wm-message wm-success">
            <strong>Selected destination:</strong>{" "}
            {selectedLocation.displayName ||
              selectedLocation.name ||
              selectedLocation.city ||
              selectedLocation.country ||
              locationName}
            <br />
            <small>
              Coordinates: {latitude}, {longitude}
            </small>
          </div>
        )}
      </SectionCard>

      {/* MAP */}
      <SectionCard
        title="Select Destination on Map"
        icon="🗺️"
      >
        <p style={{ marginBottom: "12px" }}>
          Your current location is detected automatically. You can
          also search for a destination or click anywhere on the map
          to view its weather.
        </p>

        <WeatherLocationMap
          position={mapPosition}
          onLocationSelect={handleMapLocationSelect}
        />

        {resolvingLocation && (
          <div className="wm-message">
            Identifying the selected location...
          </div>
        )}

        <div className="wm-message">
          <strong>Selected coordinates:</strong>{" "}
          {latitude || "—"}, {longitude || "—"}
        </div>
      </SectionCard>

      {/* MANUAL COORDINATES */}
      <SectionCard
        title="Destination Coordinates"
        icon="📍"
      >
        <form
          className="wm-history-form"
          onSubmit={handleSubmit}
        >
          <label>
            Latitude
            <input
              type="number"
              value={latitude}
              onChange={(event) => {
                setLatitude(event.target.value);
                setSelectedLocation(null);
              }}
              placeholder="16.3067"
              min="-90"
              max="90"
              step="any"
              required
            />
          </label>

          <label>
            Longitude
            <input
              type="number"
              value={longitude}
              onChange={(event) => {
                setLongitude(event.target.value);
                setSelectedLocation(null);
              }}
              placeholder="80.4365"
              min="-180"
              max="180"
              step="any"
              required
            />
          </label>

          <button
            type="submit"
            className="wm-primary-button"
            disabled={loading}
          >
            {loading ? "Loading..." : "Get Weather"}
          </button>
        </form>
      </SectionCard>

      {/* ERROR */}
      {error && (
        <div className="wm-message wm-error">
          ⚠️ {error}
        </div>
      )}

      {/* SUCCESS */}
      {successMessage && !error && (
        <div className="wm-message wm-success">
          ✓ {successMessage}
        </div>
      )}

      {/* CURRENT WEATHER */}
      <div className="wm-current-card">
        <div className="wm-current-main">
          <span className="wm-current-label">
            CURRENT WEATHER
          </span>

          <div
            style={{
              fontSize: "4rem",
              marginBottom: "8px",
            }}
          >
            {getWeatherIcon(currentWeather.weatherCode)}
          </div>

          <div className="wm-current-temperature">
            {formatValue(currentWeather.temperature, "°C")}
          </div>

          <div className="wm-current-condition">
            {formatValue(currentWeather.weatherDescription)}
          </div>

          <div className="wm-current-location">
            📍 {locationName || "Select a location"}
            <br />
            Latitude: {formatValue(latitude)}
            {" | "}
            Longitude: {formatValue(longitude)}
          </div>

          {currentWeather.time && (
            <small>Updated: {currentWeather.time}</small>
          )}
        </div>

        <div className="wm-current-metrics">
          <MetricCard
            icon="🌡️"
            label="Temperature"
            value={formatValue(currentWeather.temperature, "°C")}
          />
          <MetricCard
            icon="🔥"
            label="Feels Like"
            value={formatValue(currentWeather.apparentTemperature, "°C")}
          />
          <MetricCard
            icon="💧"
            label="Humidity"
            value={formatValue(currentWeather.humidity, "%")}
          />
          <MetricCard
            icon="💨"
            label="Wind Speed"
            value={formatValue(currentWeather.windSpeed, " km/h")}
          />
          <MetricCard
            icon="🧭"
            label="Wind Direction"
            value={formatValue(currentWeather.windDirection, "°")}
          />
          <MetricCard
            icon="💨"
            label="Wind Gusts"
            value={formatValue(currentWeather.windGusts, " km/h")}
          />
          <MetricCard
            icon="☀️"
            label="UV Index"
            value={formatValue(currentWeather.uvIndex)}
          />
          <MetricCard
            icon="🌧️"
            label="Rain"
            value={formatValue(currentWeather.rain, " mm")}
          />
        </div>
      </div>

      {/* WEATHER DETAILS */}
      <div className="wm-grid">
        <SectionCard title="Weather Details" icon="🌤️">
          <div className="wm-data-grid">
            <div className="wm-data-item">
              <span>Weather Code</span>
              <strong>{formatValue(currentWeather.weatherCode)}</strong>
            </div>
            <div className="wm-data-item">
              <span>Condition</span>
              <strong>
                {formatValue(currentWeather.weatherDescription)}
              </strong>
            </div>
            <div className="wm-data-item">
              <span>Temperature</span>
              <strong>
                {formatValue(currentWeather.temperature, "°C")}
              </strong>
            </div>
            <div className="wm-data-item">
              <span>Apparent Temperature</span>
              <strong>
                {formatValue(currentWeather.apparentTemperature, "°C")}
              </strong>
            </div>
            <div className="wm-data-item">
              <span>Humidity</span>
              <strong>{formatValue(currentWeather.humidity, "%")}</strong>
            </div>
            <div className="wm-data-item">
              <span>Precipitation</span>
              <strong>
                {formatValue(currentWeather.precipitation, " mm")}
              </strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Wind Information" icon="💨">
          <div className="wm-data-grid">
            <div className="wm-data-item">
              <span>Wind Speed</span>
              <strong>
                {formatValue(currentWeather.windSpeed, " km/h")}
              </strong>
            </div>
            <div className="wm-data-item">
              <span>Wind Direction</span>
              <strong>
                {formatValue(currentWeather.windDirection, "°")}
              </strong>
            </div>
            <div className="wm-data-item">
              <span>Wind Gusts</span>
              <strong>
                {formatValue(currentWeather.windGusts, " km/h")}
              </strong>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* UV AND RAIN */}
      <div className="wm-grid">
        <SectionCard title="UV Information" icon="☀️">
          <div className="wm-data-grid">
            <div className="wm-data-item">
              <span>UV Index</span>
              <strong>{formatValue(currentWeather.uvIndex)}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Rain & Precipitation" icon="🌧️">
          <div className="wm-data-grid">
            <div className="wm-data-item">
              <span>Rain</span>
              <strong>
                {formatValue(currentWeather.rain, " mm")}
              </strong>
            </div>
            <div className="wm-data-item">
              <span>Precipitation</span>
              <strong>
                {formatValue(currentWeather.precipitation, " mm")}
              </strong>
            </div>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}

export default WeatherMonitoring;
