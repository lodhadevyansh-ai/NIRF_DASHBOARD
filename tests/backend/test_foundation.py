"""NIRF Analytics Dashboard — Backend Foundation Unit Tests."""

from pathlib import Path
import sys

# Ensure backend root is on sys.path
backend_path = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.config import settings
from app.core.database import dataset_manager
from app.main import app, get_dataset_columns, get_dataset_status, get_dataset_summary, get_health


def run_coro(coro):
    """Step an asynchronous coroutine synchronously without socket loop overhead."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def test_foundation():
    print(f"Project Name: {settings.PROJECT_NAME}")
    print(f"Target Dataset: {settings.dataset_file_path}")
    print(f"Dataset Available: {dataset_manager.is_available()}")

    # 1. Test get_health
    health = run_coro(get_health())
    assert health.status == "ok", f"Expected ok, got {health.status}"
    assert health.dataset_available is True, "Dataset should be available"
    print(f"[PASS] Health Check: (status={health.status}, env={health.environment})")

    # 2. Test get_dataset_status
    status = run_coro(get_dataset_status())
    assert status.file_available is True
    assert status.total_records == 6572, f"Expected 6572 records, got {status.total_records}"
    assert status.total_columns == 23, f"Expected 23 columns, got {status.total_columns}"
    assert len(status.available_categories) == 17, f"Expected 17 categories, got {len(status.available_categories)}"
    assert len(status.available_years) == 9, f"Expected 9 years, got {len(status.available_years)}"
    print(
        f"[PASS] Dataset Status: (file={status.filename}, size={status.file_size_formatted}, "
        f"records={status.total_records}, cols={status.total_columns}, cats={len(status.available_categories)}, years={len(status.available_years)})"
    )

    # 3. Test get_dataset_columns
    cols = run_coro(get_dataset_columns())
    assert cols.total_columns == 23
    assert len(cols.columns) == 23
    col_names = [c.name for c in cols.columns]
    expected_cols = ["year", "category", "institute_id", "institution_name", "city", "state", "rank", "numeric_rank", "overall_score"]
    for ec in expected_cols:
        assert ec in col_names, f"Missing expected column {ec}"
    print(f"[PASS] Dataset Columns: (total={cols.total_columns}, first 5={col_names[:5]})")

    # 4. Test get_dataset_summary
    summary = run_coro(get_dataset_summary())
    assert summary.total_records == 6572
    assert summary.unique_institutions_by_name == 1223
    assert summary.unique_institutions_by_id == 2055
    assert summary.unique_states_count == 32
    assert summary.year_range == [2017, 2025]
    assert summary.categories_count == 17
    print(
        f"[PASS] Dataset Summary: (institutions={summary.unique_institutions_by_name}, "
        f"states={summary.unique_states_count}, year_range={summary.year_range})"
    )

    # 5. Test OpenAPI Documentation Schema
    schema = app.openapi()
    assert schema["info"]["title"] == settings.PROJECT_NAME
    assert "/api/health" in schema["paths"]
    assert "/api/dataset/status" in schema["paths"]
    assert "/api/dataset/columns" in schema["paths"]
    assert "/api/dataset/summary" in schema["paths"]
    print(f"[PASS] Swagger & OpenAPI Schema: ({len(schema['paths'])} routes registered)")

    print("\nALL BACKEND FOUNDATION TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_foundation()
