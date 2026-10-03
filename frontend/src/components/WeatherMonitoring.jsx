import { useEffect, useState } from "react";
import "../styles/WeatherMonitoring.css";

import {
  getCurrentWeather,
} from "../utils/apiUtils";

const DEFAULT_LATITUDE = 16.3067;
const DEFAULT_LONGITUDE = 80.4365;

const formatValue = (
  value,
  suffix = ""
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return `${value}${suffix}`;
};

const getWeatherIcon = (
  weatherCode
) => {
  if (
    weatherCode === null ||
    weatherCode === undefined
  ) {
    return "🌤️";
  }

  if (weatherCode === 0) {
    return "☀️";
  }

  if (
    weatherCode === 1 ||
    weatherCode === 2
  ) {
    return "🌤️";
  }

  if (weatherCode === 3) {
    return "☁️";
  }

  if (
    weatherCode >= 45 &&
    weatherCode <= 48
  ) {
    return "🌫️";
  }

  if (
    (weatherCode >= 51 &&
      weatherCode <= 67) ||
    (weatherCode >= 80 &&
      weatherCode <= 82)
  ) {
    return "🌧️";
  }

  if (
    weatherCode >= 71 &&
    weatherCode <= 77
  ) {
    return "❄️";
  }

  if (
    weatherCode >= 95
  ) {
    return "⛈️";
  }

  return "🌤️";
};

const MetricCard = ({
  icon,
  label,
  value,
  description,
}) => {
  return (
    <article className="wm-metric-card">
      <div className="wm-metric-icon">
        {icon}
      </div>

      <div className="wm-metric-content">
        <span className="wm-metric-label">
          {label}
        </span>

        <strong className="wm-metric-value">
          {value}
        </strong>

        {description && (
          <small className="wm-metric-description">
            {description}
          </small>
        )}
      </div>
    </article>
  );
};

const SectionCard = ({
  title,
  icon,
  children,
  className = "",
}) => {
  return (
    <section
      className={`wm-section-card ${className}`}
    >
      <div className="wm-section-heading">
        <div className="wm-section-title">
          <span className="wm-section-icon">
            {icon}
          </span>

          <div>
            <h2>{title}</h2>
          </div>
        </div>
      </div>

      {children}
    </section>
  );
};

function WeatherMonitoring() {
  const [latitude, setLatitude] =
    useState(
      String(DEFAULT_LATITUDE)
    );

  const [longitude, setLongitude] =
    useState(
      String(DEFAULT_LONGITUDE)
    );

  const [weather, setWeather] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /**
   * Load current weather from:
   *
   * /api/weather/current
   *
   * with:
   *
   * ?latitude=...
   * &longitude=...
   */
  const loadWeather = async (
    customLatitude = latitude,
    customLongitude = longitude
  ) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const parsedLatitude =
        Number(customLatitude);

      const parsedLongitude =
        Number(customLongitude);

      if (
        !Number.isFinite(
          parsedLatitude
        )
      ) {
        throw new Error(
          "Please enter a valid latitude."
        );
      }

      if (
        !Number.isFinite(
          parsedLongitude
        )
      ) {
        throw new Error(
          "Please enter a valid longitude."
        );
      }

      if (
        parsedLatitude < -90 ||
        parsedLatitude > 90
      ) {
        throw new Error(
          "Latitude must be between -90 and 90."
        );
      }

      if (
        parsedLongitude < -180 ||
        parsedLongitude > 180
      ) {
        throw new Error(
          "Longitude must be between -180 and 180."
        );
      }

      const data =
        await getCurrentWeather(
          parsedLatitude,
          parsedLongitude
        );

      setWeather(data);

      setSuccessMessage(
        "Current weather updated successfully."
      );
    } catch (err) {
      console.error(
        "Weather monitoring error:",
        err
      );

      setWeather(null);

      setError(
        err?.message ||
          "Unable to load current weather."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Automatically load the default coordinates
   * when the Weather Monitoring page opens.
   */
  useEffect(() => {
    loadWeather(
      DEFAULT_LATITUDE,
      DEFAULT_LONGITUDE
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    loadWeather();
  };

  const currentWeather =
    weather || {};

  return (
    <section className="weather-monitoring-page">

      {/* HEADER */}

      <div className="weather-monitoring-header">
        <div>
          <h1>
            Weather Monitoring
          </h1>

          <p>
            Get current weather
            information from your
            selected destination.
          </p>
        </div>

        <button
          type="button"
          className="wm-primary-button"
          onClick={() =>
            loadWeather()
          }
          disabled={loading}
        >
          {loading
            ? "Updating..."
            : "↻ Refresh Weather"}
        </button>
      </div>

      {/* LOCATION INPUT */}

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
              onChange={(event) =>
                setLatitude(
                  event.target.value
                )
              }
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
              onChange={(event) =>
                setLongitude(
                  event.target.value
                )
              }
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
            {loading
              ? "Loading..."
              : "Get Weather"}
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

      {successMessage &&
        !error && (
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
            {getWeatherIcon(
              currentWeather.weatherCode
            )}
          </div>

          <div className="wm-current-temperature">
            {formatValue(
              currentWeather.temperature,
              "°C"
            )}
          </div>

          <div className="wm-current-condition">
            {formatValue(
              currentWeather.weatherDescription
            )}
          </div>

          <div className="wm-current-location">
            📍 Latitude:{" "}
            {formatValue(
              latitude
            )}
            {" | "}
            Longitude:{" "}
            {formatValue(
              longitude
            )}
          </div>

          {currentWeather.time && (
            <small>
              Updated:{" "}
              {currentWeather.time}
            </small>
          )}

        </div>

        <div className="wm-current-metrics">

          <MetricCard
            icon="🌡️"
            label="Temperature"
            value={formatValue(
              currentWeather.temperature,
              "°C"
            )}
          />

          <MetricCard
            icon="🔥"
            label="Feels Like"
            value={formatValue(
              currentWeather.apparentTemperature,
              "°C"
            )}
          />

          <MetricCard
            icon="💧"
            label="Humidity"
            value={formatValue(
              currentWeather.humidity,
              "%"
            )}
          />

          <MetricCard
            icon="💨"
            label="Wind Speed"
            value={formatValue(
              currentWeather.windSpeed,
              " km/h"
            )}
          />

          <MetricCard
            icon="🧭"
            label="Wind Direction"
            value={formatValue(
              currentWeather.windDirection,
              "°"
            )}
          />

          <MetricCard
            icon="💨"
            label="Wind Gusts"
            value={formatValue(
              currentWeather.windGusts,
              " km/h"
            )}
          />

          <MetricCard
            icon="☀️"
            label="UV Index"
            value={formatValue(
              currentWeather.uvIndex
            )}
          />

          <MetricCard
            icon="🌧️"
            label="Rain"
            value={formatValue(
              currentWeather.rain,
              " mm"
            )}
          />

        </div>
      </div>

      {/* WEATHER DETAILS */}

      <div className="wm-grid">

        <SectionCard
          title="Weather Details"
          icon="🌤️"
        >
          <div className="wm-data-grid">

            <div className="wm-data-item">
              <span>
                Weather Code
              </span>

              <strong>
                {formatValue(
                  currentWeather.weatherCode
                )}
              </strong>
            </div>

            <div className="wm-data-item">
              <span>
                Condition
              </span>

              <strong>
                {formatValue(
                  currentWeather.weatherDescription
                )}
              </strong>
            </div>

            <div className="wm-data-item">
              <span>
                Temperature
              </span>

              <strong>
                {formatValue(
                  currentWeather.temperature,
                  "°C"
                )}
              </strong>
            </div>

            <div className="wm-data-item">
              <span>
                Apparent Temperature
              </span>

              <strong>
                {formatValue(
                  currentWeather.apparentTemperature,
                  "°C"
                )}
              </strong>
            </div>

            <div className="wm-data-item">
              <span>
                Humidity
              </span>

              <strong>
                {formatValue(
                  currentWeather.humidity,
                  "%"
                )}
              </strong>
            </div>

            <div className="wm-data-item">
              <span>
                Precipitation
              </span>

              <strong>
                {formatValue(
                  currentWeather.precipitation,
                  " mm"
                )}
              </strong>
            </div>

          </div>
        </SectionCard>

        <SectionCard
          title="Wind Information"
          icon="💨"
        >
          <div className="wm-data-grid">

            <div className="wm-data-item">
              <span>
                Wind Speed
              </span>

              <strong>
                {formatValue(
                  currentWeather.windSpeed,
                  " km/h"
                )}
              </strong>
            </div>

            <div className="wm-data-item">
              <span>
                Wind Direction
              </span>

              <strong>
                {formatValue(
                  currentWeather.windDirection,
                  "°"
                )}
              </strong>
            </div>

            <div className="wm-data-item">
              <span>
                Wind Gusts
              </span>

              <strong>
                {formatValue(
                  currentWeather.windGusts,
                  " km/h"
                )}
              </strong>
            </div>

          </div>
        </SectionCard>

      </div>

      {/* UV / RAIN */}

      <div className="wm-grid">

        <SectionCard
          title="UV Information"
          icon="☀️"
        >
          <div className="wm-data-grid">

            <div className="wm-data-item">
              <span>
                UV Index
              </span>

              <strong>
                {formatValue(
                  currentWeather.uvIndex
                )}
              </strong>
            </div>

          </div>
        </SectionCard>

        <SectionCard
          title="Rain & Precipitation"
          icon="🌧️"
        >
          <div className="wm-data-grid">

            <div className="wm-data-item">
              <span>
                Rain
              </span>

              <strong>
                {formatValue(
                  currentWeather.rain,
                  " mm"
                )}
              </strong>
            </div>

            <div className="wm-data-item">
              <span>
                Precipitation
              </span>

              <strong>
                {formatValue(
                  currentWeather.precipitation,
                  " mm"
                )}
              </strong>
            </div>

          </div>
        </SectionCard>

      </div>

    </section>
  );
}

export default WeatherMonitoring;