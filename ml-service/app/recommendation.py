
from .topsis import rank_activities
from .optimizer import optimize_itinerary


def score_and_rank(request, predictor):

    predictions, frame, condition = (
        predictor.predict(
            request.weather,
            request.activities
        )
    )

    warnings = predictor.range_warnings(
        frame,
        request.activities
    )

    rows = []

    for activity, prediction in zip(
        request.activities,
        predictions
    ):

        rows.append({

            "candidate_id":
                activity.candidate_id,

            "activity_type":
                activity.activity_type,

            "predicted_suitability":
                float(prediction),

            "user_preference":
                float(activity.user_preference),

            "budget_match":
                float(activity.budget_match)
        })

    ranked = rank_activities(rows)

    for row in ranked:

        if not (
            0.0 <= row["predicted_suitability"] <= 1.0
        ):

            warnings.append({

                "candidate_id":
                    row["candidate_id"],

                "feature":
                    "predicted_suitability",

                "value":
                    row["predicted_suitability"],

                "message":
                    "Prediction is outside target range [0, 1]. "
                    "It was not clipped."
            })

    return ranked, condition, warnings


def generate(request, predictor):

    ranked, condition, warnings = score_and_rank(
        request,
        predictor
    )

    itinerary = optimize_itinerary(
        ranked,
        request
    )

    return {

        "weather_condition": condition,

        "rankings": ranked,

        "itinerary": itinerary,

        "warnings": warnings,

        "model": {
            "name": "XGBRegressor",
            "feature_count": 24
        }
    }


def replan(request, predictor):

    result = generate(
        request,
        predictor
    )

    previous = set(
        request.previous_selected_ids
    )

    current = {
        item["candidate_id"]
        for item in result["itinerary"]["schedule"]
    }

    result["changes"] = {

        "retained_candidate_ids":
            sorted(previous & current),

        "removed_candidate_ids":
            sorted(previous - current),

        "added_candidate_ids":
            sorted(current - previous)
    }

    return result
