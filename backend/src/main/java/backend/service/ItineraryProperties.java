package backend.service;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import backend.service.ItineraryScheduler.Meal;
import backend.service.ItineraryScheduler.Settings;

/**
 * Every tunable number of the itinerary generator, read from
 * application.properties (all optional; the defaults below apply).
 *
 *   itinerary.departure-time=07:00
 *   itinerary.earliest-visit-time=07:00        (00:00 = visits may start at any hour)
 *   itinerary.default-visit-minutes=90
 *   itinerary.travel-buffer-percent=10
 *   itinerary.travel-buffer-minutes=0
 *   itinerary.max-continuous-travel-minutes=300
 *   itinerary.rest-stop-minutes=20
 *   itinerary.max-awake-minutes=960
 *   itinerary.overnight-rest-minutes=480
 *   itinerary.meal.breakfast=07:00-10:30/30      (window start-end / minutes)
 *   itinerary.meal.lunch=12:00-15:00/45
 *   itinerary.meal.dinner=19:00-22:30/45
 */
@Component
public class ItineraryProperties {

    @Value("${itinerary.departure-time:07:00}")
    private String departureTime;

    @Value("${itinerary.earliest-visit-time:07:00}")
    private String earliestVisitTime;

    @Value("${itinerary.default-visit-minutes:90}")
    private int defaultVisitMinutes;

    @Value("${itinerary.travel-buffer-percent:10}")
    private double travelBufferPercent;

    @Value("${itinerary.travel-buffer-minutes:0}")
    private int travelBufferMinutes;

    @Value("${itinerary.max-continuous-travel-minutes:300}")
    private int maxContinuousTravelMinutes;

    @Value("${itinerary.rest-stop-minutes:20}")
    private int restStopMinutes;

    @Value("${itinerary.max-awake-minutes:960}")
    private int maxAwakeMinutes;

    @Value("${itinerary.overnight-rest-minutes:480}")
    private int overnightRestMinutes;

    @Value("${itinerary.meal.breakfast:07:00-10:30/30}")
    private String breakfast;

    @Value("${itinerary.meal.lunch:12:00-15:00/45}")
    private String lunch;

    @Value("${itinerary.meal.dinner:19:00-22:30/45}")
    private String dinner;

    /** A fresh, mutable Settings object (callers may override per request). */
    public Settings toSettings() {
        Settings s = new Settings();
        s.departureTime = LocalTime.parse(departureTime.trim());
        s.earliestVisitTime = LocalTime.parse(earliestVisitTime.trim());
        s.defaultVisitMinutes = defaultVisitMinutes;
        s.travelBufferPercent = travelBufferPercent;
        s.travelBufferMinutes = travelBufferMinutes;
        s.maxContinuousTravelMinutes = maxContinuousTravelMinutes;
        s.restStopMinutes = restStopMinutes;
        s.maxAwakeMinutes = maxAwakeMinutes;
        s.overnightRestMinutes = overnightRestMinutes;

        List<Meal> meals = new ArrayList<>();
        meals.add(parseMeal("Breakfast", breakfast));
        meals.add(parseMeal("Lunch", lunch));
        meals.add(parseMeal("Dinner", dinner));
        s.meals = meals;
        return s;
    }

    /** "12:00-15:00/45" -> Meal(name, 12:00, 15:00, 45) */
    static Meal parseMeal(String name, String text) {
        try {
            String[] parts = text.trim().split("/");
            String[] window = parts[0].split("-");
            return new Meal(name, LocalTime.parse(window[0].trim()),
                    LocalTime.parse(window[1].trim()), Integer.parseInt(parts[1].trim()));
        } catch (RuntimeException e) {
            throw new IllegalStateException("Invalid itinerary.meal." + name.toLowerCase()
                    + " value '" + text + "'. Use HH:mm-HH:mm/minutes, for example 12:00-15:00/45.", e);
        }
    }
}
