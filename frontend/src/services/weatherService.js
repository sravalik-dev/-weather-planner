import {
  getCurrentWeather,
} from "../utils/apiUtils";

import {
  getWeatherType,
} from "../utils/weatherUtils";

export const getCurrentWeatherData =
  async (
    latitude,
    longitude
  ) => {
    const data =
      await getCurrentWeather(
        latitude,
        longitude
      );

    return {
      type: getWeatherType(
        data.weatherCode
      ),

      temperature:
        data.temperature,

      isDay: true,

      location:
        "Your location",

      humidity:
        data.humidity,

      wind:
        data.windSpeed,

      apparentTemperature:
        data.apparentTemperature,

      precipitation:
        data.precipitation,

      rain:
        data.rain,

      weatherCode:
        data.weatherCode,

      weatherDescription:
        data.weatherDescription,

      windDirection:
        data.windDirection,

      windGusts:
        data.windGusts,

      uvIndex:
        data.uvIndex,

      time:
        data.time,

      loading: false,

      error: "",
    };
  };