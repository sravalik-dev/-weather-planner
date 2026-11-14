package backend.service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Chooses the right weather for a recommendation.
 *
 * THE PROBLEM THIS FIXES
 * ----------------------
 * Recommendations were always built from the CURRENT weather reading, even
 * when the trip starts weeks later, and the current reading does not contain
 * a rain probability at all (it was always 0). So the "high chance of rain
 * -> prefer indoor places" rules could never trigger.
 *
 * HOW IT WORKS NOW
 * ----------------
 *  - planned date is today        -> current conditions, plus today's rain
 *                                    probability from the daily forecast
 *  - planned date within forecast -> that day's forecast (high temperature,
 *                                    rain probability, UV, wind, weather code)
 *  - anything else                -> current conditions, clearly labelled as
 *                                    a fallback so the screen can say so
 *
 * This class has NO Spring dependency so it can be tested on its own.
 */
public class RecommendationWeatherResolver {

    public static final String BASIS_CURRENT = "CURRENT";
    public static final String BASIS_FORECAST = "FORECAST";
    public static final String BASIS_CURRENT_FALLBACK = "CURRENT_FALLBACK";

    private RecommendationWeatherResolver() {
    }

    /**
     * @param planning map with "current" (map) and "daily" (map of lists),
     *                 as returned by WeatherService.getPlanningWeather
     * @param date     the planned date
     * @param today    today's date (passed in so tests are deterministic)
     * @return a flat map using the keys RecommendationService already reads
     */
    public static Map<String, Object> resolve(
            Map<String, Object> planning,
            LocalDate date,
            LocalDate today) {

        Map<String, Object> current = planning == null
                ? Map.of()
                : asMap(planning.get("current"));

        Map<String, Object> daily = planning == null
                ? Map.of()
                : asMap(planning.get("daily"));

        int index = indexOfDate(daily.get("time"), date);

        Map<String, Object> result = new LinkedHashMap<>();

        boolean hasCurrent = !current.isEmpty();

        if (index >= 0 && !date.equals(today)) {
            // ---- a day in the forecast window ----
            result.put("temperature", number(daily.get("temperatureMax"), index));
            result.put("rainProbability", number(daily.get("precipitationProbabilityMax"), index));
            result.put("uvIndex", number(daily.get("uvIndexMax"), index));
            result.put("windSpeed", number(daily.get("windSpeedMax"), index));
            result.put("weatherCode", number(daily.get("weatherCode"), index));
            result.put("weatherDescription", text(daily.get("weatherDescription"), index));
            // The daily forecast has no humidity; the current value is the
            // best available approximation.
            result.put("humidity", hasCurrent ? current.get("humidity") : null);
            result.put("weatherBasis", BASIS_FORECAST);
            result.put("weatherDate", date.toString());
            return result;
        }

        if (hasCurrent) {
            result.put("temperature", current.get("temperature"));
            result.put("humidity", current.get("humidity"));
            result.put("windSpeed", current.get("windSpeed"));
            result.put("uvIndex", current.get("uvIndex"));
            result.put("weatherCode", current.get("weatherCode"));
            result.put("weatherDescription", current.get("weatherDescription"));

            Double probability = index >= 0
                    ? number(daily.get("precipitationProbabilityMax"), index)
                    : null;

            // If it is raining right now, never report a low probability.
            double rainingNow = Math.max(
                    doubleOrZero(current.get("rain")),
                    doubleOrZero(current.get("precipitation")));

            double rain = probability == null ? 0.0 : probability;
            if (rainingNow > 0) {
                rain = Math.max(rain, 90.0);
            }
            result.put("rainProbability", rain);

            boolean isToday = date.equals(today);
            result.put("weatherBasis",
                    isToday ? BASIS_CURRENT : BASIS_CURRENT_FALLBACK);
            result.put("weatherDate", today.toString());
            return result;
        }

        // Nothing usable at all.
        return result;
    }

    // ---------------------------------------------------------------

    private static Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> copy = new LinkedHashMap<>();
            map.forEach((k, v) -> copy.put(String.valueOf(k), v));
            return copy;
        }
        return Map.of();
    }

    private static int indexOfDate(Object times, LocalDate date) {
        if (!(times instanceof List<?> list)) {
            return -1;
        }
        String wanted = date.toString();
        for (int i = 0; i < list.size(); i++) {
            Object item = list.get(i);
            // Open-Meteo daily times look like "2026-11-14".
            if (item != null && String.valueOf(item).startsWith(wanted)) {
                return i;
            }
        }
        return -1;
    }

    private static Double number(Object list, int index) {
        if (list instanceof List<?> values
                && index >= 0 && index < values.size()
                && values.get(index) instanceof Number n) {
            return n.doubleValue();
        }
        return null;
    }

    private static String text(Object list, int index) {
        if (list instanceof List<?> values
                && index >= 0 && index < values.size()
                && values.get(index) != null) {
            return String.valueOf(values.get(index));
        }
        return null;
    }

    private static double doubleOrZero(Object value) {
        return value instanceof Number n ? n.doubleValue() : 0.0;
    }
}
