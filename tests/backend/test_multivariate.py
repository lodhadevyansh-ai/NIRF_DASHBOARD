"""NIRF Analytics Dashboard — Unit & Integration Tests for Multivariate Analytics."""

import asyncio
from pathlib import Path
import sys

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.api.routes.analytics import (
    get_parameter_gap,
    get_research_teaching_gap,
    get_score_improvement,
    get_teaching_perception_gap,
    get_top_five,
)
from fastapi import HTTPException


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def test_top_five_comparison():
    """Verify Q5.1 Top Five Comparison: 5 institutions, 5 parameters."""
    print("--- 1. Testing Q5.1 Top Five Comparison Endpoint ---")
    data = run_async(get_top_five(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.year == 2025
    assert len(data.institutions) == 5
    assert len(data.parameters) == 5  # TLR, RPC, GO, OI, PR
    first = data.institutions[0]
    assert first.rank == "1"
    assert "Madras" in first.institution_name
    assert "rpc_score" in first.scores
    print(f"[PASS] Top Five verified: Leader={first.institution_name} (#{first.rank}), Parameters={data.parameters}.")


def test_research_teaching_gap():
    """Verify Q5.2 High Research, Low Teaching: qualifying count and gap."""
    print("--- 2. Testing Q5.2 Research-Teaching Gap Endpoint ---")
    data = run_async(get_research_teaching_gap(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.year == 2025
    assert data.qualifying_count > 0
    assert len(data.institutions) == data.qualifying_count
    # All qualifying must satisfy threshold
    for inst in data.institutions:
        assert inst.score_a >= data.threshold_a
        assert inst.score_b <= data.threshold_b
        assert inst.gap == round(inst.score_a - inst.score_b, 2)
    top_discrepancy = data.institutions[0]
    print(f"[PASS] Research-Teaching Gap verified: {data.qualifying_count} institutions (Leader: {top_discrepancy.institution_name}, Gap={top_discrepancy.gap} pts).")


def test_teaching_perception_gap():
    """Verify Q5.3 High Teaching, Low Perception: qualifying count and gap."""
    print("--- 3. Testing Q5.3 Teaching-Perception Gap Endpoint ---")
    data = run_async(get_teaching_perception_gap(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.year == 2025
    assert data.qualifying_count > 0
    top_discrepancy = data.institutions[0]
    print(f"[PASS] Teaching-Perception Gap verified: {data.qualifying_count} institutions (Leader: {top_discrepancy.institution_name}, Gap={top_discrepancy.gap} pts).")


def test_score_improvement_despite_decline():
    """Verify Q5.4 Score Improvement Despite Parameter Regression."""
    print("--- 4. Testing Q5.4 Score Improvement Despite Decline Endpoint ---")
    data = run_async(get_score_improvement(category="Overall", start_year=2023, end_year=2025))
    assert data.category == "Overall"
    assert data.start_year == 2023
    assert data.end_year == 2025
    assert data.total_improved_entities > 0
    assert data.total_paradoxical_entities > 0
    assert len(data.institutions) == data.total_paradoxical_entities

    for inst in data.institutions:
        assert inst.score_gain > 0
        assert len(inst.declining_parameters) >= 1

    top_inst = data.institutions[0]
    print(f"[PASS] Score improvement despite decline verified: {data.total_paradoxical_entities} paradoxical institutions (Top Gain: {top_inst.institution_name} +{top_inst.score_gain} pts with {len(top_inst.declining_parameters)} declining parameters).")


def test_parameter_gap():
    """Verify Q5.5 Parameter Gap: max minus min disparity."""
    print("--- 5. Testing Q5.5 Parameter Gap Endpoint ---")
    data = run_async(get_parameter_gap(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.year == 2025
    assert len(data.institutions) > 0
    assert data.average_gap > 0

    first = data.institutions[0]
    assert first.param_gap == round(first.highest_score - first.lowest_score, 2)
    print(f"[PASS] Parameter gap verified across {len(data.institutions)} institutions (Average Gap={data.average_gap} pts, Max Gap: {first.institution_name} = {first.param_gap} pts).")


def test_invalid_year_bounds():
    """Verify HTTP 400 when start_year >= end_year."""
    print("--- 6. Testing Invalid Year Bounds Validation ---")
    try:
        run_async(get_score_improvement(start_year=2025, end_year=2023))
        assert False, "Should raise 400"
    except HTTPException as e:
        assert e.status_code == 400

    print("[PASS] HTTP 400 properly thrown for invalid start/end year bounds.")


if __name__ == "__main__":
    test_top_five_comparison()
    test_research_teaching_gap()
    test_teaching_perception_gap()
    test_score_improvement_despite_decline()
    test_parameter_gap()
    test_invalid_year_bounds()
    print("\n==========================================")
    print("ALL MULTIVARIATE BACKEND TESTS PASSED (100%)")
    print("==========================================")

