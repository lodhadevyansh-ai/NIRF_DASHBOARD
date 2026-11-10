"""NIRF Analytics Dashboard — Filter Query Schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class FilterOptionsQuery(BaseModel):
    """Query parameters to refine dependent filter options."""

    category: Optional[str] = Field(None, description="Select discipline to filter years and states.")
    year: Optional[int] = Field(None, description="Select academic year.")
    state: Optional[str] = Field(None, description="Select state or union territory.")


class InstitutionQueryParams(BaseModel):
    """Query parameters for searchable and paginated institutions list."""

    query: Optional[str] = Field(None, description="Search by institution name, city, state, or ID.")
    category: Optional[str] = Field(None, description="Filter by NIRF category.")
    year: Optional[int] = Field(None, description="Filter by ranking year.")
    state: Optional[str] = Field(None, description="Filter by Indian State/UT.")
    page: int = Field(1, ge=1, description="Page number (1-based).")
    page_size: int = Field(20, ge=1, le=100, description="Items per page.")
    sort_by: str = Field("institution_name", description="Field to sort by.")
    sort_order: str = Field("asc", pattern="^(asc|desc)$", description="Sort direction ('asc' or 'desc').")


class DashboardQueryParams(BaseModel):
    """Query parameters for executive dashboard KPIs and top institutions."""

    category: Optional[str] = Field("Overall", description="NIRF category discipline.")
    year: Optional[int] = Field(None, description="Academic ranking cycle year.")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Top N institutions to return.")

