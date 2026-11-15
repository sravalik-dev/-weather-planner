package backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;

import backend.entity.ItineraryActivity;
import backend.exception.ItineraryException;

class ItineraryServiceTest {

    @Test
    void fixedTravelActivityBlocksUnsafeRegeneration() {
        ItineraryActivity activity = new ItineraryActivity();
        activity.setActivityType("RETURN");

        ItineraryException exception = assertThrows(
                ItineraryException.class,
                () -> ItineraryService.rejectFixedTravelActivities(List.of(activity)));

        assertEquals(409, exception.getStatus());
    }
}
