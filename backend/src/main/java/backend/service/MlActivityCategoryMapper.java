package backend.service;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MlActivityCategoryMapper {

    private static final Map<String, String> CATEGORY_MAPPINGS =
            Map.ofEntries(

                // Beach
                Map.entry("beach", "Beach"),
                Map.entry("beaches", "Beach"),
                Map.entry("seaside", "Beach"),

                // Boating
                Map.entry("boating", "Boating"),
                Map.entry("boat ride", "Boating"),
                Map.entry("boating activity", "Boating"),
                Map.entry("cruise", "Boating"),

                // Cycling
                Map.entry("cycling", "Cycling"),
                Map.entry("biking", "Cycling"),
                Map.entry("bike ride", "Cycling"),
                Map.entry("bicycle", "Cycling"),

                // Indoor Games
                Map.entry("indoor games", "Indoor Games"),
                Map.entry("game zone", "Indoor Games"),
                Map.entry("arcade", "Indoor Games"),
                Map.entry("gaming", "Indoor Games"),

                // Museum
                Map.entry("museum", "Museum"),
                Map.entry("art museum", "Museum"),
                Map.entry("history museum", "Museum"),

                // Shopping
                Map.entry("shopping", "Shopping"),
                Map.entry("shopping mall", "Shopping"),
                Map.entry("mall", "Shopping"),
                Map.entry("market", "Shopping"),

                // Sightseeing
                Map.entry("sightseeing", "Sightseeing"),
                Map.entry("tourist attraction", "Sightseeing"),
                Map.entry("landmark", "Sightseeing"),
                Map.entry("monument", "Sightseeing"),
                Map.entry("historical site", "Sightseeing"),

                // Trekking
                Map.entry("trekking", "Trekking"),
                Map.entry("hiking", "Trekking"),
                Map.entry("trek", "Trekking"),
                Map.entry("mountain trail", "Trekking")
            );

    private static final Set<String> VALID_ML_TYPES = Set.of(
            "Beach",
            "Boating",
            "Cycling",
            "Indoor Games",
            "Museum",
            "Shopping",
            "Sightseeing",
            "Trekking"
    );

    public String mapCategory(String originalCategory) {

        if (originalCategory == null ||
                originalCategory.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Destination category is required for ML itinerary generation."
            );
        }

        String normalized = originalCategory
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ");

        String mapped = CATEGORY_MAPPINGS.get(normalized);

        if (mapped == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported destination category: '"
                            + originalCategory
                            + "'. Supported ML categories are: "
                            + VALID_ML_TYPES
                            + ". Please update the destination category."
            );
        }

        return mapped;
    }

    public boolean isSupportedCategory(String category) {

        if (category == null) {
            return false;
        }

        return CATEGORY_MAPPINGS.containsKey(
                category.trim()
                        .toLowerCase(Locale.ROOT)
                        .replaceAll("\\s+", " ")
        );
    }
}
