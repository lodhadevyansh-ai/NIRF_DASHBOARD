"""NIRF Analytics Dashboard — Data Loader Service.

Centralized ingestion service for NIRF_Master_Dataset.csv.
Ensures thread-safe caching, type integrity, missing value preservation,
and graceful rank-band handling.
"""

from datetime import datetime, timezone
import logging
from pathlib import Path
import threading
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd

from app.core.config import settings
from app.services.data_validator import data_validator, ValidationReport

logger = logging.getLogger("nirf_backend.data_loader")


class DataLoaderError(Exception):
    """Raised when dataset loading or transformation fails."""

    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class DataLoader:
    """Thread-safe singleton responsible for loading, typing, and caching NIRF datasets."""

    _instance: Optional["DataLoader"] = None
    _singleton_lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self._df: Optional[pd.DataFrame] = None
        self._load_lock: threading.Lock = threading.Lock()
        self._last_loaded_time: Optional[datetime] = None
        self._last_validation_report: Optional[ValidationReport] = None
        self._dataset_path: Path = settings.dataset_file_path

    @classmethod
    def get_instance(cls) -> "DataLoader":
        """Access the singleton DataLoader."""
        if cls._instance is None:
            with cls._singleton_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @property
    def dataset_path(self) -> Path:
        """Active path to NIRF_Master_Dataset.csv."""
        return self._dataset_path

    def is_dataset_available(self) -> bool:
        """Verify existence and readability of the CSV."""
        return self._dataset_path.exists() and self._dataset_path.is_file()

    def get_file_metadata(self) -> Dict[str, Any]:
        """Fetch filesystem stats for the master dataset without reading rows."""
        if not self.is_dataset_available():
            return {
                "file_available": False,
                "filename": self._dataset_path.name,
                "file_size_bytes": 0,
                "file_size_formatted": "0 B",
                "last_modified": None,
            }

        stat = self._dataset_path.stat()
        size_bytes = stat.st_size
        mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()

        if size_bytes < 1024:
            size_formatted = f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            size_formatted = f"{size_bytes / 1024:.2f} KB"
        else:
            size_formatted = f"{size_bytes / (1024 * 1024):.2f} MB"

        return {
            "file_available": True,
            "filename": self._dataset_path.name,
            "file_size_bytes": size_bytes,
            "file_size_formatted": size_formatted,
            "last_modified": mtime,
        }

    def _clean_and_type_dataset(self, raw_df: pd.DataFrame) -> pd.DataFrame:
        """Sanitize types, handle rank bands, and preserve missing values."""
        df = raw_df.copy()

        # 1. Clean string fields
        str_columns = ["category", "institution_name", "city", "state", "institute_id", "rank"]
        for col in str_columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()

        # 2. Year to integer
        if "year" in df.columns:
            df["year"] = pd.to_numeric(df["year"], errors="coerce").astype("Int64")

        # 3. Handle ranks and rank bands:
        # If rank contains a band (e.g. '101-150'), numeric_rank must be NaN so math is preserved
        if "rank" in df.columns:
            # Extract pure integers where possible
            is_pure_int = df["rank"].astype(str).str.match(r"^\d+$")
            if "numeric_rank" not in df.columns:
                df["numeric_rank"] = np.nan
            df.loc[is_pure_int, "numeric_rank"] = pd.to_numeric(df.loc[is_pure_int, "rank"], errors="coerce")
            df.loc[~is_pure_int, "numeric_rank"] = np.nan

        if "numeric_rank" in df.columns:
            df["numeric_rank"] = pd.to_numeric(df["numeric_rank"], errors="coerce")

        # 4. Score columns: float, keep true NaNs (never replace missing scores with 0)
        score_columns = [c for c in df.columns if c.endswith("_score")]
        for col in score_columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        return df

    def load_dataset(self, force_reload: bool = False) -> pd.DataFrame:
        """Retrieve the in-memory dataset, reading from disk only when necessary.

        Args:
            force_reload: Bypass cache and re-read from disk.

        Raises:
            DataLoaderError: If the file is missing or invalid.
        """
        if self._df is not None and not force_reload:
            return self._df

        with self._load_lock:
            # Double check lock
            if self._df is not None and not force_reload:
                return self._df

            if not self.is_dataset_available():
                logger.error("Dataset not found at: %s", self._dataset_path)
                raise DataLoaderError(
                    f"NIRF Master Dataset '{self._dataset_path.name}' is missing. "
                    "Please verify data/Processed/NIRF_Master_Dataset.csv exists.",
                    status_code=503,
                )

            logger.info("Reading NIRF Master Dataset from %s (force_reload=%s)", self._dataset_path.name, force_reload)
            try:
                raw_df = pd.read_csv(self._dataset_path, low_memory=False)
                clean_df = self._clean_and_type_dataset(raw_df)

                # Validate data schema
                validation_report = data_validator.validate_dataframe(clean_df)
                if not validation_report.is_valid:
                    error_msg = f"Dataset validation failed: {'; '.join(validation_report.errors)}"
                    logger.error(error_msg)
                    raise DataLoaderError(error_msg, status_code=500)

                self._df = clean_df
                self._last_loaded_time = datetime.now(timezone.utc)
                self._last_validation_report = validation_report

                logger.info(
                    "Master dataset successfully loaded into memory: %d records, %d columns",
                    len(clean_df),
                    len(clean_df.columns),
                )
                return self._df
            except DataLoaderError:
                raise
            except Exception as exc:
                logger.exception("Failed to load NIRF Master Dataset: %s", str(exc))
                raise DataLoaderError(f"Unexpected error loading dataset: {str(exc)}", status_code=500)

    def reload(self) -> Tuple[pd.DataFrame, ValidationReport]:
        """Trigger an explicit reload of the master dataset."""
        df = self.load_dataset(force_reload=True)
        return df, self._last_validation_report or ValidationReport()

    def get_dataframe(self) -> pd.DataFrame:
        """Fast read-only access to cached dataset."""
        if self._df is None:
            return self.load_dataset()
        return self._df

    @property
    def last_loaded_time(self) -> Optional[datetime]:
        """Timestamp of the most recent disk load."""
        return self._last_loaded_time

    @property
    def validation_report(self) -> Optional[ValidationReport]:
        """Most recent validation report."""
        return self._last_validation_report


data_loader = DataLoader.get_instance()

