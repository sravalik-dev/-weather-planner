import { apiRequest } from "../utils/apiUtils";

const coords = (latitude, longitude) =>
  `latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`;

export const getWeatherDashboard = (latitude, longitude) =>
  apiRequest(`/weather/dashboard?${coords(latitude, longitude)}`);
export const getWeatherCurrent = (latitude, longitude) =>
  apiRequest(`/weather/current?${coords(latitude, longitude)}`);
export const getWeatherHourly = (latitude, longitude) =>
  apiRequest(`/weather/hourly?${coords(latitude, longitude)}`);
export const getWeatherDaily = (latitude, longitude) =>
  apiRequest(`/weather/daily?${coords(latitude, longitude)}`);
export const getWeatherRain = (latitude, longitude) =>
  apiRequest(`/weather/rain?${coords(latitude, longitude)}`);
export const getWeatherTemperature = (latitude, longitude) =>
  apiRequest(`/weather/temperature?${coords(latitude, longitude)}`);
export const getWeatherHumidity = (latitude, longitude) =>
  apiRequest(`/weather/humidity?${coords(latitude, longitude)}`);
export const getWeatherWind = (latitude, longitude) =>
  apiRequest(`/weather/wind?${coords(latitude, longitude)}`);
export const getWeatherUV = (latitude, longitude) =>
  apiRequest(`/weather/uv?${coords(latitude, longitude)}`);
export const getWeatherAirQuality = (latitude, longitude) =>
  apiRequest(`/weather/air-quality?${coords(latitude, longitude)}`);
export const getWeatherAlerts = (latitude, longitude) =>
  apiRequest(`/weather/alerts?${coords(latitude, longitude)}`);
export const getWeatherHistory = (latitude, longitude, startDate, endDate) =>
  apiRequest("/weather/history", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, startDate, endDate }),
  });