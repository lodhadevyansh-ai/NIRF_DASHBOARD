"""NIRF Analytics Dashboard — Analytics API Routes.

Exposes computational endpoints for longitudinal and multi-dimensional analysis:
- Time-Series Trajectory, Improvements, Declines, Average Scores, and Consistency
"""

from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.analytics import (
    AnnualMobilityItem,
    AverageScoreResponse,
    BandMovementResponse,
    BivariateRelationshipResponse,
    CategorySpreadResponse,
    CompareStatesResponse,
    ConsistentTopResponse,
    CustomBivariateRequest,
    DescriptiveStatisticsResponse,
    DistributionTrendResponse,
    HistoricalCorrelationResponse,
    InstitutionLookupItem,
    InstitutionalMobilityResponse,
    LargestMovementsResponse,
    NewlyAppearingResponse,
    ParameterCorrelationMatrixResponse,
    ParameterDiscrepancyResponse,
    ParameterGapResponse,
    ParameterVariabilityResponse,
    RankDistributionResponse,
    RankShiftsResponse,
    RankingVolatilityResponse,
    ResearchOutlierResponse,
    ResearchTeachingGapResponse,
    ScoreChangeOutlierResponse,
    ScoreDispersionResponse,
    ScoreDistributionAnalyticsResponse,
    ScoreImprovementDespiteDeclineResponse,
    ScoreQuartilesResponse,
    StateDistributionResponse,
    StateScoreDistributionResponse,
    StateGrowthResponse,
    StrongParamPoorRankResponse,
    TopFiveComparisonResponse,
    Top10ComparisonResponse,
    Top10EntryExitResponse,
    TopStatesResponse,
    TrajectoryResponse,
    TransitionRetentionResponse,
    MedianIQRTrendResponse,
)
from app.schemas.responses import (
    DynamicChartResponse,
    DynamicQueryRequest,
    ExplorerSchemaResponse,
    RecommendedChartInfo,
)
from app.services.analytics.bivariate import bivariate_service
from app.services.analytics.distribution import distribution_service
from app.services.analytics.geospatial import geospatial_service
from app.services.analytics.multivariate import multivariate_service
from app.services.analytics.outlier_detection import outlier_detection_service
from app.services.analytics.ranking_transitions import ranking_transitions_service
from app.services.analytics.time_series import time_series_service
from app.services.analytics.univariate import univariate_service
from app.services.chart_service import chart_service, ChartServiceError

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _unwrap(val: Any, default: Any = None) -> Any:
    """Safely unpack values that may be FastAPI Query or Path parameter defaults during testing."""
    if hasattr(val, "default"):
        return val.default if val.default is not Ellipsis else default
    return val if val is not None else default


@router.get(
    "/time-series/institutions",
    response_model=List[InstitutionLookupItem],
    summary="Get Institutions in Category for Time-Series Lookup",
    description="Returns distinct institutions appearing in the selected category sorted by frequency and rank.",
)
async def get_time_series_institutions(
    category: str = Query("Overall", description="NIRF category discipline."),
) -> List[InstitutionLookupItem]:
    """Retrieve institution lookup options for category."""
    return time_series_service.get_category_institutions(category=category)


@router.get(
    "/time-series/trajectory",
    response_model=TrajectoryResponse,
    summary="Q1.1 Institutional Rank & Score Trajectory",
    description="Returns historical rank, overall score, and parameter trends from 2017 to 2025 for a selected institution.",
)
async def get_trajectory(
    category: str = Query("Overall", description="NIRF category discipline."),
    institution: Optional[str] = Query(None, description="Institution name or official ID. Defaults to top ranked."),
) -> TrajectoryResponse:
    """Retrieve longitudinal trajectory of an institution."""
    try:
        return time_series_service.get_trajectory(category=category, institution=_unwrap(institution, None))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compute trajectory: {exc}")


@router.get(
    "/time-series/improvements",
    response_model=RankShiftsResponse,
    summary="Q1.2 Top Ranking Improvements",
    description="Identifies institutions with the greatest positive rank improvement (Starting Rank - Ending Rank) between two editions.",
)
async def get_improvements(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2017, description="Base starting year."),
    end_year: int = Query(2025, description="Comparison ending year."),
    limit: int = Query(10, ge=1, le=100, description="Maximum institutions to return."),
) -> RankShiftsResponse:
    """Retrieve top ranking improvements."""
    if start_year >= end_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({start_year}) must be strictly less than end_year ({end_year}).",
        )
    try:
        return time_series_service.get_rank_shifts(
            category=category,
            start_year=start_year,
            end_year=end_year,
            metric_type="improvement",
            limit=limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate improvements: {exc}")


@router.get(
    "/time-series/declines",
    response_model=RankShiftsResponse,
    summary="Q1.3 Largest Ranking Declines",
    description="Identifies institutions experiencing the largest ranking decline (Ending Rank - Starting Rank) between two editions.",
)
async def get_declines(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2017, description="Base starting year."),
    end_year: int = Query(2025, description="Comparison ending year."),
    limit: int = Query(10, ge=1, le=100, description="Maximum institutions to return."),
) -> RankShiftsResponse:
    """Retrieve largest ranking declines."""
    if start_year >= end_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({start_year}) must be strictly less than end_year ({end_year}).",
        )
    try:
        return time_series_service.get_rank_shifts(
            category=category,
            start_year=start_year,
            end_year=end_year,
            metric_type="decline",
            limit=limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate declines: {exc}")


@router.get(
    "/time-series/average-score",
    response_model=AverageScoreResponse,
    summary="Q1.4 Category Longitudinal Score Dynamics",
    description="Calculates average, median, IQR, and dispersion of overall scores by year across NIRF editions.",
)
async def get_average_score_trend(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: Optional[int] = Query(None, description="Starting year filter."),
    end_year: Optional[int] = Query(None, description="Ending year filter."),
) -> AverageScoreResponse:
    """Retrieve annual score distribution trends."""
    s_yr = _unwrap(start_year, None)
    e_yr = _unwrap(end_year, None)
    if s_yr is not None and e_yr is not None and s_yr >= e_yr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({s_yr}) must be strictly less than end_year ({e_yr}).",
        )
    try:
        return time_series_service.get_average_score_trend(
            category=category,
            start_year=s_yr,
            end_year=e_yr,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate score trend: {exc}")


@router.get(
    "/time-series/consistent-top",
    response_model=ConsistentTopResponse,
    summary="Q1.5 Persistent Top-Tier Institutions",
    description="Identifies institutions consistently ranked within the Top-N tier across multiple NIRF editions.",
)
async def get_consistent_top(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: Optional[int] = Query(None, description="Starting year filter."),
    end_year: Optional[int] = Query(None, description="Ending year filter."),
    top_n: int = Query(10, ge=1, le=100, description="Top-N ranking threshold (default 10)."),
    limit: int = Query(20, ge=1, le=100, description="Maximum institutions to return."),
) -> ConsistentTopResponse:
    """Retrieve persistent top-tier performers."""
    s_yr = _unwrap(start_year, None)
    e_yr = _unwrap(end_year, None)
    if s_yr is not None and e_yr is not None and s_yr >= e_yr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({s_yr}) must be strictly less than end_year ({e_yr}).",
        )
    try:
        return time_series_service.get_consistent_top(
            category=category,
            start_year=s_yr,
            end_year=e_yr,
            top_n=top_n,
            limit=limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compute consistency: {exc}")


# ---------------------------------------------------------------------------
# Geospatial Analytics Endpoints (Q2.1 - Q2.5)
# ---------------------------------------------------------------------------
@router.get(
    "/geospatial/top-states",
    response_model=TopStatesResponse,
    summary="Q2.1 Top States Representation & Hub Concentration",
    description="Identifies states with the highest representation in top rankings, computing leading state, total states, and top-3 concentration.",
)
async def get_top_states(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking year."),
    top_n: int = Query(100, ge=0, le=500, description="Top-N ranking threshold (0 for all)."),
) -> TopStatesResponse:
    """Retrieve state-wise representation in top ranking tiers."""
    try:
        return geospatial_service.get_top_states(category=category, year=year, top_n=top_n)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate top states: {exc}")


@router.get(
    "/geospatial/distribution-trend",
    response_model=DistributionTrendResponse,
    summary="Q2.2 Geographic Distribution Trend (2017–2025)",
    description="Tracks how geographical representation and regional share have shifted across editions.",
)
async def get_distribution_trend(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: Optional[int] = Query(None, description="Active comparison year."),
) -> DistributionTrendResponse:
    """Retrieve geographic distribution trends."""
    try:
        return geospatial_service.get_distribution_trend(category=category, year=_unwrap(year, None))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate distribution trend: {exc}")


@router.get(
    "/geospatial/state-growth",
    response_model=StateGrowthResponse,
    summary="Q2.3 State-wise Institutional Representation Growth",
    description="Calculates changes in top-100 institution counts by state between starting and ending years.",
)
async def get_state_growth(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2017, description="Baseline starting year."),
    end_year: int = Query(2025, description="Comparison ending year."),
    top_n: int = Query(100, ge=0, le=500, description="Top-N threshold."),
) -> StateGrowthResponse:
    """Retrieve state-level growth metrics."""
    if start_year >= end_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({start_year}) must be strictly less than end_year ({end_year}).",
        )
    try:
        return geospatial_service.get_state_growth(
            category=category,
            start_year=start_year,
            end_year=end_year,
            top_n=top_n,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate state growth: {exc}")


@router.get(
    "/geospatial/compare-states",
    response_model=CompareStatesResponse,
    summary="Q2.4 Dual-State Comparative Analytics",
    description="Direct comparative profiling between two states (e.g. Karnataka vs Tamil Nadu) across counts, scores, and rankings.",
)
async def compare_states(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition."),
    state_a: str = Query("Karnataka", description="First state for comparison."),
    state_b: str = Query("Tamil Nadu", description="Second state for comparison."),
) -> CompareStatesResponse:
    """Retrieve comparative analysis between two states."""
    try:
        return geospatial_service.compare_states(
            category=category,
            year=year,
            state_a=state_a,
            state_b=state_b,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compare states: {exc}")


@router.get(
    "/geospatial/newly-appearing",
    response_model=NewlyAppearingResponse,
    summary="Q2.5 Newly Appearing Institutions Breakdown by State",
    description="Aggregates by state all institutions making their first-ever debut in NIRF rankings within the selected period.",
)
async def get_newly_appearing(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2017, description="Baseline threshold year."),
    end_year: int = Query(2025, description="Span ending year."),
) -> NewlyAppearingResponse:
    """Retrieve newly appearing institutions grouped by state."""
    if start_year >= end_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({start_year}) must be strictly less than end_year ({end_year}).",
        )
    try:
        return geospatial_service.get_newly_appearing(
            category=category,
            start_year=start_year,
            end_year=end_year,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to aggregate newly appearing institutions: {exc}")


# ---------------------------------------------------------------------------
# Univariate Analytics Endpoints (Q3.1 - Q3.5)
# ---------------------------------------------------------------------------
@router.get(
    "/univariate/score-distribution",
    response_model=ScoreDistributionAnalyticsResponse,
    summary="Q3.1 Score Distribution Histogram & Frequency",
    description="Calculates score histogram bins, frequency, percentage share, and raw score series for a selected year and category.",
)
async def get_score_distribution(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition."),
    bins: int = Query(15, ge=5, le=50, description="Number of histogram bins."),
) -> ScoreDistributionAnalyticsResponse:
    """Retrieve score distribution metrics and histogram binning."""
    try:
        return univariate_service.get_score_distribution(category=category, year=year, bins=bins)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate score distribution: {exc}")


@router.get(
    "/univariate/rank-distribution",
    response_model=RankDistributionResponse,
    summary="Q3.2 Institutional Rank Distribution & Tier Brackets",
    description="Analyzes rank distribution across standardized brackets (Top 25, 26–50, etc.) with separate exact rank and rank-band tallies.",
)
async def get_rank_distribution(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: Optional[int] = Query(None, description="Optional single year filter."),
    min_rank: Optional[int] = Query(None, description="Lower rank boundary filter."),
    max_rank: Optional[int] = Query(None, description="Upper rank boundary filter."),
) -> RankDistributionResponse:
    """Retrieve rank distribution across tiers and brackets."""
    try:
        return univariate_service.get_rank_distribution(
            category=category,
            year=_unwrap(year, None),
            min_rank=_unwrap(min_rank, None),
            max_rank=_unwrap(max_rank, None),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate rank distribution: {exc}")


@router.get(
    "/univariate/descriptive-statistics",
    response_model=DescriptiveStatisticsResponse,
    summary="Q3.3 Descriptive Statistics across NIRF Parameters",
    description="Computes central tendency (mean, median), dispersion (std dev, variance, IQR), extremes (min, max), and skewness for all parameters.",
)
async def get_descriptive_statistics(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition."),
) -> DescriptiveStatisticsResponse:
    """Retrieve comprehensive descriptive statistics for all parameters."""
    try:
        return univariate_service.get_descriptive_statistics(category=category, year=year)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate descriptive statistics: {exc}")


@router.get(
    "/univariate/score-quartiles",
    response_model=ScoreQuartilesResponse,
    summary="Q3.4 Score Quartiles Breakdown (Q1–Q4)",
    description="Dissects the filtered score distribution into statistical quartiles (Q1, Q2, Q3, Q4) with institution counts and boundary cutoffs.",
)
async def get_score_quartiles(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition."),
) -> ScoreQuartilesResponse:
    """Retrieve score quartile boundaries and institution frequencies."""
    try:
        return univariate_service.get_score_quartiles(category=category, year=year)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate score quartiles: {exc}")


@router.get(
    "/univariate/category-spread",
    response_model=CategorySpreadResponse,
    summary="Q3.5 Cross-Category Score Spread & Box Plot Data",
    description="Provides comparative distribution spreads, medians, IQRs, and raw scores across all categories in a given year.",
)
async def get_category_spread(
    year: int = Query(2025, description="Ranking edition."),
) -> CategorySpreadResponse:
    """Retrieve cross-category score distributions for comparative box plots."""
    try:
        return univariate_service.get_category_spread(year=year)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate category spread: {exc}")


# ---------------------------------------------------------------------------
# Bivariate Analytics Endpoints (Q4.1 - Q4.5 & Custom Two-Variable Selection)
# ---------------------------------------------------------------------------
@router.get(
    "/bivariate/rpc-score",
    response_model=BivariateRelationshipResponse,
    summary="Q4.1 Research & Professional Practice (RPC) vs Overall Score",
    description="Scatter plot and linear regression analyzing relationship between research scores and overall composite rank scores.",
)
async def get_rpc_vs_overall(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
) -> BivariateRelationshipResponse:
    """Retrieve RPC vs Overall Score correlation and scatter data."""
    try:
        return bivariate_service.compute_bivariate_relationship(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
            var_x="rpc_score",
            var_y="overall_score",
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to analyze RPC vs Overall: {exc}")


@router.get(
    "/bivariate/pr-score",
    response_model=BivariateRelationshipResponse,
    summary="Q4.2 Perception (PR) vs Overall Score",
    description="Scatter plot and linear regression analyzing relationship between institutional perception and overall scores.",
)
async def get_pr_vs_overall(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
) -> BivariateRelationshipResponse:
    """Retrieve PR vs Overall Score correlation and scatter data."""
    try:
        return bivariate_service.compute_bivariate_relationship(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
            var_x="pr_score",
            var_y="overall_score",
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to analyze PR vs Overall: {exc}")


@router.get(
    "/bivariate/parameter-correlation",
    response_model=ParameterCorrelationMatrixResponse,
    summary="Q4.3 Strongest Parameter Correlation Hierarchy & Correlation Matrix",
    description="Ranks all NIRF parameters by correlation strength with overall score, and computes complete pairwise correlation matrix.",
)
async def get_parameter_correlation(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
    target_variable: str = Query("overall_score", description="Target parameter to correlate against."),
) -> ParameterCorrelationMatrixResponse:
    """Retrieve ranked parameter correlations and heatmap correlation matrix."""
    try:
        return bivariate_service.get_parameter_correlation_ranking(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
            target_variable=_unwrap(target_variable, "overall_score"),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compute parameter correlation: {exc}")


@router.get(
    "/bivariate/tlr-rpc",
    response_model=BivariateRelationshipResponse,
    summary="Q4.4 Teaching (TLR) vs Research (RPC) Performance",
    description="Scatter plot comparing teaching resources against research output, identifying teaching-heavy vs research-heavy institutions.",
)
async def get_tlr_vs_rpc(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
) -> BivariateRelationshipResponse:
    """Retrieve TLR vs RPC correlation and quadrant scatter data."""
    try:
        return bivariate_service.compute_bivariate_relationship(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
            var_x="tlr_score",
            var_y="rpc_score",
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to analyze TLR vs RPC: {exc}")


@router.get(
    "/bivariate/historical-correlation",
    response_model=HistoricalCorrelationResponse,
    summary="Q4.5 Historical Correlation Longitudinal Stability (2017–2025)",
    description="Tracks how the correlation between research scores and overall scores has shifted across NIRF editions.",
)
async def get_historical_correlation(
    category: str = Query("Overall", description="NIRF category discipline."),
    var_x: str = Query("rpc_score", description="First variable."),
    var_y: str = Query("overall_score", description="Second variable."),
    start_year: int = Query(2017, description="Baseline year."),
    end_year: int = Query(2025, description="Comparison ending year."),
) -> HistoricalCorrelationResponse:
    """Retrieve historical correlation trajectory across editions."""
    v_x = _unwrap(var_x, "rpc_score")
    v_y = _unwrap(var_y, "overall_score")
    s_yr = _unwrap(start_year, 2017)
    e_yr = _unwrap(end_year, 2025)
    if s_yr >= e_yr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({s_yr}) must be strictly less than end_year ({e_yr}).",
        )
    try:
        return bivariate_service.get_historical_correlation(
            category=category,
            var_x=v_x,
            var_y=v_y,
            start_year=s_yr,
            end_year=e_yr,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compute historical correlation: {exc}")


@router.post(
    "/bivariate/custom",
    response_model=BivariateRelationshipResponse,
    summary="General-purpose Select Two Variables Bivariate Interface",
    description="Calculates scatter points, Pearson/Spearman correlation, regression line, and interpretation for any two selected numerical columns.",
)
async def post_custom_bivariate(
    request: CustomBivariateRequest,
) -> BivariateRelationshipResponse:
    """Compute customized bivariate analysis between two arbitrary variables."""
    try:
        return bivariate_service.compute_bivariate_relationship(
            category=request.category,
            year=request.year,
            var_x=request.var_x,
            var_y=request.var_y,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compute custom bivariate analysis: {exc}")


# ---------------------------------------------------------------------------
# Multivariate Analytics Endpoints (Q5.1 - Q5.5)
# ---------------------------------------------------------------------------
@router.get(
    "/multivariate/top-five",
    response_model=TopFiveComparisonResponse,
    summary="Q5.1 Top Five Multi-Parameter Comparison",
    description="Compares the top five institutions across all evaluated parameters for radar chart and grouped bar visualizers.",
)
async def get_top_five(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
) -> TopFiveComparisonResponse:
    """Retrieve top 5 institutions and their complete 5-parameter profiles."""
    try:
        return multivariate_service.get_top_five(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to analyze top five: {exc}")


@router.get(
    "/multivariate/research-teaching-gap",
    response_model=ParameterDiscrepancyResponse,
    summary="Q5.2 High Research, Low Teaching Discrepancy",
    description="Identifies institutions with disproportionately high RPC scores alongside lower TLR scores using percentile screening.",
)
async def get_research_teaching_gap(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
) -> ParameterDiscrepancyResponse:
    """Retrieve institutions with high RPC and relatively low TLR."""
    try:
        return multivariate_service.get_research_teaching_gap(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to analyze research-teaching gap: {exc}")


@router.get(
    "/multivariate/teaching-perception-gap",
    response_model=ParameterDiscrepancyResponse,
    summary="Q5.3 High Teaching, Low Perception Discrepancy",
    description="Identifies institutions with strong teaching metrics (TLR) alongside lagging perception reputations (PR).",
)
async def get_teaching_perception_gap(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
) -> ParameterDiscrepancyResponse:
    """Retrieve institutions with high TLR and relatively low PR."""
    try:
        return multivariate_service.get_teaching_perception_gap(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to analyze teaching-perception gap: {exc}")


@router.get(
    "/multivariate/score-improvement",
    response_model=ScoreImprovementDespiteDeclineResponse,
    summary="Q5.4 Score Improvement Despite Parameter Regression",
    description="Identifies institutions whose overall composite score improved between two editions despite regressions in one or more component parameters.",
)
async def get_score_improvement(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2023, description="Baseline starting year."),
    end_year: int = Query(2025, description="Comparison ending year."),
) -> ScoreImprovementDespiteDeclineResponse:
    """Retrieve institutions achieving overall improvement despite component declines."""
    s_yr = _unwrap(start_year, 2023)
    e_yr = _unwrap(end_year, 2025)
    if s_yr >= e_yr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({s_yr}) must be strictly less than end_year ({e_yr}).",
        )
    try:
        return multivariate_service.get_score_improvement(
            category=_unwrap(category, "Overall"),
            start_year=s_yr,
            end_year=e_yr,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to analyze score improvement: {exc}")


@router.get(
    "/multivariate/parameter-gap",
    response_model=ParameterGapResponse,
    summary="Q5.5 Maximum Parameter Gap Disparity",
    description="Calculates disparity between strongest and weakest parameter score for each institution, ranking highest imbalances.",
)
async def get_parameter_gap(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
) -> ParameterGapResponse:
    """Retrieve ranked parameter gap disparities across cohort."""
    try:
        return multivariate_service.get_parameter_gap(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compute parameter gaps: {exc}")


# ---------------------------------------------------------------------------
# Distribution & Statistical Comparison Endpoints (Q6.1 - Q6.5)
# ---------------------------------------------------------------------------
@router.get(
    "/statistics/top10-comparison",
    response_model=Top10ComparisonResponse,
    summary="Q6.1 Top 10 vs Remaining Score Distribution Comparison",
    description="Compares the score distribution between the premier top 10 institutions and the remaining cohort.",
)
async def get_top10_comparison(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
) -> Top10ComparisonResponse:
    """Retrieve score distribution comparison between Top 10 and remaining institutions."""
    try:
        return distribution_service.get_top10_comparison(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compare Top 10 vs remaining: {exc}")


@router.get(
    "/statistics/score-dispersion",
    response_model=ScoreDispersionResponse,
    summary="Q6.2 Score Dispersion Across Years",
    description="Calculates variance, standard deviation, interquartile range, and coefficient of variation across available years.",
)
async def get_score_dispersion(
    category: str = Query("Overall", description="NIRF category discipline."),
) -> ScoreDispersionResponse:
    """Retrieve longitudinal dispersion metrics across all ranking years."""
    try:
        return distribution_service.get_score_dispersion(
            category=_unwrap(category, "Overall"),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate score dispersion: {exc}")


@router.get(
    "/statistics/parameter-variability",
    response_model=ParameterVariabilityResponse,
    summary="Q6.3 Parameter Variability & Relative Dispersion",
    description="Ranks all NIRF parameters by Coefficient of Variation (CV) and variance across institutions.",
)
async def get_parameter_variability(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
) -> ParameterVariabilityResponse:
    """Retrieve parameter variability metrics and relative dispersion rankings."""
    try:
        return distribution_service.get_parameter_variability(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate parameter variability: {exc}")


@router.get(
    "/statistics/median-iqr-trend",
    response_model=MedianIQRTrendResponse,
    summary="Q6.4 Median and IQR Longitudinal Trend",
    description="Calculates yearly median, Q1, Q3, and IQR bounds from 2017 to 2025 to visualize central tendency and interquartile dispersion bands.",
)
async def get_median_iqr_trend(
    category: str = Query("Overall", description="NIRF category discipline."),
) -> MedianIQRTrendResponse:
    """Retrieve median and IQR longitudinal trend trajectory."""
    try:
        return distribution_service.get_median_iqr_trend(
            category=_unwrap(category, "Overall"),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate median and IQR trend: {exc}")


@router.get(
    "/statistics/state-distribution",
    response_model=StateScoreDistributionResponse,
    summary="Q6.5 State Score Distribution",
    description="Calculates state-wise score distributions, box plot metrics, and descriptive statistics.",
)
async def get_state_distribution(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
    min_institutions: int = Query(1, description="Minimum number of institutions required for a state."),
) -> StateScoreDistributionResponse:
    """Retrieve state-wise score distribution metrics."""
    try:
        return distribution_service.get_state_distribution(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
            min_institutions=_unwrap(min_institutions, 1),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate state distribution: {exc}")


# ---------------------------------------------------------------------------
# Ranking Transitions & Institutional Mobility Endpoints (Q7.1 - Q7.5)
# ---------------------------------------------------------------------------
@router.get(
    "/transitions/band-movement",
    response_model=BandMovementResponse,
    summary="Q7.1 Rank Band Movement & Sankey Flow",
    description="Tracks movements across rank bands (1–10, 11–25, 26–50, 51–100) between two selected years, highlighting institutions climbing from 51–100 into the top 50.",
)
async def get_band_movement(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2023, description="Baseline starting edition year."),
    end_year: int = Query(2025, description="Comparison ending edition year."),
) -> BandMovementResponse:
    """Retrieve rank band transition flows and Sankey data."""
    s_yr = _unwrap(start_year, 2023)
    e_yr = _unwrap(end_year, 2025)
    if s_yr >= e_yr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({s_yr}) must be strictly earlier than end_year ({e_yr}).",
        )
    try:
        return ranking_transitions_service.get_band_movement(
            category=_unwrap(category, "Overall"),
            start_year=s_yr,
            end_year=e_yr,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compute band movements: {exc}")


@router.get(
    "/transitions/top10-entry-exit",
    response_model=Top10EntryExitResponse,
    summary="Q7.2 Top 10 Entries and Exits",
    description="Identifies premier institutions entering, exiting, or retaining membership in the Top 10 between editions.",
)
async def get_top10_entry_exit(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2024, description="Starting edition year."),
    end_year: int = Query(2025, description="Ending edition year."),
) -> Top10EntryExitResponse:
    """Retrieve top 10 entrants, exits, and stability rate."""
    s_yr = _unwrap(start_year, 2024)
    e_yr = _unwrap(end_year, 2025)
    if s_yr >= e_yr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({s_yr}) must be strictly earlier than end_year ({e_yr}).",
        )
    try:
        return ranking_transitions_service.get_top10_entry_exit(
            category=_unwrap(category, "Overall"),
            start_year=s_yr,
            end_year=e_yr,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to analyze Top 10 turnover: {exc}")


@router.get(
    "/transitions/retention",
    response_model=TransitionRetentionResponse,
    summary="Q7.3 Rank Band Retention & Markov Transition Matrix",
    description="Calculates band retention rates, upward and downward mobility shares, and Markov transition matrix cells.",
)
async def get_band_retention(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2023, description="Baseline starting edition year."),
    end_year: int = Query(2025, description="Comparison ending edition year."),
) -> TransitionRetentionResponse:
    """Retrieve band retention statistics and Markov transition matrix."""
    s_yr = _unwrap(start_year, 2023)
    e_yr = _unwrap(end_year, 2025)
    if s_yr >= e_yr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({s_yr}) must be strictly earlier than end_year ({e_yr}).",
        )
    try:
        return ranking_transitions_service.get_band_retention(
            category=_unwrap(category, "Overall"),
            start_year=s_yr,
            end_year=e_yr,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate band retention: {exc}")


@router.get(
    "/transitions/largest-movements",
    response_model=LargestMovementsResponse,
    summary="Q7.4 Largest Climbers and Fallers",
    description="Identifies institutions with the largest upward and downward rank movements between two selected years.",
)
async def get_largest_movements(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2023, description="Baseline starting edition year."),
    end_year: int = Query(2025, description="Comparison ending edition year."),
    limit: int = Query(10, description="Number of top climbers/fallers to return."),
) -> LargestMovementsResponse:
    """Retrieve largest institutional rank climbers and fallers."""
    s_yr = _unwrap(start_year, 2023)
    e_yr = _unwrap(end_year, 2025)
    if s_yr >= e_yr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({s_yr}) must be strictly earlier than end_year ({e_yr}).",
        )
    try:
        return ranking_transitions_service.get_largest_movements(
            category=_unwrap(category, "Overall"),
            start_year=s_yr,
            end_year=e_yr,
            limit=_unwrap(limit, 10),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch largest movements: {exc}")


@router.get(
    "/transitions/mobility",
    response_model=InstitutionalMobilityResponse,
    summary="Q7.5 Institutional Mobility Annual History",
    description="Computes historical mobility shares (Up, Down, Retained percentages) for all consecutive year pairs.",
)
async def get_institutional_mobility(
    category: str = Query("Overall", description="NIRF category discipline."),
) -> InstitutionalMobilityResponse:
    """Retrieve annual mobility history across all editions."""
    try:
        return ranking_transitions_service.get_institutional_mobility(
            category=_unwrap(category, "Overall"),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to calculate institutional mobility history: {exc}")


# ---------------------------------------------------------------------------
# Outlier Detection & Performance Gaps Endpoints (Q8.1 - Q8.5)
# ---------------------------------------------------------------------------
@router.get(
    "/outliers/research",
    response_model=ResearchOutlierResponse,
    summary="Q8.1 Research Outliers Relative to Overall Score",
    description="Identifies institutions with unusually strong RPC performance relative to their Overall Score using OLS regression residuals and user-selected method (zscore or iqr).",
)
async def get_research_outliers(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
    method: str = Query("zscore", description="Detection method ('zscore' or 'iqr')."),
    threshold: float = Query(2.0, description="Outlier threshold (e.g. 1.5, 2.0)."),
) -> ResearchOutlierResponse:
    """Retrieve research outlier points, OLS regression, and highlighted anomalies."""
    try:
        return outlier_detection_service.get_research_outliers(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
            method=_unwrap(method, "zscore"),
            threshold=_unwrap(threshold, 2.0),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to detect research outliers: {exc}")


@router.get(
    "/outliers/research-teaching",
    response_model=ResearchTeachingGapResponse,
    summary="Q8.2 Research vs Teaching Divergence Gap",
    description="Identifies institutions performing substantially better in Research (RPC) than in Teaching (TLR) based on statistical divergence.",
)
async def get_research_teaching_gap_outliers(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
    method: str = Query("zscore", description="Detection method ('zscore' or 'iqr')."),
    threshold: float = Query(2.0, description="Outlier cutoff threshold."),
) -> ResearchTeachingGapResponse:
    """Retrieve institutions with extreme positive Research-to-Teaching gaps."""
    try:
        return outlier_detection_service.get_research_teaching_gap(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
            method=_unwrap(method, "zscore"),
            threshold=_unwrap(threshold, 2.0),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to evaluate research vs teaching gaps: {exc}")


@router.get(
    "/outliers/score-changes",
    response_model=ScoreChangeOutlierResponse,
    summary="Q8.3 Year-to-Year Score Change Outliers",
    description="Identifies institutions experiencing statistically anomalous score jumps or drops between two consecutive editions.",
)
async def get_score_change_outliers(
    category: str = Query("Overall", description="NIRF category discipline."),
    start_year: int = Query(2024, description="Starting edition year."),
    end_year: int = Query(2025, description="Ending edition year."),
    method: str = Query("zscore", description="Detection method ('zscore' or 'iqr')."),
    threshold: float = Query(2.0, description="Cutoff threshold."),
) -> ScoreChangeOutlierResponse:
    """Retrieve institutions with unusual year-over-year score movements."""
    s_yr = _unwrap(start_year, 2024)
    e_yr = _unwrap(end_year, 2025)
    if s_yr >= e_yr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_year ({s_yr}) must be strictly earlier than end_year ({e_yr}).",
        )
    try:
        return outlier_detection_service.get_score_change_outliers(
            category=_unwrap(category, "Overall"),
            start_year=s_yr,
            end_year=e_yr,
            method=_unwrap(method, "zscore"),
            threshold=_unwrap(threshold, 2.0),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compute score change outliers: {exc}")


@router.get(
    "/outliers/parameter-performance",
    response_model=StrongParamPoorRankResponse,
    summary="Q8.4 Strong Parameter Score but Poor Overall Rank",
    description="Identifies institutions achieving high marks in a selected parameter while holding a lagging overall ranking.",
)
async def get_strong_param_poor_rank(
    category: str = Query("Overall", description="NIRF category discipline."),
    year: int = Query(2025, description="Ranking edition year."),
    parameter: str = Query("rpc_score", description="Parameter column to evaluate."),
    param_percentile_min: float = Query(60.0, description="Minimum parameter percentile threshold."),
    rank_min: int = Query(50, description="Minimum overall rank threshold."),
) -> StrongParamPoorRankResponse:
    """Retrieve institutions with high parameter achievement but lower composite rank."""
    try:
        return outlier_detection_service.get_strong_param_poor_rank(
            category=_unwrap(category, "Overall"),
            year=_unwrap(year, 2025),
            parameter=_unwrap(parameter, "rpc_score"),
            param_percentile_min=_unwrap(param_percentile_min, 60.0),
            rank_min=_unwrap(rank_min, 50),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to evaluate parameter performance discrepancies: {exc}")


@router.get(
    "/outliers/ranking-volatility",
    response_model=RankingVolatilityResponse,
    summary="Q8.5 Multi-Year Ranking Volatility Outliers",
    description="Identifies institutions exhibiting statistically extreme rank fluctuation (high standard deviation & mean absolute shifts).",
)
async def get_ranking_volatility(
    category: str = Query("Overall", description="NIRF category discipline."),
    min_years: int = Query(4, description="Minimum years of participation required."),
    method: str = Query("zscore", description="Detection method ('zscore' or 'iqr')."),
    threshold: float = Query(1.5, description="Cutoff threshold for high volatility."),
) -> RankingVolatilityResponse:
    """Retrieve multi-year ranking volatility metrics and anomalous fluctuating entities."""
    try:
        return outlier_detection_service.get_ranking_volatility(
            category=_unwrap(category, "Overall"),
            min_years=_unwrap(min_years, 4),
            method=_unwrap(method, "zscore"),
            threshold=_unwrap(threshold, 1.5),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to compute ranking volatility: {exc}")


# ---------------------------------------------------------------------------
# Dynamic Explorer Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/explorer/schema",
    response_model=ExplorerSchemaResponse,
    summary="Dynamic Explorer Schema & Options",
    description="Returns metadata for dataset variables, domains, and 14 supported chart types.",
)
async def get_explorer_schema() -> ExplorerSchemaResponse:
    """Fetch variables, types, and chart configurations for dynamic exploration."""
    try:
        return chart_service.get_explorer_schema()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch explorer schema: {exc}",
        )


@router.post(
    "/explorer/query",
    response_model=DynamicChartResponse,
    summary="Dynamic Analytical Query & Chart Generation",
    description="Generates dynamic Plotly traces, descriptive statistics, and data table from user selections.",
)
async def execute_explorer_query(query: DynamicQueryRequest) -> DynamicChartResponse:
    """Execute dynamic query and return customized visualization data."""
    try:
        return chart_service.execute_query(query)
    except ChartServiceError as cse:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=cse.message)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute dynamic chart query: {exc}",
        )


@router.get(
    "/explorer/recommend",
    response_model=RecommendedChartInfo,
    summary="Automatic Chart Recommendation",
    description="Provides intelligent chart recommendation based on variable types and analysis purpose.",
)
async def recommend_chart(
    x_var: Optional[str] = Query(None, description="Primary variable"),
    y_var: Optional[str] = Query(None, description="Secondary variable"),
    group_var: Optional[str] = Query(None, description="Grouping variable"),
    color_var: Optional[str] = Query(None, description="Color variable"),
    size_var: Optional[str] = Query(None, description="Size variable"),
    analysis_purpose: Optional[str] = Query(None, description="Analytical goal"),
) -> RecommendedChartInfo:
    """Determine the optimal chart type using structural heuristics and analysis purpose."""
    try:
        return chart_service.recommend_chart(
            x_var=_unwrap(x_var),
            y_var=_unwrap(y_var),
            group_var=_unwrap(group_var),
            color_var=_unwrap(color_var),
            size_var=_unwrap(size_var),
            analysis_purpose=_unwrap(analysis_purpose),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute chart recommendation: {exc}",
        )









