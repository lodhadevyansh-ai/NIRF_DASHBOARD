"""NIRF Analytics Dashboard — Time-Series Analytics Service.

Provides computational engines for:
- Q1.1 Institutional Rank & Score Trajectory (2017–2025)
- Q1.2 Top Ranking Improvements (Start Year to End Year)
- Q1.3 Largest Ranking Declines (Start Year to End Year)
- Q1.4 Category Longitudinal Score Trends (Mean, Median, Dispersion)
- Q1.5 Persistent Top Tier Consistency (Top-10 Frequency & Heatmap)
"""

from datetime import datetime, timezone
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.core.database import dataset_manager
from app.nlq.entity_resolver import entity_resolver
from app.schemas.analytics import (
    AverageScoreResponse,
    ConsistentTopInstitution,
    ConsistentTopResponse,
    InstitutionLookupItem,
    RankShiftItem,
    RankShiftsResponse,
    TrajectoryPoint,
    TrajectoryResponse,
    YearlyScoreStat,
)

logger = logging.getLogger("nirf_backend.analytics.time_series")


class TimeSeriesService:
    """Service class executing longitudinal analyses across NIRF editions."""

    def __init__(self) -> None:
        pass

    def _get_df(self) -> pd.DataFrame:
        """Fetch the preloaded validated master dataset."""
        return dataset_manager.load_dataset()

    def get_category_institutions(self, category: str = "Overall") -> List[InstitutionLookupItem]:
        """Retrieve list of institutions in a category for dropdown selection.

        Sorted by total editions appeared (descending) and best rank (ascending).
        """
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        if cat_df.empty:
            return []

        grouped = cat_df.groupby("institution_name")
        institutions: List[Dict[str, Any]] = []

        latest_year = cat_df["year"].max()

        for name, group in grouped:
            appearances = len(group)
            inst_id = str(group["institute_id"].dropna().iloc[-1]) if not group["institute_id"].dropna().empty else None
            state = str(group["state"].dropna().iloc[-1]) if not group["state"].dropna().empty else None

            # Find latest rank
            latest_row = group[group["year"] == latest_year]
            if not latest_row.empty:
                latest_rank = str(latest_row["rank"].iloc[0])
            else:
                sorted_group = group.sort_values(by="year", ascending=False)
                latest_rank = str(sorted_group["rank"].iloc[0]) if not sorted_group.empty else None

            # Calculate min numeric rank for sorting
            min_rank = group["numeric_rank"].min()
            sort_rank = min_rank if pd.notna(min_rank) else 9999

            institutions.append({
                "item": InstitutionLookupItem(
                    institution_name=str(name),
                    institute_id=inst_id,
                    state=state,
                    appearances=appearances,
                    latest_rank=latest_rank,
                ),
                "appearances": appearances,
                "sort_rank": sort_rank,
            })

        # Sort by appearances descending, then best rank
        institutions.sort(key=lambda x: (-x["appearances"], x["sort_rank"], x["item"].institution_name))
        return [i["item"] for i in institutions]

    def get_trajectory(
        self,
        category: str = "Overall",
        institution: Optional[str] = None,
    ) -> TrajectoryResponse:
        """Compute the longitudinal trajectory of an institution in a category.

        If institution is omitted, defaults to the #1 ranked institution in the latest year.
        """
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        if cat_df.empty:
            raise ValueError(f"Category '{category}' has no recorded rankings in NIRF dataset.")

        # Determine target institution using entity resolver
        if not institution or not institution.strip():
            latest_year = cat_df["year"].max()
            top_inst = cat_df[(cat_df["year"] == latest_year) & (cat_df["numeric_rank"] == 1)]
            if not top_inst.empty:
                target_name = top_inst["institution_name"].iloc[0]
            else:
                target_name = cat_df.sort_values(by=["year", "numeric_rank"], ascending=[False, True])["institution_name"].iloc[0]
            canonical_entity = entity_resolver.get_by_name(target_name)
        else:
            target_name = institution.strip()
            canonical_entity = entity_resolver.resolve_from_query(target_name) or entity_resolver.get_by_name(target_name)

        if canonical_entity:
            # Check if entity exists in requested category; if not, discover its active/primary category
            effective_cat = entity_resolver.get_active_category(canonical_entity, category)
            inst_df = entity_resolver.filter_dataset(df, canonical_entity, effective_cat)
            canonical_name = canonical_entity.canonical_name
            canonical_id = canonical_entity.aishe_id
            category = effective_cat
        else:
            # Direct match fallback
            inst_df = cat_df[cat_df["institution_name"].astype(str).str.lower() == target_name.lower()]
            if inst_df.empty:
                inst_df = cat_df[cat_df["institute_id"].astype(str).str.lower() == target_name.lower()]
            if inst_df.empty:
                inst_df = cat_df[cat_df["institution_name"].astype(str).str.lower().str.contains(target_name.lower(), regex=False)]
            if inst_df.empty:
                # Check other categories in the entire dataset
                alt_df = df[df["institution_name"].astype(str).str.lower().str.contains(target_name.lower(), regex=False)]
                if not alt_df.empty:
                    alt_cat = alt_df["category"].iloc[0]
                    category = alt_cat
                    inst_df = alt_df[alt_df["category"] == alt_cat]

            if inst_df.empty:
                raise ValueError(f"Institution '{target_name}' was not found in the NIRF dataset.")
            canonical_name = str(inst_df["institution_name"].iloc[-1])
            canonical_id = str(inst_df["institute_id"].iloc[-1]) if pd.notna(inst_df["institute_id"].iloc[-1]) else None
        state = str(inst_df["state"].iloc[-1]) if pd.notna(inst_df["state"].iloc[-1]) else None
        city = str(inst_df["city"].iloc[-1]) if pd.notna(inst_df["city"].iloc[-1]) else None

        points: List[TrajectoryPoint] = []
        available_params = set()

        for _, row in inst_df.iterrows():
            year_val = int(row["year"]) if pd.notna(row["year"]) else 0
            rank_val = str(row["rank"]) if pd.notna(row["rank"]) else "N/A"
            numeric_rank = int(row["numeric_rank"]) if pd.notna(row.get("numeric_rank")) else None
            score_val = round(float(row["overall_score"]), 2) if pd.notna(row.get("overall_score")) else None

            # Parameters
            def _param(col_name: str) -> Optional[float]:
                if col_name in row and pd.notna(row[col_name]):
                    available_params.add(col_name)
                    return round(float(row[col_name]), 2)
                return None

            tlr = _param("tlr_score")
            rpc = _param("rpc_score")
            go = _param("go_score")
            oi = _param("oi_score")
            pr = _param("pr_score")
            qnr = _param("qnr_score")
            qlr = _param("qlr_score")
            sfc = _param("sfc_score")

            points.append(
                TrajectoryPoint(
                    year=year_val,
                    rank=rank_val,
                    numeric_rank=numeric_rank,
                    overall_score=score_val,
                    tlr_score=tlr,
                    rpc_score=rpc,
                    go_score=go,
                    oi_score=oi,
                    pr_score=pr,
                    qnr_score=qnr,
                    qlr_score=qlr,
                    sfc_score=sfc,
                )
            )

        # Calculate high level statistics
        valid_ranks = [p.numeric_rank for p in points if p.numeric_rank is not None]
        valid_scores = [p.overall_score for p in points if p.overall_score is not None]

        best_rank = min(valid_ranks) if valid_ranks else None
        worst_rank = max(valid_ranks) if valid_ranks else None
        latest_rank = points[-1].rank if points else None
        latest_score = points[-1].overall_score if points else None

        # Rank change: Starting Rank - Ending Rank (positive indicates improvement)
        rank_change_overall: Optional[int] = None
        if len(valid_ranks) >= 2:
            rank_change_overall = valid_ranks[0] - valid_ranks[-1]

        # Score change: Ending Score - Starting Score
        score_change_overall: Optional[float] = None
        if len(valid_scores) >= 2:
            score_change_overall = round(valid_scores[-1] - valid_scores[0], 2)

        return TrajectoryResponse(
            institution_name=canonical_name,
            institute_id=canonical_id,
            category=category,
            state=state,
            city=city,
            years_ranked=len(points),
            best_rank=best_rank,
            worst_rank=worst_rank,
            latest_rank=latest_rank,
            latest_score=latest_score,
            rank_change_overall=rank_change_overall,
            score_change_overall=score_change_overall,
            trajectory=points,
            parameters_available=sorted(list(available_params)),
        )

    def get_rank_shifts(
        self,
        category: str = "Overall",
        start_year: int = 2017,
        end_year: int = 2025,
        metric_type: str = "improvement",
        limit: int = 10,
    ) -> RankShiftsResponse:
        """Compute institutional rank improvements or declines between two editions.

        Formulas:
        - Improvement = Starting Rank - Ending Rank (positive denotes improvement).
        - Decline = Ending Rank - Starting Rank (positive denotes decline / regression).

        Strict Rules:
        - Only compare actual available observations present in both years.
        - Never fabricate or interpret missing years as rank zero.
        - Never compare across categories.
        - Match institutions using canonical identifiers, institute IDs, or normalized names.
        - Ensure each institution appears at most once in the comparison.
        """
        if start_year >= end_year:
            raise ValueError(f"Start year ({start_year}) must be earlier than end year ({end_year}).")

        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        if cat_df.empty:
            return RankShiftsResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                metric_type=metric_type,
                total_compared=0,
                items=[],
            )

        # Filter strictly for rows with valid numeric rank in start_year and end_year
        df_start = cat_df[(cat_df["year"] == start_year) & (cat_df["numeric_rank"].notna())]
        df_end = cat_df[(cat_df["year"] == end_year) & (cat_df["numeric_rank"].notna())]

        if df_start.empty or df_end.empty:
            return RankShiftsResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                metric_type=metric_type,
                total_compared=0,
                items=[],
            )

        def _get_match_key(row: pd.Series) -> str:
            name = str(row["institution_name"]).strip()
            ent = entity_resolver.resolve_from_query(name) or entity_resolver.get_by_name(name)
            if ent and ent.canonical_name:
                return f"canon:{ent.canonical_name.strip().lower()}"
            iid = str(row.get("institute_id", "")).strip().lower()
            if iid and not iid.startswith(("ir17-", "ir18-")) and iid != "nan":
                return f"iid:{iid}"
            cleaned = re.sub(r"\(.*?\)", "", name.lower())
            norm = re.sub(r"[^a-z0-9]", " ", cleaned).strip()
            norm = re.sub(r"\s+", " ", norm)
            return f"norm:{norm}"

        # Sort ascending by numeric_rank so best rank is retained if any duplicates
        start_sorted = df_start.sort_values(by="numeric_rank").copy()
        start_sorted["match_key"] = [_get_match_key(r) for _, r in start_sorted.iterrows()]
        df_start_unique = start_sorted.drop_duplicates(subset=["match_key"]).set_index("match_key")

        end_sorted = df_end.sort_values(by="numeric_rank").copy()
        end_sorted["match_key"] = [_get_match_key(r) for _, r in end_sorted.iterrows()]
        df_end_unique = end_sorted.drop_duplicates(subset=["match_key"]).set_index("match_key")

        common_keys = df_start_unique.index.intersection(end_dedup_keys := df_end_unique.index)
        total_compared = len(common_keys)

        items: List[RankShiftItem] = []

        for key in common_keys:
            row_start = df_start_unique.loc[key]
            row_end = df_end_unique.loc[key]

            s_rank = int(row_start["numeric_rank"])
            e_rank = int(row_end["numeric_rank"])

            s_score = round(float(row_start["overall_score"]), 2) if pd.notna(row_start.get("overall_score")) else None
            e_score = round(float(row_end["overall_score"]), 2) if pd.notna(row_end.get("overall_score")) else None
            score_diff = round(e_score - s_score, 2) if (s_score is not None and e_score is not None) else None

            # Prefer the latest institution name (from end_year)
            inst_name = str(row_end["institution_name"]).strip()
            inst_id = str(row_end["institute_id"]).strip() if pd.notna(row_end.get("institute_id")) else None
            state = (
                str(row_end["state"]).strip()
                if pd.notna(row_end.get("state"))
                else (str(row_start["state"]).strip() if pd.notna(row_start.get("state")) else None)
            )
            city = (
                str(row_end["city"]).strip()
                if pd.notna(row_end.get("city"))
                else (str(row_start["city"]).strip() if pd.notna(row_start.get("city")) else None)
            )

            if metric_type == "improvement":
                diff = s_rank - e_rank
                if diff > 0:
                    items.append(
                        RankShiftItem(
                            institution_name=inst_name,
                            institute_id=inst_id,
                            state=state,
                            city=city,
                            category=category,
                            start_year=start_year,
                            start_rank=s_rank,
                            start_score=s_score,
                            end_year=end_year,
                            end_rank=e_rank,
                            end_score=e_score,
                            rank_change=diff,
                            score_change=score_diff,
                        )
                    )
            else:
                diff = e_rank - s_rank
                if diff > 0:
                    items.append(
                        RankShiftItem(
                            institution_name=inst_name,
                            institute_id=inst_id,
                            state=state,
                            city=city,
                            category=category,
                            start_year=start_year,
                            start_rank=s_rank,
                            start_score=s_score,
                            end_year=end_year,
                            end_rank=e_rank,
                            end_score=e_score,
                            rank_change=diff,
                            score_change=score_diff,
                        )
                    )

        # Sort descending by change magnitude, then by end_rank, then alphabetically
        items.sort(key=lambda x: (-x.rank_change, x.end_rank, x.institution_name))

        return RankShiftsResponse(
            category=category,
            start_year=start_year,
            end_year=end_year,
            metric_type=metric_type,
            total_compared=total_compared,
            items=items[:limit],
        )

    def get_average_score_trend(
        self,
        category: str = "Overall",
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
    ) -> AverageScoreResponse:
        """Compute category-wide longitudinal score dynamics (Mean, Median, Dispersion)."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        if cat_df.empty:
            return AverageScoreResponse(
                category=category,
                start_year=start_year or 2017,
                end_year=end_year or 2025,
                overall_mean_change=None,
                yearly_stats=[],
            )

        available_years = sorted(cat_df["year"].dropna().astype(int).unique())
        s_year = start_year if start_year is not None else (available_years[0] if available_years else 2017)
        e_year = end_year if end_year is not None else (available_years[-1] if available_years else 2025)

        scoped_df = cat_df[(cat_df["year"] >= s_year) & (cat_df["year"] <= e_year)]

        yearly_stats: List[YearlyScoreStat] = []

        for y in sorted(scoped_df["year"].dropna().astype(int).unique()):
            y_df = scoped_df[scoped_df["year"] == y]
            scores = y_df["overall_score"].dropna()

            count = len(scores)
            if count > 0:
                mean_s = round(float(scores.mean()), 2)
                median_s = round(float(scores.median()), 2)
                std_s = round(float(scores.std()), 2) if count > 1 else 0.0
                min_s = round(float(scores.min()), 2)
                max_s = round(float(scores.max()), 2)
                q25_s = round(float(np.percentile(scores, 25)), 2)
                q75_s = round(float(np.percentile(scores, 75)), 2)
            else:
                mean_s = median_s = std_s = min_s = max_s = q25_s = q75_s = None

            yearly_stats.append(
                YearlyScoreStat(
                    year=y,
                    institution_count=count,
                    mean_score=mean_s,
                    median_score=median_s,
                    std_score=std_s,
                    min_score=min_s,
                    max_score=max_s,
                    q25_score=q25_s,
                    q75_score=q75_s,
                )
            )

        # Net mean score change
        valid_means = [ys.mean_score for ys in yearly_stats if ys.mean_score is not None]
        overall_change = None
        if len(valid_means) >= 2:
            overall_change = round(valid_means[-1] - valid_means[0], 2)

        return AverageScoreResponse(
            category=category,
            start_year=s_year,
            end_year=e_year,
            overall_mean_change=overall_change,
            yearly_stats=yearly_stats,
        )

    def get_consistent_top(
        self,
        category: str = "Overall",
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        top_n: int = 10,
        limit: int = 20,
    ) -> ConsistentTopResponse:
        """Identify institutions maintaining persistent rankings within Top-N tier."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        available_years = sorted(cat_df["year"].dropna().astype(int).unique())
        s_year = start_year if start_year is not None else (available_years[0] if available_years else 2017)
        e_year = end_year if end_year is not None else (available_years[-1] if available_years else 2025)

        scoped_df = cat_df[(cat_df["year"] >= s_year) & (cat_df["year"] <= e_year)]
        years_in_scope = sorted(scoped_df["year"].dropna().astype(int).unique())
        total_years_count = len(years_in_scope)

        if total_years_count == 0:
            return ConsistentTopResponse(
                category=category,
                start_year=s_year,
                end_year=e_year,
                top_n=top_n,
                total_years_analyzed=0,
                institutions=[],
            )

        # Filter institutions that achieved numeric_rank <= top_n at least once
        top_tier_df = scoped_df[scoped_df["numeric_rank"] <= top_n]

        institutions: List[ConsistentTopInstitution] = []
        unique_insts = top_tier_df["institution_name"].unique()

        for name in unique_insts:
            inst_scoped = scoped_df[scoped_df["institution_name"] == name]
            appearances = len(inst_scoped[inst_scoped["numeric_rank"] <= top_n])
            consistency_pct = round((appearances / total_years_count) * 100, 1)

            top_appearances = inst_scoped[inst_scoped["numeric_rank"] <= top_n]
            avg_rank = round(float(top_appearances["numeric_rank"].mean()), 1)
            best_rank = int(top_appearances["numeric_rank"].min())
            worst_rank = int(top_appearances["numeric_rank"].max())

            # Map yearly ranks
            yearly_ranks: Dict[str, Optional[int]] = {}
            for yr in years_in_scope:
                yr_match = inst_scoped[inst_scoped["year"] == yr]
                if not yr_match.empty and pd.notna(yr_match["numeric_rank"].iloc[0]):
                    yearly_ranks[str(yr)] = int(yr_match["numeric_rank"].iloc[0])
                else:
                    yearly_ranks[str(yr)] = None

            latest_yr = years_in_scope[-1]
            latest_match = inst_scoped[inst_scoped["year"] == latest_yr]
            latest_rank = str(latest_match["rank"].iloc[0]) if not latest_match.empty else None

            inst_id = str(inst_scoped["institute_id"].dropna().iloc[-1]) if not inst_scoped["institute_id"].dropna().empty else None
            state = str(inst_scoped["state"].dropna().iloc[-1]) if not inst_scoped["state"].dropna().empty else None

            institutions.append(
                ConsistentTopInstitution(
                    institution_name=str(name),
                    institute_id=inst_id,
                    state=state,
                    appearances=appearances,
                    total_years=total_years_count,
                    consistency_pct=consistency_pct,
                    average_rank=avg_rank,
                    best_rank=best_rank,
                    worst_rank=worst_rank,
                    latest_rank=latest_rank,
                    yearly_ranks=yearly_ranks,
                )
            )

        # Sort by appearances descending, then average_rank ascending
        institutions.sort(key=lambda x: (-x.appearances, x.average_rank, x.best_rank, x.institution_name))

        return ConsistentTopResponse(
            category=category,
            start_year=s_year,
            end_year=e_year,
            top_n=top_n,
            total_years_analyzed=total_years_count,
            institutions=institutions[:limit],
        )


time_series_service = TimeSeriesService()

