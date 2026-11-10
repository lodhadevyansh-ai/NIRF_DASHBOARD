"""NIRF Analytics Dashboard — 10 Mandatory Entity Resolution & NLQ Validation Tests.

Validates that:
1. Canonical entity resolution maps abbreviations and aliases accurately across all 9 NIRF cycles.
2. IIIT Delhi resolves to Indraprastha Institute of Information Technology Delhi in Engineering across all 9 years, never substituting IISc Bangalore.
3. IIIT Hyderabad resolves to International Institute of Information Technology Hyderabad across all 9 years.
4. Single-year factual lookups extract exact ranks and overall scores without confusion.
5. Multi-year comparisons track longitudinal head-to-head records with reversed rank Y-axes.
6. Parameter-specific queries report verified progression and peak statistics.
7. Ranking improvements retrieve verified historical climbers (e.g. Saveetha Institute).
8. IISc Bangalore retrieves all 9 years across raw name variations.
9. Methodology queries explain mathematical ordinal vs continuous distinction.
10. Data continuity queries analyze continuous vs intermittent participation.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

import pytest
from app.nlq.query_parser import query_parser
from app.nlq.hybrid_engine import HybridNLQEngine
from app.nlq.entity_resolver import entity_resolver
from app.services.data_loader import data_loader


@pytest.fixture(scope="module")
def engine():
    return HybridNLQEngine()


@pytest.fixture(scope="module")
def df():
    return data_loader.load_dataset()


def test_q1_iiit_delhi_trajectory_all_9_years(engine):
    """Q1: How has IIIT Delhi performed from 2017 to 2025?"""
    query = "How has IIIT Delhi performed from 2017 to 2025?"
    res = engine.process_query(query)

    assert res["intent"] == "INSTITUTION_TRAJECTORY"
    assert res["records_count"] == 9, "IIIT Delhi must have all 9 editions (2017–2025) in Engineering"
    assert res["applied_filters"]["category"] == "Engineering"
    assert "Indraprastha Institute of Information Technology Delhi" in res["answer"]
    assert "Indian Institute of Science" not in res["answer"], "Must never substitute IISc Bangalore"
    assert "55" in res["answer"], "Best rank must be #55"
    assert "63" in res["answer"], "Latest rank in 2025 must be #63"

    chart = res.get("chart")
    assert chart is not None
    assert chart["chart_type"] == "line"
    assert chart["layout"]["yaxis"]["autorange"] == "reversed"


def test_q2_iiit_hyderabad_trajectory(engine):
    """Q2: How has IIIT Hyderabad performed over the last 8 years?"""
    query = "How has IIIT Hyderabad performed over the last 8 years?"
    res = engine.process_query(query)

    assert res["intent"] == "INSTITUTION_TRAJECTORY"
    assert res["records_count"] >= 8
    assert res["applied_filters"]["category"] == "Engineering"
    assert "International Institute of Information Technology Hyderabad" in res["answer"]
    assert "38" in res["answer"], "Best/latest rank in Engineering is #38"


def test_q3_iiit_hyderabad_rank_in_2025(engine):
    """Q3: What is the rank of IIIT Hyderabad in 2025?"""
    query = "What is the rank of IIIT Hyderabad in 2025?"
    res = engine.process_query(query)

    assert res["intent"] == "FACTUAL_LOOKUP"
    assert res["records_count"] == 1
    assert "Rank #38" in res["answer"]
    assert "58.45" in res["answer"]
    assert res["applied_filters"]["category"] == "Engineering"


def test_q4_iit_madras_overall_score_in_2023(engine):
    """Q4: What was IIT Madras's overall score in 2023?"""
    query = "What was IIT Madras's overall score in 2023?"
    res = engine.process_query(query)

    assert res["intent"] == "FACTUAL_LOOKUP"
    assert res["records_count"] == 1
    assert "86.69" in res["answer"]
    assert "Rank #1" in res["answer"]
    assert res["applied_filters"]["year"] == 2023


def test_q5_compare_iit_delhi_and_iit_bombay_multi_year(engine):
    """Q5: Compare IIT Delhi and IIT Bombay from 2017 to 2025."""
    query = "Compare IIT Delhi and IIT Bombay from 2017 to 2025."
    res = engine.process_query(query)

    assert res["intent"] == "INSTITUTION_COMPARISON"
    assert res["records_count"] == 18, "Both institutions have 9 editions each (total 18 records)"
    assert "Indian Institute of Technology Bombay" in res["answer"]
    assert "Indian Institute of Technology Delhi" in res["answer"]
    assert "6 editions" in res["answer"]

    chart = res.get("chart")
    assert chart is not None
    assert chart["chart_type"] == "line"
    assert chart["layout"]["yaxis"]["autorange"] == "reversed"
    assert len(chart["traces"]) == 2


def test_q6_rpc_parameter_of_iit_madras(engine):
    """Q6: How has the RPC parameter of IIT Madras changed over time?"""
    query = "How has the RPC parameter of IIT Madras changed over time?"
    res = engine.process_query(query)

    assert res["intent"] == "INSTITUTION_TRAJECTORY"
    assert res["records_count"] == 9
    assert "RPC parameter score" in res["answer"]
    assert "72.60" in res["answer"]
    assert "88.02" in res["answer"]
    assert "92.51" in res["answer"]

    chart = res.get("chart")
    assert chart is not None
    assert "RPC Score" in chart["title"]


def test_q7_rank_improvements_climbers(engine):
    """Q7: Which institution improved its ranking the most between 2017 and 2025?"""
    query = "Which institution improved its ranking the most between 2017 and 2025?"
    res = engine.process_query(query)

    assert res["intent"] == "RANK_IMPROVEMENTS"
    assert res["records_count"] >= 1
    assert "Saveetha Institute of Medical and Technical Sciences" in res["answer"]
    assert "+68 places" in res["answer"]
    assert "Rank #91" in res["answer"]
    assert "Rank #23" in res["answer"]


def test_q8_iisc_bangalore_historical_performance_all_9_years(engine):
    """Q8: Show the historical performance of IISc Bangalore."""
    query = "Show the historical performance of IISc Bangalore."
    res = engine.process_query(query)

    assert res["intent"] == "INSTITUTION_TRAJECTORY"
    assert res["records_count"] == 9, "IISc Bangalore must have all 9 editions, not 1 single year!"
    assert "Indian Institute of Science Bangalore" in res["answer"]
    assert "**#1**" in res["answer"]
    assert "**#2**" in res["answer"]


def test_q9_methodology_difference_rank_and_score(engine):
    """Q9: What is the difference between rank and overall score?"""
    query = "What is the difference between rank and overall score?"
    res = engine.process_query(query)

    assert res["intent"] == "METHODOLOGY_EXPLANATION"
    assert "Ordinal" in res["answer"] or "ordinal" in res["answer"]
    assert "0 to 100" in res["answer"] or "0–100" in res["answer"]
    assert "TLR" in res["answer"]
    assert "RPC" in res["answer"]
    assert res["chart"] is None


def test_q10_data_continuity_analysis(engine):
    """Q10: Which institutions have missing historical ranking records?"""
    query = "Which institutions have missing historical ranking records?"
    res = engine.process_query(query)

    assert res["intent"] == "DATA_CONTINUITY_ANALYSIS"
    assert res["records_count"] == 230
    assert "Continuous Participation" in res["answer"]
    assert "29 institutions" in res["answer"]
    assert "Discontinuous" in res["answer"]

    chart = res.get("chart")
    assert chart is not None
    assert chart["chart_type"] == "bar"
