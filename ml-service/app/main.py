
import logging
import os

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import (
    FastAPI,
    HTTPException,
    Request
)

from fastapi.responses import JSONResponse

from .prediction import ModelPredictor

from .schemas import (
    PredictionRequest,
    ItineraryRequest,
    ReplanRequest
)

from .recommendation import (
    score_and_rank,
    generate,
    replan
)


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO")
)

logger = logging.getLogger(
    "weather-ml-service"
)

MODEL_DIR = Path(
    os.getenv(
        "MODEL_DIR",
        Path(__file__).resolve().parent.parent / "models"
    )
)

predictor = ModelPredictor(MODEL_DIR)


@asynccontextmanager
async def lifespan(app: FastAPI):

    try:

        predictor.load()

        logger.info(
            "XGBoost model loaded successfully."
        )

    except Exception:

        logger.exception(
            "Unable to load model artifacts."
        )

        raise

    yield


app = FastAPI(
    title="Weather Adaptive Itinerary ML Service",
    description=(
        "XGBoost suitability prediction, "
        "TOPSIS ranking and itinerary optimization."
    ),
    version="1.0.0",
    lifespan=lifespan
)


@app.exception_handler(ValueError)
async def value_error_handler(
    request: Request,
    exc: ValueError
):

    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)}
    )


@app.get("/")
def root():

    return {
        "message":
            "Weather Adaptive Itinerary ML Service",
        "documentation": "/docs"
    }


@app.get("/health")
def health():

    return {

        "status":
            "UP" if predictor.model is not None else "DOWN",

        "model_loaded":
            predictor.model is not None,

        "feature_count":
            len(predictor.feature_names or [])
    }


@app.post("/ml/predict-suitability")
def predict_suitability(
    payload: PredictionRequest
):

    try:

        ranked, condition, warnings = (
            score_and_rank(
                payload,
                predictor
            )
        )

        return {

            "weather_condition": condition,

            "rankings": ranked,

            "warnings": warnings,

            "model": {
                "name": "XGBRegressor",
                "feature_count": 24
            }
        }

    except (ValueError, RuntimeError) as exc:

        raise HTTPException(
            status_code=422,
            detail=str(exc)
        ) from exc

    except Exception as exc:

        logger.exception(
            "Prediction failed"
        )

        raise HTTPException(
            status_code=500,
            detail="ML prediction failed"
        ) from exc


@app.post("/ml/generate-itinerary")
def generate_itinerary(
    payload: ItineraryRequest
):

    try:

        return generate(
            payload,
            predictor
        )

    except (ValueError, RuntimeError) as exc:

        raise HTTPException(
            status_code=422,
            detail=str(exc)
        ) from exc

    except Exception as exc:

        logger.exception(
            "Itinerary generation failed"
        )

        raise HTTPException(
            status_code=500,
            detail="Itinerary generation failed"
        ) from exc


@app.post("/ml/replan-itinerary")
def replan_itinerary(
    payload: ReplanRequest
):

    try:

        return replan(
            payload,
            predictor
        )

    except (ValueError, RuntimeError) as exc:

        raise HTTPException(
            status_code=422,
            detail=str(exc)
        ) from exc

    except Exception as exc:

        logger.exception(
            "Itinerary replanning failed"
        )

        raise HTTPException(
            status_code=500,
            detail="Itinerary replanning failed"
        ) from exc
