"""NIRF Analytics Dashboard — Dashboard Overview API Route.

Exposes executive KPI metrics, Top-10 ranking tables, score distribution histograms,
and macro institutional insights.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Query

from app.schemas.responses import DashboardKpiResponse, TopInstitutionsResponse
from app.services.filter_service import filter_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/kpis",
    response_model=DashboardKpiResponse,
    summary="Get Executive Dashboard KPIs",
    description="Calculates the 5 primary KPI cards and cohort specifics for the selected category and year.",
)
async def get_dashboard_kpis(
    category: Optional[str] = Query("Overall", description="Selected NIRF category."),
    year: Optional[int] = Query(None, description="Selected academic ranking cycle year."),
) -> DashboardKpiResponse:
    """Fetch dashboard KPI metrics."""
    kpi_data = filter_service.get_dashboard_kpis(
        category=category,
        year=year,
    )
    return DashboardKpiResponse(**kpi_data)


@router.get(
    "/top-institutions",
    response_model=TopInstitutionsResponse,
    summary="Get Top Ranked Institutions",
    description="Returns top N institutions for the specified category and year with parameter breakdowns.",
)
async def get_top_institutions(
    category: str = Query("Overall", description="NIRF category."),
    year: int = Query(2025, description="Ranking year."),
    limit: int = Query(10, ge=1, le=100, description="Number of top institutions to return."),
) -> TopInstitutionsResponse:
    """Fetch top institutions table data."""
    institutions = filter_service.get_top_institutions(
        category=category,
        year=year,
        limit=limit,
    )
    return TopInstitutionsResponse(
        category=category,
        year=year,
        total=len(institutions),
        institutions=institutions,
    )


@router.get(
    "/score-distribution",
    summary="Get Score Distribution Histogram Data",
    description="Computes histogram bins, counts, and descriptive score statistics for the active cohort.",
)
async def get_score_distribution(
    category: str = Query("Overall", description="NIRF category."),
    year: int = Query(2025, description="Ranking year."),
    bins: int = Query(15, ge=5, le=50, description="Number of histogram bins."),
) -> Dict[str, Any]:
    """Fetch score distribution histogram bins and statistics."""
    return filter_service.get_score_distribution(
        category=category,
        year=year,
        bins=bins,
    )


@router.get(
    "/insights",
    summary="Get Additional Dashboard Insights",
    description="Computes category counts, year trends, state shares, and parameter leaders.",
)
async def get_dashboard_insights(
    category: str = Query("Overall", description="NIRF category."),
    year: int = Query(2025, description="Ranking year."),
) -> Dict[str, Any]:
    """Fetch macro dashboard insights and performance leaders."""
    return filter_service.get_dashboard_insights(
        category=category,
        year=year,
    )
