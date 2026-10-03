package backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WeatherService {

    private static final String FORECAST_URL =
            "https://api.open-meteo.com/v1/forecast";

    private static final String AIR_QUALITY_URL =
            "https://air-quality-api.open-meteo.com/v1/air-quality";

    private static final String HISTORY_URL =
            "https://archive-api.open-meteo.com/v1/archive";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public WeatherService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    // =========================================================
    // CURRENT WEATHER
    // =========================================================

    public Map<String, Object> getCurrentWeather(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        return buildCurrentWeather(forecast);
    }

    // =========================================================
    // HOURLY FORECAST
    // =========================================================

    public Map<String, Object> getHourlyForecast(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        return buildHourlyForecast(forecast);
    }

    // =========================================================
    // DAILY FORECAST
    // =========================================================

    public Map<String, Object> getDailyForecast(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        return buildDailyForecast(forecast);
    }

    // =========================================================
    // RAIN PREDICTION
    // =========================================================

    public Map<String, Object> getRainPrediction(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        Map<String, Object> response =
                new LinkedHashMap<>();

        JsonNode hourly =
                forecast.path("hourly");

        response.put(
                "time",
                readArray(hourly, "time")
        );

        response.put(
                "precipitation",
                readArray(hourly, "precipitation")
        );

        response.put(
                "rain",
                readArray(hourly, "rain")
        );

        response.put(
                "precipitationProbability",
                readArray(
                        hourly,
                        "precipitation_probability"
                )
        );

        response.put(
                "weatherCode",
                readArray(hourly, "weather_code")
        );

        response.put(
                "message",
                "Rain prediction retrieved successfully"
        );

        return response;
    }

    // =========================================================
    // TEMPERATURE
    // =========================================================

    public Map<String, Object> getTemperature(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        Map<String, Object> response =
                new LinkedHashMap<>();

        JsonNode current =
                forecast.path("current");

        JsonNode hourly =
                forecast.path("hourly");

        response.put(
                "currentTemperature",
                getValue(current, "temperature_2m")
        );

        response.put(
                "apparentTemperature",
                getValue(
                        current,
                        "apparent_temperature"
                )
        );

        response.put(
                "hourlyTime",
                readArray(hourly, "time")
        );

        response.put(
                "hourlyTemperature",
                readArray(
                        hourly,
                        "temperature_2m"
                )
        );

        response.put(
                "hourlyApparentTemperature",
                readArray(
                        hourly,
                        "apparent_temperature"
                )
        );

        return response;
    }

    // =========================================================
    // HUMIDITY
    // =========================================================

    public Map<String, Object> getHumidity(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        Map<String, Object> response =
                new LinkedHashMap<>();

        JsonNode current =
                forecast.path("current");

        JsonNode hourly =
                forecast.path("hourly");

        response.put(
                "currentHumidity",
                getValue(
                        current,
                        "relative_humidity_2m"
                )
        );

        response.put(
                "time",
                readArray(hourly, "time")
        );

        response.put(
                "humidity",
                readArray(
                        hourly,
                        "relative_humidity_2m"
                )
        );

        return response;
    }

    // =========================================================
    // WIND
    // =========================================================

    public Map<String, Object> getWind(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        Map<String, Object> response =
                new LinkedHashMap<>();

        JsonNode current =
                forecast.path("current");

        JsonNode hourly =
                forecast.path("hourly");

        response.put(
                "currentWindSpeed",
                getValue(
                        current,
                        "wind_speed_10m"
                )
        );

        response.put(
                "currentWindDirection",
                getValue(
                        current,
                        "wind_direction_10m"
                )
        );

        response.put(
                "currentWindGusts",
                getValue(
                        current,
                        "wind_gusts_10m"
                )
        );

        response.put(
                "time",
                readArray(hourly, "time")
        );

        response.put(
                "windSpeed",
                readArray(
                        hourly,
                        "wind_speed_10m"
                )
        );

        response.put(
                "windDirection",
                readArray(
                        hourly,
                        "wind_direction_10m"
                )
        );

        response.put(
                "windGusts",
                readArray(
                        hourly,
                        "wind_gusts_10m"
                )
        );

        return response;
    }

    // =========================================================
    // UV INDEX
    // =========================================================

    public Map<String, Object> getUvIndex(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        Map<String, Object> response =
                new LinkedHashMap<>();

        JsonNode current =
                forecast.path("current");

        JsonNode hourly =
                forecast.path("hourly");

        JsonNode daily =
                forecast.path("daily");

        response.put(
                "currentUvIndex",
                getValue(current, "uv_index")
        );

        response.put(
                "hourlyTime",
                readArray(hourly, "time")
        );

        response.put(
                "hourlyUvIndex",
                readArray(
                        hourly,
                        "uv_index"
                )
        );

        response.put(
                "dailyTime",
                readArray(daily, "time")
        );

        response.put(
                "dailyMaximumUvIndex",
                readArray(
                        daily,
                        "uv_index_max"
                )
        );

        return response;
    }

    // =========================================================
    // AIR QUALITY
    // =========================================================

    public Map<String, Object> getAirQuality(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        String url =
                AIR_QUALITY_URL
                        + "?latitude=" + latitude
                        + "&longitude=" + longitude
                        + "&current="
                        + "european_aqi,"
                        + "us_aqi,"
                        + "pm2_5,"
                        + "pm10,"
                        + "carbon_monoxide,"
                        + "nitrogen_dioxide,"
                        + "sulphur_dioxide,"
                        + "ozone"
                        + "&hourly="
                        + "european_aqi,"
                        + "us_aqi,"
                        + "pm2_5,"
                        + "pm10,"
                        + "carbon_monoxide,"
                        + "nitrogen_dioxide,"
                        + "sulphur_dioxide,"
                        + "ozone"
                        + "&forecast_days=5"
                        + "&timezone=auto";

        JsonNode airQuality =
                getJson(url);

        Map<String, Object> response =
                new LinkedHashMap<>();

        JsonNode current =
                airQuality.path("current");

        response.put(
                "current",
                convertObjectNode(current)
        );

        JsonNode hourly =
                airQuality.path("hourly");

        response.put(
                "time",
                readArray(hourly, "time")
        );

        response.put(
                "europeanAqi",
                readArray(
                        hourly,
                        "european_aqi"
                )
        );

        response.put(
                "usAqi",
                readArray(
                        hourly,
                        "us_aqi"
                )
        );

        response.put(
                "pm2_5",
                readArray(
                        hourly,
                        "pm2_5"
                )
        );

        response.put(
                "pm10",
                readArray(
                        hourly,
                        "pm10"
                )
        );

        response.put(
                "carbonMonoxide",
                readArray(
                        hourly,
                        "carbon_monoxide"
                )
        );

        response.put(
                "nitrogenDioxide",
                readArray(
                        hourly,
                        "nitrogen_dioxide"
                )
        );

        response.put(
                "sulphurDioxide",
                readArray(
                        hourly,
                        "sulphur_dioxide"
                )
        );

        response.put(
                "ozone",
                readArray(
                        hourly,
                        "ozone"
                )
        );

        response.put(
                "airQualityCategory",
                getAirQualityCategory(
                        current.path("us_aqi")
                                .asDouble(-1)
                )
        );

        return response;
    }

    // =========================================================
    // WEATHER ALERTS
    // =========================================================

    public Map<String, Object> getWeatherAlerts(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        JsonNode hourly =
                forecast.path("hourly");

        List<Map<String, Object>> alerts =
                new ArrayList<>();

        JsonNode times =
                hourly.path("time");

        JsonNode weatherCodes =
                hourly.path("weather_code");

        JsonNode windGusts =
                hourly.path("wind_gusts_10m");

        JsonNode temperatures =
                hourly.path("temperature_2m");

        JsonNode precipitation =
                hourly.path("precipitation");

        int size =
                Math.max(
                        times.size(),
                        Math.max(
                                weatherCodes.size(),
                                Math.max(
                                        windGusts.size(),
                                        temperatures.size()
                                )
                        )
                );

        for (int i = 0; i < size; i++) {

            String time =
                    getArrayText(times, i);

            int weatherCode =
                    getArrayInt(
                            weatherCodes,
                            i,
                            -1
                    );

            double windGust =
                    getArrayDouble(
                            windGusts,
                            i,
                            -1
                    );

            double temperature =
                    getArrayDouble(
                            temperatures,
                            i,
                            Double.NaN
                    );

            double rain =
                    getArrayDouble(
                            precipitation,
                            i,
                            0
                    );

            if (weatherCode == 95
                    || weatherCode == 96
                    || weatherCode == 99) {

                alerts.add(
                        createAlert(
                                "THUNDERSTORM",
                                "HIGH",
                                time,
                                "Thunderstorm conditions are forecast."
                        )
                );
            }

            if (weatherCode == 65
                    || weatherCode == 67
                    || weatherCode == 82
                    || rain >= 10) {

                alerts.add(
                        createAlert(
                                "HEAVY_RAIN",
                                "HIGH",
                                time,
                                "Heavy rain conditions are forecast."
                        )
                );
            }

            if (weatherCode == 75
                    || weatherCode == 77
                    || weatherCode == 86) {

                alerts.add(
                        createAlert(
                                "HEAVY_SNOW",
                                "HIGH",
                                time,
                                "Heavy snow conditions are forecast."
                        )
                );
            }

            if (weatherCode == 66
                    || weatherCode == 67) {

                alerts.add(
                        createAlert(
                                "FREEZING_RAIN",
                                "HIGH",
                                time,
                                "Freezing rain conditions are forecast."
                        )
                );
            }

            if (weatherCode == 45
                    || weatherCode == 48) {

                alerts.add(
                        createAlert(
                                "FOG",
                                "MODERATE",
                                time,
                                "Foggy conditions are forecast."
                        )
                );
            }

            if (windGust >= 60) {

                alerts.add(
                        createAlert(
                                "STRONG_WIND",
                                "HIGH",
                                time,
                                "Strong wind gusts are forecast."
                        )
                );
            }

            if (!Double.isNaN(temperature)
                    && temperature >= 40) {

                alerts.add(
                        createAlert(
                                "EXTREME_HEAT",
                                "HIGH",
                                time,
                                "Very high temperatures are forecast."
                        )
                );
            }

            if (!Double.isNaN(temperature)
                    && temperature <= 0) {

                alerts.add(
                        createAlert(
                                "EXTREME_COLD",
                                "MODERATE",
                                time,
                                "Very low temperatures are forecast."
                        )
                );
            }
        }

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("alerts", alerts);
        response.put("alertCount", alerts.size());

        response.put(
                "source",
                "Open-Meteo forecast-derived weather conditions"
        );

        response.put(
                "officialWarning",
                false
        );

        return response;
    }

    // =========================================================
    // WEATHER HISTORY
    // =========================================================

    public Map<String, Object> getWeatherHistory(
            Double latitude,
            Double longitude,
            LocalDate startDate,
            LocalDate endDate) {

        validateCoordinates(latitude, longitude);

        validateHistoryDates(
                startDate,
                endDate
        );

        String url =
                HISTORY_URL
                        + "?latitude=" + latitude
                        + "&longitude=" + longitude
                        + "&start_date=" + startDate
                        + "&end_date=" + endDate
                        + "&hourly="
                        + "temperature_2m,"
                        + "relative_humidity_2m,"
                        + "apparent_temperature,"
                        + "precipitation,"
                        + "rain,"
                        + "weather_code,"
                        + "wind_speed_10m,"
                        + "wind_direction_10m,"
                        + "wind_gusts_10m"
                        + "&daily="
                        + "weather_code,"
                        + "temperature_2m_max,"
                        + "temperature_2m_min,"
                        + "precipitation_sum,"
                        + "rain_sum,"
                        + "precipitation_hours"
                        + "&timezone=auto";

        JsonNode history =
                getJson(url);

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "latitude",
                history.path("latitude").asDouble()
        );

        response.put(
                "longitude",
                history.path("longitude").asDouble()
        );

        response.put(
                "timezone",
                history.path("timezone").asText()
        );

        response.put(
                "startDate",
                startDate.toString()
        );

        response.put(
                "endDate",
                endDate.toString()
        );

        JsonNode hourly =
                history.path("hourly");

        Map<String, Object> hourlyData =
                new LinkedHashMap<>();

        hourlyData.put(
                "time",
                readArray(hourly, "time")
        );

        hourlyData.put(
                "temperature",
                readArray(
                        hourly,
                        "temperature_2m"
                )
        );

        hourlyData.put(
                "humidity",
                readArray(
                        hourly,
                        "relative_humidity_2m"
                )
        );

        hourlyData.put(
                "apparentTemperature",
                readArray(
                        hourly,
                        "apparent_temperature"
                )
        );

        hourlyData.put(
                "precipitation",
                readArray(
                        hourly,
                        "precipitation"
                )
        );

        hourlyData.put(
                "rain",
                readArray(
                        hourly,
                        "rain"
                )
        );

        hourlyData.put(
                "weatherCode",
                readArray(
                        hourly,
                        "weather_code"
                )
        );

        hourlyData.put(
                "windSpeed",
                readArray(
                        hourly,
                        "wind_speed_10m"
                )
        );

        hourlyData.put(
                "windDirection",
                readArray(
                        hourly,
                        "wind_direction_10m"
                )
        );

        hourlyData.put(
                "windGusts",
                readArray(
                        hourly,
                        "wind_gusts_10m"
                )
        );

        response.put(
                "hourly",
                hourlyData
        );

        JsonNode daily =
                history.path("daily");

        Map<String, Object> dailyData =
                new LinkedHashMap<>();

        dailyData.put(
                "time",
                readArray(daily, "time")
        );

        dailyData.put(
                "weatherCode",
                readArray(
                        daily,
                        "weather_code"
                )
        );

        dailyData.put(
                "temperatureMax",
                readArray(
                        daily,
                        "temperature_2m_max"
                )
        );

        dailyData.put(
                "temperatureMin",
                readArray(
                        daily,
                        "temperature_2m_min"
                )
        );

        dailyData.put(
                "precipitationSum",
                readArray(
                        daily,
                        "precipitation_sum"
                )
        );

        dailyData.put(
                "rainSum",
                readArray(
                        daily,
                        "rain_sum"
                )
        );

        dailyData.put(
                "precipitationHours",
                readArray(
                        daily,
                        "precipitation_hours"
                )
        );

        response.put(
                "daily",
                dailyData
        );

        return response;
    }

    // =========================================================
    // COMPLETE WEATHER DASHBOARD
    // =========================================================

    public Map<String, Object> getWeatherDashboard(
            Double latitude,
            Double longitude) {

        validateCoordinates(latitude, longitude);

        JsonNode forecast =
                getForecastData(latitude, longitude);

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "current",
                buildCurrentWeather(forecast)
        );

        response.put(
                "hourly",
                buildHourlyForecast(forecast)
        );

        response.put(
                "daily",
                buildDailyForecast(forecast)
        );

        response.put(
                "rain",
                buildRainData(forecast)
        );

        response.put(
                "temperature",
                buildTemperatureData(forecast)
        );

        response.put(
                "humidity",
                buildHumidityData(forecast)
        );

        response.put(
                "wind",
                buildWindData(forecast)
        );

        response.put(
                "uv",
                buildUvData(forecast)
        );

        response.put(
                "alerts",
                getWeatherAlerts(
                        latitude,
                        longitude
                )
        );

        response.put(
                "location",
                Map.of(
                        "latitude",
                        latitude,
                        "longitude",
                        longitude
                )
        );

        response.put(
                "timezone",
                forecast.path("timezone").asText()
        );

        return response;
    }

    // =========================================================
    // FORECAST API
    // =========================================================

    private JsonNode getForecastData(
            Double latitude,
            Double longitude) {

        String url =
                FORECAST_URL
                        + "?latitude=" + latitude
                        + "&longitude=" + longitude
                        + "&current="
                        + "temperature_2m,"
                        + "relative_humidity_2m,"
                        + "apparent_temperature,"
                        + "precipitation,"
                        + "rain,"
                        + "weather_code,"
                        + "wind_speed_10m,"
                        + "wind_direction_10m,"
                        + "wind_gusts_10m,"
                        + "uv_index"
                        + "&hourly="
                        + "temperature_2m,"
                        + "relative_humidity_2m,"
                        + "apparent_temperature,"
                        + "precipitation,"
                        + "rain,"
                        + "precipitation_probability,"
                        + "weather_code,"
                        + "wind_speed_10m,"
                        + "wind_direction_10m,"
                        + "wind_gusts_10m,"
                        + "uv_index"
                        + "&daily="
                        + "weather_code,"
                        + "temperature_2m_max,"
                        + "temperature_2m_min,"
                        + "apparent_temperature_max,"
                        + "apparent_temperature_min,"
                        + "precipitation_sum,"
                        + "rain_sum,"
                        + "precipitation_probability_max,"
                        + "precipitation_hours,"
                        + "sunrise,"
                        + "sunset,"
                        + "uv_index_max"
                        + "&forecast_days=7"
                        + "&timezone=auto";

        return getJson(url);
    }

    // =========================================================
    // CURRENT WEATHER BUILDER
    // =========================================================

    private Map<String, Object> buildCurrentWeather(
            JsonNode forecast) {

        JsonNode current =
                forecast.path("current");

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "time",
                getValue(current, "time")
        );

        result.put(
                "temperature",
                getValue(
                        current,
                        "temperature_2m"
                )
        );

        result.put(
                "humidity",
                getValue(
                        current,
                        "relative_humidity_2m"
                )
        );

        result.put(
                "apparentTemperature",
                getValue(
                        current,
                        "apparent_temperature"
                )
        );

        result.put(
                "precipitation",
                getValue(
                        current,
                        "precipitation"
                )
        );

        result.put(
                "rain",
                getValue(
                        current,
                        "rain"
                )
        );

        result.put(
                "weatherCode",
                getValue(
                        current,
                        "weather_code"
                )
        );

        result.put(
                "weatherDescription",
                weatherCodeDescription(
                        getValueAsInt(
                                current,
                                "weather_code",
                                -1
                        )
                )
        );

        result.put(
                "windSpeed",
                getValue(
                        current,
                        "wind_speed_10m"
                )
        );

        result.put(
                "windDirection",
                getValue(
                        current,
                        "wind_direction_10m"
                )
        );

        result.put(
                "windGusts",
                getValue(
                        current,
                        "wind_gusts_10m"
                )
        );

        result.put(
                "uvIndex",
                getValue(
                        current,
                        "uv_index"
                )
        );

        return result;
    }

    // =========================================================
    // HOURLY BUILDER
    // =========================================================

    private Map<String, Object> buildHourlyForecast(
            JsonNode forecast) {

        JsonNode hourly =
                forecast.path("hourly");

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "time",
                readFirstN(
                        hourly,
                        "time",
                        48
                )
        );

        result.put(
                "temperature",
                readFirstN(
                        hourly,
                        "temperature_2m",
                        48
                )
        );

        result.put(
                "humidity",
                readFirstN(
                        hourly,
                        "relative_humidity_2m",
                        48
                )
        );

        result.put(
                "apparentTemperature",
                readFirstN(
                        hourly,
                        "apparent_temperature",
                        48
                )
        );

        result.put(
                "precipitation",
                readFirstN(
                        hourly,
                        "precipitation",
                        48
                )
        );

        result.put(
                "rain",
                readFirstN(
                        hourly,
                        "rain",
                        48
                )
        );

        result.put(
                "precipitationProbability",
                readFirstN(
                        hourly,
                        "precipitation_probability",
                        48
                )
        );

        result.put(
                "weatherCode",
                readFirstN(
                        hourly,
                        "weather_code",
                        48
                )
        );

        result.put(
                "windSpeed",
                readFirstN(
                        hourly,
                        "wind_speed_10m",
                        48
                )
        );

        result.put(
                "windDirection",
                readFirstN(
                        hourly,
                        "wind_direction_10m",
                        48
                )
        );

        result.put(
                "windGusts",
                readFirstN(
                        hourly,
                        "wind_gusts_10m",
                        48
                )
        );

        result.put(
                "uvIndex",
                readFirstN(
                        hourly,
                        "uv_index",
                        48
                )
        );

        return result;
    }

    // =========================================================
    // DAILY BUILDER
    // =========================================================

    private Map<String, Object> buildDailyForecast(
            JsonNode forecast) {

        JsonNode daily =
                forecast.path("daily");

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "time",
                readArray(daily, "time")
        );

        result.put(
                "weatherCode",
                readArray(
                        daily,
                        "weather_code"
                )
        );

        result.put(
                "weatherDescription",
                buildWeatherDescriptions(
                        daily,
                        "weather_code"
                )
        );

        result.put(
                "temperatureMax",
                readArray(
                        daily,
                        "temperature_2m_max"
                )
        );

        result.put(
                "temperatureMin",
                readArray(
                        daily,
                        "temperature_2m_min"
                )
        );

        result.put(
                "apparentTemperatureMax",
                readArray(
                        daily,
                        "apparent_temperature_max"
                )
        );

        result.put(
                "apparentTemperatureMin",
                readArray(
                        daily,
                        "apparent_temperature_min"
                )
        );

        result.put(
                "precipitationSum",
                readArray(
                        daily,
                        "precipitation_sum"
                )
        );

        result.put(
                "rainSum",
                readArray(
                        daily,
                        "rain_sum"
                )
        );

        result.put(
                "precipitationProbabilityMax",
                readArray(
                        daily,
                        "precipitation_probability_max"
                )
        );

        result.put(
                "precipitationHours",
                readArray(
                        daily,
                        "precipitation_hours"
                )
        );

        result.put(
                "sunrise",
                readArray(
                        daily,
                        "sunrise"
                )
        );

        result.put(
                "sunset",
                readArray(
                        daily,
                        "sunset"
                )
        );

        result.put(
                "uvIndexMax",
                readArray(
                        daily,
                        "uv_index_max"
                )
        );

        return result;
    }

    // =========================================================
    // DASHBOARD BUILDERS
    // =========================================================

    private Map<String, Object> buildRainData(
            JsonNode forecast) {

        JsonNode hourly =
                forecast.path("hourly");

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "time",
                readFirstN(
                        hourly,
                        "time",
                        48
                )
        );

        result.put(
                "rain",
                readFirstN(
                        hourly,
                        "rain",
                        48
                )
        );

        result.put(
                "precipitation",
                readFirstN(
                        hourly,
                        "precipitation",
                        48
                )
        );

        result.put(
                "probability",
                readFirstN(
                        hourly,
                        "precipitation_probability",
                        48
                )
        );

        return result;
    }

    private Map<String, Object> buildTemperatureData(
            JsonNode forecast) {

        JsonNode current =
                forecast.path("current");

        JsonNode hourly =
                forecast.path("hourly");

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "current",
                getValue(
                        current,
                        "temperature_2m"
                )
        );

        result.put(
                "time",
                readFirstN(
                        hourly,
                        "time",
                        48
                )
        );

        result.put(
                "temperature",
                readFirstN(
                        hourly,
                        "temperature_2m",
                        48
                )
        );

        return result;
    }

    private Map<String, Object> buildHumidityData(
            JsonNode forecast) {

        JsonNode current =
                forecast.path("current");

        JsonNode hourly =
                forecast.path("hourly");

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "current",
                getValue(
                        current,
                        "relative_humidity_2m"
                )
        );

        result.put(
                "time",
                readFirstN(
                        hourly,
                        "time",
                        48
                )
        );

        result.put(
                "humidity",
                readFirstN(
                        hourly,
                        "relative_humidity_2m",
                        48
                )
        );

        return result;
    }

    private Map<String, Object> buildWindData(
            JsonNode forecast) {

        JsonNode current =
                forecast.path("current");

        JsonNode hourly =
                forecast.path("hourly");

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "currentSpeed",
                getValue(
                        current,
                        "wind_speed_10m"
                )
        );

        result.put(
                "currentDirection",
                getValue(
                        current,
                        "wind_direction_10m"
                )
        );

        result.put(
                "currentGusts",
                getValue(
                        current,
                        "wind_gusts_10m"
                )
        );

        result.put(
                "time",
                readFirstN(
                        hourly,
                        "time",
                        48
                )
        );

        result.put(
                "speed",
                readFirstN(
                        hourly,
                        "wind_speed_10m",
                        48
                )
        );

        result.put(
                "direction",
                readFirstN(
                        hourly,
                        "wind_direction_10m",
                        48
                )
        );

        result.put(
                "gusts",
                readFirstN(
                        hourly,
                        "wind_gusts_10m",
                        48
                )
        );

        return result;
    }

    private Map<String, Object> buildUvData(
            JsonNode forecast) {

        JsonNode current =
                forecast.path("current");

        JsonNode hourly =
                forecast.path("hourly");

        JsonNode daily =
                forecast.path("daily");

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "current",
                getValue(
                        current,
                        "uv_index"
                )
        );

        result.put(
                "hourlyTime",
                readFirstN(
                        hourly,
                        "time",
                        48
                )
        );

        result.put(
                "hourly",
                readFirstN(
                        hourly,
                        "uv_index",
                        48
                )
        );

        result.put(
                "dailyTime",
                readArray(
                        daily,
                        "time"
                )
        );

        result.put(
                "dailyMaximum",
                readArray(
                        daily,
                        "uv_index_max"
                )
        );

        return result;
    }

    // =========================================================
    // HTTP REQUEST
    // =========================================================

    private JsonNode getJson(String url) {

        try {

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .timeout(
                                    Duration.ofSeconds(20)
                            )
                            .header(
                                    "Accept",
                                    "application/json"
                            )
                            .GET()
                            .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() < 200
                    || response.statusCode() >= 300) {

                throw new RuntimeException(
                        "Weather provider returned HTTP "
                                + response.statusCode()
                );
            }

            return objectMapper.readTree(
                    response.body()
            );

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Weather API request was interrupted.",
                    e
            );

        } catch (IOException e) {

            throw new RuntimeException(
                    "Unable to connect to weather service.",
                    e
            );
        }
    }

    // =========================================================
    // VALIDATION
    // =========================================================

    private void validateCoordinates(
            Double latitude,
            Double longitude) {

        if (latitude == null
                || longitude == null) {

            throw new IllegalArgumentException(
                    "Latitude and longitude are required."
            );
        }

        if (latitude < -90
                || latitude > 90) {

            throw new IllegalArgumentException(
                    "Latitude must be between -90 and 90."
            );
        }

        if (longitude < -180
                || longitude > 180) {

            throw new IllegalArgumentException(
                    "Longitude must be between -180 and 180."
            );
        }
    }

    private void validateHistoryDates(
            LocalDate startDate,
            LocalDate endDate) {

        if (startDate == null
                || endDate == null) {

            throw new IllegalArgumentException(
                    "Start date and end date are required."
            );
        }

        if (startDate.isAfter(endDate)) {

            throw new IllegalArgumentException(
                    "Start date cannot be after end date."
            );
        }

        if (endDate.isAfter(LocalDate.now())) {

            throw new IllegalArgumentException(
                    "Weather history cannot use a future date."
            );
        }
    }

    // =========================================================
    // JSON VALUE HELPERS
    // =========================================================

    private Object getValue(
            JsonNode node,
            String field) {

        JsonNode value =
                node.path(field);

        if (value.isMissingNode()
                || value.isNull()) {

            return null;
        }

        if (value.isNumber()) {
            return value.numberValue();
        }

        return value.asText();
    }

    private int getValueAsInt(
            JsonNode node,
            String field,
            int defaultValue) {

        JsonNode value =
                node.path(field);

        if (value.isMissingNode()
                || value.isNull()) {

            return defaultValue;
        }

        return value.asInt(defaultValue);
    }

    private List<Object> readArray(
            JsonNode parent,
            String field) {

        List<Object> values =
                new ArrayList<>();

        JsonNode array =
                parent.path(field);

        if (!array.isArray()) {
            return values;
        }

        for (JsonNode value : array) {

            if (value.isNull()) {

                values.add(null);

            } else if (value.isNumber()) {

                values.add(
                        value.numberValue()
                );

            } else {

                values.add(
                        value.asText()
                );
            }
        }

        return values;
    }

    private List<Object> readFirstN(
            JsonNode parent,
            String field,
            int maxItems) {

        List<Object> values =
                new ArrayList<>();

        JsonNode array =
                parent.path(field);

        if (!array.isArray()) {
            return values;
        }

        int limit =
                Math.min(
                        array.size(),
                        maxItems
                );

        for (int i = 0; i < limit; i++) {

            JsonNode value =
                    array.get(i);

            if (value == null
                    || value.isNull()) {

                values.add(null);

            } else if (value.isNumber()) {

                values.add(
                        value.numberValue()
                );

            } else {

                values.add(
                        value.asText()
                );
            }
        }

        return values;
    }

    // =========================================================
    // FIXED JSON ITERATION
    // =========================================================

    private Object convertObjectNode(
            JsonNode node) {

        if (node == null
                || node.isMissingNode()
                || node.isNull()) {

            return new LinkedHashMap<>();
        }

        Map<String, Object> result =
                new LinkedHashMap<>();

        /*
         * Do not use node.fields().
         *
         * fieldNames() is used here so we can iterate
         * through the JSON object's field names and then
         * retrieve each value using node.get(name).
         */

        var fieldNames =
                node.fieldNames();

        while (fieldNames.hasNext()) {

            String fieldName =
                    fieldNames.next();

            JsonNode value =
                    node.get(fieldName);

            if (value == null
                    || value.isNull()) {

                result.put(
                        fieldName,
                        null
                );

            } else if (value.isNumber()) {

                result.put(
                        fieldName,
                        value.numberValue()
                );

            } else if (value.isBoolean()) {

                result.put(
                        fieldName,
                        value.booleanValue()
                );

            } else {

                result.put(
                        fieldName,
                        value.asText()
                );
            }
        }

        return result;
    }

    // =========================================================
    // ARRAY HELPERS
    // =========================================================

    private String getArrayText(
            JsonNode array,
            int index) {

        if (array == null
                || !array.isArray()
                || index >= array.size()) {

            return null;
        }

        JsonNode value =
                array.get(index);

        if (value == null
                || value.isNull()) {

            return null;
        }

        return value.asText();
    }

    private int getArrayInt(
            JsonNode array,
            int index,
            int defaultValue) {

        if (array == null
                || !array.isArray()
                || index >= array.size()) {

            return defaultValue;
        }

        JsonNode value =
                array.get(index);

        if (value == null
                || value.isNull()) {

            return defaultValue;
        }

        return value.asInt(defaultValue);
    }

    private double getArrayDouble(
            JsonNode array,
            int index,
            double defaultValue) {

        if (array == null
                || !array.isArray()
                || index >= array.size()) {

            return defaultValue;
        }

        JsonNode value =
                array.get(index);

        if (value == null
                || value.isNull()) {

            return defaultValue;
        }

        return value.asDouble(defaultValue);
    }

    // =========================================================
    // WEATHER DESCRIPTIONS
    // =========================================================

    private String weatherCodeDescription(
            int code) {

        return switch (code) {

            case 0 ->
                    "Clear sky";

            case 1 ->
                    "Mainly clear";

            case 2 ->
                    "Partly cloudy";

            case 3 ->
                    "Overcast";

            case 45, 48 ->
                    "Fog";

            case 51, 53, 55 ->
                    "Drizzle";

            case 56, 57 ->
                    "Freezing drizzle";

            case 61, 63, 65 ->
                    "Rain";

            case 66, 67 ->
                    "Freezing rain";

            case 71, 73, 75, 77 ->
                    "Snow";

            case 80, 81, 82 ->
                    "Rain showers";

            case 85, 86 ->
                    "Snow showers";

            case 95 ->
                    "Thunderstorm";

            case 96, 99 ->
                    "Thunderstorm with hail";

            default ->
                    "Unknown weather condition";
        };
    }

    private List<String> buildWeatherDescriptions(
            JsonNode parent,
            String field) {

        List<String> descriptions =
                new ArrayList<>();

        JsonNode array =
                parent.path(field);

        if (!array.isArray()) {
            return descriptions;
        }

        for (JsonNode value : array) {

            descriptions.add(
                    weatherCodeDescription(
                            value.asInt(-1)
                    )
            );
        }

        return descriptions;
    }

    // =========================================================
    // AIR QUALITY CATEGORY
    // =========================================================

    private String getAirQualityCategory(
            double aqi) {

        if (aqi < 0) {
            return "UNKNOWN";
        }

        if (aqi <= 50) {
            return "GOOD";
        }

        if (aqi <= 100) {
            return "MODERATE";
        }

        if (aqi <= 150) {
            return "UNHEALTHY_FOR_SENSITIVE_GROUPS";
        }

        if (aqi <= 200) {
            return "UNHEALTHY";
        }

        if (aqi <= 300) {
            return "VERY_UNHEALTHY";
        }

        return "HAZARDOUS";
    }

    // =========================================================
    // ALERT BUILDER
    // =========================================================

    private Map<String, Object> createAlert(
            String type,
            String severity,
            String time,
            String message) {

        Map<String, Object> alert =
                new LinkedHashMap<>();

        alert.put(
                "type",
                type
        );

        alert.put(
                "severity",
                severity
        );

        alert.put(
                "time",
                time
        );

        alert.put(
                "message",
                message
        );

        return alert;
    }
}