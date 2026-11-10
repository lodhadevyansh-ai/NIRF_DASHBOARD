"""NIRF Analytics Dashboard — In-Memory Dataset Manager & Database Abstraction.

Maintains a singleton in-memory copy of NIRF_Master_Dataset.csv via DataLoader.
Guarantees read-only access and avoids duplicate file loading.
"""

from datetime import datetime
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.core.config import settings
from app.services.data_loader import data_loader, DataLoaderError

logger = logging.getLogger("nirf_backend.database")


class DatasetError(DataLoaderError):
    """Raised when the master dataset cannot be located or loaded."""
    pass


class DatasetManager:
    """Thread-safe singleton managing in-memory access to the NIRF Master Dataset."""

    _instance: Optional["DatasetManager"] = None

    @classmethod
    def get_instance(cls) -> "DatasetManager":
        """Retrieve the singleton DatasetManager instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def dataset_path(self) -> Path:
        """Return the target dataset path."""
        return data_loader.dataset_path

    def is_available(self) -> bool:
        """Check if the master dataset CSV exists on disk."""
        return data_loader.is_dataset_available()

    def get_file_stats(self) -> Dict[str, Any]:
        """Obtain file system metadata without reading the entire dataset."""
        return data_loader.get_file_metadata()

    def load_dataset(self, force_reload: bool = False) -> pd.DataFrame:
        """Load the master dataset into memory safely."""
        return data_loader.load_dataset(force_reload=force_reload)

    def get_df(self) -> pd.DataFrame:
        """Access the cached master dataset DataFrame."""
        return data_loader.get_dataframe()

    def get_status(self) -> Dict[str, Any]:
        """Compile comprehensive dataset status metrics."""
        stats = self.get_file_stats()
        if not stats["file_available"]:
            return {
                **stats,
                "total_records": 0,
                "total_columns": 0,
                "available_categories": [],
                "available_years": [],
            }

        df = self.get_df()
        categories = sorted(df["category"].dropna().unique().tolist()) if "category" in df.columns else []
        years = sorted([int(y) for y in df["year"].dropna().unique().tolist()]) if "year" in df.columns else []

        return {
            **stats,
            "total_records": len(df),
            "total_columns": len(df.columns),
            "available_categories": categories,
            "available_years": years,
        }

    def get_columns_metadata(self) -> List[Dict[str, Any]]:
        """Return structural metadata and summary statistics for every column."""
        df = self.get_df()
        columns_info = []

        for col in df.columns:
            series = df[col]
            n_missing = int(series.isna().sum())
            pct_missing = round(float((n_missing / len(df)) * 100), 2)
            n_unique = int(series.nunique(dropna=True))

            # Sample values (up to 3 non-null values)
            non_null_samples = series.dropna().unique()[:3]
            sample_values = [
                int(v) if isinstance(v, (np.integer, int))
                else float(v) if isinstance(v, (np.floating, float))
                else str(v)
                for v in non_null_samples
            ]

            columns_info.append(
                {
                    "name": col,
                    "dtype": str(series.dtype),
                    "non_null_count": int(series.notna().sum()),
                    "null_count": n_missing,
                    "null_percentage": pct_missing,
                    "unique_count": n_unique,
                    "sample_values": sample_values,
                }
            )

        return columns_info

    def get_dataset_summary(self) -> Dict[str, Any]:
        """Compute high-level macro summary of the master dataset."""
        df = self.get_df()

        category_counts = df["category"].value_counts().to_dict() if "category" in df.columns else {}
        year_counts = {int(k): int(v) for k, v in df["year"].value_counts().sort_index().items()} if "year" in df.columns else {}

        score_columns = [c for c in df.columns if c.endswith("_score")]

        # Determine unscored categories
        unscored_cats = []
        if "category" in df.columns and "overall_score" in df.columns:
            cat_score_nulls = df.groupby("category")["overall_score"].apply(lambda s: s.isna().all())
            unscored_cats = cat_score_nulls[cat_score_nulls].index.tolist()

        return {
            "total_records": len(df),
            "total_columns": len(df.columns),
            "unique_institutions_by_name": int(df["institution_name"].nunique()) if "institution_name" in df.columns else 0,
            "unique_institutions_by_id": int(df["institute_id"].nunique()) if "institute_id" in df.columns else 0,
            "unique_states_count": int(df["state"].nunique()) if "state" in df.columns else 0,
            "year_range": [min(year_counts.keys()), max(year_counts.keys())] if year_counts else [],
            "years_covered_count": len(year_counts),
            "categories_count": len(category_counts),
            "records_per_category": category_counts,
            "records_per_year": year_counts,
            "available_parameters": score_columns,
            "unscored_categories": unscored_cats,
        }


# Global singleton dataset manager
dataset_manager = DatasetManager.get_instance()
