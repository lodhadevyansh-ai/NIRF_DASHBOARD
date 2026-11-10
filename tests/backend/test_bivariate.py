"""NIRF Analytics Dashboard — Unit & Integration Tests for Bivariate Analytics."""

import asyncio
from pathlib import Path
import sys

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.api.routes.analytics import (
    get_historical_correlation,
    get_parameter_correlation,
    get_pr_vs_overall,
    get_rpc_vs_overall,
    get_tlr_vs_rpc,
    post_custom_bivariate,
)
from app.schemas.analytics import CustomBivariateRequest


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def test_rpc_vs_overall():
    """Verify Q4.1 RPC vs Overall Score: Pearson r, Spearman, regression line, points."""
    print("--- 1. Testing Q4.1 RPC vs Overall Score Endpoint ---")
    data = run_async(get_rpc_vs_overall(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.year == 2025
    assert data.sample_size == 100
    assert data.pearson_r > 0.85
    assert data.spearman_rho > 0.80
    assert data.regression is not None
    assert data.regression.r_squared > 0.70
    assert len(data.points) == 100
    print(f"[PASS] RPC vs Overall verified: Pearson r={data.pearson_r}, R^2={data.regression.r_squared}, Eq: {data.regression.equation}.")


def test_pr_vs_overall():
    """Verify Q4.2 PR vs Overall Score: Pearson r and scatter points."""
    print("--- 2. Testing Q4.2 PR vs Overall Score Endpoint ---")
    data = run_async(get_pr_vs_overall(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.pearson_r > 0.80
    assert len(data.points) == 100
    print(f"[PASS] PR vs Overall verified: Pearson r={data.pearson_r}, Sample size={data.sample_size}.")


def test_parameter_correlation_ranking_and_matrix():
    """Verify Q4.3 Parameter Correlation: ranking hierarchy and correlation matrix."""
    print("--- 3. Testing Q4.3 Parameter Correlation Hierarchy Endpoint ---")
    data = run_async(get_parameter_correlation(category="Overall", year=2025))
    assert data.category == "Overall"
    assert len(data.ranked_parameters) >= 5
    # Strongest parameter should be RPC (or PR)
    strongest = data.ranked_parameters[0]
    assert strongest.parameter == "rpc_score"
    assert strongest.rank == 1
    assert strongest.pearson_r > 0.85
    assert "overall_score" in data.correlation_matrix
    assert data.correlation_matrix["overall_score"]["overall_score"] == 1.0
    print(f"[PASS] Parameter correlation verified: Strongest parameter={strongest.parameter_label} (r={strongest.pearson_r}).")


def test_tlr_vs_rpc():
    """Verify Q4.4 TLR vs RPC: teaching vs research scatter and correlation."""
    print("--- 4. Testing Q4.4 TLR vs RPC Endpoint ---")
    data = run_async(get_tlr_vs_rpc(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.sample_size == 100
    assert len(data.points) == 100
    print(f"[PASS] TLR vs RPC verified: Pearson r={data.pearson_r}, Spearman rho={data.spearman_rho}.")


def test_historical_correlation():
    """Verify Q4.5 Historical Correlation: RPC vs Overall stability (2017–2025)."""
    print("--- 5. Testing Q4.5 Historical Correlation Endpoint ---")
    data = run_async(get_historical_correlation(category="Overall", start_year=2017, end_year=2025))
    assert data.category == "Overall"
    assert len(data.yearly_correlations) == 9
    for pt in data.yearly_correlations:
        assert pt.pearson_r > 0.80
        assert pt.sample_size >= 100
    print(f"[PASS] Historical correlation verified across 9 editions (Span change: {data.overall_change}).")


def test_custom_bivariate_endpoint():
    """Verify Custom Two-Variable Selection interface."""
    print("--- 6. Testing Custom Two-Variable Selection Endpoint ---")
    req = CustomBivariateRequest(
        category="Overall",
        year=2025,
        var_x="go_score",
        var_y="overall_score",
    )
    data = run_async(post_custom_bivariate(req))
    assert data.var_x == "go_score"
    assert data.var_y == "overall_score"
    assert data.pearson_r > 0.50
    assert data.sample_size == 100
    print(f"[PASS] Custom bivariate analysis verified for {data.var_x_label} vs {data.var_y_label} (r={data.pearson_r}).")


if __name__ == "__main__":
    test_rpc_vs_overall()
    test_pr_vs_overall()
    test_parameter_correlation_ranking_and_matrix()
    test_tlr_vs_rpc()
    test_historical_correlation()
    test_custom_bivariate_endpoint()
    print("\n==========================================")
    print("ALL BIVARIATE BACKEND TESTS PASSED (100%)")
    print("==========================================")

