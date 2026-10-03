package backend.controller;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.WeatherHistoryRequest;
import backend.service.WeatherService;

@RestController
@RequestMapping("/api/weather")
@CrossOrigin(origins = {
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178"
})
public class WeatherController {

    @Autowired
    private WeatherService weatherService;

    // ==========================================
    // COMPLETE WEATHER DASHBOARD
    // ==========================================

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getWeatherDashboard(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // CURRENT WEATHER
    // ==========================================

    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> current(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getCurrentWeather(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // HOURLY FORECAST
    // ==========================================

    @GetMapping("/hourly")
    public ResponseEntity<Map<String, Object>> hourly(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getHourlyForecast(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // DAILY FORECAST
    // ==========================================

    @GetMapping("/daily")
    public ResponseEntity<Map<String, Object>> daily(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getDailyForecast(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // RAIN PREDICTION
    // ==========================================

    @GetMapping("/rain")
    public ResponseEntity<Map<String, Object>> rain(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getRainPrediction(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // TEMPERATURE
    // ==========================================

    @GetMapping("/temperature")
    public ResponseEntity<Map<String, Object>> temperature(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getTemperature(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // HUMIDITY
    // ==========================================

    @GetMapping("/humidity")
    public ResponseEntity<Map<String, Object>> humidity(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getHumidity(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // WIND
    // ==========================================

    @GetMapping("/wind")
    public ResponseEntity<Map<String, Object>> wind(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getWind(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // UV INDEX
    // ==========================================

    @GetMapping("/uv")
    public ResponseEntity<Map<String, Object>> uv(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getUvIndex(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // AIR QUALITY
    // ==========================================

    @GetMapping("/air-quality")
    public ResponseEntity<Map<String, Object>> airQuality(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getAirQuality(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // SEVERE WEATHER CONDITIONS
    // ==========================================

    @GetMapping("/alerts")
    public ResponseEntity<Map<String, Object>> alerts(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {

        return ResponseEntity.ok(
                weatherService.getWeatherAlerts(
                        latitude,
                        longitude
                )
        );
    }

    // ==========================================
    // WEATHER HISTORY
    // ==========================================

    @PostMapping("/history")
    public ResponseEntity<Map<String, Object>> history(
            @RequestBody WeatherHistoryRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Weather history request cannot be null."
            );
        }

        if (request.getLatitude() == null ||
                request.getLongitude() == null) {

            throw new IllegalArgumentException(
                    "Latitude and longitude are required."
            );
        }

        if (request.getStartDate() == null ||
                request.getStartDate().isBlank()) {

            throw new IllegalArgumentException(
                    "Start date is required."
            );
        }

        if (request.getEndDate() == null ||
                request.getEndDate().isBlank()) {

            throw new IllegalArgumentException(
                    "End date is required."
            );
        }

        final LocalDate startDate;
        final LocalDate endDate;

        try {
            startDate = LocalDate.parse(
                    request.getStartDate().trim()
            );

            endDate = LocalDate.parse(
                    request.getEndDate().trim()
            );

        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(
                    "Dates must use YYYY-MM-DD format."
            );
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException(
                    "Start date cannot be after end date."
            );
        }

        return ResponseEntity.ok(
                weatherService.getWeatherHistory(
                        request.getLatitude(),
                        request.getLongitude(),
                        startDate,
                        endDate
                )
        );
    }
}