"""NIRF Analytics Dashboard — Filter Service.

Provides faceted filtering, dynamic dependent dropdown options,
institution queries with pagination, and executive KPI calculations.
"""

import logging
import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.services.data_loader import data_loader

logger = logging.getLogger("nirf_backend.filter_service")

STANDARD_PARAMETERS: List[str] = [
    "overall_score",
    "tlr_score",
    "rpc_score",
    "go_score",
    "oi_score",
    "pr_score",
]

RESEARCH_PARAMETERS: List[str] = [
    "overall_score",
    "qnr_score",
    "qlr_score",
    "sfc_score",
    "oi_score",
    "pr_score",
]


def _unwrap(val: Any, default: Any = None) -> Any:
    """Safely unpack values that may be FastAPI Query or Path parameter defaults."""
    if hasattr(val, "default"):
        return val.default if val.default is not Ellipsis else default
    return val if val is not None else default


class FilterService:
    """Centralized analytical query and multi-dimensional filtering service."""

    def __init__(self) -> None:
        pass

    def _get_base_df(self) -> pd.DataFrame:
        """Fetch active in-memory master dataset."""
        return data_loader.get_dataframe()

    def get_filter_options(
        self,
        category: Optional[str] = None,
        year: Optional[int] = None,
        state: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Compute dynamically dependent filter options."""
        category = _unwrap(category)
        year = _unwrap(year)
        state = _unwrap(state)

        df = self._get_base_df()
        all_categories = sorted(df["category"].dropna().unique().tolist())
        all_years = sorted([int(y) for y in df["year"].dropna().unique().tolist()])
        all_states = sorted(df["state"].dropna().unique().tolist())

        scoped_df = df.copy()

        if category and category in all_categories:
            scoped_df = scoped_df[scoped_df["category"] == category]

        if year and year in all_years:
            scoped_df = scoped_df[scoped_df["year"] == year]

        if state and state in all_states:
            scoped_df = scoped_df[scoped_df["state"] == state]

        available_years = sorted([int(y) for y in scoped_df["year"].dropna().unique().tolist()])
        available_states = sorted(scoped_df["state"].dropna().unique().tolist())
        available_categories = sorted(scoped_df["category"].dropna().unique().tolist())

        min_rank = 1
        max_rank = 100
        if "numeric_rank" in scoped_df.columns:
            valid_ranks = scoped_df["numeric_rank"].dropna()
            if not valid_ranks.empty:
                min_rank = int(valid_ranks.min())
                max_rank = int(valid_ranks.max())

        min_score = 0.0
        max_score = 100.0
        if "overall_score" in scoped_df.columns:
            valid_scores = scoped_df["overall_score"].dropna()
            if not valid_scores.empty:
                min_score = round(float(valid_scores.min()), 2)
                max_score = round(float(valid_scores.max()), 2)

        if category == "Research Institutions":
            parameters = RESEARCH_PARAMETERS
        else:
            parameters = STANDARD_PARAMETERS

        return {
            "all_categories": all_categories,
            "available_categories": available_categories,
            "all_years": all_years,
            "available_years": available_years,
            "all_states": all_states,
            "available_states": available_states,
            "parameters": parameters,
            "rank_range": {"min": min_rank, "max": max_rank},
            "score_range": {"min": min_score, "max": max_score},
            "matching_records_count": len(scoped_df),
        }

    def filter_dataset(
        self,
        category: Optional[str] = None,
        year: Optional[int] = None,
        state: Optional[str] = None,
        query: Optional[str] = None,
        min_rank: Optional[int] = None,
        max_rank: Optional[int] = None,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
    ) -> pd.DataFrame:
        """Apply faceted filters over the master dataset."""
        category = _unwrap(category)
        year = _unwrap(year)
        state = _unwrap(state)
        query = _unwrap(query)
        min_rank = _unwrap(min_rank)
        max_rank = _unwrap(max_rank)
        min_score = _unwrap(min_score)
        max_score = _unwrap(max_score)

        df = self._get_base_df()
        mask = pd.Series(True, index=df.index)

        if category:
            mask &= df["category"] == category

        if year:
            mask &= df["year"] == year

        if state:
            mask &= df["state"] == state

        if min_rank is not None:
            mask &= df["numeric_rank"] >= min_rank

        if max_rank is not None:
            mask &= df["numeric_rank"] <= max_rank

        if min_score is not None:
            mask &= df["overall_score"] >= min_score

        if max_score is not None:
            mask &= df["overall_score"] <= max_score

        if query:
            q_clean = query.strip().lower()
            name_match = df["institution_name"].astype(str).str.lower().str.contains(q_clean, na=False)
            id_match = df["institute_id"].astype(str).str.lower().str.contains(q_clean, na=False)
            city_match = df["city"].astype(str).str.lower().str.contains(q_clean, na=False)
            state_match = df["state"].astype(str).str.lower().str.contains(q_clean, na=False)
            mask &= name_match | id_match | city_match | state_match

        return df[mask]

    def get_institutions_paginated(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        year: Optional[int] = None,
        state: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "institution_name",
        sort_order: str = "asc",
    ) -> Dict[str, Any]:
        """Search and paginate through distinct institutions or filtered records."""
        query = _unwrap(query)
        category = _unwrap(category)
        year = _unwrap(year)
        state = _unwrap(state)
        page = int(_unwrap(page, 1))
        page_size = int(_unwrap(page_size, 20))
        sort_by = str(_unwrap(sort_by, "institution_name"))
        sort_order = str(_unwrap(sort_order, "asc")).lower()

        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        filtered_df = self.filter_dataset(
            category=category,
            year=year,
            state=state,
            query=query,
        )

        if category and year:
            ascending = sort_order == "asc"
            sort_column = sort_by if sort_by in filtered_df.columns else "numeric_rank"
            sorted_df = filtered_df.sort_values(by=sort_column, ascending=ascending)

            total_records = len(sorted_df)
            total_pages = math.ceil(total_records / page_size) if total_records > 0 else 1

            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            page_slice = sorted_df.iloc[start_idx:end_idx]

            items = []
            for _, row in page_slice.iterrows():
                items.append({
                    "institute_id": row["institute_id"],
                    "institution_name": row["institution_name"],
                    "city": row["city"],
                    "state": row["state"],
                    "category": row["category"],
                    "year": int(row["year"]) if pd.notna(row["year"]) else None,
                    "rank": int(row["numeric_rank"]) if pd.notna(row["numeric_rank"]) else str(row["rank"]),
                    "overall_score": round(float(row["overall_score"]), 2) if pd.notna(row["overall_score"]) else None,
                    "tlr_score": round(float(row["tlr_score"]), 2) if "tlr_score" in row and pd.notna(row["tlr_score"]) else None,
                    "rpc_score": round(float(row["rpc_score"]), 2) if "rpc_score" in row and pd.notna(row["rpc_score"]) else None,
                    "go_score": round(float(row["go_score"]), 2) if "go_score" in row and pd.notna(row["go_score"]) else None,
                    "oi_score": round(float(row["oi_score"]), 2) if "oi_score" in row and pd.notna(row["oi_score"]) else None,
                    "pr_score": round(float(row["pr_score"]), 2) if "pr_score" in row and pd.notna(row["pr_score"]) else None,
                })

            return {
                "total": total_records,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "items": items,
            }

        grouped = (
            filtered_df.groupby("institute_id")
            .agg(
                institution_name=("institution_name", "first"),
                city=("city", "first"),
                state=("state", "first"),
                categories=("category", lambda c: sorted(list(set(c)))),
                years=("year", lambda y: sorted([int(v) for v in set(y) if pd.notna(v)])),
                total_appearances=("year", "count"),
                best_rank=("numeric_rank", lambda r: int(r.min()) if r.notna().any() else None),
            )
            .reset_index()
        )

        ascending = sort_order == "asc"
        sort_col = sort_by if sort_by in grouped.columns else "institution_name"
        sorted_grouped = grouped.sort_values(by=sort_col, ascending=ascending)

        total_records = len(sorted_grouped)
        total_pages = math.ceil(total_records / page_size) if total_records > 0 else 1

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_slice = sorted_grouped.iloc[start_idx:end_idx]

        items = []
        for _, row in page_slice.iterrows():
            items.append({
                "institute_id": row["institute_id"],
                "institution_name": row["institution_name"],
                "city": row["city"],
                "state": row["state"],
                "categories": row["categories"],
                "years_participated": row["years"],
                "total_appearances": int(row["total_appearances"]),
                "best_rank": int(row["best_rank"]) if pd.notna(row["best_rank"]) else None,
            })

        return {
            "total": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "items": items,
        }

    def get_institution_detail(self, institution_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full historical profile and all rankings for an institution."""
        institution_id = str(_unwrap(institution_id, ""))
        df = self._get_base_df()
        inst_records = df[df["institute_id"].astype(str).str.lower() == institution_id.strip().lower()]

        if inst_records.empty:
            inst_records = df[df["institution_name"].astype(str).str.lower() == institution_id.strip().lower()]

        if inst_records.empty:
            return None

        first_row = inst_records.iloc[0]
        inst_id = first_row["institute_id"]
        inst_name = first_row["institution_name"]
        city = first_row["city"]
        state = first_row["state"]

        categories = sorted(inst_records["category"].dropna().unique().tolist())
        years = sorted([int(y) for y in inst_records["year"].dropna().unique().tolist()])
        best_rank = int(inst_records["numeric_rank"].min()) if inst_records["numeric_rank"].notna().any() else None

        history_records = []
        sorted_records = inst_records.sort_values(by=["year", "numeric_rank"], ascending=[False, True])

        for _, r in sorted_records.iterrows():
            record = {
                "year": int(r["year"]) if pd.notna(r["year"]) else None,
                "category": r["category"],
                "rank": int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else str(r["rank"]),
                "overall_score": round(float(r["overall_score"]), 2) if pd.notna(r["overall_score"]) else None,
                "tlr_score": round(float(r["tlr_score"]), 2) if "tlr_score" in r and pd.notna(r["tlr_score"]) else None,
                "rpc_score": round(float(r["rpc_score"]), 2) if "rpc_score" in r and pd.notna(r["rpc_score"]) else None,
                "go_score": round(float(r["go_score"]), 2) if "go_score" in r and pd.notna(r["go_score"]) else None,
                "oi_score": round(float(r["oi_score"]), 2) if "oi_score" in r and pd.notna(r["oi_score"]) else None,
                "pr_score": round(float(r["pr_score"]), 2) if "pr_score" in r and pd.notna(r["pr_score"]) else None,
            }
            if "qnr_score" in r and pd.notna(r["qnr_score"]):
                record["qnr_score"] = round(float(r["qnr_score"]), 2)
            if "qlr_score" in r and pd.notna(r["qlr_score"]):
                record["qlr_score"] = round(float(r["qlr_score"]), 2)
            if "sfc_score" in r and pd.notna(r["sfc_score"]):
                record["sfc_score"] = round(float(r["sfc_score"]), 2)

            history_records.append(record)

        return {
            "institute_id": inst_id,
            "institution_name": inst_name,
            "city": city,
            "state": state,
            "categories_participated": categories,
            "years_participated": years,
            "total_appearances": len(inst_records),
            "best_rank": best_rank,
            "history": history_records,
        }

    def get_dashboard_kpis(
        self,
        category: Optional[str] = "Overall",
        year: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Compute the 5 macro KPI cards matching dashboard design."""
        category = _unwrap(category, "Overall")
        year = _unwrap(year, None)

        df = self._get_base_df()

        total_global_records = len(df)
        total_global_institutions = int(df["institute_id"].nunique())
        total_global_states = int(df["state"].nunique())
        all_years = sorted([int(y) for y in df["year"].dropna().unique().tolist()])
        global_years_span = f"{min(all_years)}–{max(all_years)}"
        total_global_categories = int(df["category"].nunique())

        active_cat = category or "Overall"
        scoped_df = df[df["category"] == active_cat] if active_cat in df["category"].values else df

        available_years = sorted([int(y) for y in scoped_df["year"].dropna().unique().tolist()])
        active_year = year if (year and year in available_years) else (available_years[-1] if available_years else 2025)

        cohort_df = scoped_df[scoped_df["year"] == active_year]

        top_state_name = "N/A"
        top_state_count = 0
        if not cohort_df.empty:
            state_counts = cohort_df["state"].value_counts()
            if not state_counts.empty:
                top_state_name = state_counts.index[0]
                top_state_count = int(state_counts.iloc[0])

        return {
            "total_records": total_global_records,
            "unique_institutions": total_global_institutions,
            "states_count": total_global_states,
            "years_covered": global_years_span,
            "categories_count": total_global_categories,
            "active_category": active_cat,
            "active_year": active_year,
            "cohort_records": len(cohort_df),
            "cohort_institutions": int(cohort_df["institute_id"].nunique()),
            "cohort_states": int(cohort_df["state"].nunique()),
            "leading_state": top_state_name,
            "leading_state_institutions": top_state_count,
        }

    def get_top_institutions(
        self,
        category: str = "Overall",
        year: int = 2025,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Retrieve top N institutions sorted by rank for the given category & year."""
        category = str(_unwrap(category, "Overall"))
        year = int(_unwrap(year, 2025))
        limit = int(_unwrap(limit, 10))

        df = self._get_base_df()
        limit = min(max(1, limit), 100)

        cat_clean = category.strip()
        matched = df[(df["category"] == cat_clean) & (df["year"] == year)]

        if matched.empty:
            cat_df = df[df["category"] == cat_clean]
            if not cat_df.empty:
                latest_year = int(cat_df["year"].max())
                matched = cat_df[cat_df["year"] == latest_year]

        sorted_df = matched.sort_values(by="numeric_rank", ascending=True).head(limit)

        results = []
        for _, row in sorted_df.iterrows():
            item = {
                "rank": int(row["numeric_rank"]) if pd.notna(row["numeric_rank"]) else str(row["rank"]),
                "institute_id": row["institute_id"],
                "institution_name": row["institution_name"],
                "city": row["city"],
                "state": row["state"],
                "overall_score": round(float(row["overall_score"]), 2) if pd.notna(row["overall_score"]) else None,
                "tlr_score": round(float(row["tlr_score"]), 2) if "tlr_score" in row and pd.notna(row["tlr_score"]) else None,
                "rpc_score": round(float(row["rpc_score"]), 2) if "rpc_score" in row and pd.notna(row["rpc_score"]) else None,
                "go_score": round(float(row["go_score"]), 2) if "go_score" in row and pd.notna(row["go_score"]) else None,
                "oi_score": round(float(row["oi_score"]), 2) if "oi_score" in row and pd.notna(row["oi_score"]) else None,
                "pr_score": round(float(row["pr_score"]), 2) if "pr_score" in row and pd.notna(row["pr_score"]) else None,
            }
            if "qnr_score" in row and pd.notna(row["qnr_score"]):
                item["qnr_score"] = round(float(row["qnr_score"]), 2)
            if "qlr_score" in row and pd.notna(row["qlr_score"]):
                item["qlr_score"] = round(float(row["qlr_score"]), 2)
            if "sfc_score" in row and pd.notna(row["sfc_score"]):
                item["sfc_score"] = round(float(row["sfc_score"]), 2)

            results.append(item)

        return results

    def get_score_distribution(
        self,
        category: str = "Overall",
        year: int = 2025,
        bins: int = 15,
    ) -> Dict[str, Any]:
        """Compute score distribution histogram bins and summary statistics."""
        category = str(_unwrap(category, "Overall"))
        year = int(_unwrap(year, 2025))
        bins = int(_unwrap(bins, 15))

        df = self._get_base_df()
        matched = df[(df["category"] == category) & (df["year"] == year)]

        if matched.empty:
            cat_df = df[df["category"] == category]
            if not cat_df.empty:
                year = int(cat_df["year"].max())
                matched = cat_df[cat_df["year"] == year]

        valid_scores = matched["overall_score"].dropna().tolist()
        unscored_count = int(matched["overall_score"].isna().sum())

        if not valid_scores:
            return {
                "category": category,
                "year": year,
                "total_institutions": len(matched),
                "unscored_count": unscored_count,
                "has_scores": False,
                "scores": [],
                "bin_counts": [],
                "bin_edges": [],
                "bin_centers": [],
                "min_score": None,
                "max_score": None,
                "mean_score": None,
                "median_score": None,
                "std_score": None,
            }

        counts, edges = np.histogram(valid_scores, bins=bins)
        centers = [(edges[i] + edges[i + 1]) / 2.0 for i in range(len(counts))]

        return {
            "category": category,
            "year": year,
            "total_institutions": len(matched),
            "unscored_count": unscored_count,
            "has_scores": True,
            "scores": [round(float(s), 2) for s in valid_scores],
            "bin_counts": [int(c) for c in counts],
            "bin_edges": [round(float(e), 2) for e in edges],
            "bin_centers": [round(float(c), 2) for c in centers],
            "min_score": round(float(np.min(valid_scores)), 2),
            "max_score": round(float(np.max(valid_scores)), 2),
            "mean_score": round(float(np.mean(valid_scores)), 2),
            "median_score": round(float(np.median(valid_scores)), 2),
            "std_score": round(float(np.std(valid_scores)), 2),
        }

    def get_dashboard_insights(
        self,
        category: str = "Overall",
        year: int = 2025,
    ) -> Dict[str, Any]:
        """Compute comprehensive dashboard insights: category counts, year trends, state shares, leaders."""
        category = str(_unwrap(category, "Overall"))
        year = int(_unwrap(year, 2025))

        df = self._get_base_df()

        # Category-wise institution / record totals
        cat_counts = df["category"].value_counts().to_dict()

        # Year-wise record totals for active category
        active_cat_df = df[df["category"] == category]
        year_counts = {int(k): int(v) for k, v in active_cat_df["year"].value_counts().sort_index().items()}

        # Active cohort records
        cohort = active_cat_df[active_cat_df["year"] == year]
        if cohort.empty and not active_cat_df.empty:
            year = int(active_cat_df["year"].max())
            cohort = active_cat_df[active_cat_df["year"] == year]

        # Top 5 states in this cohort
        top_states = []
        if not cohort.empty:
            state_vc = cohort["state"].value_counts().head(5)
            for state_name, count in state_vc.items():
                top_states.append({
                    "state": state_name,
                    "count": int(count),
                    "percentage": round(float(count / len(cohort) * 100), 1),
                })

        # Parameter leaders (highest performer in each parameter)
        param_leaders = {}
        score_columns = [c for c in ["tlr_score", "rpc_score", "go_score", "oi_score", "pr_score", "qnr_score", "qlr_score", "sfc_score"] if c in cohort.columns]
        for col in score_columns:
            valid_col = cohort[cohort[col].notna()]
            if not valid_col.empty:
                best_row = valid_col.loc[valid_col[col].idxmax()]
                param_leaders[col] = {
                    "institution_name": best_row["institution_name"],
                    "state": best_row["state"],
                    "rank": int(best_row["numeric_rank"]) if pd.notna(best_row["numeric_rank"]) else str(best_row["rank"]),
                    "score": round(float(best_row[col]), 2),
                }

        # Highest scoring institution overall
        highest_scoring = None
        valid_overall = cohort[cohort["overall_score"].notna()]
        if not valid_overall.empty:
            top_inst = valid_overall.loc[valid_overall["overall_score"].idxmax()]
            highest_scoring = {
                "institution_name": top_inst["institution_name"],
                "rank": int(top_inst["numeric_rank"]) if pd.notna(top_inst["numeric_rank"]) else str(top_inst["rank"]),
                "state": top_inst["state"],
                "overall_score": round(float(top_inst["overall_score"]), 2),
            }

        return {
            "category": category,
            "year": year,
            "category_counts": cat_counts,
            "year_counts": year_counts,
            "top_states": top_states,
            "highest_scoring": highest_scoring,
            "parameter_leaders": param_leaders,
        }


filter_service = FilterService()
