"""NIRF Analytics Dashboard — FastAPI Application Entry Point.

Provides institutional rankings intelligence, statistical computations,
faceted filtering, and dataset inspection endpoints for the React 19 frontend.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
import sys

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.routes.analytics import router as analytics_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.filters import router as filters_router
from app.api.routes.institutions import router as institutions_router
from app.api.routes.nlq import router as nlq_router
from app.core.config import settings
from app.core.database import DatasetError, dataset_manager
from app.schemas.dataset import (
    ColumnMetadata,
    DatasetColumnsResponse,
    DatasetStatusResponse,
    DatasetSummaryResponse,
    ErrorResponse,
    HealthResponse,
)

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("nirf_backend.main")


# ---------------------------------------------------------------------------
# Lifespan Event Management (Preload Dataset on Startup)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown routines."""
    logger.info("Initializing %s v%s in %s environment", settings.PROJECT_NAME, settings.VERSION, settings.ENVIRONMENT)

    # Pre-load master dataset into memory on startup
    try:
        if dataset_manager.is_available():
            df = dataset_manager.load_dataset()
            logger.info(
                "Dataset ready: %d records, %d categories, years %d-%d",
                len(df),
                df["category"].nunique(),
                df["year"].min(),
                df["year"].max(),
            )
        else:
            logger.warning(
                "Master dataset CSV is not yet present at '%s'. Endpoints requiring data will return 503.",
                settings.dataset_file_path.name,
            )
    except Exception as exc:
        logger.error("Error during initial dataset loading: %s", exc)

    yield

    logger.info("Shutting down %s", settings.PROJECT_NAME)


# ---------------------------------------------------------------------------
# FastAPI Initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Centralized Error Handlers
# ---------------------------------------------------------------------------
@app.exception_handler(DatasetError)
async def dataset_error_handler(request: Request, exc: DatasetError) -> JSONResponse:
    """Handle custom DatasetError exceptions gracefully."""
    logger.warning("DatasetError encountered on %s: %s", request.url.path, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="DatasetUnavailable",
            message=exc.message,
            status_code=exc.status_code,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle input validation failures consistently."""
    logger.info("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error="ValidationError",
            message="Request parameters failed validation.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ).model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle standard FastAPI HTTPExceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="HTTPException",
            message=exc.detail,
            status_code=exc.status_code,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all unhandled exceptions with structured logging."""
    logger.exception("Unhandled server exception on %s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="InternalServerError",
            message="An unexpected server error occurred. Please try again later.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            timestamp=datetime.now(timezone.utc).isoformat(),
        ).model_dump(),
    )


# ---------------------------------------------------------------------------
# Core Root & Documentation Redirects
# ---------------------------------------------------------------------------
@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    """Redirect API root to Swagger UI documentation."""
    return RedirectResponse(url="/docs")


# ---------------------------------------------------------------------------
# Foundation API Endpoints
# ---------------------------------------------------------------------------
@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Application Health Check",
    description="Returns the operational status of the API server, timestamp, environment, and dataset presence.",
)
async def get_health() -> HealthResponse:
    """Health status endpoint."""
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
        dataset_available=dataset_manager.is_available(),
    )


@app.get(
    "/api/dataset/status",
    response_model=DatasetStatusResponse,
    tags=["Dataset"],
    summary="Master Dataset Status",
    description=(
        "Returns file availability, file size, total records, total columns, "
        "available categories, available years, and last modified timestamp."
    ),
)
async def get_dataset_status() -> DatasetStatusResponse:
    """Dataset availability and metadata endpoint."""
    status_data = dataset_manager.get_status()
    return DatasetStatusResponse(**status_data)


@app.get(
    "/api/dataset/columns",
    response_model=DatasetColumnsResponse,
    tags=["Dataset"],
    summary="Master Dataset Column Schema",
    description="Returns the detailed schema of all 23 columns including data types, missing percentages, and sample values.",
)
async def get_dataset_columns() -> DatasetColumnsResponse:
    """Dataset columns schema introspection endpoint."""
    cols = dataset_manager.get_columns_metadata()
    return DatasetColumnsResponse(
        total_columns=len(cols),
        columns=[ColumnMetadata(**col) for col in cols],
    )


@app.get(
    "/api/dataset/summary",
    response_model=DatasetSummaryResponse,
    tags=["Dataset"],
    summary="Master Dataset Summary Statistics",
    description="Returns macro aggregations, unique entity counts, category breakdowns, and year distributions.",
)
async def get_dataset_summary() -> DatasetSummaryResponse:
    """Dataset macro summary endpoint."""
    summary_data = dataset_manager.get_dataset_summary()
    return DatasetSummaryResponse(**summary_data)


# ---------------------------------------------------------------------------
# Mount Feature API Routers
# ---------------------------------------------------------------------------
app.include_router(filters_router, prefix=settings.API_PREFIX)
app.include_router(institutions_router, prefix=settings.API_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(nlq_router, prefix=settings.API_PREFIX)
