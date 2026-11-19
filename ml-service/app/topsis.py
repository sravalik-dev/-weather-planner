
import numpy as np

from .catalog import (
    TOPSIS_CRITERIA,
    TOPSIS_WEIGHTS
)


def rank_activities(records):

    if not records:
        return []

    matrix = np.asarray(
        [
            [
                float(row[criterion])
                for criterion in TOPSIS_CRITERIA
            ]
            for row in records
        ],
        dtype=float
    )

    # Step 1: Vector normalization

    denominator = np.sqrt(
        (matrix ** 2).sum(axis=0)
    )

    denominator[denominator == 0] = 1.0

    normalized = matrix / denominator

    # Step 2: Apply weights

    weights = np.asarray(
        TOPSIS_WEIGHTS,
        dtype=float
    )

    weighted = normalized * weights

    # Step 3: Ideal solutions

    ideal_best = weighted.max(axis=0)
    ideal_worst = weighted.min(axis=0)

    # Step 4: Euclidean distances

    distance_best = np.sqrt(
        ((weighted - ideal_best) ** 2).sum(axis=1)
    )

    distance_worst = np.sqrt(
        ((weighted - ideal_worst) ** 2).sum(axis=1)
    )

    # Step 5: Closeness coefficient

    total = distance_best + distance_worst

    scores = np.divide(
        distance_worst,
        total,
        out=np.full_like(
            distance_worst,
            0.5
        ),
        where=total != 0
    )

    result = []

    for row, score in zip(records, scores):

        result.append({
            **row,
            "topsis_score": float(score)
        })

    result.sort(
        key=lambda item: item["topsis_score"],
        reverse=True
    )

    for rank, item in enumerate(
        result,
        start=1
    ):

        item["rank"] = rank

    return result
