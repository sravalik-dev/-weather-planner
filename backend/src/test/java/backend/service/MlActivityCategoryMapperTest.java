package backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

class MlActivityCategoryMapperTest {

    private final MlActivityCategoryMapper mapper =
            new MlActivityCategoryMapper();

    @Test
    void mapsShoppingMallToShopping() {
        assertEquals(
                "Shopping",
                mapper.mapCategory("Shopping Mall")
        );
    }

    @Test
    void mapsBikeRideToCycling() {
        assertEquals(
                "Cycling",
                mapper.mapCategory("Bike Ride")
        );
    }

    @Test
    void mapsCaseInsensitiveCategory() {
        assertEquals(
                "Museum",
                mapper.mapCategory("  MUSEUM  ")
        );
    }

    @Test
    void rejectsUnknownCategory() {
        assertThrows(
                ResponseStatusException.class,
                () -> mapper.mapCategory("Park")
        );
    }

    @Test
    void rejectsEmptyCategory() {
        assertThrows(
                ResponseStatusException.class,
                () -> mapper.mapCategory(" ")
        );
    }
}
