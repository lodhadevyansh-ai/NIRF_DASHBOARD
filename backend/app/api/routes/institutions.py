"""NIRF Analytics Dashboard — Institutions API Route.

Exposes searchable, paginated institution lists and individual institutional histories.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Path, Query, status

from app.schemas.responses import (
    InstitutionDetailResponse,
    PaginatedInstitutionsResponse,
)
from app.services.filter_service import filter_service

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get(
    "",
    response_model=PaginatedInstitutionsResponse,
    summary="List and Search Institutions",
    description="Search institutions by keyword, category, year, or state with server-side pagination.",
)
async def list_institutions(
    query: Optional[str] = Query(None, description="Search keyword matching name, city, state, or ID."),
    category: Optional[str] = Query(None, description="Filter by NIRF discipline."),
    year: Optional[int] = Query(None, description="Filter by ranking year."),
    state: Optional[str] = Query(None, description="Filter by Indian State/UT."),
    page: int = Query(1, ge=1, description="Page number (1-based)."),
    page_size: int = Query(20, ge=1, le=100, description="Items per page."),
    sort_by: str = Query("institution_name", description="Field to sort by."),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order ('asc' or 'desc')."),
) -> PaginatedInstitutionsResponse:
    """Retrieve paginated institution entries."""
    data = filter_service.get_institutions_paginated(
        query=query,
        category=category,
        year=year,
        state=state,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return PaginatedInstitutionsResponse(**data)


@router.get(
    "/{institution_id}",
    response_model=InstitutionDetailResponse,
    summary="Get Institution Historical Profile",
    description="Retrieve full multi-year rankings and parameter breakdown for a specific institution ID or name.",
)
async def get_institution_detail(
    institution_id: str = Path(..., description="Official NIRF Institute ID (e.g. IR-E-U-0456) or clean name."),
) -> InstitutionDetailResponse:
    """Retrieve deep dive profile of an institution."""
    detail = filter_service.get_institution_detail(institution_id=institution_id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with ID or name '{institution_id}' was not found in the NIRF dataset.",
        )
    return InstitutionDetailResponse(**detail)

