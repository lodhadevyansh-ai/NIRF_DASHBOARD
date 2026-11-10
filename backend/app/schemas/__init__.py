"""NIRF Analytics Dashboard — Schemas Package."""

from app.schemas.analytics import (
    AverageScoreResponse,
    ConsistentTopInstitution,
    ConsistentTopResponse,
    InstitutionLookupItem,
    RankShiftItem,
    RankShiftsResponse,
    TrajectoryPoint,
    TrajectoryResponse,
    YearlyScoreStat,
)
from app.schemas.dataset import (
    ColumnMetadata,
    DatasetColumnsResponse,
    DatasetStatusResponse,
    DatasetSummaryResponse,
    ErrorResponse,
    HealthResponse,
)
from app.schemas.filters import (
    DashboardQueryParams,
    FilterOptionsQuery,
    InstitutionQueryParams,
)
from app.schemas.responses import (
    DashboardKpiResponse,
    FilterOptionsResponse,
    InstitutionDetailResponse,
    InstitutionHistoryRecord,
    NumericRange,
    PaginatedInstitutionsResponse,
    TopInstitutionItem,
    TopInstitutionsResponse,
)

__all__ = [
    "HealthResponse",
    "DatasetStatusResponse",
    "ColumnMetadata",
    "DatasetColumnsResponse",
    "DatasetSummaryResponse",
    "ErrorResponse",
    "FilterOptionsQuery",
    "InstitutionQueryParams",
    "DashboardQueryParams",
    "NumericRange",
    "FilterOptionsResponse",
    "PaginatedInstitutionsResponse",
    "InstitutionHistoryRecord",
    "InstitutionDetailResponse",
    "DashboardKpiResponse",
    "TopInstitutionItem",
    "TopInstitutionsResponse",
    "TrajectoryPoint",
    "TrajectoryResponse",
    "RankShiftItem",
    "RankShiftsResponse",
    "YearlyScoreStat",
    "AverageScoreResponse",
    "ConsistentTopInstitution",
    "ConsistentTopResponse",
    "InstitutionLookupItem",
]
