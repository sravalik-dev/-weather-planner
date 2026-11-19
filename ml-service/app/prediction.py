
import json
from pathlib import Path

import numpy as np
from xgboost import XGBRegressor

from .preprocessing import (
    load_feature_names,
    build_feature_frame
)


class ModelPredictor:

    def __init__(self, model_dir: Path):

        self.model_dir = model_dir
        self.model = None
        self.feature_names = None
        self.training_ranges = None

    def load(self):

        # Use the native XGBoost JSON model
        model_path = (
            self.model_dir / "xgb_model.json"
        )

        names_path = (
            self.model_dir / "feature_names.json"
        )

        ranges_path = (
            self.model_dir / "training_ranges.json"
        )

        for path in (
            model_path,
            names_path,
            ranges_path
        ):

            if not path.is_file():
                raise FileNotFoundError(
                    f"Model artifact missing: {path}"
                )

        # Load expected feature names
        self.feature_names = load_feature_names(
            names_path
        )

        # Load the trained XGBoost model
        self.model = XGBRegressor()

        self.model.load_model(
            str(model_path)
        )

        # Validate feature count
        actual_features = (
            self.model.get_booster().num_features()
        )

        if actual_features != 24:

            raise ValueError(
                f"Model must expect exactly 24 features. "
                f"Found: {actual_features}"
            )

        # Validate feature order when metadata is available
        booster_names = (
            self.model.get_booster().feature_names
        )

        if (
            booster_names is not None
            and booster_names != self.feature_names
        ):

            raise ValueError(
                "Model feature order mismatch"
            )

        if len(self.feature_names) != 24:

            raise ValueError(
                "feature_names.json must contain exactly 24 features"
            )

        # Load training ranges
        self.training_ranges = json.loads(
            ranges_path.read_text(
                encoding="utf-8"
            )
        )

    def predict(self, weather, activities):

        if self.model is None:
            raise RuntimeError(
                "Model has not been loaded"
            )

        frame, condition = build_feature_frame(
            weather,
            activities,
            self.feature_names
        )

        predictions = np.asarray(
            self.model.predict(frame),
            dtype=float
        )

        if not np.isfinite(predictions).all():

            raise ValueError(
                "Model returned invalid predictions"
            )

        return predictions, frame, condition

    def range_warnings(self, frame, activities):

        warnings = []

        for column, bounds in (
            self.training_ranges.items()
        ):

            if column not in frame.columns:
                continue

            low = bounds["min"]
            high = bounds["max"]

            for index, value in enumerate(
                frame[column].tolist()
            ):

                if value < low or value > high:

                    warnings.append({
                        "candidate_id":
                            activities[index].candidate_id,

                        "feature": column,
                        "value": float(value),
                        "training_min": low,
                        "training_max": high,

                        "message":
                            "Input is outside observed training "
                            "range. Prediction was not clipped."
                    })

        return warnings
