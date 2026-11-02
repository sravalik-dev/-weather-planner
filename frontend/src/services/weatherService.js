import { getCurrentWeather } from "../utils/apiUtils";
import { resolveLocationName } from "../utils/locationUtils";
import { getWeatherType } from "../utils/weatherUtils";

export const getCurrentWeatherData = async (latitude, longitude) => {
  const data = await getCurrentWeather(latitude, longitude);
  const locationName = await resolveLocationName(latitude, longitude);

  return {
    type: getWeatherType(data.weatherCode),
    temperature: data.temperature,
    isDay: data.isDay !== false && data.isDay !== 0,
    location: locationName,
    humidity: data.humidity,
    wind: data.windSpeed,
    apparentTemperature: data.apparentTemperature,
    precipitation: data.precipitation,
    rain: data.rain,
    weatherCode: data.weatherCode,
    weatherDescription: data.weatherDescription,
    windDirection: data.windDirection,
    windGusts: data.windGusts,
    uvIndex: data.uvIndex,
    time: data.time,
    loading: false,
    error: "",
  };
};