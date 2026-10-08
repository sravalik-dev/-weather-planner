export const getWeatherType = (code) => {
  const weatherCode = Number(code);

  if (weatherCode === 0) {
    return "clear";
  }

  if ([1, 2].includes(weatherCode)) {
    return "partly-cloudy";
  }

  if ([3, 45, 48].includes(weatherCode)) {
    return "cloudy";
  }

  if ([51, 53, 55, 56, 57].includes(weatherCode)) {
    return "drizzle";
  }

  if (
    [61, 63, 65, 66, 67, 80, 81, 82].includes(
      weatherCode
    )
  ) {
    return "rain";
  }

  if (
    [71, 73, 75, 77, 85, 86].includes(
      weatherCode
    )
  ) {
    return "snow";
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return "storm";
  }

  return "clear";
};

export const getWeatherLabel = (type) => {
  const labels = {
    clear: "Clear",
    "partly-cloudy": "Partly Cloudy",
    cloudy: "Cloudy",
    drizzle: "Drizzle",
    rain: "Rainy",
    snow: "Snowy",
    storm: "Thunderstorm",
  };

  return labels[type] || "Clear";
};

export const getWeatherIcon = (type, isDay = true) => {
  if (!isDay && type === "clear") {
    return "🌙";
  }

  const icons = {
    clear: "☀️",
    "partly-cloudy": "🌤️",
    cloudy: "☁️",
    drizzle: "🌦️",
    rain: "🌧️",
    snow: "❄️",
    storm: "⛈️",
  };

  return icons[type] || "🌤️";
};

export const buildWeatherUrl = (
  latitude,
  longitude
) => {
  return (
    "https://api.open-meteo.com/v1/forecast?" +
    `latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    "&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m" +
    "&timezone=auto"
  );
};