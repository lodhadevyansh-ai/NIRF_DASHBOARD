"""NIRF Analytics Dashboard — NLQ (Natural Language Query) API Route.

Exposes:
- POST /api/nlq/query for hybrid conversational data exploration and intelligence.
- GET /api/nlq/health for AI engine provider status, connectivity, and telemetry.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.nlq.hybrid_engine import hybrid_engine
from app.nlq.llm_client import llm_client

router = APIRouter(prefix="/nlq", tags=["Natural Language Query Intelligence"])


class NLQRequest(BaseModel):
    """Payload for natural-language analytical inquiry."""

    query: str = Field(..., min_length=2, max_length=500, description="Analytical question about NIRF dataset.")
    category: Optional[str] = Field(None, description="Optional override category from global filter context.")
    year: Optional[int] = Field(None, description="Optional override year from global filter context.")
    conversation_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Previous exchanges.")


class NLQResponse(BaseModel):
    """Complete conversational intelligence response."""

    query: str
    intent: str
    answer: str
    confidence: float
    records_count: int
    applied_filters: Dict[str, Any]
    chart: Optional[Dict[str, Any]] = None
    follow_up_suggestions: List[str]
    engine_used: Optional[str] = "internal"
    provider_used: Optional[str] = None
    routing_reason: Optional[str] = None
    error: Optional[str] = None


@router.get(
    "/health",
    summary="Check AI Engine & LLM Status",
    description="Reports the operational status of internal and secondary AI engines without exposing secrets.",
)
def get_nlq_health() -> Dict[str, Any]:
    """Get AI engine configuration and health metrics."""
    llm_health = llm_client.check_health()
    return {
        "status": "healthy",
        "internal_engine": "operational",
        "dataset_loaded": True,
        "multi_layer_orchestration": llm_health,
        "llm_engine": llm_health,
    }


@router.post(
    "/query",
    response_model=NLQResponse,
    summary="Ask NIRF Data in Natural Language",
    description="Processes natural-language queries via hybrid internal/external AI pipeline with verified dataset grounding.",
)
def ask_nirf_data(request: NLQRequest) -> NLQResponse:
    """Process natural language analytical questions against the NIRF master dataset."""
    try:
        raw_query = request.query.strip()
        if not raw_query:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query text cannot be empty.")

        result = hybrid_engine.process_query(
            query=raw_query,
            category=request.category,
            year=request.year,
            conversation_history=request.conversation_history or [],
        )

        return NLQResponse(
            query=result["query"],
            intent=result["intent"],
            answer=result["answer"],
            confidence=result.get("confidence", 0.9),
            records_count=result.get("records_count", 0),
            applied_filters=result.get("applied_filters", {}),
            chart=result.get("chart"),
            follow_up_suggestions=result.get("follow_up_suggestions", []),
            engine_used=result.get("engine_used", "internal"),
            provider_used=result.get("provider_used", "Custom NIRF NLQ Engine"),
            routing_reason=result.get("routing_reason"),
            error=result.get("error"),
        )

    except HTTPException:
        raise
    except Exception as exc:
        return NLQResponse(
            query=request.query,
            intent="ERROR",
            answer=f"Could not compute analytical answer for query: '{request.query}'. Please verify the parameters.",
            confidence=0.0,
            records_count=0,
            applied_filters={},
            chart=None,
            follow_up_suggestions=[
                "Which state has the highest number of Engineering institutions in 2025?",
                "Show the top 10 institutions in Overall category in 2025",
                "How has IIT Madras performed from 2017 to 2025?",
            ],
            engine_used="fallback",
            routing_reason="exception_recovery",
            error=str(exc),
        )

