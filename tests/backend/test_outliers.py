"""NIRF Analytics Dashboard — Outlier Detection & Performance Gaps Verification Suite.

Tests endpoints:
1. Q8.1 Research Outliers (Regression Residuals, Z-Score, IQR)
2. Q8.2 Research vs Teaching Divergence Gap
3. Q8.3 Year-to-Year Score Change Outliers (Jumps & Drops)
4. Q8.4 Strong Parameter Score but Poor Overall Rank
5. Q8.5 Multi-Year Ranking Volatility Outliers
6. Method Switching (Z-score vs IQR)
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.api.routes.analytics import (
    get_ranking_volatility,
    get_research_outliers,
    get_research_teaching_gap_outliers,
    get_score_change_outliers,
    get_strong_param_poor_rank,
)


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def run_tests():
    print("--- 1. Testing Q8.1 Research Outliers Endpoint ---")
    res1_z = run_async(get_research_outliers(category="Overall", year=2025, method="zscore", threshold=1.5))
    assert res1_z.category == "Overall"
    assert res1_z.year == 2025
    assert res1_z.outliers_count > 0
    assert len(res1_z.points) >= 90
    print(
        f"[PASS] Research Outliers (Z-score) verified: {res1_z.outliers_count} outliers detected. "
        f"Slope: {res1_z.regression_slope}, R^2: {res1_z.regression_r2}. "
        f"Top Outlier: {res1_z.outliers[0].institution_name} (Z={res1_z.outliers[0].z_score}, Residual=+{res1_z.outliers[0].residual} pts)."
    )

    res1_iqr = run_async(get_research_outliers(category="Overall", year=2025, method="iqr", threshold=1.5))
    assert res1_iqr.method == "iqr"
    print(f"[PASS] Research Outliers (IQR) verified: {res1_iqr.outliers_count} outliers detected.")

    print("--- 2. Testing Q8.2 Research vs Teaching Gap Endpoint ---")
    res2 = run_async(get_research_teaching_gap_outliers(category="Overall", year=2025, method="zscore", threshold=2.0))
    assert len(res2.institutions) >= 90
    top_gap = res2.institutions[0]
    print(
        f"[PASS] Research vs Teaching Gap verified: Mean Gap={res2.mean_gap} pts, Std={res2.std_gap}. "
        f"Outliers Count={res2.outliers_count}. Top Gap: {top_gap.institution_name} (Gap={top_gap.gap} pts, Z={top_gap.gap_zscore})."
    )

    print("--- 3. Testing Q8.3 Year-to-Year Score Change Outliers Endpoint ---")
    res3 = run_async(get_score_change_outliers(category="Overall", start_year=2024, end_year=2025, method="zscore", threshold=2.0))
    assert res3.total_evaluated > 70
    assert res3.outliers_count > 0
    print(
        f"[PASS] Score Change Outliers verified: {res3.outliers_count} outliers ({res3.positive_outliers_count} jumps, {res3.negative_outliers_count} drops). "
        f"Top Shift: {res3.outliers[0].institution_name} (Delta={res3.outliers[0].score_delta:+.2f} pts, Z={res3.outliers[0].z_score})."
    )

    print("--- 4. Testing Q8.4 Strong Parameter, Poor Rank Endpoint ---")
    res4 = run_async(get_strong_param_poor_rank(category="Overall", year=2025, parameter="rpc_score", param_percentile_min=60.0, rank_min=50))
    assert res4.qualifying_count > 0
    top_discrepancy = res4.institutions[0]
    print(
        f"[PASS] Strong Parameter, Poor Rank verified: {res4.qualifying_count} qualifying institutions. "
        f"Top Discrepancy: {top_discrepancy.institution_name} (Rank #{top_discrepancy.rank}, RPC={top_discrepancy.parameter_score}, "
        f"RPC Percentile={top_discrepancy.param_percentile}%, Rank Percentile={top_discrepancy.rank_percentile}%)."
    )

    print("--- 5. Testing Q8.5 Ranking Volatility Endpoint ---")
    res5 = run_async(get_ranking_volatility(category="Overall", min_years=4, method="zscore", threshold=1.5))
    assert res5.total_evaluated > 60
    assert res5.volatile_outliers_count > 0
    top_vol = res5.institutions[0]
    print(
        f"[PASS] Ranking Volatility verified: {res5.volatile_outliers_count} volatile outliers among {res5.total_evaluated} institutions. "
        f"Most Volatile: {top_vol.institution_name} (Rank Std={top_vol.std_rank}, Mean Annual Shift={top_vol.mean_absolute_shift} pls, "
        f"Rank Range={top_vol.min_rank}–{top_vol.max_rank})."
    )

    print("\n==========================================")
    print("ALL OUTLIER DETECTION BACKEND TESTS PASSED (100%)")
    print("==========================================")


if __name__ == "__main__":
    run_tests()
