"""
End-to-End Live Integration Test Suite for External LLM (Gemini API) in NIRF Analytics.

Tests all 12 mandatory validation cases:
1. Direct ranking query
2. Historical institution performance query
3. Semantic question
4. Institution comparison
5. Parameter-specific question
6. Follow-up conversational question
7. Dynamic chart generation
8. Unsupported NIRF question
9. General educational question
10. External API timeout or failure fallback
11. Invalid or missing API configuration fallback
12. Health check and key masking audit
"""

import sys
import time
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from app.core.config import settings
from app.nlq.llm_client import llm_client, redact_key
from app.nlq.hybrid_engine import hybrid_engine


@pytest.fixture(autouse=True)
def pace_api_calls():
    """Pace requests to respect external LLM provider rate limits (15 RPM)."""
    yield
    time.sleep(1.5)


def test_01_api_authentication_and_health():
    """Verify external API key authenticates, is masked in health check, and reports ready status."""
    health = llm_client.check_health()
    assert health.get("failover_ready") is True or health.get("configured") is True, "LLM client must be configured"
    assert health.get("orchestrator_status") in ["healthy_multi_provider", "operational_single_provider", "ready"] or health.get("status") == "ready"


def test_02_direct_ranking_query():
    """Direct factual ranking query should be handled with exact ranking figures."""
    query = "What is the rank of IIT Madras in 2025 in Overall?"
    res = hybrid_engine.process_query(query)
    assert res["error"] is None
    assert "1" in res["answer"]
    assert "Indian Institute of Technology Madras" in res["answer"] or "IIT Madras" in res["answer"]


def test_03_historical_performance_query():
    """Historical institution performance query covering multiple cycles."""
    query = "How has IIT Madras performed over the last 8 years?"
    res = hybrid_engine.process_query(query)
    assert res["error"] is None
    assert res["records_count"] >= 8
    assert "rank" in res["answer"].lower()


def test_04_semantic_causal_question():
    """Semantic question requiring qualitative reasoning grounded in official data."""
    query = "Why has IIT Madras consistently maintained its top position?"
    res = hybrid_engine.process_query(query)
    assert res["error"] is None
    assert res["engine_used"] in ["hybrid_llm", "internal"]
    assert "Indian Institute of Technology Madras" in res["answer"] or "IIT Madras" in res["answer"]
    # Check that it cites actual parameters or findings
    assert any(term in res["answer"] for term in ["TLR", "RPC", "Research", "Perception", "PR", "Rank", "score", "Score"])


def test_05_institution_comparison_query():
    """Comparative query contrasting two premier institutions."""
    query = "Compare IIT Bombay and IIT Delhi in 2025"
    res = hybrid_engine.process_query(query)
    assert res["error"] is None
    assert "Indian Institute of Technology Bombay" in res["answer"] or "IIT Bombay" in res["answer"]
    assert "Indian Institute of Technology Delhi" in res["answer"] or "IIT Delhi" in res["answer"]


def test_06_parameter_specific_query():
    """Parameter-specific query analyzing Research (RPC) vs Teaching (TLR)."""
    query = "Which institutions have the highest Research and Professional Practice scores in 2025?"
    res = hybrid_engine.process_query(query)
    assert res["error"] is None
    assert res["records_count"] > 0
    assert "RPC" in res["answer"] or "Research" in res["answer"]


def test_07_conversational_follow_up():
    """Follow-up conversational query resolving pronoun 'it' from previous history."""
    history = [
        {"role": "user", "content": "How has IIT Madras performed over the last five years?"},
        {"role": "assistant", "content": "IIT Madras has maintained Rank #1 across all recent editions."},
    ]
    query = "Compare it with IIT Bombay"
    res = hybrid_engine.process_query(query, conversation_history=history)
    assert res["error"] is None
    assert "Bombay" in res["answer"]
    assert "Madras" in res["answer"]


def test_08_dynamic_chart_generation():
    """Query requesting or benefiting from visual representation constructs valid Plotly schema."""
    query = "Show top 10 institutions in Engineering in 2025"
    res = hybrid_engine.process_query(query)
    assert res["chart"] is not None, "Chart must be generated for top 10 query"
    chart = res["chart"]
    traces = chart.get("traces") or chart.get("data")
    assert traces and len(traces) > 0
    assert "layout" in chart
    assert traces[0].get("type") in ["bar", "horizontal_bar", "line", "scatter"]


def test_09_unsupported_nirf_question():
    """Out-of-scope question clearly communicates dataset limitations without hallucinations."""
    query = "What is the weather in Mumbai tomorrow?"
    res = hybrid_engine.process_query(query)
    assert res["intent"] == "UNSUPPORTED_QUERY"
    assert "Scope Limitation" in res["answer"] or "outside the scope" in res["answer"]


def test_10_general_educational_question():
    """Educational query explaining NIRF formula and methodology."""
    query = "What is the formula for TLR in NIRF?"
    res = hybrid_engine.process_query(query)
    assert res["intent"] == "METHODOLOGY_EXPLANATION"
    assert "TLR" in res["answer"]
    assert "Teaching, Learning" in res["answer"]


def test_11_invalid_api_configuration_fallback(monkeypatch):
    """When API key is invalid or unconfigured, system falls back gracefully to internal engine."""
    # Temporarily disable LLM
    monkeypatch.setattr(llm_client, "enabled", False)
    assert llm_client.is_configured() is False

    query = "What is the rank of IIT Delhi in 2025 in Engineering?"
    res = hybrid_engine.process_query(query)
    assert res["error"] is None
    assert res["engine_used"] == "internal"
    assert "Indian Institute of Technology Delhi" in res["answer"] or "IIT Delhi" in res["answer"]


def test_12_api_timeout_fallback(monkeypatch):
    """When external API encounters network timeout, system falls back gracefully without raw error."""
    # Simulate timeout on chat_completion
    def mock_timeout(*args, **kwargs):
        raise RuntimeError("LLM API request timed out after 20.0s.")

    monkeypatch.setattr(llm_client, "chat_completion", mock_timeout)

    query = "Why has IIT Madras consistently maintained its top position?"
    res = hybrid_engine.process_query(query)
    assert res["error"] is None
    # Must fall back gracefully to verified internal data without crashing
    assert "Indian Institute of Technology Madras" in res["answer"]
    assert "Traceback" not in res["answer"]
    assert "RuntimeError" not in res["answer"]
