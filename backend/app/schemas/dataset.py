"""NIRF Analytics Dashboard — Pydantic Schemas for Dataset & Health Endpoints."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Schema for /api/health endpoint."""

    status: str = Field(..., description="Application health status", examples=["ok"])
    timestamp: str = Field(..., description="Current ISO 8601 UTC timestamp", examples=["2026-11-03T01:50:00Z"])
    environment: str = Field(..., description="Running environment", examples=["development"])
    version: str = Field(..., description="Application release version", examples=["1.0.0"])
    dataset_available: bool = Field(..., description="Whether the master dataset is loaded", examples=[True])


class DatasetStatusResponse(BaseModel):
    """Schema for /api/dataset/status endpoint."""

    file_available: bool = Field(..., description="Whether the master dataset file is present.")
    filename: str = Field(..., description="Base filename of the dataset (no private path exposed).")
    file_size_bytes: int = Field(..., description="File size in bytes.")
    file_size_formatted: str = Field(..., description="Human-readable file size string.")
    total_records: int = Field(..., description="Total verified institutional ranking rows.")
    total_columns: int = Field(..., description="Total attribute columns in the dataset.")
    available_categories: List[str] = Field(..., description="All distinct NIRF disciplines present.")
    available_years: List[int] = Field(..., description="All distinct academic cycles present.")
    last_modified: Optional[str] = Field(None, description="ISO timestamp of last file modification.")


class ColumnMetadata(BaseModel):
    """Schema describing structural properties of a single dataset column."""

    name: str = Field(..., description="Column header name.")
    dtype: str = Field(..., description="Physical pandas data type.")
    non_null_count: int = Field(..., description="Number of populated rows.")
    null_count: int = Field(..., description="Number of missing / null rows.")
    null_percentage: float = Field(..., description="Percentage of null values.")
    unique_count: int = Field(..., description="Number of unique non-null values.")
    sample_values: List[Any] = Field(default_factory=list, description="Sample values from the column.")


class DatasetColumnsResponse(BaseModel):
    """Schema for /api/dataset/columns endpoint."""

    total_columns: int = Field(..., description="Total columns in dataset.")
    columns: List[ColumnMetadata] = Field(..., description="List of column metadata specifications.")


class DatasetSummaryResponse(BaseModel):
    """Schema for /api/dataset/summary endpoint."""

    total_records: int = Field(..., description="Total row count.")
    total_columns: int = Field(..., description="Total column count.")
    unique_institutions_by_name: int = Field(..., description="Distinct institution names.")
    unique_institutions_by_id: int = Field(..., description="Distinct NIRF Institute IDs.")
    unique_states_count: int = Field(..., description="Distinct States & Union Territories represented.")
    year_range: List[int] = Field(..., description="Minimum and maximum ranking years [start, end].")
    years_covered_count: int = Field(..., description="Number of annual ranking cycles.")
    categories_count: int = Field(..., description="Number of distinct disciplines.")
    records_per_category: Dict[str, int] = Field(..., description="Record count breakdown by category.")
    records_per_year: Dict[int, int] = Field(..., description="Record count breakdown by year.")
    available_parameters: List[str] = Field(..., description="Available numerical score parameters.")
    unscored_categories: List[str] = Field(..., description="Categories published without composite scores.")


class ErrorResponse(BaseModel):
    """Standardized API error response format."""

    error: str = Field(..., description="Error category or type.")
    message: str = Field(..., description="Human-readable explanation of error.")
    status_code: int = Field(..., description="HTTP status code.")
    timestamp: str = Field(..., description="ISO 8601 timestamp when error occurred.")

