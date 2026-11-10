"""NIRF Analytics Dashboard — Data Validator Service.

Validates column presence, data types, value boundaries, and data integrity
for the NIRF Master Dataset.
"""

import logging
from typing import Any, Dict, List, Optional, Set
import numpy as np
import pandas as pd

logger = logging.getLogger("nirf_backend.data_validator")

REQUIRED_COLUMNS: Set[str] = {
    "year",
    "category",
    "institute_id",
    "institution_name",
    "city",
    "state",
    "rank",
    "numeric_rank",
}

EXPECTED_SCORE_COLUMNS: Set[str] = {
    "overall_score",
    "tlr_score",
    "rpc_score",
    "go_score",
    "oi_score",
    "pr_score",
    "qnr_score",
    "qlr_score",
    "sfc_score",
}


class ValidationReport:
    """Encapsulates the results of a dataset schema and integrity validation."""

    def __init__(self) -> None:
        self.is_valid: bool = True
        self.total_rows: int = 0
        self.total_columns: int = 0
        self.missing_required_columns: List[str] = []
        self.missing_score_columns: List[str] = []
        self.invalid_score_ranges: Dict[str, int] = {}
        self.duplicate_records_count: int = 0
        self.warnings: List[str] = []
        self.errors: List[str] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "total_rows": self.total_rows,
            "total_columns": self.total_columns,
            "missing_required_columns": self.missing_required_columns,
            "missing_score_columns": self.missing_score_columns,
            "invalid_score_ranges": self.invalid_score_ranges,
            "duplicate_records_count": self.duplicate_records_count,
            "warnings": self.warnings,
            "errors": self.errors,
        }


class DataValidator:
    """Validates DataFrame structure, types, and values against NIRF domain rules."""

    @staticmethod
    def validate_dataframe(df: pd.DataFrame) -> ValidationReport:
        """Execute comprehensive validation against an ingested DataFrame."""
        report = ValidationReport()
        report.total_rows = len(df)
        report.total_columns = len(df.columns)

        if df.empty:
            report.is_valid = False
            report.errors.append("Dataset DataFrame is completely empty.")
            return report

        # 1. Check required structural columns
        missing_req = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_req:
            report.is_valid = False
            report.missing_required_columns = missing_req
            report.errors.append(f"Missing mandatory columns: {missing_req}")

        # 2. Check score columns
        missing_scores = [col for col in EXPECTED_SCORE_COLUMNS if col not in df.columns]
        if missing_scores:
            report.missing_score_columns = missing_scores
            report.warnings.append(f"Optional score columns absent: {missing_scores}")

        # 3. Check duplicate composite keys (year, category, institute_id)
        if all(k in df.columns for k in ["year", "category", "institute_id"]):
            duplicates = df.duplicated(subset=["year", "category", "institute_id"], keep=False).sum()
            report.duplicate_records_count = int(duplicates)
            if duplicates > 0:
                report.is_valid = False
                report.errors.append(f"Detected {duplicates} duplicate ranking records for (year, category, institute_id).")

        # 4. Check score ranges [0, 100] for numeric columns
        for col in EXPECTED_SCORE_COLUMNS:
            if col in df.columns:
                valid_scores = df[col].dropna()
                if not valid_scores.empty:
                    out_of_bounds = valid_scores[(valid_scores < 0.0) | (valid_scores > 100.0)]
                    if len(out_of_bounds) > 0:
                        report.invalid_score_ranges[col] = len(out_of_bounds)
                        report.warnings.append(f"Column '{col}' has {len(out_of_bounds)} values outside [0, 100].")

        # 5. Check year range (2017 to current)
        if "year" in df.columns:
            years = df["year"].dropna()
            invalid_years = years[(years < 2016) | (years > 2035)]
            if len(invalid_years) > 0:
                report.warnings.append(f"Found {len(invalid_years)} unexpected year values outside [2016, 2035].")

        # 6. Check rank ranges
        if "numeric_rank" in df.columns:
            numeric_ranks = df["numeric_rank"].dropna()
            invalid_ranks = numeric_ranks[numeric_ranks < 1]
            if len(invalid_ranks) > 0:
                report.is_valid = False
                report.errors.append(f"Found {len(invalid_ranks)} ranks less than 1.")

        logger.info(
            "Validation finished: valid=%s, rows=%d, errors=%d, warnings=%d",
            report.is_valid,
            report.total_rows,
            len(report.errors),
            len(report.warnings),
        )
        return report


data_validator = DataValidator()

