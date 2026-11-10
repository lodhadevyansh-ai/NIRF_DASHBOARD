"""NIRF Analytics Dashboard — Analytical Schemas.

Pydantic models for Time-Series, Geospatial, Univariate, Bivariate,
and Multivariate analytical routes.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class TrajectoryPoint(BaseModel):
    """Single-year performance point for an institution."""

    year: int = Field(..., description="Ranking year.")
    rank: str = Field(..., description="Original rank string (e.g. '1' or '101-150').")
    numeric_rank: Optional[int] = Field(None, description="Exact integer rank if not a rank band.")
    overall_score: Optional[float] = Field(None, description="Composite NIRF overall score (0–100).")
    tlr_score: Optional[float] = Field(None, description="Teaching, Learning & Resources score.")
    rpc_score: Optional[float] = Field(None, description="Research and Professional Practice score.")
    go_score: Optional[float] = Field(None, description="Graduation Outcomes score.")
    oi_score: Optional[float] = Field(None, description="Outreach and Inclusivity score.")
    pr_score: Optional[float] = Field(None, description="Perception score.")
    qnr_score: Optional[float] = Field(None, description="Quantitative Research score (Research Category).")
    qlr_score: Optional[float] = Field(None, description="Qualitative Research score (Research Category).")
    sfc_score: Optional[float] = Field(None, description="Students and Faculty Contribution score.")


class TrajectoryResponse(BaseModel):
    """Longitudinal rank and score trajectory response for an institution."""

    institution_name: str
    institute_id: Optional[str] = None
    category: str
    state: Optional[str] = None
    city: Optional[str] = None
    years_ranked: int
    best_rank: Optional[int] = None
    worst_rank: Optional[int] = None
    latest_rank: Optional[str] = None
    latest_score: Optional[float] = None
    rank_change_overall: Optional[int] = Field(
        None,
        description="Starting rank minus ending rank (positive indicates improvement)."
    )
    score_change_overall: Optional[float] = Field(
        None,
        description="Ending score minus starting score (positive indicates score gain)."
    )
    trajectory: List[TrajectoryPoint]
    parameters_available: List[str]


class RankShiftItem(BaseModel):
    """Institutional rank improvement or decline record."""

    institution_name: str
    institute_id: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    category: str
    start_year: int
    start_rank: int
    start_score: Optional[float] = None
    end_year: int
    end_rank: int
    end_score: Optional[float] = None
    rank_change: int = Field(
        ...,
        description="Magnitude of rank shift. Positive value denotes improvement or decline according to endpoint type."
    )
    score_change: Optional[float] = Field(
        None,
        description="End score minus start score."
    )


class RankShiftsResponse(BaseModel):
    """Response containing top ranking improvements or largest declines."""

    category: str
    start_year: int
    end_year: int
    metric_type: str = Field(..., description="'improvement' or 'decline'")
    total_compared: int = Field(..., description="Number of institutions with valid ranks in both years.")
    items: List[RankShiftItem]


class YearlyScoreStat(BaseModel):
    """Statistical aggregations for a category in a single year."""

    year: int
    institution_count: int
    mean_score: Optional[float] = None
    median_score: Optional[float] = None
    std_score: Optional[float] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    q25_score: Optional[float] = None
    q75_score: Optional[float] = None


class AverageScoreResponse(BaseModel):
    """Time-series macro score trajectory across NIRF editions."""

    category: str
    start_year: int
    end_year: int
    overall_mean_change: Optional[float] = Field(
        None,
        description="Net change in mean score from earliest to latest evaluated year."
    )
    yearly_stats: List[YearlyScoreStat]


class ConsistentTopInstitution(BaseModel):
    """Institution maintaining persistent presence in Top-N ranking tier."""

    institution_name: str
    institute_id: Optional[str] = None
    state: Optional[str] = None
    appearances: int = Field(..., description="Number of editions ranked in top tier.")
    total_years: int = Field(..., description="Total published editions in selected range.")
    consistency_pct: float = Field(..., description="Percentage of editions ranked in top tier.")
    average_rank: float = Field(..., description="Average rank within top appearances.")
    best_rank: int
    worst_rank: int
    latest_rank: Optional[str] = None
    yearly_ranks: Dict[str, Optional[int]] = Field(
        ...,
        description="Map of year string to numeric rank for heat grid visualization."
    )


class ConsistentTopResponse(BaseModel):
    """Response of top-tier persistent institutions."""

    category: str
    start_year: int
    end_year: int
    top_n: int
    total_years_analyzed: int
    institutions: List[ConsistentTopInstitution]


class InstitutionLookupItem(BaseModel):
    """Quick lookup item for institutions dropdown."""

    institution_name: str
    institute_id: Optional[str] = None
    state: Optional[str] = None
    appearances: int
    latest_rank: Optional[str] = None


class StateDistributionItem(BaseModel):
    """State-level institution aggregation metrics."""

    state: str
    count: int
    share_pct: float
    top_institution: Optional[str] = None
    top_institution_rank: Optional[str] = None
    average_score: Optional[float] = None
    median_score: Optional[float] = None
    cities_count: int
    avg_tlr: Optional[float] = None
    avg_rpc: Optional[float] = None
    avg_go: Optional[float] = None
    avg_oi: Optional[float] = None
    avg_pr: Optional[float] = None


class TopStatesResponse(BaseModel):
    """Q2.1 Top States response schema."""

    category: str
    year: int
    top_n: int
    total_institutions_scoped: int
    leading_state: str
    leading_state_count: int
    total_states_represented: int
    top3_concentration_pct: float
    top3_states: List[str]
    states: List[StateDistributionItem]


class StateHistoricalTrend(BaseModel):
    """Longitudinal representation of a single state across editions."""

    state: str
    yearly_counts: Dict[str, int]
    total_across_years: int
    trend_direction: str


class DistributionTrendResponse(BaseModel):
    """Q2.2 Distribution Trend response schema."""

    category: str
    years: List[int]
    unique_states_by_year: Dict[str, int]
    top_states_trends: List[StateHistoricalTrend]
    states_distribution: List[StateDistributionItem]


class StateGrowthItem(BaseModel):
    """State growth representation between two ranking editions."""

    state: str
    start_year: int
    start_count: int
    end_year: int
    end_count: int
    growth: int = Field(..., description="end_count - start_count")
    growth_pct: Optional[float] = None
    status: str = Field(..., description="'growing', 'declining', or 'stable'")


class StateGrowthResponse(BaseModel):
    """Q2.3 State Growth response schema."""

    category: str
    start_year: int
    end_year: int
    top_n: int
    growing_states_count: int
    declining_states_count: int
    stable_states_count: int
    items: List[StateGrowthItem]


class StateProfile(BaseModel):
    """Analytical summary of an individual state for comparative analysis."""

    state: str
    total_institutions: int
    top_100_count: int
    top_10_count: int
    average_score: Optional[float] = None
    median_score: Optional[float] = None
    best_rank: Optional[int] = None
    top_institution: Optional[str] = None
    scores: List[float]


class CompareStatesResponse(BaseModel):
    """Q2.4 Compare States response schema."""

    category: str
    year: int
    state_a: StateProfile
    state_b: StateProfile
    institutions: List[Dict[str, Any]]


class NewlyAppearingStateItem(BaseModel):
    """State breakdown of newly appearing institutions in a given time span."""

    state: str
    new_institutions_count: int
    share_pct: float
    institution_names: List[str]
    institutions: List[Dict[str, Any]]


class NewlyAppearingResponse(BaseModel):
    """Q2.5 Newly Appearing Institutions by State response schema."""

    category: str
    start_year: int
    end_year: int
    total_new_institutions: int
    states_count: int
    leading_state: str
    leading_state_count: int
    items: List[NewlyAppearingStateItem]


# ---------------------------------------------------------------------------
# Univariate Analytics Schemas (Q3.1 - Q3.5)
# ---------------------------------------------------------------------------
class HistogramBin(BaseModel):
    """Discrete frequency bin for histograms."""

    bin_start: float
    bin_end: float
    label: str
    count: int
    percentage: float


class ScoreDistributionAnalyticsResponse(BaseModel):
    """Q3.1 Score Distribution response schema."""

    category: str
    year: int
    total_records: int
    valid_observations: int
    missing_observations: int
    mean: Optional[float] = None
    median: Optional[float] = None
    std_dev: Optional[float] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    bin_width: float
    bins: List[HistogramBin]
    raw_scores: List[float]


class RankTierItem(BaseModel):
    """Aggregated institutional bracket for rank distributions."""

    tier_name: str
    min_rank: int
    max_rank: int
    count: int
    share_pct: float
    sample_institutions: List[str]


class RankDistributionResponse(BaseModel):
    """Q3.2 Rank Distribution response schema."""

    category: str
    year: Optional[int] = None
    total_records: int
    exact_ranks_count: int
    rank_bands_count: int
    min_rank: Optional[int] = None
    max_rank: Optional[int] = None
    tiers: List[RankTierItem]
    histogram_bins: List[HistogramBin]


class DescriptiveStatItem(BaseModel):
    """Comprehensive descriptive statistics for a single numerical parameter."""

    parameter: str
    parameter_label: str
    observations: int
    missing: int
    mean: Optional[float] = None
    median: Optional[float] = None
    std_dev: Optional[float] = None
    variance: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    q1: Optional[float] = None
    q2: Optional[float] = None
    q3: Optional[float] = None
    iqr: Optional[float] = None
    skewness: Optional[float] = None


class DescriptiveStatisticsResponse(BaseModel):
    """Q3.3 Descriptive Statistics response schema."""

    category: str
    year: int
    total_records: int
    parameters: List[DescriptiveStatItem]


class QuartileItem(BaseModel):
    """Institution count and share in a score quartile bracket."""

    quartile: str
    lower_bound: float
    upper_bound: float
    count: int
    percentage: float
    sample_institutions: List[str]


class ScoreQuartilesResponse(BaseModel):
    """Q3.4 Score Quartiles response schema."""

    category: str
    year: int
    total_observations: int
    min_score: float
    q1_threshold: float
    median_threshold: float
    q3_threshold: float
    max_score: float
    quartiles: List[QuartileItem]


class CategorySpreadItem(BaseModel):
    """Category-level distribution statistics for comparative box plot."""

    category: str
    observations: int
    mean: Optional[float] = None
    median: Optional[float] = None
    std_dev: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    q1: Optional[float] = None
    q3: Optional[float] = None
    iqr: Optional[float] = None
    scores: List[float]


class CategorySpreadResponse(BaseModel):
    """Q3.5 Category Score Spread response schema."""

    year: int
    total_categories: int
    categories: List[CategorySpreadItem]


# ---------------------------------------------------------------------------
# Bivariate Analytics Schemas (Q4.1 - Q4.5 & Custom Two-Variable Selection)
# ---------------------------------------------------------------------------
class ScatterPoint(BaseModel):
    """Single point in a bivariate scatter plot."""

    x: float
    y: float
    institution_name: str
    rank: str
    state: str
    city: str


class RegressionLine(BaseModel):
    """Fitted linear regression parameters."""

    slope: float
    intercept: float
    r_squared: float
    p_value: float
    equation: str
    x_start: float
    y_start: float
    x_end: float
    y_end: float


class BivariateRelationshipResponse(BaseModel):
    """Scatter and correlation analysis response for two numerical variables."""

    category: str
    year: int
    var_x: str
    var_x_label: str
    var_y: str
    var_y_label: str
    sample_size: int
    missing_count: int
    pearson_r: float
    pearson_p_value: float
    spearman_rho: float
    spearman_p_value: float
    interpretation: str
    regression: Optional[RegressionLine] = None
    points: List[ScatterPoint]


class ParameterCorrelationRankItem(BaseModel):
    """Ranking item for parameter correlation with overall score."""

    parameter: str
    parameter_label: str
    pearson_r: float
    spearman_rho: float
    r_squared: float
    rank: int
    strength: str


class ParameterCorrelationMatrixResponse(BaseModel):
    """Q4.3 Parameter correlation ranking and full correlation matrix."""

    category: str
    year: int
    target_variable: str
    sample_size: int
    strongest_parameter: str
    strongest_pearson_r: float
    ranked_parameters: List[ParameterCorrelationRankItem]
    parameters: List[str]
    correlation_matrix: Dict[str, Dict[str, float]]


class HistoricalCorrelationYearPoint(BaseModel):
    """Correlation point for an individual NIRF edition."""

    year: int
    sample_size: int
    pearson_r: float
    spearman_rho: Optional[float] = None


class HistoricalCorrelationResponse(BaseModel):
    """Q4.5 Longitudinal parameter correlation evolution."""

    category: str
    var_x: str
    var_x_label: str
    var_y: str
    var_y_label: str
    start_year: int
    end_year: int
    overall_change: float
    yearly_correlations: List[HistoricalCorrelationYearPoint]
    summary_insight: str


class CustomBivariateRequest(BaseModel):
    """Request payload for custom two-variable bivariate analysis."""

    category: str = Field("Overall", description="NIRF category discipline.")
    year: int = Field(2025, description="Ranking edition year.")
    var_x: str = Field("rpc_score", description="First numerical variable.")
    var_y: str = Field("overall_score", description="Second numerical variable.")


# ---------------------------------------------------------------------------
# Multivariate Analytics Schemas (Q5.1 - Q5.5)
# ---------------------------------------------------------------------------
class TopFiveInstitutionItem(BaseModel):
    """Individual top-five entity with full parametric breakdown."""

    rank: str
    numeric_rank: int
    institution_name: str
    state: str
    city: str
    overall_score: float
    scores: Dict[str, float]


class TopFiveComparisonResponse(BaseModel):
    """Q5.1 Top Five institutions comparative multivariate profile."""

    category: str
    year: int
    parameters: List[str]
    parameter_labels: Dict[str, str]
    institutions: List[TopFiveInstitutionItem]


class DiscrepancyInstitutionItem(BaseModel):
    """Institution displaying significant gap between two key parameters."""

    institution_name: str
    rank: str
    state: str
    city: str
    score_a: float
    score_b: float
    gap: float
    overall_score: Optional[float] = None


class ParameterDiscrepancyResponse(BaseModel):
    """Q5.2 and Q5.3 Discrepancy analysis response."""

    category: str
    year: int
    dimension_a: str
    dimension_b: str
    methodology: str
    threshold_a: float
    threshold_b: float
    qualifying_count: int
    institutions: List[DiscrepancyInstitutionItem]


class ParameterShiftItem(BaseModel):
    """Parameter-specific delta between two editions."""

    parameter: str
    parameter_label: str
    start_value: float
    end_value: float
    delta: float


class ParadoxicalImprovementItem(BaseModel):
    """Institution whose overall score gained despite decline in one or more components."""

    institution_name: str
    start_rank: str
    end_rank: str
    start_score: float
    end_score: float
    score_gain: float
    declining_parameters: List[ParameterShiftItem]
    improving_parameters: List[ParameterShiftItem]


class ScoreImprovementDespiteDeclineResponse(BaseModel):
    """Q5.4 Score improvement despite parameter regression response."""

    category: str
    start_year: int
    end_year: int
    total_improved_entities: int
    total_paradoxical_entities: int
    institutions: List[ParadoxicalImprovementItem]


class ParameterGapItem(BaseModel):
    """Institution exhibiting extreme dispersion between highest and lowest parameters."""

    institution_name: str
    rank: str
    state: str
    city: str
    param_gap: float
    highest_param: str
    highest_score: float
    lowest_param: str
    lowest_score: float
    scores: Dict[str, float]


class ParameterGapResponse(BaseModel):
    """Q5.5 Parameter Gap response schema."""

    category: str
    year: int
    average_gap: float
    institutions: List[ParameterGapItem]


# ---------------------------------------------------------------------------
# Distribution & Statistical Comparison Schemas (Q6.1 - Q6.5)
# ---------------------------------------------------------------------------
class ComprehensiveStatItem(BaseModel):
    """Full parametric and non-parametric statistical breakdown for a dataset segment."""

    label: str
    observations: int
    mean: float
    median: float
    mode: Optional[float] = None
    std_dev: float
    variance: float
    min: float
    max: float
    q1: float
    q3: float
    iqr: float
    cv: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    scores: List[float] = []


class Top10ComparisonResponse(BaseModel):
    """Q6.1 Top 10 vs Remaining institutions distribution comparison."""

    category: str
    year: int
    top10_stats: ComprehensiveStatItem
    remaining_stats: ComprehensiveStatItem
    mean_difference: float
    median_difference: float


class YearlyDispersionItem(BaseModel):
    """Year-level parametric dispersion metrics."""

    year: int
    observations: int
    mean: float
    median: float
    variance: float
    std_dev: float
    q1: float
    q3: float
    iqr: float
    cv: Optional[float] = None
    min: float
    max: float
    range: float
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None


class ScoreDispersionResponse(BaseModel):
    """Q6.2 Score Dispersion across ranking years."""

    category: str
    yearly_dispersions: List[YearlyDispersionItem]
    max_dispersion_year: int
    min_dispersion_year: int
    max_std_dev: float
    min_std_dev: float


class ParameterVariabilityItem(BaseModel):
    """Variability metrics for an individual NIRF parameter."""

    parameter: str
    parameter_label: str
    observations: int
    mean: float
    median: float
    variance: float
    std_dev: float
    q1: float
    q3: float
    iqr: float
    cv: Optional[float] = None
    min: float
    max: float
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    scores: List[float] = []


class ParameterVariabilityResponse(BaseModel):
    """Q6.3 Parameter Variability comparison response."""

    category: str
    year: int
    parameters: List[ParameterVariabilityItem]
    highest_cv_parameter: str
    lowest_cv_parameter: str


class MedianIQRTrendItem(BaseModel):
    """Longitudinal median and interquartile boundary for a single year."""

    year: int
    observations: int
    mean: float
    median: float
    q1: float
    q3: float
    iqr: float
    min: float
    max: float


class MedianIQRTrendResponse(BaseModel):
    """Q6.4 Median and IQR longitudinal trend response."""

    category: str
    trends: List[MedianIQRTrendItem]
    iqr_trend_direction: str


class StateScoreDistributionItem(BaseModel):
    """State-level institutional score distribution metrics."""

    state: str
    observations: int
    mean: float
    median: float
    std_dev: float
    variance: float
    q1: float
    q3: float
    iqr: float
    min: float
    max: float
    cv: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    scores: List[float] = []
    top_institutions: List[str] = []


class StateScoreDistributionResponse(BaseModel):
    """Q6.5 State score distribution response."""

    category: str
    year: int
    states: List[StateScoreDistributionItem]
    all_states: List[str]


# Backwards compatibility alias
StateDistributionResponse = StateScoreDistributionResponse




# ---------------------------------------------------------------------------
# Ranking Transitions & Institutional Mobility Schemas (Q7.1 - Q7.5)
# ---------------------------------------------------------------------------
class SankeyNode(BaseModel):
    """Node in Sankey flow diagram representing a rank band in start or end edition."""

    name: str
    category: str  # "source", "target", "exit", "new"


class SankeyLink(BaseModel):
    """Directed link in Sankey flow."""

    source: int
    target: int
    value: int
    label: str


class SankeyData(BaseModel):
    """Plotly-compatible Sankey dataset."""

    nodes: List[SankeyNode]
    links: List[SankeyLink]


class BandTransitionItem(BaseModel):
    """Movement count and percentage between two rank bands."""

    source_band: str
    target_band: str
    count: int
    percentage: float
    sample_institutions: List[str]


class BandMovementResponse(BaseModel):
    """Q7.1 Rank Band Movement response schema."""

    category: str
    start_year: int
    end_year: int
    total_evaluated: int
    common_count: int
    new_entrants_count: int
    exited_count: int
    band51_100_to_top50_count: int
    band51_100_to_top50_institutions: List[str]
    transitions: List[BandTransitionItem]
    sankey_data: SankeyData
    exited_institutions: List[str]
    new_entrants: List[str]


class Top10MemberItem(BaseModel):
    """Institution belonging to, entering, or departing the elite Top 10."""

    institution_name: str
    rank: int
    score: float
    state: str
    previous_rank: Optional[int] = None
    status: str  # "retained", "new_entrant", "exited"
    rank_delta: Optional[int] = None


class Top10EntryExitResponse(BaseModel):
    """Q7.2 Top 10 Entries and Exits response schema."""

    category: str
    start_year: int
    end_year: int
    entrants: List[Top10MemberItem]
    exits: List[Top10MemberItem]
    retained: List[Top10MemberItem]
    stability_rate: float
    turnover_count: int


class BandRetentionStat(BaseModel):
    """Cohort retention statistics for an individual starting rank band."""

    band: str
    start_count: int
    retained_count: int
    retention_pct: float
    upward_count: int
    upward_pct: float
    downward_count: int
    downward_pct: float
    exited_count: int
    exited_pct: float


class TransitionMatrixCell(BaseModel):
    """Individual cell in the Markov rank band transition matrix."""

    source_band: str
    target_band: str
    count: int
    percentage: float


class TransitionRetentionResponse(BaseModel):
    """Q7.3 Rank Band Retention & Markov Transition Matrix response schema."""

    category: str
    start_year: int
    end_year: int
    total_institutions: int
    overall_retention_pct: float
    overall_upward_pct: float
    overall_downward_pct: float
    overall_exit_pct: float
    band_stats: List[BandRetentionStat]
    matrix_bands: List[str]
    matrix_cells: List[TransitionMatrixCell]


class InstitutionRankMovementItem(BaseModel):
    """Individual institution rank movement and score delta."""

    institution_name: str
    state: str
    city: str
    start_rank: int
    end_rank: int
    rank_delta: int  # positive = climbed, negative = dropped
    start_score: float
    end_score: float
    score_delta: float


class LargestMovementsResponse(BaseModel):
    """Q7.4 Largest Climbers and Fallers response schema."""

    category: str
    start_year: int
    end_year: int
    largest_climbers: List[InstitutionRankMovementItem]
    largest_fallers: List[InstitutionRankMovementItem]
    total_evaluated: int


class AnnualMobilityItem(BaseModel):
    """Annual mobility statistics for a consecutive edition transition."""

    year_pair: str
    start_year: int
    end_year: int
    total_common: int
    moved_up_count: int
    moved_up_pct: float
    moved_down_count: int
    moved_down_pct: float
    retained_count: int
    retained_pct: float
    average_absolute_shift: float
    new_entrants_count: int
    exited_count: int


class InstitutionalMobilityResponse(BaseModel):
    """Q7.5 Institutional Mobility longitudinal history response schema."""

    category: str
    cycles: List[AnnualMobilityItem]
    average_upward_pct: float
    average_downward_pct: float
    average_retained_pct: float


# ---------------------------------------------------------------------------
# Outlier Detection & Performance Gaps Schemas (Q8.1 - Q8.5)
# ---------------------------------------------------------------------------
class ResearchOutlierPoint(BaseModel):
    """Data point in RPC vs Overall score distribution with regression residual."""

    institution_name: str
    rank: int
    state: str
    city: str
    overall_score: float
    rpc_score: float
    expected_rpc: float
    residual: float
    z_score: float
    is_outlier: bool
    outlier_type: str  # "high_research_outlier", "low_research_outlier", "normal"


class ResearchOutlierResponse(BaseModel):
    """Q8.1 Research Outliers response schema."""

    category: str
    year: int
    method: str  # "zscore" or "iqr"
    threshold: float
    total_evaluated: int
    outliers_count: int
    regression_slope: float
    regression_intercept: float
    regression_r2: float
    points: List[ResearchOutlierPoint]
    outliers: List[ResearchOutlierPoint]


class ResearchTeachingGapItem(BaseModel):
    """Institution displaying extreme gap between research output and teaching resources."""

    institution_name: str
    rank: int
    state: str
    city: str
    rpc_score: float
    tlr_score: float
    gap: float  # RPC - TLR
    gap_zscore: float
    is_outlier: bool
    overall_score: float


class ResearchTeachingGapResponse(BaseModel):
    """Q8.2 Research vs Teaching Gap response schema."""

    category: str
    year: int
    method: str
    threshold: float
    mean_gap: float
    std_gap: float
    outliers_count: int
    institutions: List[ResearchTeachingGapItem]


class ScoreChangeOutlierItem(BaseModel):
    """Institution with anomalous year-over-year score shift."""

    institution_name: str
    state: str
    city: str
    start_rank: int
    end_rank: int
    start_score: float
    end_score: float
    score_delta: float
    z_score: float
    is_outlier: bool
    direction: str  # "positive_jump", "negative_drop", "normal"


class ScoreChangeOutlierResponse(BaseModel):
    """Q8.3 Year-to-Year Score Change Outliers response schema."""

    category: str
    start_year: int
    end_year: int
    method: str
    threshold: float
    mean_delta: float
    std_delta: float
    total_evaluated: int
    outliers_count: int
    positive_outliers_count: int
    negative_outliers_count: int
    outliers: List[ScoreChangeOutlierItem]
    all_changes: List[ScoreChangeOutlierItem]


class StrongParamPoorRankItem(BaseModel):
    """Institution with strong parameter marks but lagging overall composite rank."""

    institution_name: str
    state: str
    city: str
    rank: int
    parameter: str
    parameter_score: float
    param_percentile: float
    rank_percentile: float
    discrepancy_score: float
    overall_score: float


class StrongParamPoorRankResponse(BaseModel):
    """Q8.4 Strong Parameter, Poor Overall Rank response schema."""

    category: str
    year: int
    parameter: str
    parameter_label: str
    param_threshold: float
    rank_threshold: int
    qualifying_count: int
    institutions: List[StrongParamPoorRankItem]


class RankingVolatilityItem(BaseModel):
    """Multi-year rank dispersion and volatility metrics for an institution."""

    institution_name: str
    state: str
    city: str
    years_present: int
    years_span: str
    min_rank: int
    max_rank: int
    rank_range: int
    std_rank: float
    mean_absolute_shift: float
    z_volatility: float
    is_volatile_outlier: bool
    recent_rank: int


class RankingVolatilityResponse(BaseModel):
    """Q8.5 Ranking Volatility response schema."""

    category: str
    method: str
    threshold: float
    total_evaluated: int
    volatile_outliers_count: int
    mean_std_rank: float
    institutions: List[RankingVolatilityItem]







