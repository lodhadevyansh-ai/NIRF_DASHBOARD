"""NIRF Analytics Dashboard — Filters API Route.

Exposes dynamic, dependent filter choices for category, year, state, rank, and score ranges.
"""

from typing import Optional
from fastapi import APIRouter, Query

from app.schemas.responses import FilterOptionsResponse
from app.services.filter_service import filter_service

router = APIRouter(prefix="/filters", tags=["Filters"])


@router.get(
    "/options",
    response_model=FilterOptionsResponse,
    summary="Get Dependent Filter Options",
    description=(
        "Returns available filter options dynamically. Passing a category scopes available "
        "years and states strictly to that discipline (e.g. Agriculture returns 2023–2025 only)."
    ),
)
async def get_filter_options(
    category: Optional[str] = Query(None, description="Scope filter options to a specific discipline."),
    year: Optional[int] = Query(None, description="Scope filter options to a specific ranking year."),
    state: Optional[str] = Query(None, description="Scope filter options to an Indian State/UT."),
) -> FilterOptionsResponse:
    """Fetch dynamically computed filter choices."""
    options = filter_service.get_filter_options(
        category=category,
        year=year,
        state=state,
    )
    return FilterOptionsResponse(**options)

