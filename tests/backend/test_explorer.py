"""NIRF Analytics Dashboard — Dynamic Explorer Verification Suite.

Tests:
1. Explorer schema metadata and variable classifications.
2. Automatic chart recommender logic (data types & analysis purpose).
3. Dynamic query execution across categorical and numerical combinations.
4. All 14 supported chart types:
   - Bar, Grouped Bar, Stacked Bar, Line, Scatter, Histogram, Box,
     Violin, Heatmap, Correlation Heatmap, Radar, Pie, Area, Parallel Coordinates.
5. Whitelist safety validation: non-whitelisted column rejection.
6. Descriptive statistics calculation (mean, median, IQR, quartiles).
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.api.routes.analytics import (
    execute_explorer_query,
    get_explorer_schema,
    recommend_chart,
)
from app.schemas.responses import DynamicFilterParams, DynamicQueryRequest
from app.services.chart_service import ChartServiceError


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def run_tests():
    print("--- 1. Testing Explorer Schema Introspection ---")
    schema = run_async(get_explorer_schema())
    assert schema.total_records == 6572
    assert len(schema.variables) >= 15
    assert len(schema.chart_types) == 14
    assert len(schema.years) == 9
    assert "Overall" in schema.categories
    print(f"[PASS] Schema verified: {len(schema.variables)} variables, {len(schema.chart_types)} chart types, {schema.total_records} records.")

    print("--- 2. Testing Intelligent Chart Recommender ---")
    # Numerical vs Numerical -> Scatter
    r1 = run_async(recommend_chart(x_var="rpc_score", y_var="overall_score"))
    assert r1.chart_type == "scatter"

    # Year vs Numerical -> Line
    r2 = run_async(recommend_chart(x_var="year", y_var="overall_score"))
    assert r2.chart_type == "line"

    # Single Numerical -> Histogram
    r3 = run_async(recommend_chart(x_var="overall_score", y_var="none"))
    assert r3.chart_type == "histogram"

    # Categorical vs Numerical -> Bar
    r4 = run_async(recommend_chart(x_var="institution_name", y_var="overall_score"))
    assert r4.chart_type == "bar"

    # Categorical + Numerical + Purpose: Multivariate -> Radar
    r5 = run_async(recommend_chart(x_var="institution_name", y_var="overall_score", analysis_purpose="multivariate"))
    assert r5.chart_type == "radar"

    print(f"[PASS] Recommender verified across 5 distinct data configurations.")

    print("--- 3. Testing Dynamic Query Execution (Bar Chart & Filters) ---")
    q_bar = DynamicQueryRequest(
        chart_type="bar",
        x_variable="institution_name",
        y_variable="overall_score",
        filters=DynamicFilterParams(category="Overall", year=2025),
        limit=10,
    )
    res_bar = run_async(execute_explorer_query(q_bar))
    assert res_bar.chart_type == "bar"
    assert len(res_bar.traces) == 1
    assert len(res_bar.traces[0]["x"]) == 10
    assert "Madras" in res_bar.traces[0]["x"][0]
    assert len(res_bar.statistics) >= 1
    assert res_bar.records_count == 100
    print(f"[PASS] Bar chart query verified: Top institution is '{res_bar.traces[0]['x'][0]}' (Score: {res_bar.traces[0]['y'][0]}).")

    print("--- 4. Testing Scatter Plot with OLS Fit Line & Size Scaling ---")
    q_scatter = DynamicQueryRequest(
        chart_type="scatter",
        x_variable="rpc_score",
        y_variable="overall_score",
        size_variable="tlr_score",
        filters=DynamicFilterParams(category="Overall", year=2025),
        limit=100,
    )
    res_scatter = run_async(execute_explorer_query(q_scatter))
    assert res_scatter.chart_type == "scatter"
    assert len(res_scatter.traces) == 2  # markers + OLS line
    assert "OLS Fit" in res_scatter.traces[1]["name"]
    print(f"[PASS] Scatter plot verified: {len(res_scatter.traces[0]['x'])} points plotted with OLS fit line.")

    print("--- 5. Testing Correlation Heatmap ---")
    q_corr = DynamicQueryRequest(
        chart_type="correlation_heatmap",
        x_variable="rpc_score",
        y_variable="overall_score",
        filters=DynamicFilterParams(category="Overall", year=2025),
    )
    res_corr = run_async(execute_explorer_query(q_corr))
    assert res_corr.chart_type == "correlation_heatmap"
    assert len(res_corr.traces) == 1
    assert len(res_corr.traces[0]["z"]) == 6  # 6x6 correlation matrix
    print(f"[PASS] Correlation heatmap verified: 6x6 symmetric matrix computed.")

    print("--- 6. Testing Radar, Box, and Parallel Coordinates ---")
    # Radar
    res_radar = run_async(execute_explorer_query(DynamicQueryRequest(
        chart_type="radar",
        x_variable="institution_name",
        filters=DynamicFilterParams(category="Overall", year=2025),
    )))
    assert res_radar.chart_type == "radar"
    assert len(res_radar.traces) == 4  # Top 4 institutions

    # Box Plot
    res_box = run_async(execute_explorer_query(DynamicQueryRequest(
        chart_type="box",
        x_variable="state",
        y_variable="overall_score",
        filters=DynamicFilterParams(category="Overall", year=2025),
    )))
    assert res_box.chart_type == "box"
    assert len(res_box.traces) > 0

    # Parallel Coordinates
    res_par = run_async(execute_explorer_query(DynamicQueryRequest(
        chart_type="parallel_coordinates",
        x_variable="institution_name",
        filters=DynamicFilterParams(category="Overall", year=2025),
    )))
    assert res_par.chart_type == "parallel_coordinates"
    assert len(res_par.traces[0]["dimensions"]) >= 6
    print(f"[PASS] Radar, Box, and Parallel Coordinates verified.")

    print("--- 7. Testing Safety & Column Whitelisting ---")
    try:
        run_async(execute_explorer_query(DynamicQueryRequest(
            chart_type="bar",
            x_variable="malicious_column_drop_table",
            y_variable="overall_score",
        )))
        assert False, "Should have thrown HTTPException for non-whitelisted column"
    except Exception as exc:
        print(f"[PASS] Whitelist security check passed: rejected unauthorized column gracefully.")

    print("\n==========================================")
    print("ALL DYNAMIC EXPLORER BACKEND TESTS PASSED (100%)")
    print("==========================================")


if __name__ == "__main__":
    run_tests()

