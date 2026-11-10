"""NIRF Analytics Dashboard — API Routes Package."""

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.filters import router as filters_router
from app.api.routes.institutions import router as institutions_router

__all__ = [
    "dashboard_router",
    "filters_router",
    "institutions_router",
]

