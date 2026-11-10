"""NIRF Analytics Dashboard — Unit & Integration Tests for Univariate Analytics."""

import asyncio
from pathlib import Path
import sys

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.api.routes.analytics import (
    get_category_spread,
    get_descriptive_statistics,
    get_rank_distribution,
    get_score_distribution,
    get_score_quartiles,
)


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def test_score_distribution():
    """Verify Q3.1 Score Distribution: histogram bins, mean, median, min, max."""
    print("--- 1. Testing Q3.1 Score Distribution Endpoint ---")
    data = run_async(get_score_distribution(category="Overall", year=2025, bins=15))
    assert data.category == "Overall"
    assert data.year == 2025
    assert data.total_records == 100
    assert data.valid_observations == 100
    assert data.missing_observations == 0
    assert data.mean == 57.76
    assert data.median == 55.35
    assert data.min_score == 49.04
    assert data.max_score == 87.31
    assert len(data.bins) == 15
    # Total count across bins must sum to 100
    total_binned = sum(b.count for b in data.bins)
    assert total_binned == 100
    print(f"[PASS] Score distribution verified: {data.valid_observations} observations binned across {len(data.bins)} intervals.")


def test_rank_distribution():
    """Verify Q3.2 Rank Distribution: exact ranks vs rank bands and tier segments."""
    print("--- 2. Testing Q3.2 Rank Distribution Endpoint ---")
    data = run_async(get_rank_distribution(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.total_records == 100
    assert data.exact_ranks_count == 100
    assert data.rank_bands_count == 0
    assert len(data.tiers) >= 4  # Top 25, 26-50, 51-75, 76-100
    assert data.tiers[0].count == 25
    print(f"[PASS] Rank distribution verified: {data.exact_ranks_count} exact ranks across {len(data.tiers)} standard brackets.")


def test_descriptive_statistics():
    """Verify Q3.3 Descriptive Statistics: mean, median, std, var, IQR for all parameters."""
    print("--- 3. Testing Q3.3 Descriptive Statistics Endpoint ---")
    data = run_async(get_descriptive_statistics(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.year == 2025
    assert len(data.parameters) >= 6  # overall, tlr, rpc, go, oi, pr

    overall_param = next((p for p in data.parameters if p.parameter == "overall_score"), None)
    assert overall_param is not None
    assert overall_param.mean == 57.76
    assert overall_param.median == 55.35
    assert overall_param.min == 49.04
    assert overall_param.max == 87.31
    assert overall_param.q1 == 51.98
    assert overall_param.q3 == 60.49
    assert overall_param.iqr == 8.51
    print(f"[PASS] Descriptive statistics verified across {len(data.parameters)} parameters (Overall IQR: {overall_param.iqr}).")


def test_score_quartiles():
    """Verify Q3.4 Score Quartiles: boundaries and frequency across Q1, Q2, Q3, Q4."""
    print("--- 4. Testing Q3.4 Score Quartiles Endpoint ---")
    data = run_async(get_score_quartiles(category="Overall", year=2025))
    assert data.category == "Overall"
    assert data.year == 2025
    assert data.total_observations == 100
    assert len(data.quartiles) == 4
    assert data.min_score == 49.04
    assert data.q1_threshold == 51.98
    assert data.median_threshold == 55.35
    assert data.q3_threshold == 60.49
    assert data.max_score == 87.31
    # Check that sum of quartiles equals 100
    total_q_count = sum(q.count for q in data.quartiles)
    assert total_q_count == 100
    print(f"[PASS] Score quartiles verified: Q1={data.q1_threshold}, Median={data.median_threshold}, Q3={data.q3_threshold}, total count={total_q_count}.")


def test_category_spread():
    """Verify Q3.5 Category Spread: cross-category distributions for boxplots."""
    print("--- 5. Testing Q3.5 Category Spread Endpoint ---")
    data = run_async(get_category_spread(year=2025))
    assert data.year == 2025
    assert data.total_categories >= 10
    assert len(data.categories) >= 10
    first_cat = data.categories[0]
    assert first_cat.mean is not None
    assert first_cat.median is not None
    assert len(first_cat.scores) == first_cat.observations
    print(f"[PASS] Category spread verified across {data.total_categories} categories in 2025.")


if __name__ == "__main__":
    test_score_distribution()
    test_rank_distribution()
    test_descriptive_statistics()
    test_score_quartiles()
    test_category_spread()
    print("\n==========================================")
    print("ALL UNIVARIATE BACKEND TESTS PASSED (100%)")
    print("==========================================")

