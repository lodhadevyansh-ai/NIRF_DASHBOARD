"""NIRF Analytics Dashboard — Distribution & Statistical Comparison Verification Suite.

Tests endpoints:
1. Q6.1 Top 10 vs Remaining Score Distribution Comparison
2. Q6.2 Longitudinal Score Dispersion across all years
3. Q6.3 Parameter Variability & Relative Dispersion Ranking (CV & Std Dev)
4. Q6.4 Median and IQR Longitudinal Trend
5. Q6.5 State Score Distribution
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.api.routes.analytics import (
    get_median_iqr_trend,
    get_parameter_variability,
    get_score_dispersion,
    get_state_distribution,
    get_top10_comparison,
)


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def run_tests():
    print("--- 1. Testing Q6.1 Top 10 vs Remaining Comparison Endpoint ---")
    res1 = run_async(get_top10_comparison(category="Overall", year=2025))

    assert res1.category == "Overall"
    assert res1.year == 2025
    assert res1.top10_stats.observations == 10
    assert res1.top10_stats.mean > res1.remaining_stats.mean
    assert res1.top10_stats.median > res1.remaining_stats.median
    assert res1.mean_difference > 0
    print(
        f"[PASS] Top 10 vs Remaining verified: Top10 Mean={res1.top10_stats.mean}, "
        f"Remaining Mean={res1.remaining_stats.mean}, Mean Diff=+{res1.mean_difference} pts."
    )

    print("--- 2. Testing Q6.2 Longitudinal Score Dispersion Endpoint ---")
    res2 = run_async(get_score_dispersion(category="Overall"))

    assert len(res2.yearly_dispersions) >= 8  # 2017 to 2025
    assert res2.max_std_dev > 0
    print(
        f"[PASS] Score Dispersion verified across {len(res2.yearly_dispersions)} years. "
        f"Max Dispersion Year: {res2.max_dispersion_year} (Std Dev: {res2.max_std_dev}), "
        f"Min Dispersion Year: {res2.min_dispersion_year} (Std Dev: {res2.min_std_dev})."
    )

    print("--- 3. Testing Q6.3 Parameter Variability Endpoint ---")
    res3 = run_async(get_parameter_variability(category="Overall", year=2025))

    assert len(res3.parameters) >= 5
    assert res3.highest_cv_parameter is not None
    top_p = res3.parameters[0]
    print(
        f"[PASS] Parameter Variability verified across {len(res3.parameters)} parameters. "
        f"Highest CV Parameter: {res3.highest_cv_parameter} (CV={top_p.cv}%, Std Dev={top_p.std_dev})."
    )

    print("--- 4. Testing Q6.4 Median & IQR Trend Endpoint ---")
    res4 = run_async(get_median_iqr_trend(category="Overall"))

    assert len(res4.trends) >= 8
    print(
        f"[PASS] Median & IQR Trend verified across {len(res4.trends)} editions. "
        f"Direction: {res4.iqr_trend_direction}, 2025 Median: {res4.trends[-1].median}, IQR: {res4.trends[-1].iqr} pts."
    )

    print("--- 5. Testing Q6.5 State Score Distribution Endpoint ---")
    res5 = run_async(get_state_distribution(category="Overall", year=2025, min_institutions=2))

    assert len(res5.states) > 0
    lead_st = res5.states[0]
    print(
        f"[PASS] State Distribution verified across {len(res5.states)} qualifying states. "
        f"Leading State by Median: {lead_st.state} (Median={lead_st.median}, Mean={lead_st.mean}, Insts={lead_st.observations})."
    )

    print("\n==========================================")
    print("ALL DISTRIBUTION & STATISTICAL COMPARISON BACKEND TESTS PASSED (100%)")
    print("==========================================")


if __name__ == "__main__":
    run_tests()
