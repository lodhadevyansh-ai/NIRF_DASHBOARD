"""NIRF Analytics Dashboard — Geospatial Analytics Service.

Provides computational engines for:
- Q2.1 Top States Representation & Hub Concentration
- Q2.2 Longitudinal Distribution Trends across Editions
- Q2.3 State-level Institution Growth & Shifts (Start to End Year)
- Q2.4 Dual-State Comparative Analytics (Karnataka vs Tamil Nadu, etc.)
- Q2.5 Newly Appearing Institutions Breakdown by State
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.core.database import dataset_manager
from app.schemas.analytics import (
    CompareStatesResponse,
    DistributionTrendResponse,
    NewlyAppearingResponse,
    NewlyAppearingStateItem,
    StateDistributionItem,
    StateGrowthItem,
    StateGrowthResponse,
    StateHistoricalTrend,
    StateProfile,
    TopStatesResponse,
)

logger = logging.getLogger("nirf_backend.analytics.geospatial")


class GeospatialService:
    """Service class executing state-level and geospatial analyses across NIRF datasets."""

    def __init__(self) -> None:
        pass

    def _get_df(self) -> pd.DataFrame:
        """Fetch the preloaded validated master dataset."""
        return dataset_manager.load_dataset()

    def get_top_states(
        self,
        category: str = "Overall",
        year: int = 2025,
        top_n: int = 100,
    ) -> TopStatesResponse:
        """Q2.1: Identify states with the highest representation in top ranking tiers."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        # Filter by year
        year_df = cat_df[cat_df["year"] == year].copy()
        if year_df.empty:
            latest_year = cat_df["year"].max() if not cat_df.empty else 2025
            year = int(latest_year)
            year_df = cat_df[cat_df["year"] == year].copy()

        if year_df.empty:
            return TopStatesResponse(
                category=category,
                year=year,
                top_n=top_n,
                total_institutions_scoped=0,
                leading_state="N/A",
                leading_state_count=0,
                total_states_represented=0,
                top3_concentration_pct=0.0,
                top3_states=[],
                states=[],
            )

        # Apply top_n threshold if numeric_rank is available
        if top_n > 0 and year_df["numeric_rank"].notna().any():
            scoped_df = year_df[year_df["numeric_rank"] <= top_n].copy()
            if scoped_df.empty:
                scoped_df = year_df.copy()
        else:
            scoped_df = year_df.copy()

        total_scoped = len(scoped_df)
        states_items: List[StateDistributionItem] = []

        grouped = scoped_df.groupby("state")
        for state_name, group in grouped:
            count = len(group)
            share_pct = round((count / total_scoped) * 100, 1) if total_scoped > 0 else 0.0

            # Find best institution in state
            sorted_insts = group.sort_values(by="numeric_rank", ascending=True, na_position="last")
            top_inst_name = str(sorted_insts["institution_name"].iloc[0])
            top_inst_rank = str(sorted_insts["rank"].iloc[0]) if pd.notna(sorted_insts["rank"].iloc[0]) else "N/A"

            scores = group["overall_score"].dropna()
            avg_score = round(float(scores.mean()), 2) if not scores.empty else None
            med_score = round(float(scores.median()), 2) if not scores.empty else None
            cities_cnt = int(group["city"].nunique())

            tlr_series = group["tlr_score"].dropna() if "tlr_score" in group else pd.Series(dtype=float)
            rpc_series = group["rpc_score"].dropna() if "rpc_score" in group else pd.Series(dtype=float)
            go_series = group["go_score"].dropna() if "go_score" in group else pd.Series(dtype=float)
            oi_series = group["oi_score"].dropna() if "oi_score" in group else pd.Series(dtype=float)
            pr_series = group["pr_score"].dropna() if "pr_score" in group else pd.Series(dtype=float)

            avg_tlr = round(float(tlr_series.mean()), 2) if not tlr_series.empty else None
            avg_rpc = round(float(rpc_series.mean()), 2) if not rpc_series.empty else None
            avg_go = round(float(go_series.mean()), 2) if not go_series.empty else None
            avg_oi = round(float(oi_series.mean()), 2) if not oi_series.empty else None
            avg_pr = round(float(pr_series.mean()), 2) if not pr_series.empty else None

            states_items.append(
                StateDistributionItem(
                    state=str(state_name),
                    count=count,
                    share_pct=share_pct,
                    top_institution=top_inst_name,
                    top_institution_rank=top_inst_rank,
                    average_score=avg_score,
                    median_score=med_score,
                    cities_count=cities_cnt,
                    avg_tlr=avg_tlr,
                    avg_rpc=avg_rpc,
                    avg_go=avg_go,
                    avg_oi=avg_oi,
                    avg_pr=avg_pr,
                )
            )

        # Sort descending by count, then average score
        states_items.sort(key=lambda x: (-x.count, -(x.average_score or 0), x.state))

        leading_state = states_items[0].state if states_items else "N/A"
        leading_count = states_items[0].count if states_items else 0
        total_states_rep = len(states_items)

        top3_sum = sum(s.count for s in states_items[:3])
        top3_pct = round((top3_sum / total_scoped) * 100, 1) if total_scoped > 0 else 0.0
        top3_names = [s.state for s in states_items[:3]]

        return TopStatesResponse(
            category=category,
            year=year,
            top_n=top_n,
            total_institutions_scoped=total_scoped,
            leading_state=leading_state,
            leading_state_count=leading_count,
            total_states_represented=total_states_rep,
            top3_concentration_pct=top3_pct,
            top3_states=top3_names,
            states=states_items,
        )

    def get_distribution_trend(
        self,
        category: str = "Overall",
        year: Optional[int] = None,
    ) -> DistributionTrendResponse:
        """Q2.2: Longitudinal evolution of geographic distribution and regional share."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        available_years: List[int] = sorted([int(y) for y in cat_df["year"].dropna().unique()])
        if not available_years:
            return DistributionTrendResponse(
                category=category,
                years=[],
                unique_states_by_year={},
                top_states_trends=[],
                states_distribution=[],
            )

        selected_year: int = year if (year is not None and year in available_years) else available_years[-1]

        # 1. Unique states by year
        unique_by_yr: Dict[str, int] = {}
        for y in available_years:
            unique_by_yr[str(y)] = int(cat_df[cat_df["year"] == y]["state"].nunique())

        # 2. Top states trends across all years
        # Identify top 8 states by cumulative institutions
        top_state_names = cat_df["state"].value_counts().head(8).index.tolist()
        top_trends: List[StateHistoricalTrend] = []

        for st in top_state_names:
            st_df = cat_df[cat_df["state"] == st]
            yearly_counts: Dict[str, int] = {}
            for y in available_years:
                cnt = len(st_df[st_df["year"] == y])
                yearly_counts[str(y)] = cnt

            counts_list = [yearly_counts[str(y)] for y in available_years]
            if len(counts_list) >= 2:
                if counts_list[-1] > counts_list[0]:
                    direction = "increasing"
                elif counts_list[-1] < counts_list[0]:
                    direction = "decreasing"
                else:
                    direction = "stable"
            else:
                direction = "stable"

            top_trends.append(
                StateHistoricalTrend(
                    state=str(st),
                    yearly_counts=yearly_counts,
                    total_across_years=len(st_df),
                    trend_direction=direction,
                )
            )

        # 3. Selected year state distribution
        current_top = self.get_top_states(category=category, year=selected_year, top_n=0)

        return DistributionTrendResponse(
            category=category,
            years=available_years,
            unique_states_by_year=unique_by_yr,
            top_states_trends=top_trends,
            states_distribution=current_top.states,
        )

    def get_state_growth(
        self,
        category: str = "Overall",
        start_year: int = 2017,
        end_year: int = 2025,
        top_n: int = 100,
    ) -> StateGrowthResponse:
        """Q2.3: Calculate state representation gains/declines in top tiers over time."""
        if start_year >= end_year:
            raise ValueError(f"Start year ({start_year}) must be earlier than end year ({end_year}).")

        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        # Scope by top_n if numeric_rank is present
        if top_n > 0 and cat_df["numeric_rank"].notna().any():
            scoped = cat_df[cat_df["numeric_rank"] <= top_n]
        else:
            scoped = cat_df

        s_counts = scoped[scoped["year"] == start_year]["state"].value_counts().to_dict()
        e_counts = scoped[scoped["year"] == end_year]["state"].value_counts().to_dict()

        all_states = sorted(set(s_counts.keys()).union(set(e_counts.keys())))

        items: List[StateGrowthItem] = []
        growing = 0
        declining = 0
        stable = 0

        for st in all_states:
            s_c = int(s_counts.get(st, 0))
            e_c = int(e_counts.get(st, 0))
            growth = e_c - s_c

            if growth > 0:
                growing += 1
                status = "growing"
            elif growth < 0:
                declining += 1
                status = "declining"
            else:
                stable += 1
                status = "stable"

            if s_c > 0:
                pct = round(((e_c - s_c) / s_c) * 100, 1)
            else:
                pct = 100.0 if e_c > 0 else 0.0

            items.append(
                StateGrowthItem(
                    state=str(st),
                    start_year=start_year,
                    start_count=s_c,
                    end_year=end_year,
                    end_count=e_c,
                    growth=growth,
                    growth_pct=pct,
                    status=status,
                )
            )

        # Sort by growth descending, then end_count descending
        items.sort(key=lambda x: (-x.growth, -x.end_count, x.state))

        return StateGrowthResponse(
            category=category,
            start_year=start_year,
            end_year=end_year,
            top_n=top_n,
            growing_states_count=growing,
            declining_states_count=declining,
            stable_states_count=stable,
            items=items,
        )

    def compare_states(
        self,
        category: str = "Overall",
        year: int = 2025,
        state_a: str = "Karnataka",
        state_b: str = "Tamil Nadu",
    ) -> CompareStatesResponse:
        """Q2.4: Deep comparative institutional analysis between two states."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        def _build_profile(state_name: str) -> StateProfile:
            st_df = yr_df[yr_df["state"].astype(str).str.strip().str.lower() == state_name.strip().lower()]
            total_insts = len(st_df)
            top_100_cnt = len(st_df[st_df["numeric_rank"] <= 100]) if not st_df.empty else 0
            top_10_cnt = len(st_df[st_df["numeric_rank"] <= 10]) if not st_df.empty else 0

            scores = st_df["overall_score"].dropna().tolist()
            avg_score = round(float(np.mean(scores)), 2) if scores else None
            med_score = round(float(np.median(scores)), 2) if scores else None

            sorted_st = st_df.sort_values(by="numeric_rank", ascending=True, na_position="last")
            best_rank = int(sorted_st["numeric_rank"].iloc[0]) if not sorted_st.empty and pd.notna(sorted_st["numeric_rank"].iloc[0]) else None
            top_inst = str(sorted_st["institution_name"].iloc[0]) if not sorted_st.empty else None

            return StateProfile(
                state=state_name,
                total_institutions=total_insts,
                top_100_count=top_100_cnt,
                top_10_count=top_10_cnt,
                average_score=avg_score,
                median_score=med_score,
                best_rank=best_rank,
                top_institution=top_inst,
                scores=[round(float(s), 2) for s in scores],
            )

        profile_a = _build_profile(state_a)
        profile_b = _build_profile(state_b)

        # Combined institution list for comparative sorting
        combined_df = yr_df[
            yr_df["state"].astype(str).str.strip().str.lower().isin(
                [state_a.strip().lower(), state_b.strip().lower()]
            )
        ].copy()

        combined_df = combined_df.sort_values(by=["numeric_rank", "overall_score"], ascending=[True, False], na_position="last")

        institutions_list = []
        for _, row in combined_df.iterrows():
            institutions_list.append({
                "institution_name": str(row["institution_name"]),
                "state": str(row["state"]),
                "city": str(row["city"]) if pd.notna(row["city"]) else "N/A",
                "rank": str(row["rank"]),
                "numeric_rank": int(row["numeric_rank"]) if pd.notna(row["numeric_rank"]) else None,
                "overall_score": round(float(row["overall_score"]), 2) if pd.notna(row.get("overall_score")) else None,
                "tlr_score": round(float(row["tlr_score"]), 2) if pd.notna(row.get("tlr_score")) else None,
                "rpc_score": round(float(row["rpc_score"]), 2) if pd.notna(row.get("rpc_score")) else None,
            })

        return CompareStatesResponse(
            category=category,
            year=year,
            state_a=profile_a,
            state_b=profile_b,
            institutions=institutions_list,
        )

    def get_newly_appearing(
        self,
        category: str = "Overall",
        start_year: int = 2017,
        end_year: int = 2025,
    ) -> NewlyAppearingResponse:
        """Q2.5: Aggregate newly debuting institutions by State within a time range."""
        if start_year >= end_year:
            raise ValueError(f"Start year ({start_year}) must be earlier than end year ({end_year}).")

        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        if cat_df.empty:
            return NewlyAppearingResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                total_new_institutions=0,
                states_count=0,
                leading_state="N/A",
                leading_state_count=0,
                items=[],
            )

        # 1. Determine first year ever appearing in this category
        first_appearances = cat_df.groupby("institution_name")["year"].min().reset_index()
        first_appearances = first_appearances.rename(columns={"year": "first_year"})

        # 2. Filter for institutions whose debut year is between (start_year, end_year]
        new_debuts = first_appearances[
            (first_appearances["first_year"] > start_year) & (first_appearances["first_year"] <= end_year)
        ]

        if new_debuts.empty:
            return NewlyAppearingResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                total_new_institutions=0,
                states_count=0,
                leading_state="N/A",
                leading_state_count=0,
                items=[],
            )

        # Merge back to get state and inaugural rank/score
        merged = new_debuts.merge(
            cat_df,
            left_on=["institution_name", "first_year"],
            right_on=["institution_name", "year"],
        )

        total_new = len(merged)
        grouped_states = merged.groupby("state")

        items: List[NewlyAppearingStateItem] = []

        for st_name, group in grouped_states:
            insts_in_st = []
            for _, r in group.iterrows():
                insts_in_st.append({
                    "institution_name": str(r["institution_name"]),
                    "first_year": int(r["first_year"]),
                    "rank": str(r["rank"]),
                    "overall_score": round(float(r["overall_score"]), 2) if pd.notna(r.get("overall_score")) else None,
                    "city": str(r["city"]) if pd.notna(r.get("city")) else "N/A",
                })

            cnt = len(insts_in_st)
            share = round((cnt / total_new) * 100, 1) if total_new > 0 else 0.0

            items.append(
                NewlyAppearingStateItem(
                    state=str(st_name),
                    new_institutions_count=cnt,
                    share_pct=share,
                    institution_names=[i["institution_name"] for i in insts_in_st],
                    institutions=insts_in_st,
                )
            )

        # Sort descending by new institution count
        items.sort(key=lambda x: (-x.new_institutions_count, x.state))

        leading_st = items[0].state if items else "N/A"
        leading_cnt = items[0].new_institutions_count if items else 0

        return NewlyAppearingResponse(
            category=category,
            start_year=start_year,
            end_year=end_year,
            total_new_institutions=total_new,
            states_count=len(items),
            leading_state=leading_st,
            leading_state_count=leading_cnt,
            items=items,
        )


geospatial_service = GeospatialService()

