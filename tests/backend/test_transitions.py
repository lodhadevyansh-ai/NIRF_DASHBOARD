"""NIRF Analytics Dashboard — Ranking Transitions & Institutional Mobility Verification Suite.

Tests endpoints:
1. Q7.1 Rank Band Movement & Sankey Flow (51–100 to Top 50, Between Bands, Exits/Entrants)
2. Q7.2 Top 10 Entries and Exits Between Editions
3. Q7.3 Rank Band Retention Rates & Markov Transition Matrix
4. Q7.4 Largest Climbers and Fallers
5. Q7.5 Institutional Mobility Annual History
6. Input Validation (start_year >= end_year)
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.api.routes.analytics import (
    get_band_movement,
    get_band_retention,
    get_institutional_mobility,
    get_largest_movements,
    get_top10_entry_exit,
)
from fastapi import HTTPException


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def run_tests():
    print("--- 1. Testing Q7.1 Rank Band Movement Endpoint ---")
    res1 = run_async(get_band_movement(category="Overall", start_year=2023, end_year=2025))

    assert res1.category == "Overall"
    assert res1.start_year == 2023
    assert res1.end_year == 2025
    assert res1.common_count > 70
    assert len(res1.sankey_data.nodes) > 0
    assert len(res1.sankey_data.links) > 0
    print(
        f"[PASS] Rank Band Movement verified: {res1.common_count} common institutions, "
        f"{res1.new_entrants_count} new entrants, {res1.exited_count} exited. "
        f"Institutions climbing from 51–100 into Top 50: {res1.band51_100_to_top50_count} "
        f"(Sample: {res1.band51_100_to_top50_institutions[:2]})."
    )

    print("--- 2. Testing Q7.2 Top 10 Entries and Exits Endpoint ---")
    res2 = run_async(get_top10_entry_exit(category="Overall", start_year=2024, end_year=2025))

    assert res2.category == "Overall"
    assert res2.stability_rate >= 80.0
    assert len(res2.retained) >= 8
    print(
        f"[PASS] Top 10 Turnover verified: Stability Rate={res2.stability_rate}%, "
        f"Retained={len(res2.retained)}, Entrants={len(res2.entrants)}, Exits={len(res2.exits)}."
    )

    print("--- 3. Testing Q7.3 Rank Band Retention Endpoint ---")
    res3 = run_async(get_band_retention(category="Overall", start_year=2023, end_year=2025))

    assert len(res3.band_stats) == 4
    assert res3.overall_retention_pct > 0
    assert len(res3.matrix_cells) == 20  # 4 source bands * 5 target bands
    top_band = res3.band_stats[0]
    print(
        f"[PASS] Band Retention verified: Overall Retention={res3.overall_retention_pct}%, "
        f"Upward={res3.overall_upward_pct}%, Downward={res3.overall_downward_pct}%, Exit={res3.overall_exit_pct}%. "
        f"Top 10 Retention={top_band.retention_pct}%."
    )

    print("--- 4. Testing Q7.4 Largest Movements Endpoint ---")
    res4 = run_async(get_largest_movements(category="Overall", start_year=2023, end_year=2025, limit=5))

    assert len(res4.largest_climbers) > 0
    assert len(res4.largest_fallers) > 0
    top_c = res4.largest_climbers[0]
    top_f = res4.largest_fallers[0]
    assert top_c.rank_delta > 0
    assert top_f.rank_delta < 0
    print(
        f"[PASS] Largest Movements verified: Top Climber={top_c.institution_name} (+{top_c.rank_delta} places, #{top_c.start_rank} -> #{top_c.end_rank}), "
        f"Top Faller={top_f.institution_name} ({top_f.rank_delta} places, #{top_f.start_rank} -> #{top_f.end_rank})."
    )

    print("--- 5. Testing Q7.5 Institutional Mobility Annual History Endpoint ---")
    res5 = run_async(get_institutional_mobility(category="Overall"))

    assert len(res5.cycles) >= 8  # 2017 to 2025
    print(
        f"[PASS] Institutional Mobility verified across {len(res5.cycles)} cycles. "
        f"Average Upward: {res5.average_upward_pct}%, Downward: {res5.average_downward_pct}%, Retained: {res5.average_retained_pct}%."
    )

    print("--- 6. Testing Year Bounds Validation ---")
    try:
        run_async(get_band_movement(category="Overall", start_year=2025, end_year=2023))
        assert False, "Should have raised HTTPException 400"
    except HTTPException as e:
        assert e.status_code == 400
        print("[PASS] Proper HTTP 400 thrown for start_year >= end_year.")

    print("\n==========================================")
    print("ALL RANKING TRANSITIONS BACKEND TESTS PASSED (100%)")
    print("==========================================")


if __name__ == "__main__":
    run_tests()

