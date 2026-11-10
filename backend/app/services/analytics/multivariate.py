"""NIRF Analytics Dashboard — Multivariate Analytics Service.

Provides computational engines for:
- Q5.1 Top Five Multi-Parameter Comparison (Radar & Grouped Bar Profiles)
- Q5.2 High Research, Low Teaching Discrepancy (RPC vs TLR)
- Q5.3 High Teaching, Low Perception Discrepancy (TLR vs PR)
- Q5.4 Score Improvement Despite Component Regression
- Q5.5 Maximum Parameter Gap Disparity
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.core.database import dataset_manager
from app.schemas.analytics import (
    DiscrepancyInstitutionItem,
    ParameterDiscrepancyResponse,
    ParameterGapItem,
    ParameterGapResponse,
    ParameterShiftItem,
    ParadoxicalImprovementItem,
    ScoreImprovementDespiteDeclineResponse,
    TopFiveComparisonResponse,
    TopFiveInstitutionItem,
)

logger = logging.getLogger("nirf_backend.analytics.multivariate")

PARAMETER_LABELS: Dict[str, str] = {
    "tlr_score": "Teaching, Learning & Resources (TLR)",
    "rpc_score": "Research & Professional Practice (RPC)",
    "go_score": "Graduation Outcomes (GO)",
    "oi_score": "Outreach & Inclusivity (OI)",
    "pr_score": "Perception (PR)",
    "qnr_score": "Quantitative Research (QNR)",
    "qlr_score": "Qualitative Research (QLR)",
    "sfc_score": "Students & Faculty Contribution (SFC)",
}


class MultivariateService:
    """Service class executing simultaneous multi-parameter analyses."""

    def __init__(self) -> None:
        pass

    def _get_df(self) -> pd.DataFrame:
        """Fetch the preloaded validated master dataset."""
        return dataset_manager.load_dataset()

    def _get_active_params(self, category: str, yr_df: pd.DataFrame) -> List[str]:
        """Determine valid evaluated parameters for category without fabricating missing ones."""
        if category.strip().lower() == "research institutions":
            candidates = ["qnr_score", "qlr_score", "sfc_score", "oi_score", "pr_score"]
        else:
            candidates = ["tlr_score", "rpc_score", "go_score", "oi_score", "pr_score"]

        return [p for p in candidates if p in yr_df.columns and yr_df[p].notna().any()]

    def get_top_five(
        self,
        category: str = "Overall",
        year: int = 2025,
    ) -> TopFiveComparisonResponse:
        """Q5.1: Retrieve top 5 ranked institutions and their complete 5-parameter profiles."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        active_params = self._get_active_params(category, yr_df)

        # Sort by numeric rank ascending and select top 5
        sorted_df = yr_df.sort_values(by="numeric_rank", ascending=True, na_position="last").head(5)

        institutions: List[TopFiveInstitutionItem] = []
        for _, row in sorted_df.iterrows():
            scores_dict = {}
            for p in active_params:
                if pd.notna(row.get(p)):
                    scores_dict[p] = round(float(row[p]), 2)

            institutions.append(
                TopFiveInstitutionItem(
                    rank=str(row["rank"]),
                    numeric_rank=int(row["numeric_rank"]) if pd.notna(row["numeric_rank"]) else 999,
                    institution_name=str(row["institution_name"]),
                    state=str(row["state"]),
                    city=str(row["city"]) if pd.notna(row["city"]) else "N/A",
                    overall_score=round(float(row["overall_score"]), 2) if pd.notna(row.get("overall_score")) else 0.0,
                    scores=scores_dict,
                )
            )

        labels_dict = {p: PARAMETER_LABELS.get(p, p.replace("_", " ").title()) for p in active_params}

        return TopFiveComparisonResponse(
            category=category,
            year=year,
            parameters=active_params,
            parameter_labels=labels_dict,
            institutions=institutions,
        )

    def get_research_teaching_gap(
        self,
        category: str = "Overall",
        year: int = 2025,
    ) -> ParameterDiscrepancyResponse:
        """Q5.2: Identify institutions exhibiting high research output (RPC) but lower teaching resources (TLR)."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        clean_df = yr_df.dropna(subset=["rpc_score", "tlr_score"]).copy()
        if clean_df.empty:
            return ParameterDiscrepancyResponse(
                category=category,
                year=year,
                dimension_a="Research & Professional Practice (RPC)",
                dimension_b="Teaching, Learning & Resources (TLR)",
                methodology="Percentile Screening: RPC >= 60th %ile and TLR <= 50th %ile",
                threshold_a=0.0,
                threshold_b=0.0,
                qualifying_count=0,
                institutions=[],
            )

        rpc_thresh = round(float(np.percentile(clean_df["rpc_score"], 60)), 2)
        tlr_thresh = round(float(np.percentile(clean_df["tlr_score"], 50)), 2)

        qualifying = clean_df[
            (clean_df["rpc_score"] >= rpc_thresh) & (clean_df["tlr_score"] <= tlr_thresh)
        ].copy()

        qualifying["gap"] = qualifying["rpc_score"] - qualifying["tlr_score"]
        qualifying = qualifying.sort_values(by="gap", ascending=False)

        items: List[DiscrepancyInstitutionItem] = []
        for _, row in qualifying.iterrows():
            items.append(
                DiscrepancyInstitutionItem(
                    institution_name=str(row["institution_name"]),
                    rank=str(row["rank"]),
                    state=str(row["state"]),
                    city=str(row["city"]) if pd.notna(row["city"]) else "N/A",
                    score_a=round(float(row["rpc_score"]), 2),
                    score_b=round(float(row["tlr_score"]), 2),
                    gap=round(float(row["gap"]), 2),
                    overall_score=round(float(row["overall_score"]), 2) if pd.notna(row.get("overall_score")) else None,
                )
            )

        return ParameterDiscrepancyResponse(
            category=category,
            year=year,
            dimension_a="Research (RPC)",
            dimension_b="Teaching (TLR)",
            methodology=f"Percentile Screening: RPC >= {rpc_thresh} (60th %ile) and TLR <= {tlr_thresh} (50th %ile)",
            threshold_a=rpc_thresh,
            threshold_b=tlr_thresh,
            qualifying_count=len(items),
            institutions=items,
        )

    def get_teaching_perception_gap(
        self,
        category: str = "Overall",
        year: int = 2025,
    ) -> ParameterDiscrepancyResponse:
        """Q5.3: Identify institutions exhibiting high teaching resources (TLR) but low perception reputation (PR)."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        clean_df = yr_df.dropna(subset=["tlr_score", "pr_score"]).copy()
        if clean_df.empty:
            return ParameterDiscrepancyResponse(
                category=category,
                year=year,
                dimension_a="Teaching, Learning & Resources (TLR)",
                dimension_b="Perception (PR)",
                methodology="Percentile Screening: TLR >= 60th %ile and PR <= 40th %ile",
                threshold_a=0.0,
                threshold_b=0.0,
                qualifying_count=0,
                institutions=[],
            )

        tlr_thresh = round(float(np.percentile(clean_df["tlr_score"], 60)), 2)
        pr_thresh = round(float(np.percentile(clean_df["pr_score"], 40)), 2)

        qualifying = clean_df[
            (clean_df["tlr_score"] >= tlr_thresh) & (clean_df["pr_score"] <= pr_thresh)
        ].copy()

        qualifying["gap"] = qualifying["tlr_score"] - qualifying["pr_score"]
        qualifying = qualifying.sort_values(by="gap", ascending=False)

        items: List[DiscrepancyInstitutionItem] = []
        for _, row in qualifying.iterrows():
            items.append(
                DiscrepancyInstitutionItem(
                    institution_name=str(row["institution_name"]),
                    rank=str(row["rank"]),
                    state=str(row["state"]),
                    city=str(row["city"]) if pd.notna(row["city"]) else "N/A",
                    score_a=round(float(row["tlr_score"]), 2),
                    score_b=round(float(row["pr_score"]), 2),
                    gap=round(float(row["gap"]), 2),
                    overall_score=round(float(row["overall_score"]), 2) if pd.notna(row.get("overall_score")) else None,
                )
            )

        return ParameterDiscrepancyResponse(
            category=category,
            year=year,
            dimension_a="Teaching (TLR)",
            dimension_b="Perception (PR)",
            methodology=f"Percentile Screening: TLR >= {tlr_thresh} (60th %ile) and PR <= {pr_thresh} (40th %ile)",
            threshold_a=tlr_thresh,
            threshold_b=pr_thresh,
            qualifying_count=len(items),
            institutions=items,
        )

    def get_score_improvement(
        self,
        category: str = "Overall",
        start_year: int = 2023,
        end_year: int = 2025,
    ) -> ScoreImprovementDespiteDeclineResponse:
        """Q5.4: Identify institutions whose composite overall scores gained despite drops in component parameters."""
        if start_year >= end_year:
            raise ValueError(f"Start year ({start_year}) must be earlier than end year ({end_year}).")

        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        df_start = cat_df[cat_df["year"] == start_year].drop_duplicates(subset=["institution_name"]).set_index("institution_name")
        df_end = cat_df[cat_df["year"] == end_year].drop_duplicates(subset=["institution_name"]).set_index("institution_name")

        common_insts = df_start.index.intersection(df_end.index)

        candidate_params = ["tlr_score", "rpc_score", "go_score", "oi_score", "pr_score"]

        improved_count = 0
        paradoxical_items: List[ParadoxicalImprovementItem] = []

        for name in common_insts:
            row_s = df_start.loc[name]
            row_e = df_end.loc[name]

            s_overall = row_s.get("overall_score")
            e_overall = row_e.get("overall_score")

            if pd.notna(s_overall) and pd.notna(e_overall):
                gain = round(float(e_overall) - float(s_overall), 2)
                if gain > 0:
                    improved_count += 1
                    declining_shifts: List[ParameterShiftItem] = []
                    improving_shifts: List[ParameterShiftItem] = []

                    for p in candidate_params:
                        p_s = row_s.get(p)
                        p_e = row_e.get(p)
                        if pd.notna(p_s) and pd.notna(p_e):
                            diff = round(float(p_e) - float(p_s), 2)
                            shift_obj = ParameterShiftItem(
                                parameter=p,
                                parameter_label=PARAMETER_LABELS.get(p, p),
                                start_value=round(float(p_s), 2),
                                end_value=round(float(p_e), 2),
                                delta=diff,
                            )
                            if diff < 0:
                                declining_shifts.append(shift_obj)
                            elif diff > 0:
                                improving_shifts.append(shift_obj)

                    # Paradoxical condition: overall score improved but >= 1 parameter declined
                    if declining_shifts:
                        paradoxical_items.append(
                            ParadoxicalImprovementItem(
                                institution_name=str(name),
                                start_rank=str(row_s["rank"]),
                                end_rank=str(row_e["rank"]),
                                start_score=round(float(s_overall), 2),
                                end_score=round(float(e_overall), 2),
                                score_gain=gain,
                                declining_parameters=declining_shifts,
                                improving_parameters=improving_shifts,
                            )
                        )

        # Sort descending by score gain
        paradoxical_items.sort(key=lambda x: -x.score_gain)

        return ScoreImprovementDespiteDeclineResponse(
            category=category,
            start_year=start_year,
            end_year=end_year,
            total_improved_entities=improved_count,
            total_paradoxical_entities=len(paradoxical_items),
            institutions=paradoxical_items,
        )

    def get_parameter_gap(
        self,
        category: str = "Overall",
        year: int = 2025,
    ) -> ParameterGapResponse:
        """Q5.5: Compute disparity between strongest and weakest parameter scores for each institution."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        active_params = self._get_active_params(category, yr_df)
        if len(active_params) < 2:
            return ParameterGapResponse(
                category=category,
                year=year,
                average_gap=0.0,
                institutions=[],
            )

        items: List[ParameterGapItem] = []
        for _, row in yr_df.iterrows():
            valid_scores: Dict[str, float] = {}
            for p in active_params:
                if pd.notna(row.get(p)):
                    valid_scores[p] = round(float(row[p]), 2)

            if len(valid_scores) >= 2:
                highest_param, highest_score = max(valid_scores.items(), key=lambda x: x[1])
                lowest_param, lowest_score = min(valid_scores.items(), key=lambda x: x[1])
                gap = round(highest_score - lowest_score, 2)

                items.append(
                    ParameterGapItem(
                        institution_name=str(row["institution_name"]),
                        rank=str(row["rank"]),
                        state=str(row["state"]),
                        city=str(row["city"]) if pd.notna(row["city"]) else "N/A",
                        param_gap=gap,
                        highest_param=PARAMETER_LABELS.get(highest_param, highest_param),
                        highest_score=highest_score,
                        lowest_param=PARAMETER_LABELS.get(lowest_param, lowest_param),
                        lowest_score=lowest_score,
                        scores=valid_scores,
                    )
                )

        # Sort descending by parameter gap
        items.sort(key=lambda x: -x.param_gap)
        avg_gap = round(float(np.mean([i.param_gap for i in items])), 2) if items else 0.0

        return ParameterGapResponse(
            category=category,
            year=year,
            average_gap=avg_gap,
            institutions=items,
        )


multivariate_service = MultivariateService()

