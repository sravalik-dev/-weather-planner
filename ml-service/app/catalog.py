
ACTIVITY_CATALOG = {
    "Beach": {
        "is_indoor": 0,
        "ideal_temp_min": 25,
        "ideal_temp_max": 35,
        "rain_tolerance": 1.0,
        "wind_tolerance": 20.0
    },
    "Boating": {
        "is_indoor": 0,
        "ideal_temp_min": 22,
        "ideal_temp_max": 32,
        "rain_tolerance": 1.0,
        "wind_tolerance": 15.0
    },
    "Cycling": {
        "is_indoor": 0,
        "ideal_temp_min": 15,
        "ideal_temp_max": 27,
        "rain_tolerance": 0.5,
        "wind_tolerance": 20.0
    },
    "Indoor Games": {
        "is_indoor": 1,
        "ideal_temp_min": 18,
        "ideal_temp_max": 35,
        "rain_tolerance": 15.0,
        "wind_tolerance": 50.0
    },
    "Museum": {
        "is_indoor": 1,
        "ideal_temp_min": 18,
        "ideal_temp_max": 35,
        "rain_tolerance": 15.0,
        "wind_tolerance": 50.0
    },
    "Shopping": {
        "is_indoor": 1,
        "ideal_temp_min": 18,
        "ideal_temp_max": 35,
        "rain_tolerance": 15.0,
        "wind_tolerance": 50.0
    },
    "Sightseeing": {
        "is_indoor": 0,
        "ideal_temp_min": 18,
        "ideal_temp_max": 30,
        "rain_tolerance": 2.0,
        "wind_tolerance": 30.0
    },
    "Trekking": {
        "is_indoor": 0,
        "ideal_temp_min": 15,
        "ideal_temp_max": 28,
        "rain_tolerance": 2.0,
        "wind_tolerance": 25.0
    }
}

TOPSIS_CRITERIA = [
    "predicted_suitability",
    "user_preference",
    "budget_match"
]

TOPSIS_WEIGHTS = [0.50, 0.30, 0.20]
