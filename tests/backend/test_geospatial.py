"""NIRF Analytics Dashboard — Unit & Integration Tests for Geospatial Analytics."""

import asyncio
from pathlib import Path
import sys

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.api.routes.analytics import (
    compare_states,
    get_distribution_trend,
    get_newly_appearing,
    get_state_growth,
    get_top_states,
)
from fastapi import HTTPException


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def test_top_states_kpis_and_ranking():
    """Verify Q2.1 Top States: Leading state, Total states, Top-3 concentration."""
    print("--- 1. Testing Q2.1 Top States Endpoint ---")
    data = run_async(get_top_states(category="Overall", year=2025, top_n=100))
    assert data.category == "Overall"
    assert data.year == 2025
    assert data.top_n == 100
    assert data.total_institutions_scoped == 100
    assert data.leading_state == "Tamil Nadu"
    assert data.leading_state_count == 17
    assert data.total_states_represented == 22
    assert data.top3_concentration_pct == 37.0
    assert data.top3_states == ["Tamil Nadu", "Maharashtra", "Uttar Pradesh"]
    assert len(data.states) == 22

    # Verify first state record
    tn = data.states[0]
    assert tn.state == "Tamil Nadu"
    assert tn.count == 17
    assert tn.top_institution == "Indian Institute of Technology Madras"
    assert tn.top_institution_rank == "1"
    print(f"[PASS] Top States verified: Leading={data.leading_state} ({data.leading_state_count}), States={data.total_states_represented}, Top-3 Concentration={data.top3_concentration_pct}%.")


def test_distribution_trend():
    """Verify Q2.2 Distribution Trend: longitudinal state trends."""
    print("--- 2. Testing Q2.2 Distribution Trend Endpoint ---")
    data = run_async(get_distribution_trend(category="Overall", year=2025))
    assert data.category == "Overall"
    assert len(data.years) == 9
    assert len(data.top_states_trends) > 0
    assert "2025" in data.unique_states_by_year
    print(f"[PASS] Distribution Trend verified across {len(data.years)} years with {len(data.top_states_trends)} top state trajectories.")


def test_state_growth_calculation():
    """Verify Q2.3 State Growth: changes in institution representation between two years."""
    print("--- 3. Testing Q2.3 State Growth Endpoint ---")
    data = run_async(get_state_growth(category="Overall", start_year=2017, end_year=2025, top_n=100))
    assert data.category == "Overall"
    assert data.start_year == 2017
    assert data.end_year == 2025
    assert len(data.items) > 0

    # Find Jammu and Kashmir (grew from 0 to 3)
    jk = next((item for item in data.items if item.state == "Jammu and Kashmir"), None)
    assert jk is not None
    assert jk.start_count == 0
    assert jk.end_count == 3
    assert jk.growth == 3
    assert jk.status == "growing"

    print(f"[PASS] State Growth verified: {data.growing_states_count} growing, {data.declining_states_count} declining, {data.stable_states_count} stable.")


def test_compare_states():
    """Verify Q2.4 Compare States: side by side metrics for Karnataka vs Tamil Nadu."""
    print("--- 4. Testing Q2.4 Compare States Endpoint ---")
    data = run_async(compare_states(category="Overall", year=2025, state_a="Karnataka", state_b="Tamil Nadu"))
    assert data.state_a.state == "Karnataka"
    assert data.state_b.state == "Tamil Nadu"
    assert data.state_a.total_institutions == 6
    assert data.state_b.total_institutions == 17
    assert data.state_a.top_institution == "Indian Institute of Science"
    assert data.state_b.top_institution == "Indian Institute of Technology Madras"
    assert len(data.institutions) == 23  # 6 + 17
    print(f"[PASS] State comparison verified: {data.state_a.state} ({data.state_a.total_institutions} insts) vs {data.state_b.state} ({data.state_b.total_institutions} insts).")


def test_newly_appearing_by_state():
    """Verify Q2.5 Newly Appearing: debuting institutions grouped by state."""
    print("--- 5. Testing Q2.5 Newly Appearing Endpoint ---")
    data = run_async(get_newly_appearing(category="Overall", start_year=2017, end_year=2025))
    assert data.category == "Overall"
    assert data.total_new_institutions == 130
    assert data.leading_state == "Tamil Nadu"
    assert data.leading_state_count == 19
    assert len(data.items) > 0
    print(f"[PASS] Newly appearing institutions verified: {data.total_new_institutions} new institutions across {data.states_count} states (Leader: {data.leading_state} with {data.leading_state_count}).")


def test_invalid_year_bounds():
    """Verify HTTP 400 when start_year >= end_year."""
    print("--- 6. Testing Invalid Year Bounds Validation ---")
    try:
        run_async(get_state_growth(start_year=2025, end_year=2017))
        assert False, "Should raise 400"
    except HTTPException as e:
        assert e.status_code == 400

    try:
        run_async(get_newly_appearing(start_year=2024, end_year=2024))
        assert False, "Should raise 400"
    except HTTPException as e:
        assert e.status_code == 400

    print("[PASS] HTTP 400 properly thrown for invalid start/end year bounds.")


if __name__ == "__main__":
    test_top_states_kpis_and_ranking()
    test_distribution_trend()
    test_state_growth_calculation()
    test_compare_states()
    test_newly_appearing_by_state()
    test_invalid_year_bounds()
    print("\n==========================================")
    print("ALL GEOSPATIAL BACKEND TESTS PASSED (100%)")
    print("==========================================")
