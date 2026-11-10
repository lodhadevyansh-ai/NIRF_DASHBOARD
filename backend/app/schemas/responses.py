"""NIRF Analytics Dashboard — Response Schemas for Filter, Institution & Dashboard Endpoints."""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class NumericRange(BaseModel):
    """Represents boundary values for a numerical filter."""

    min: Union[int, float]
    max: Union[int, float]


class FilterOptionsResponse(BaseModel):
    """Dynamic dependent filter options schema."""

    all_categories: List[str] = Field(..., description="Every category published across 2017–2025.")
    available_categories: List[str] = Field(..., description="Categories valid for the current selection.")
    all_years: List[int] = Field(..., description="All ranking years.")
    available_years: List[int] = Field(..., description="Years where the selected category/state exists.")
    all_states: List[str] = Field(..., description="All 32 States & UTs.")
    available_states: List[str] = Field(..., description="States with institutions in the active scope.")
    parameters: List[str] = Field(..., description="Evaluated parameters for this category.")
    rank_range: NumericRange = Field(..., description="Minimum and maximum rank in scope.")
    score_range: NumericRange = Field(..., description="Minimum and maximum score in scope.")
    matching_records_count: int = Field(..., description="Record count matching current filter selection.")


class PaginatedInstitutionsResponse(BaseModel):
    """Paginated list of searchable institutions or ranked records."""

    total: int = Field(..., description="Total matching institutions or records.")
    page: int = Field(..., description="Current page index (1-based).")
    page_size: int = Field(..., description="Page size.")
    total_pages: int = Field(..., description="Total available pages.")
    items: List[Dict[str, Any]] = Field(..., description="List of institution entries.")


class InstitutionHistoryRecord(BaseModel):
    """Single historical ranking instance for an institution."""

    year: Optional[int] = None
    category: str
    rank: Union[int, str]
    overall_score: Optional[float] = None
    tlr_score: Optional[float] = None
    rpc_score: Optional[float] = None
    go_score: Optional[float] = None
    oi_score: Optional[float] = None
    pr_score: Optional[float] = None
    qnr_score: Optional[float] = None
    qlr_score: Optional[float] = None
    sfc_score: Optional[float] = None


class InstitutionDetailResponse(BaseModel):
    """Complete multi-year profile and ranking history for an institution."""

    institute_id: str
    institution_name: str
    city: str
    state: str
    categories_participated: List[str]
    years_participated: List[int]
    total_appearances: int
    best_rank: Optional[int]
    history: List[InstitutionHistoryRecord]


class DashboardKpiResponse(BaseModel):
    """Executive KPI metrics card data matching reference dashboard."""

    total_records: int = Field(..., description="Total verified rank points (6,572).")
    unique_institutions: int = Field(..., description="Total unique accredited entities (1,223 names / 2,055 IDs).")
    states_count: int = Field(..., description="Total States & UTs footprint (32).")
    years_covered: str = Field(..., description="Longitudinal span string ('2017–2025').")
    categories_count: int = Field(..., description="Total academic disciplines (17).")
    active_category: str = Field(..., description="Currently selected discipline.")
    active_year: int = Field(..., description="Currently selected year.")
    cohort_records: int = Field(..., description="Records in this active cohort.")
    cohort_institutions: int = Field(..., description="Unique institutions in this active cohort.")
    cohort_states: int = Field(..., description="States represented in this active cohort.")
    leading_state: str = Field(..., description="State with highest institution representation.")
    leading_state_institutions: int = Field(..., description="Number of institutions from leading state.")


class TopInstitutionItem(BaseModel):
    """Single institution entry in Top-10 ranking table."""

    rank: Union[int, str]
    institute_id: str
    institution_name: str
    city: str
    state: str
    overall_score: Optional[float] = None
    tlr_score: Optional[float] = None
    rpc_score: Optional[float] = None
    go_score: Optional[float] = None
    oi_score: Optional[float] = None
    pr_score: Optional[float] = None
    qnr_score: Optional[float] = None
    qlr_score: Optional[float] = None
    sfc_score: Optional[float] = None


class TopInstitutionsResponse(BaseModel):
    """List of top institutions for a category and year."""

    category: str
    year: int
    total: int
    institutions: List[TopInstitutionItem]


# ---------------------------------------------------------------------------
# Dynamic Explorer Schemas
# ---------------------------------------------------------------------------

class VariableMetadata(BaseModel):
    """Schema introspection for variables available in the dynamic explorer."""

    name: str
    label: str
    data_type: str = Field(..., description="'numerical' or 'categorical'")
    description: str
    allowed_roles: List[str] = Field(default_factory=list, description="Roles: 'x', 'y', 'group', 'color', 'size'")
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    unique_count: Optional[int] = None


class ChartTypeOption(BaseModel):
    """Supported chart types and their capabilities."""

    id: str
    name: str
    description: str
    required_variables: List[str] = Field(default_factory=list)
    optional_variables: List[str] = Field(default_factory=list)
    suitable_for: List[str] = Field(default_factory=list)


class ExplorerSchemaResponse(BaseModel):
    """Schema metadata for configuring the Dynamic Data Explorer interface."""

    variables: List[VariableMetadata]
    categories: List[str]
    years: List[int]
    states: List[str]
    chart_types: List[ChartTypeOption]
    total_records: int


class DynamicFilterParams(BaseModel):
    """Faceted filters for refining dataset records in Dynamic Explorer."""

    category: Optional[str] = "Overall"
    year: Optional[int] = None
    state: Optional[str] = None
    institution_query: Optional[str] = None
    rank_min: Optional[int] = None
    rank_max: Optional[int] = None
    score_min: Optional[float] = None
    score_max: Optional[float] = None


class DynamicQueryRequest(BaseModel):
    """Specification for dynamic analytical query and visualization generation."""

    chart_type: str = Field("bar", description="One of the 14 supported chart types.")
    x_variable: str = Field("institution_name", description="Primary variable for X axis or category.")
    y_variable: Optional[str] = Field("overall_score", description="Secondary variable for Y axis or value.")
    group_variable: Optional[str] = Field(None, description="Dimension for grouping/stacking (e.g., category, year).")
    color_variable: Optional[str] = Field(None, description="Dimension for continuous/discrete color coding.")
    size_variable: Optional[str] = Field(None, description="Numerical dimension for bubble size.")
    aggregation: Optional[str] = Field("mean", description="'mean', 'median', 'sum', 'count', 'min', 'max'")
    limit: Optional[int] = Field(50, ge=1, le=500, description="Max entities/records to include in chart.")
    sort_by: Optional[str] = Field("y_desc", description="'y_desc', 'y_asc', 'x_asc', 'x_desc', 'none'")
    filters: Optional[DynamicFilterParams] = Field(default_factory=DynamicFilterParams)
    analysis_purpose: Optional[str] = Field(None, description="Optional goal for chart recommendation.")


class DescriptiveStatsItem(BaseModel):
    """Basic descriptive statistics for numerical variables in the filtered cohort."""

    variable: str
    label: str
    count: int
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    q1: Optional[float] = None
    median: Optional[float] = None
    q3: Optional[float] = None
    max: Optional[float] = None
    iqr: Optional[float] = None


class RecommendedChartInfo(BaseModel):
    """Automated chart recommendation rationale and confidence."""

    chart_type: str
    name: str
    reason: str
    confidence: float


class DynamicChartResponse(BaseModel):
    """Complete visualization payload with Plotly traces, layout, table data, and stats."""

    chart_type: str
    title: str
    x_title: str
    y_title: str
    traces: List[Dict[str, Any]]
    layout: Dict[str, Any]
    statistics: List[DescriptiveStatsItem]
    records_count: int
    total_dataset_count: int
    applied_filters: Dict[str, Any]
    table_records: List[Dict[str, Any]]
    recommendation: Optional[RecommendedChartInfo] = None


