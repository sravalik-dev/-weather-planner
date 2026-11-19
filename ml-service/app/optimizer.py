
from datetime import time


def to_minutes(value: time) -> int:

    return value.hour * 60 + value.minute


def format_time(value: float) -> str:

    total = int(round(value))

    return (
        f"{total // 60:02d}:"
        f"{total % 60:02d}"
    )


def optimize_itinerary(ranked, request):

    by_id = {
        activity.candidate_id: activity
        for activity in request.activities
    }

    start = to_minutes(request.start_time)
    end = to_minutes(request.end_time)

    best = {
        "score": -1.0,
        "path": [],
        "cost": 0.0,
        "duration": 0.0,
        "travel": float("inf"),
        "finish": float("inf")
    }

    def search(
        current_time,
        previous_id,
        remaining,
        path,
        cost,
        duration,
        travel,
        score
    ):

        better = (
            score > best["score"] + 1e-9
            or (
                abs(score - best["score"]) <= 1e-9
                and (
                    travel < best["travel"]
                    or (
                        travel == best["travel"]
                        and current_time < best["finish"]
                    )
                )
            )
        )

        if better:

            best.update({
                "score": score,
                "path": path.copy(),
                "cost": cost,
                "duration": duration,
                "travel": travel,
                "finish": current_time
            })

        for item in remaining:

            candidate_id = item["candidate_id"]
            candidate = by_id[candidate_id]

            next_cost = (
                cost + float(candidate.estimated_cost)
            )

            if next_cost > request.budget:
                continue

            travel_minutes = (
                0.0
                if previous_id is None
                else float(
                    request.travel_time_matrix[
                        previous_id
                    ][candidate_id]
                )
            )

            arrival = current_time + travel_minutes

            visit_start = max(
                arrival,
                to_minutes(candidate.opening_time)
            )

            visit_end = (
                visit_start + candidate.duration_minutes
            )

            if visit_end > to_minutes(
                candidate.closing_time
            ):
                continue

            if visit_end > end:
                continue

            entry = {

                "candidate_id": candidate_id,

                "activity_type":
                    candidate.activity_type,

                "start_time":
                    format_time(visit_start),

                "end_time":
                    format_time(visit_end),

                "duration_minutes":
                    candidate.duration_minutes,

                "estimated_cost":
                    float(candidate.estimated_cost),

                "travel_before_minutes":
                    travel_minutes,

                "topsis_score":
                    float(item["topsis_score"]),

                "predicted_suitability":
                    float(item["predicted_suitability"]),

                "rank": int(item["rank"])
            }

            next_remaining = [
                x for x in remaining
                if x["candidate_id"] != candidate_id
            ]

            search(
                visit_end,
                candidate_id,
                next_remaining,
                path + [entry],
                next_cost,
                duration + candidate.duration_minutes,
                travel + travel_minutes,
                score + float(item["topsis_score"])
            )

    search(
        start,
        None,
        ranked,
        [],
        0.0,
        0.0,
        0.0,
        0.0
    )

    if not best["path"]:

        return {
            "feasible": False,

            "reason":
                "No non-empty itinerary satisfies the "
                "time, opening-hour, travel-time and "
                "budget constraints.",

            "schedule": [],
            "total_cost": 0.0,
            "remaining_budget": float(request.budget),
            "activity_duration_minutes": 0,
            "travel_minutes": 0.0,
            "finish_time": None,
            "total_topsis_score": 0.0
        }

    return {

        "feasible": True,
        "reason": None,

        "schedule": best["path"],

        "total_cost": round(
            best["cost"], 2
        ),

        "remaining_budget": round(
            float(request.budget) - best["cost"],
            2
        ),

        "activity_duration_minutes":
            best["duration"],

        "travel_minutes":
            best["travel"],

        "finish_time":
            format_time(best["finish"]),

        "total_topsis_score": round(
            best["score"], 6
        )
    }
