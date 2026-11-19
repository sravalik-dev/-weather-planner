
import json
from pathlib import Path

import pandas as pd

from .catalog import ACTIVITY_CATALOG


def load_feature_names(path: Path) -> list[str]:
    names = json.loads(
        path.read_text(encoding="utf-8")
    )

    if len(names) != 24:
        raise ValueError(
            f"Expected 24 features, found {len(names)}"
        )

    return names


def weather_condition(weather) -> str:

    # Exact rule from original notebook

    if weather.rainfall >= 5:
        return "Rainy"

    if weather.cloud_cover >= 70:
        return "Cloudy"

    if weather.cloud_cover >= 30:
        return "Partly Cloudy"

    return "Sunny"


def build_feature_frame(
    weather,
    activities,
    feature_names
):

    rows = []

    condition = weather_condition(weather)

    for activity in activities:

        catalog = ACTIVITY_CATALOG[
            activity.activity_type
        ]

        row = {
            "temperature": weather.temperature,
            "humidity": weather.humidity,
            "rainfall": weather.rainfall,
            "wind_speed": weather.wind_speed,
            "cloud_cover": weather.cloud_cover,

            "is_indoor": catalog["is_indoor"],
            "ideal_temp_min": catalog["ideal_temp_min"],
            "ideal_temp_max": catalog["ideal_temp_max"],
            "rain_tolerance": catalog["rain_tolerance"],
            "wind_tolerance": catalog["wind_tolerance"],

            "user_preference": activity.user_preference,
            "budget_match": activity.budget_match
        }

        # Reproduce the notebook's one-hot encoding
        for name in feature_names:

            if name.startswith("activity_type_"):

                row[name] = int(
                    name == (
                        f"activity_type_{activity.activity_type}"
                    )
                )

            elif name.startswith("weather_condition_"):

                row[name] = int(
                    name == (
                        f"weather_condition_{condition}"
                    )
                )

        rows.append(row)

    frame = pd.DataFrame(
        rows,
        columns=feature_names
    )

    if frame.isnull().any().any():
        raise ValueError(
            "Preprocessing generated missing features"
        )

    return frame.astype(float), condition
