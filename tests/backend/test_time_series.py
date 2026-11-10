"""NIRF Analytics Dashboard — Unit & Integration Tests for Time-Series Analytics."""

import asyncio
from pathlib import Path
import sys

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.api.routes.analytics import (
    get_average_score_trend,
    get_consistent_top,
    get_declines,
    get_improvements,
    get_time_series_institutions,
    get_trajectory,
)
from app.services.analytics.time_series import time_series_service
from fastapi import HTTPException


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def test_time_series_institutions_lookup():
    """Verify institution lookup endpoint returns non-empty list for Overall category."""
    print("--- 1. Testing Institution Lookup Endpoint ---")
    data = run_async(get_time_series_institutions(category="Overall"))
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert first.institution_name is not None
    assert first.appearances > 0
    print(f"[PASS] Institutions lookup returned {len(data)} institutions for Overall (Top: {first.institution_name}, appearances: {first.appearances}).")


def test_trajectory_default_and_custom():
    """Verify Q1.1 Trajectory for default and specific institution."""
    print("--- 2. Testing Q1.1 Trajectory Endpoint ---")
    # 1. Default institution
    data_def = run_async(get_trajectory(category="Overall", institution=None))
    assert data_def.category == "Overall"
    assert len(data_def.trajectory) > 0
    assert data_def.best_rank is not None

    # 2. Specific institution: IIT Madras
    data_iitm = run_async(get_trajectory(category="Overall", institution="Indian Institute of Technology Madras"))
    assert "Madras" in data_iitm.institution_name
    assert data_iitm.best_rank == 1
    assert data_iitm.years_ranked == 9
    assert len(data_iitm.trajectory) == 9
    assert "tlr_score" in data_iitm.parameters_available
    assert data_iitm.latest_score is not None
    print(f"[PASS] Trajectory validated for {data_iitm.institution_name}: 9 editions, Best Rank #{data_iitm.best_rank}, Latest Rank #{data_iitm.latest_rank}.")


def test_improvements_calculation():
    """Verify Q1.2 Improvements: Improvement = Starting Rank - Ending Rank (positive values)."""
    print("--- 3. Testing Q1.2 Improvements Endpoint ---")
    data = run_async(get_improvements(category="Overall", start_year=2017, end_year=2025, limit=10))
    assert data.category == "Overall"
    assert data.start_year == 2017
    assert data.end_year == 2025
    assert data.metric_type == "improvement"
    assert data.total_compared > 0
    assert len(data.items) > 0

    for item in data.items:
        calculated = item.start_rank - item.end_rank
        assert calculated > 0, f"Improvement must be positive, got {calculated}"
        assert item.rank_change == calculated

    leader = data.items[0]
    print(f"[PASS] Top improvement: {leader.institution_name} (Rank {leader.start_rank} in 2017 -> Rank {leader.end_rank} in 2025 = +{leader.rank_change} places).")


def test_declines_calculation():
    """Verify Q1.3 Declines: Decline = Ending Rank - Starting Rank (positive values)."""
    print("--- 4. Testing Q1.3 Declines Endpoint ---")
    data = run_async(get_declines(category="Overall", start_year=2017, end_year=2025, limit=10))
    assert data.metric_type == "decline"
    assert len(data.items) > 0

    for item in data.items:
        calculated = item.end_rank - item.start_rank
        assert calculated > 0, f"Decline must be positive, got {calculated}"
        assert item.rank_change == calculated

    leader = data.items[0]
    print(f"[PASS] Largest decline: {leader.institution_name} (Rank {leader.start_rank} in 2017 -> Rank {leader.end_rank} in 2025 = -{leader.rank_change} places).")


def test_average_score_trend():
    """Verify Q1.4 Average Score Trend: annual mean, median, and counts."""
    print("--- 5. Testing Q1.4 Average Score Trend Endpoint ---")
    data = run_async(get_average_score_trend(category="Overall", start_year=2017, end_year=2025))
    assert data.category == "Overall"
    assert len(data.yearly_stats) == 9
    for stat in data.yearly_stats:
        assert stat.institution_count > 0
        assert stat.mean_score is not None
        assert stat.median_score is not None
        assert stat.min_score <= stat.median_score <= stat.max_score

    print(f"[PASS] Average score trend verified across 9 editions (Mean 2017: {data.yearly_stats[0].mean_score} -> Mean 2025: {data.yearly_stats[-1].mean_score}, Net Change: {data.overall_mean_change}).")


def test_consistent_top():
    """Verify Q1.5 Consistent Top: top 10 appearances, consistency pct, and rank heatmap data."""
    print("--- 6. Testing Q1.5 Consistent Top Endpoint ---")
    data = run_async(get_consistent_top(category="Overall", start_year=2017, end_year=2025, top_n=10, limit=10))
    assert data.top_n == 10
    assert data.total_years_analyzed == 9
    assert len(data.institutions) > 0

    top_inst = data.institutions[0]
    assert top_inst.appearances == 9
    assert top_inst.consistency_pct == 100.0
    assert "2017" in top_inst.yearly_ranks
    assert "2025" in top_inst.yearly_ranks
    print(f"[PASS] Consistent top verified (Leader: {top_inst.institution_name}, 100% Top-10 consistency across 9 years).")


def test_invalid_year_ranges():
    """Verify 400 Bad Request when start_year >= end_year."""
    print("--- 7. Testing Invalid Year Range Validation ---")
    try:
        run_async(get_improvements(start_year=2025, end_year=2017))
        assert False, "Should have raised HTTPException 400"
    except HTTPException as e:
        assert e.status_code == 400

    try:
        run_async(get_declines(start_year=2024, end_year=2024))
        assert False, "Should have raised HTTPException 400"
    except HTTPException as e:
        assert e.status_code == 400

    print("[PASS] Validation correctly rejected start_year >= end_year with HTTP 400.")


if __name__ == "__main__":
    test_time_series_institutions_lookup()
    test_trajectory_default_and_custom()
    test_improvements_calculation()
    test_declines_calculation()
    test_average_score_trend()
    test_consistent_top()
    test_invalid_year_ranges()
    print("\n==========================================")
    print("ALL TIME-SERIES BACKEND TESTS PASSED (100%)")
    print("==========================================")
