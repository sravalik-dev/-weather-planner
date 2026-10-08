function WeatherSection({
  weather,
  weatherIcon,
  weatherLabel,
}) {
  return (
    <>
      <div className="live-weather">
        <span className="live-dot"></span>

        <span>
          {weather.loading
            ? "Detecting live weather..."
            : weather.error
            ? weather.error
            : `Live weather • ${weatherLabel}`}
        </span>
      </div>

      <div className="weather-icon">
        {weatherIcon}
      </div>

      {!weather.loading &&
        weather.temperature !== null && (
          <div className="weather-info">
            <div className="temperature">
              {weather.temperature}°C
            </div>

            <div className="location">
              📍 {weather.location}
            </div>

            {weather.humidity !== null && (
              <div className="weather-details">
                <span>
                  💧 {weather.humidity}%
                </span>

                <span>
                  💨 {Math.round(weather.wind)} km/h
                </span>
              </div>
            )}
          </div>
        )}
    </>
  );
}

export default WeatherSection;