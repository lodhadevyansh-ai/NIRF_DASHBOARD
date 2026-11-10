"""NIRF Analytics Dashboard — Comprehensive Loading & Filtering Test Suite.

Validates:
1. DataLoader caching, type parsing, missing-value preservation, and reload mechanism.
2. DataValidator domain integrity checks.
3. FilterService dynamic dependent options.
4. Institution pagination, search queries, and historical profiles.
5. Executive Dashboard KPIs, Top-10 institutions, Score distribution & Insights.
"""

from pathlib import Path
import sys

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.api.routes.dashboard import (
    get_dashboard_insights,
    get_dashboard_kpis,
    get_score_distribution,
    get_top_institutions,
)
from app.api.routes.filters import get_filter_options
from app.api.routes.institutions import get_institution_detail, list_institutions
from app.main import app
from app.services.data_loader import data_loader
from app.services.data_validator import data_validator
from app.services.filter_service import filter_service


def run_coro(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def test_data_loader_and_validator():
    print("--- 1. Testing DataLoader & DataValidator ---")

    # Ingestion
    df = data_loader.get_dataframe()
    assert len(df) == 6572, f"Expected 6572 rows, got {len(df)}"
    assert len(df.columns) == 23, f"Expected 23 columns, got {len(df.columns)}"

    # Validation
    report = data_loader.validation_report
    assert report is not None
    assert report.is_valid is True, f"Validation failed with errors: {report.errors}"
    assert len(report.errors) == 0

    # Verify types
    assert df["year"].dtype == "Int64"
    assert df["numeric_rank"].dtype in ["float64", "int64"]
    assert df["overall_score"].dtype == "float64"

    # Verify missing value preservation (Innovation should have NaN overall_score, NOT 0.0)
    innovation_scores = df[df["category"] == "Innovation"]["overall_score"]
    assert innovation_scores.isna().all(), "Innovation category must preserve NaN scores, not fabricate 0.0"

    # Verify caching (calling get_dataframe returns same memory object)
    df2 = data_loader.get_dataframe()
    assert df is df2, "DataLoader must cache in-memory DataFrame and avoid re-reading CSV"

    # Verify reload mechanism
    reloaded_df, new_report = data_loader.reload()
    assert len(reloaded_df) == 6572
    assert new_report.is_valid is True
    print("[PASS] DataLoader caching, typing, missing values, and reload mechanism verified.")


def test_dependent_filter_options():
    print("\n--- 2. Testing Dependent Filter Options ---")

    # Global options
    global_opts = run_coro(get_filter_options(category=None, year=None, state=None))
    assert len(global_opts.all_categories) == 17
    assert len(global_opts.all_years) == 9
    assert len(global_opts.all_states) == 32
    assert global_opts.matching_records_count == 6572
    print(f"[PASS] Global options: 17 categories, 9 years, 32 states, {global_opts.matching_records_count} records.")

    # Dependent options for "Agriculture and Allied Sectors" (introduced in 2023!)
    agri_opts = run_coro(get_filter_options(category="Agriculture and Allied Sectors", year=None, state=None))
    assert agri_opts.available_years == [2023, 2024, 2025], f"Expected [2023, 2024, 2025], got {agri_opts.available_years}"
    assert agri_opts.matching_records_count == 120
    print(f"[PASS] Agriculture dependent years: {agri_opts.available_years} ({agri_opts.matching_records_count} records).")

    # Dependent options for "Research Institutions" (uses QNR, QLR, SFC parameters!)
    research_opts = run_coro(get_filter_options(category="Research Institutions", year=None, state=None))
    assert research_opts.available_years == [2021, 2022, 2023, 2024, 2025]
    assert "qnr_score" in research_opts.parameters
    assert "qlr_score" in research_opts.parameters
    assert "sfc_score" in research_opts.parameters
    print(f"[PASS] Research Institutions parameters: {research_opts.parameters}")


def test_institutions_search_and_pagination():
    print("\n--- 3. Testing Institutions Search & Pagination ---")

    # Page 1 of all institutions
    page1 = run_coro(list_institutions(query=None, category=None, year=None, state=None, page=1, page_size=10))
    assert page1.page == 1
    assert page1.page_size == 10
    assert len(page1.items) == 10
    assert page1.total == 2055, f"Expected 2055 unique entities, got {page1.total}"
    assert page1.total_pages > 200
    print(f"[PASS] Pagination: page 1 of {page1.total_pages} (total {page1.total} institutions).")

    # Text search for 'Madras'
    search_res = run_coro(list_institutions(query="Madras", category=None, year=None, state=None, page=1, page_size=10))
    assert search_res.total >= 1
    found_names = [item["institution_name"] for item in search_res.items]
    assert any("Madras" in name for name in found_names)
    print(f"[PASS] Search for 'Madras' returned {search_res.total} matches.")

    # Category + Year specific ranking rows sorted by numeric_rank
    cat_year_res = run_coro(list_institutions(query=None, category="Overall", year=2025, state=None, page=1, page_size=5, sort_by="numeric_rank"))
    assert len(cat_year_res.items) == 5
    # Rank 1 in Overall 2025 should be IIT Madras
    rank1 = cat_year_res.items[0]
    assert rank1["rank"] == 1
    assert "Indian Institute of Technology Madras" in rank1["institution_name"]
    assert rank1["overall_score"] > 85.0
    print(f"[PASS] Category + Year query: Rank 1 is '{rank1['institution_name']}' (Score: {rank1['overall_score']}).")

    # Institution detail by ID or name
    detail = run_coro(get_institution_detail(institution_id="Indian Institute of Technology Madras"))
    assert detail.institution_name == "Indian Institute of Technology Madras"
    assert detail.best_rank == 1
    assert len(detail.history) >= 9
    print(f"[PASS] Institution detail: '{detail.institution_name}', best rank: {detail.best_rank}, appearances: {detail.total_appearances}.")


def test_dashboard_kpis_and_top_institutions():
    print("\n--- 4. Testing Dashboard KPIs & Top Institutions ---")

    # KPIs for Overall 2025
    kpis = run_coro(get_dashboard_kpis(category="Overall", year=2025))
    assert kpis.total_records == 6572
    assert kpis.unique_institutions == 2055
    assert kpis.states_count == 32
    assert kpis.years_covered == "2017–2025"
    assert kpis.categories_count == 17
    assert kpis.active_category == "Overall"
    assert kpis.active_year == 2025
    assert kpis.cohort_records == 100
    assert kpis.leading_state == "Tamil Nadu"
    print(
        f"[PASS] Dashboard KPIs: records={kpis.total_records}, unique_entities={kpis.unique_institutions}, "
        f"states={kpis.states_count}, years={kpis.years_covered}, leading_state={kpis.leading_state} ({kpis.leading_state_institutions} insts)."
    )

    # Top 10 institutions for Overall 2025
    top10 = run_coro(get_top_institutions(category="Overall", year=2025, limit=10))
    assert top10.total == 10
    assert len(top10.institutions) == 10
    assert top10.institutions[0].rank == 1
    assert "Madras" in top10.institutions[0].institution_name
    assert top10.institutions[1].rank == 2
    assert "Science" in top10.institutions[1].institution_name
    print(f"[PASS] Top 10 institutions retrieved (Rank 1: {top10.institutions[0].institution_name}, Rank 2: {top10.institutions[1].institution_name}).")

    # Score distribution for Overall 2025
    dist = run_coro(get_score_distribution(category="Overall", year=2025, bins=15))
    assert dist["has_scores"] is True
    assert len(dist["bin_counts"]) == 15
    assert dist["total_institutions"] == 100
    assert dist["mean_score"] > 50.0
    print(f"[PASS] Score distribution verified (Mean: {dist['mean_score']}, Min: {dist['min_score']}, Max: {dist['max_score']}).")

    # Insights for Overall 2025
    insights = run_coro(get_dashboard_insights(category="Overall", year=2025))
    assert len(insights["top_states"]) > 0
    assert insights["highest_scoring"]["rank"] == 1
    assert "Madras" in insights["highest_scoring"]["institution_name"]
    print(f"[PASS] Dashboard insights verified (Leading state: {insights['top_states'][0]['state']}, Highest score: {insights['highest_scoring']['overall_score']}).")


def test_routes_mounted():
    print("\n--- 5. Testing Registered Routes in FastAPI App ---")
    schema = app.openapi()
    routes = list(schema["paths"].keys())
    required_routes = [
        "/api/health",
        "/api/dataset/status",
        "/api/dataset/columns",
        "/api/dataset/summary",
        "/api/filters/options",
        "/api/institutions",
        "/api/institutions/{institution_id}",
        "/api/dashboard/kpis",
        "/api/dashboard/top-institutions",
        "/api/dashboard/score-distribution",
        "/api/dashboard/insights",
    ]
    for r in required_routes:
        assert r in routes, f"Route '{r}' is not registered on FastAPI app!"
    print(f"[PASS] All {len(required_routes)} required API routes verified on FastAPI app.")


if __name__ == "__main__":
    test_data_loader_and_validator()
    test_dependent_filter_options()
    test_institutions_search_and_pagination()
    test_dashboard_kpis_and_top_institutions()
    test_routes_mounted()
    print("\n==================================================================")
    print("ALL NIRF DATA LOADING & FILTERING SYSTEM TESTS PASSED 100%!")
    print("==================================================================")
