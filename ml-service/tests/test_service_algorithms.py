
from fastapi.testclient import TestClient

from app.main import app


def sample_payload():

    return {
        "weather": {
            "temperature": 29,
            "humidity": 45,
            "rainfall": 0,
            "wind_speed": 8,
            "cloud_cover": 10
        },

        "activities": [
            {
                "candidate_id": "beach",
                "activity_type": "Beach",
                "user_preference": 0.8,
                "budget_match": 0.8,
                "duration_minutes": 120,
                "estimated_cost": 200,
                "opening_time": "06:00:00",
                "closing_time": "18:00:00"
            },
            {
                "candidate_id": "museum",
                "activity_type": "Museum",
                "user_preference": 0.7,
                "budget_match": 0.9,
                "duration_minutes": 90,
                "estimated_cost": 100,
                "opening_time": "09:00:00",
                "closing_time": "17:00:00"
            },
            {
                "candidate_id": "shopping",
                "activity_type": "Shopping",
                "user_preference": 0.6,
                "budget_match": 0.7,
                "duration_minutes": 120,
                "estimated_cost": 400,
                "opening_time": "10:00:00",
                "closing_time": "21:00:00"
            }
        ],

        "start_time": "09:00:00",
        "end_time": "17:00:00",
        "budget": 1500,

        "travel_time_matrix": {
            "beach": {
                "beach": 0,
                "museum": 25,
                "shopping": 20
            },
            "museum": {
                "beach": 25,
                "museum": 0,
                "shopping": 15
            },
            "shopping": {
                "beach": 20,
                "museum": 15,
                "shopping": 0
            }
        }
    }


def test_health():

    with TestClient(app) as client:

        response = client.get("/health")

        assert response.status_code == 200
        assert response.json()["model_loaded"] is True
        assert response.json()["feature_count"] == 24


def test_itinerary_generation():

    with TestClient(app) as client:

        response = client.post(
            "/ml/generate-itinerary",
            json=sample_payload()
        )

        assert response.status_code == 200

        result = response.json()

        assert len(result["rankings"]) == 3

        itinerary = result["itinerary"]

        assert itinerary["feasible"] is True
        assert itinerary["total_cost"] <= 1500
        assert itinerary["finish_time"] <= "17:00"


def test_infeasible_budget():

    data = sample_payload()
    data["budget"] = 1

    with TestClient(app) as client:

        response = client.post(
            "/ml/generate-itinerary",
            json=data
        )

        assert response.status_code == 200

        result = response.json()

        assert result["itinerary"]["feasible"] is False


def test_weather_condition():

    data = sample_payload()

    data["weather"]["rainfall"] = 5

    with TestClient(app) as client:

        response = client.post(
            "/ml/predict-suitability",
            json={
                "weather": data["weather"],
                "activities": data["activities"]
            }
        )

        assert response.status_code == 200

        assert (
            response.json()["weather_condition"]
            == "Rainy"
        )
