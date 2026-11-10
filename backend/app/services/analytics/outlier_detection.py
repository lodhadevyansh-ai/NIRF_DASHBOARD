"""NIRF Analytics Dashboard — Outlier Detection & Performance Gaps Service.

Provides computational statistical engines for:
- Q8.1 Research Outliers (Regression Residuals, Z-Score, IQR)
- Q8.2 Research vs Teaching Gap (RPC vs TLR Divergence & Relative Gap Outliers)
- Q8.3 Year-to-Year Score Change Outliers (Longitudinal Jump & Drop Anomalies)
- Q8.4 Strong Parameter, Poor Overall Rank (Parametric Discrepancies)
- Q8.5 Ranking Volatility Analysis (Multi-Year Rank Std Dev & Mean Absolute Shifts)
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats

from app.core.database import dataset_manager
from app.schemas.analytics import (
    RankingVolatilityItem,
    RankingVolatilityResponse,
    ResearchOutlierPoint,
    ResearchOutlierResponse,
    ResearchTeachingGapItem,
    ResearchTeachingGapResponse,
    ScoreChangeOutlierItem,
    ScoreChangeOutlierResponse,
    StrongParamPoorRankItem,
    StrongParamPoorRankResponse,
)

logger = logging.getLogger("nirf_backend.analytics.outlier_detection")

PARAMETER_LABELS = {
    "overall_score": "NIRF Overall Score (0–100)",
    "tlr_score": "Teaching, Learning & Resources (TLR: 0–100)",
    "rpc_score": "Research & Professional Practice (RPC: 0–100)",
    "go_score": "Graduation Outcomes (GO: 0–100)",
    "oi_score": "Outreach & Inclusivity (OI: 0–100)",
    "pr_score": "Perception (PR: 0–100)",
    "qnr_score": "Quantitative Research (QNR: 0–100)",
    "qlr_score": "Qualitative Research (QLR: 0–100)",
    "sfc_score": "Students & Faculty Contribution (SFC: 0–100)",
}


class OutlierDetectionService:
    """Service providing statistical outlier detection algorithms and gap evaluations."""

    def __init__(self) -> None:
        pass

    def _get_df(self) -> pd.DataFrame:
        """Fetch preloaded NIRF master dataset."""
        return dataset_manager.load_dataset()

    def get_research_outliers(
        self,
        category: str = "Overall",
        year: int = 2025,
        method: str = "zscore",
        threshold: float = 2.0,
    ) -> ResearchOutlierResponse:
        """Q8.1: Identify institutions with unusually high RPC relative to their Overall Score using OLS residuals."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        # Target columns: rpc_score and overall_score (or qnr_score for Research)
        x_col = "overall_score"
        y_col = "rpc_score" if "rpc_score" in yr_df.columns else "qnr_score"

        clean_df = yr_df.dropna(subset=[x_col, y_col]).copy()
        total_eval = len(clean_df)

        if total_eval < 5:
            return ResearchOutlierResponse(
                category=category,
                year=year,
                method=method,
                threshold=threshold,
                total_evaluated=total_eval,
                outliers_count=0,
                regression_slope=0.0,
                regression_intercept=0.0,
                regression_r2=0.0,
                points=[],
                outliers=[],
            )

        x_vals = clean_df[x_col].astype(float).values
        y_vals = clean_df[y_col].astype(float).values

        slope, intercept, r_val, p_val, std_err = stats.linregress(x_vals, y_vals)
        r2 = round(float(r_val**2), 4)

        pred_y = slope * x_vals + intercept
        residuals = y_vals - pred_y

        res_mean = float(np.mean(residuals))
        res_std = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else 1.0

        q1_res = float(np.percentile(residuals, 25))
        q3_res = float(np.percentile(residuals, 75))
        iqr_res = q3_res - q1_res
        upper_iqr = q3_res + threshold * iqr_res
        lower_iqr = q1_res - threshold * iqr_res

        points: List[ResearchOutlierPoint] = []
        outliers: List[ResearchOutlierPoint] = []

        for idx, (_, row) in enumerate(clean_df.iterrows()):
            name = str(row["institution_name"]).strip()
            r_num = int(row["numeric_rank"])
            state = str(row.get("state", ""))
            city = str(row.get("city", ""))
            ov = round(float(x_vals[idx]), 2)
            rpc = round(float(y_vals[idx]), 2)
            exp_rpc = round(float(pred_y[idx]), 2)
            res = round(float(residuals[idx]), 2)

            z = round(float((res - res_mean) / (res_std if res_std > 0 else 1.0)), 2)

            if method.lower() == "iqr":
                is_outlier = res > upper_iqr or res < lower_iqr
                outlier_type = (
                    "high_research_outlier"
                    if res > upper_iqr
                    else ("low_research_outlier" if res < lower_iqr else "normal")
                )
            else:  # default zscore
                is_outlier = abs(z) >= threshold
                outlier_type = (
                    "high_research_outlier"
                    if z >= threshold
                    else ("low_research_outlier" if z <= -threshold else "normal")
                )

            pt = ResearchOutlierPoint(
                institution_name=name,
                rank=r_num,
                state=state,
                city=city,
                overall_score=ov,
                rpc_score=rpc,
                expected_rpc=exp_rpc,
                residual=res,
                z_score=z,
                is_outlier=is_outlier,
                outlier_type=outlier_type,
            )
            points.append(pt)
            if is_outlier:
                outliers.append(pt)

        # Sort outliers by residual descending (highest positive surprises first)
        outliers.sort(key=lambda p: p.residual, reverse=True)

        return ResearchOutlierResponse(
            category=category,
            year=year,
            method=method,
            threshold=threshold,
            total_evaluated=total_eval,
            outliers_count=len(outliers),
            regression_slope=round(float(slope), 4),
            regression_intercept=round(float(intercept), 2),
            regression_r2=r2,
            points=points,
            outliers=outliers,
        )

    def get_research_teaching_gap(
        self,
        category: str = "Overall",
        year: int = 2025,
        method: str = "zscore",
        threshold: float = 2.0,
    ) -> ResearchTeachingGapResponse:
        """Q8.2: Identify institutions performing substantially better in Research (RPC) than in Teaching (TLR)."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        rpc_col = "rpc_score" if "rpc_score" in yr_df.columns else "qnr_score"
        tlr_col = "tlr_score" if "tlr_score" in yr_df.columns else "sfc_score"

        clean_df = yr_df.dropna(subset=[rpc_col, tlr_col]).copy()
        if clean_df.empty:
            return ResearchTeachingGapResponse(
                category=category,
                year=year,
                method=method,
                threshold=threshold,
                mean_gap=0.0,
                std_gap=0.0,
                outliers_count=0,
                institutions=[],
            )

        clean_df["gap"] = clean_df[rpc_col].astype(float) - clean_df[tlr_col].astype(float)
        gaps = clean_df["gap"].values

        mean_gap = round(float(np.mean(gaps)), 2)
        std_gap = round(float(np.std(gaps, ddof=1)), 2) if len(gaps) > 1 else 1.0

        q1_gap = float(np.percentile(gaps, 25))
        q3_gap = float(np.percentile(gaps, 75))
        iqr_gap = q3_gap - q1_gap
        upper_iqr = q3_gap + threshold * iqr_gap

        items: List[ResearchTeachingGapItem] = []
        outliers_count = 0

        for _, row in clean_df.iterrows():
            name = str(row["institution_name"]).strip()
            r_num = int(row["numeric_rank"])
            state = str(row.get("state", ""))
            city = str(row.get("city", ""))
            rpc = round(float(row[rpc_col]), 2)
            tlr = round(float(row[tlr_col]), 2)
            gap_val = round(float(row["gap"]), 2)
            overall_val = round(float(row.get("overall_score", 0.0)), 2)

            z = round(float((gap_val - mean_gap) / (std_gap if std_gap > 0 else 1.0)), 2)

            if method.lower() == "iqr":
                is_out = gap_val > upper_iqr
            else:
                is_out = z >= threshold

            if is_out:
                outliers_count += 1

            items.append(
                ResearchTeachingGapItem(
                    institution_name=name,
                    rank=r_num,
                    state=state,
                    city=city,
                    rpc_score=rpc,
                    tlr_score=tlr,
                    gap=gap_val,
                    gap_zscore=z,
                    is_outlier=is_out,
                    overall_score=overall_val,
                )
            )

        # Sort by gap descending
        items.sort(key=lambda x: x.gap, reverse=True)

        return ResearchTeachingGapResponse(
            category=category,
            year=year,
            method=method,
            threshold=threshold,
            mean_gap=mean_gap,
            std_gap=std_gap,
            outliers_count=outliers_count,
            institutions=items,
        )

    def get_score_change_outliers(
        self,
        category: str = "Overall",
        start_year: int = 2024,
        end_year: int = 2025,
        method: str = "zscore",
        threshold: float = 2.0,
    ) -> ScoreChangeOutlierResponse:
        """Q8.3: Identify institutions experiencing anomalous year-to-year score jumps or drops."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]

        s_df = cat_df[cat_df["year"] == start_year]
        e_df = cat_df[cat_df["year"] == end_year]

        if s_df.empty or e_df.empty:
            return ScoreChangeOutlierResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                method=method,
                threshold=threshold,
                mean_delta=0.0,
                std_delta=0.0,
                total_evaluated=0,
                outliers_count=0,
                positive_outliers_count=0,
                negative_outliers_count=0,
                outliers=[],
                all_changes=[],
            )

        s_map = {
            str(r["institute_id"]).strip(): r for _, r in s_df.iterrows()
        }
        e_map = {
            str(r["institute_id"]).strip(): r for _, r in e_df.iterrows()
        }

        common_ids = set(s_map.keys()).intersection(set(e_map.keys()))
        if len(common_ids) < 5:
            return ScoreChangeOutlierResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                method=method,
                threshold=threshold,
                mean_delta=0.0,
                std_delta=0.0,
                total_evaluated=len(common_ids),
                outliers_count=0,
                positive_outliers_count=0,
                negative_outliers_count=0,
                outliers=[],
                all_changes=[],
            )

        deltas_map: Dict[str, float] = {}
        for iid in common_ids:
            s_score = float(s_map[iid].get("overall_score", 0.0))
            e_score = float(e_map[iid].get("overall_score", 0.0))
            deltas_map[iid] = round(e_score - s_score, 2)

        delta_vals = np.array(list(deltas_map.values()))
        mean_d = round(float(np.mean(delta_vals)), 2)
        std_d = round(float(np.std(delta_vals, ddof=1)), 2) if len(delta_vals) > 1 else 1.0

        q1_d = float(np.percentile(delta_vals, 25))
        q3_d = float(np.percentile(delta_vals, 75))
        iqr_d = q3_d - q1_d
        upper_bound = q3_d + threshold * iqr_d
        lower_bound = q1_d - threshold * iqr_d

        all_items: List[ScoreChangeOutlierItem] = []
        outliers: List[ScoreChangeOutlierItem] = []
        pos_cnt = 0
        neg_cnt = 0

        for iid in common_ids:
            s_row = s_map[iid]
            e_row = e_map[iid]
            name = str(e_row["institution_name"]).strip()
            state = str(e_row.get("state", ""))
            city = str(e_row.get("city", ""))

            s_rank = int(s_row["numeric_rank"])
            e_rank = int(e_row["numeric_rank"])
            s_sc = round(float(s_row.get("overall_score", 0.0)), 2)
            e_sc = round(float(e_row.get("overall_score", 0.0)), 2)
            d_sc = deltas_map[iid]

            z = round(float((d_sc - mean_d) / (std_d if std_d > 0 else 1.0)), 2)

            if method.lower() == "iqr":
                is_out = d_sc > upper_bound or d_sc < lower_bound
                direction = "positive_jump" if d_sc > upper_bound else ("negative_drop" if d_sc < lower_bound else "normal")
            else:
                is_out = abs(z) >= threshold
                direction = "positive_jump" if z >= threshold else ("negative_drop" if z <= -threshold else "normal")

            item = ScoreChangeOutlierItem(
                institution_name=name,
                state=state,
                city=city,
                start_rank=s_rank,
                end_rank=e_rank,
                start_score=s_sc,
                end_score=e_sc,
                score_delta=d_sc,
                z_score=z,
                is_outlier=is_out,
                direction=direction,
            )
            all_items.append(item)
            if is_out:
                outliers.append(item)
                if direction == "positive_jump":
                    pos_cnt += 1
                else:
                    neg_cnt += 1

        # Sort outliers by absolute z-score descending
        outliers.sort(key=lambda x: abs(x.z_score), reverse=True)
        all_items.sort(key=lambda x: x.score_delta, reverse=True)

        return ScoreChangeOutlierResponse(
            category=category,
            start_year=start_year,
            end_year=end_year,
            method=method,
            threshold=threshold,
            mean_delta=mean_d,
            std_delta=std_d,
            total_evaluated=len(common_ids),
            outliers_count=len(outliers),
            positive_outliers_count=pos_cnt,
            negative_outliers_count=neg_cnt,
            outliers=outliers,
            all_changes=all_items,
        )

    def get_strong_param_poor_rank(
        self,
        category: str = "Overall",
        year: int = 2025,
        parameter: str = "rpc_score",
        param_percentile_min: float = 60.0,
        rank_min: int = 50,
    ) -> StrongParamPoorRankResponse:
        """Q8.4: Identify institutions with strong parameter performance (>= 60th percentile) but lagging overall rank (rank >= 50)."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        if parameter not in yr_df.columns:
            parameter = "rpc_score" if "rpc_score" in yr_df.columns else "overall_score"

        clean_df = yr_df.dropna(subset=[parameter, "numeric_rank"]).copy()
        if clean_df.empty:
            return StrongParamPoorRankResponse(
                category=category,
                year=year,
                parameter=parameter,
                parameter_label=PARAMETER_LABELS.get(parameter, parameter),
                param_threshold=0.0,
                rank_threshold=rank_min,
                qualifying_count=0,
                institutions=[],
            )

        param_vals = clean_df[parameter].astype(float).values
        max_rank = int(clean_df["numeric_rank"].max()) or 100

        # Percentile cutoff value for the parameter
        param_cutoff = round(float(np.percentile(param_vals, param_percentile_min)), 2)

        qualifying: List[StrongParamPoorRankItem] = []

        for _, row in clean_df.iterrows():
            name = str(row["institution_name"]).strip()
            r_num = int(row["numeric_rank"])
            p_val = round(float(row[parameter]), 2)
            ov_val = round(float(row.get("overall_score", 0.0)), 2)

            p_pct = round(float(stats.percentileofscore(param_vals, p_val, kind="rank")), 1)
            # Inverted rank percentile: rank 1 = 100%, rank 100 = 1%
            r_pct = round(float(100.0 - (r_num / max_rank) * 100.0), 1)

            discrepancy = round(p_pct - r_pct, 1)

            if p_pct >= param_percentile_min and r_num >= rank_min:
                qualifying.append(
                    StrongParamPoorRankItem(
                        institution_name=name,
                        state=str(row.get("state", "")),
                        city=str(row.get("city", "")),
                        rank=r_num,
                        parameter=parameter,
                        parameter_score=p_val,
                        param_percentile=p_pct,
                        rank_percentile=r_pct,
                        discrepancy_score=discrepancy,
                        overall_score=ov_val,
                    )
                )

        # Sort by discrepancy score descending
        qualifying.sort(key=lambda x: x.discrepancy_score, reverse=True)

        return StrongParamPoorRankResponse(
            category=category,
            year=year,
            parameter=parameter,
            parameter_label=PARAMETER_LABELS.get(parameter, parameter),
            param_threshold=param_cutoff,
            rank_threshold=rank_min,
            qualifying_count=len(qualifying),
            institutions=qualifying,
        )

    def get_ranking_volatility(
        self,
        category: str = "Overall",
        min_years: int = 4,
        method: str = "zscore",
        threshold: float = 1.5,
    ) -> RankingVolatilityResponse:
        """Q8.5: Compute multi-year rank volatility (Std Dev of ranks and mean absolute rank movement)."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]

        grouped = cat_df.groupby("institute_id")
        items_temp = []

        for iid, g in grouped:
            if len(g) >= min_years:
                sorted_g = g.sort_values(by="year")
                ranks = sorted_g["numeric_rank"].astype(float).values
                name = str(sorted_g["institution_name"].iloc[-1]).strip()
                state = str(sorted_g["state"].iloc[-1])
                city = str(sorted_g["city"].iloc[-1])
                recent_rank = int(ranks[-1])

                std_r = round(float(np.std(ranks, ddof=1)), 2)
                shifts = np.abs(np.diff(ranks))
                mean_shift = round(float(np.mean(shifts)), 2) if len(shifts) > 0 else 0.0

                min_r = int(ranks.min())
                max_r = int(ranks.max())
                rng_r = max_r - min_r

                y_start = int(sorted_g["year"].min())
                y_end = int(sorted_g["year"].max())

                items_temp.append({
                    "name": name,
                    "state": state,
                    "city": city,
                    "years_present": len(g),
                    "years_span": f"{y_start}–{y_end}",
                    "min_rank": min_r,
                    "max_rank": max_r,
                    "rank_range": rng_r,
                    "std_rank": std_r,
                    "mean_absolute_shift": mean_shift,
                    "recent_rank": recent_rank,
                })

        if not items_temp:
            return RankingVolatilityResponse(
                category=category,
                method=method,
                threshold=threshold,
                total_evaluated=0,
                volatile_outliers_count=0,
                mean_std_rank=0.0,
                institutions=[],
            )

        all_stds = np.array([x["std_rank"] for x in items_temp])
        mean_std = round(float(np.mean(all_stds)), 2)
        std_of_std = round(float(np.std(all_stds, ddof=1)), 2) if len(all_stds) > 1 else 1.0

        q1_std = float(np.percentile(all_stds, 25))
        q3_std = float(np.percentile(all_stds, 75))
        iqr_std = q3_std - q1_std
        upper_iqr = q3_std + threshold * iqr_std

        results: List[RankingVolatilityItem] = []
        outliers_count = 0

        for item in items_temp:
            s_val = item["std_rank"]
            z = round(float((s_val - mean_std) / (std_of_std if std_of_std > 0 else 1.0)), 2)

            if method.lower() == "iqr":
                is_vol = s_val > upper_iqr
            else:
                is_vol = z >= threshold

            if is_vol:
                outliers_count += 1

            results.append(
                RankingVolatilityItem(
                    institution_name=item["name"],
                    state=item["state"],
                    city=item["city"],
                    years_present=item["years_present"],
                    years_span=item["years_span"],
                    min_rank=item["min_rank"],
                    max_rank=item["max_rank"],
                    rank_range=item["rank_range"],
                    std_rank=item["std_rank"],
                    mean_absolute_shift=item["mean_absolute_shift"],
                    z_volatility=z,
                    is_volatile_outlier=is_vol,
                    recent_rank=item["recent_rank"],
                )
            )

        # Sort by std_rank descending
        results.sort(key=lambda x: x.std_rank, reverse=True)

        return RankingVolatilityResponse(
            category=category,
            method=method,
            threshold=threshold,
            total_evaluated=len(results),
            volatile_outliers_count=outliers_count,
            mean_std_rank=mean_std,
            institutions=results,
        )


# Global singleton instance
outlier_detection_service = OutlierDetectionService()
