import {
  API_BASE_URL,
  getAuthHeaders,
  readApiError,
} from "../utils/apiUtils";

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const getWeatherDashboard = () =>
  request("/api/weather/dashboard");

export const getWeatherCurrent = () =>
  request("/api/weather/current");

export const getWeatherHourly = () =>
  request("/api/weather/hourly");

export const getWeatherDaily = () =>
  request("/api/weather/daily");

export const getWeatherRain = () =>
  request("/api/weather/rain");

export const getWeatherTemperature = () =>
  request("/api/weather/temperature");

export const getWeatherHumidity = () =>
  request("/api/weather/humidity");

export const getWeatherWind = () =>
  request("/api/weather/wind");

export const getWeatherUV = () =>
  request("/api/weather/uv");

export const getWeatherAirQuality = () =>
  request("/api/weather/air-quality");

export const getWeatherAlerts = () =>
  request("/api/weather/alerts");

export const getWeatherHistory = ({
  latitude,
  longitude,
  startDate,
  endDate,
}) =>
  request("/api/weather/history", {
    method: "POST",
    body: JSON.stringify({
      latitude,
      longitude,
      startDate,
      endDate,
    }),
  });