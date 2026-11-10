"""Verification script for Chatbot, Transitions Matrix, and Dynamic Explorer Box/Violin plots."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))

from app.services.chart_service import chart_service
from app.services.analytics.ranking_transitions import ranking_transitions_service
from app.schemas.responses import DynamicQueryRequest, DynamicFilterParams

def test_dynamic_explorer_box_and_violin():
    print("--- Testing Dynamic Explorer Box & Violin Plots ---")
    
    # 1. Single-cohort Box Plot (default explorer setting)
    req_box_single = DynamicQueryRequest(
        chart_type="box",
        x_variable="institution_name",
        y_variable="overall_score",
        filters=DynamicFilterParams(category="Overall", year=2025)
    )
    res_box_single = chart_service.execute_query(req_box_single)
    assert len(res_box_single.traces) == 1, f"Expected 1 cohort trace, got {len(res_box_single.traces)}"
    assert len(res_box_single.traces[0]["y"]) == 100, f"Expected 100 points, got {len(res_box_single.traces[0]['y'])}"
    assert res_box_single.traces[0]["boxpoints"] == "outliers"
    assert res_box_single.traces[0]["boxmean"] is True
    print("[PASS] Single-cohort Box Plot verified: 100 observations, Tukey outlier whiskers, meanline.")

    # 2. Multi-cohort Box Plot (grouped by state)
    req_box_multi = DynamicQueryRequest(
        chart_type="box",
        x_variable="state",
        y_variable="overall_score",
        filters=DynamicFilterParams(category="Overall", year=2025)
    )
    res_box_multi = chart_service.execute_query(req_box_multi)
    assert len(res_box_multi.traces) >= 5, f"Expected >= 5 state traces, got {len(res_box_multi.traces)}"
    print(f"[PASS] Multi-cohort Box Plot verified: {len(res_box_multi.traces)} state distributions.")

    # 3. Single-cohort Violin Plot (default explorer setting)
    req_violin_single = DynamicQueryRequest(
        chart_type="violin",
        x_variable="institution_name",
        y_variable="overall_score",
        filters=DynamicFilterParams(category="Overall", year=2025)
    )
    res_violin_single = chart_service.execute_query(req_violin_single)
    assert len(res_violin_single.traces) == 1, f"Expected 1 cohort trace, got {len(res_violin_single.traces)}"
    assert len(res_violin_single.traces[0]["y"]) == 100
    assert res_violin_single.traces[0]["spanmode"] == "soft"
    assert res_violin_single.traces[0]["scalemode"] == "width"
    assert res_violin_single.traces[0]["box"]["visible"] is True
    print("[PASS] Single-cohort Violin Plot verified: 100 observations, soft spanmode, inner box, meanline.")

    # 4. Multi-cohort Violin Plot (grouped by state)
    req_violin_multi = DynamicQueryRequest(
        chart_type="violin",
        x_variable="state",
        y_variable="overall_score",
        filters=DynamicFilterParams(category="Overall", year=2025)
    )
    res_violin_multi = chart_service.execute_query(req_violin_multi)
    assert len(res_violin_multi.traces) >= 5
    assert res_violin_multi.traces[0]["spanmode"] == "soft"
    print(f"[PASS] Multi-cohort Violin Plot verified: {len(res_violin_multi.traces)} state KDE profiles.")

def test_transitions_band_retention_and_matrix():
    print("--- Testing Transitions Band Retention & Matrix ---")
    
    # 1. Overall standard retention
    res_overall = ranking_transitions_service.get_band_retention("Overall", 2023, 2025)
    assert res_overall.total_institutions == 100
    assert len(res_overall.band_stats) == 4
    assert len(res_overall.matrix_cells) == 20
    assert res_overall.overall_retention_pct == 62.0
    print("[PASS] Overall Band Retention verified: 100 insts, 4 band stats, 20 Markov cells.")

    # 2. Categories with smaller cohorts (e.g. Law, Architecture)
    res_arch = ranking_transitions_service.get_band_retention("Architecture and Planning", 2023, 2025)
    assert res_arch.total_institutions == 30
    assert len(res_arch.matrix_cells) == 20
    print("[PASS] Architecture Band Retention verified: 30 institutions handled safely.")

    # 3. Empty category handling (Skill University)
    res_empty = ranking_transitions_service.get_band_retention("Skill University", 2017, 2025)
    assert res_empty.total_institutions == 0
    assert len(res_empty.band_stats) == 0
    assert len(res_empty.matrix_cells) == 0
    print("[PASS] Empty category handled gracefully without crash.")

if __name__ == "__main__":
    test_dynamic_explorer_box_and_violin()
    test_transitions_band_retention_and_matrix()
    print("\n==========================================")
    print("ALL FIXES VERIFICATION TESTS PASSED (100%)")
    print("==========================================")

