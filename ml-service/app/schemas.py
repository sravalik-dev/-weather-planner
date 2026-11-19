
from datetime import time
from typing import Literal

from pydantic import (
    BaseModel,
    Field,
    ConfigDict,
    model_validator
)

ActivityType = Literal[
    "Beach",
    "Boating",
    "Cycling",
    "Indoor Games",
    "Museum",
    "Shopping",
    "Sightseeing",
    "Trekking"
]


class WeatherInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    temperature: float = Field(ge=-80, le=70)
    humidity: float = Field(ge=0, le=100)
    rainfall: float = Field(ge=0)
    wind_speed: float = Field(ge=0)
    cloud_cover: float = Field(ge=0, le=100)


class ActivityCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1, max_length=100)
    activity_type: ActivityType

    user_preference: float = Field(ge=0, le=1)
    budget_match: float = Field(ge=0, le=1)

    duration_minutes: int = Field(gt=0, le=1440)
    estimated_cost: float = Field(ge=0)

    opening_time: time
    closing_time: time

    @model_validator(mode="after")
    def validate_hours(self):
        if self.closing_time <= self.opening_time:
            raise ValueError(
                "Closing time must be later than opening time"
            )
        return self


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weather: WeatherInput
    activities: list[ActivityCandidate] = Field(
        min_length=1,
        max_length=8
    )

    @model_validator(mode="after")
    def validate_candidates(self):
        ids = [a.candidate_id for a in self.activities]
        types = [a.activity_type for a in self.activities]

        if len(ids) != len(set(ids)):
            raise ValueError("Candidate IDs must be unique")

        if len(types) != len(set(types)):
            raise ValueError(
                "Only one candidate per activity type is supported"
            )

        return self


class ItineraryRequest(PredictionRequest):
    start_time: time
    end_time: time
    budget: float = Field(ge=0)

    travel_time_matrix: dict[str, dict[str, float]]

    @model_validator(mode="after")
    def validate_itinerary(self):
        if self.end_time <= self.start_time:
            raise ValueError(
                "End time must be later than start time"
            )

        ids = {a.candidate_id for a in self.activities}

        if set(self.travel_time_matrix) != ids:
            raise ValueError(
                "Travel matrix must contain every candidate"
            )

        for source in ids:
            row = self.travel_time_matrix[source]

            if set(row) != ids:
                raise ValueError(
                    f"Invalid travel matrix row: {source}"
                )

            for minutes in row.values():
                if minutes < 0:
                    raise ValueError(
                        "Travel time cannot be negative"
                    )

        return self


class ReplanRequest(ItineraryRequest):
    previous_selected_ids: list[str] = Field(
        default_factory=list
    )
