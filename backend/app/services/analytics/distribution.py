"""NIRF Analytics Dashboard — Distribution & Statistical Comparison Service.

Provides computational statistical engines for:
- Q6.1 Top 10 vs Remaining Institutions Score Distribution & Box/Violin Comparisons
- Q6.2 Longitudinal Score Dispersion (Variance, Std Dev, IQR, CV Across Years)
- Q6.3 Parameter Variability & Relative Dispersion Ranking (CV & Std Dev)
- Q6.4 Median & Interquartile Range (IQR) Trend Bands Over Time
- Q6.5 State-Wise Score Distribution & Descriptive Metrics
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats

from app.core.database import dataset_manager
from app.schemas.analytics import (
    ComprehensiveStatItem,
    MedianIQRTrendItem,
    MedianIQRTrendResponse,
    ParameterVariabilityItem,
    ParameterVariabilityResponse,
    ScoreDispersionResponse,
    StateScoreDistributionItem,
    StateScoreDistributionResponse,
    Top10ComparisonResponse,
    YearlyDispersionItem,
)

logger = logging.getLogger("nirf_backend.analytics.distribution")

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


def compute_comprehensive_stats(series: pd.Series, label: str = "") -> ComprehensiveStatItem:
    """Compute complete parametric & non-parametric summary statistics for a 1D numerical series."""
    clean = series.dropna().astype(float)
    obs = len(clean)

    if obs == 0:
        return ComprehensiveStatItem(
            label=label,
            observations=0,
            mean=0.0,
            median=0.0,
            mode=None,
            std_dev=0.0,
            variance=0.0,
            min=0.0,
            max=0.0,
            q1=0.0,
            q3=0.0,
            iqr=0.0,
            cv=None,
            skewness=None,
            kurtosis=None,
            scores=[],
        )

    mean_val = round(float(clean.mean()), 2)
    med_val = round(float(clean.median()), 2)
    min_val = round(float(clean.min()), 2)
    max_val = round(float(clean.max()), 2)
    std_val = round(float(clean.std()), 2) if obs > 1 else 0.0
    var_val = round(float(clean.var()), 2) if obs > 1 else 0.0

    q1_val = round(float(np.percentile(clean, 25)), 2)
    q3_val = round(float(np.percentile(clean, 75)), 2)
    iqr_val = round(q3_val - q1_val, 2)

    cv_val = round((std_val / mean_val) * 100, 2) if mean_val > 0 else None

    # Mode calculation (discretized to 1 decimal place)
    mode_val: Optional[float] = None
    if obs >= 2:
        try:
            m_res = stats.mode(np.round(clean.values, 1), keepdims=False)
            mode_val = round(float(m_res.mode), 2)
        except Exception:
            mode_val = None

    skew_val: Optional[float] = None
    if obs > 2 and std_val > 0:
        try:
            skew_val = round(float(stats.skew(clean.values, nan_policy="omit")), 2)
        except Exception:
            skew_val = None

    kurt_val: Optional[float] = None
    if obs > 3 and std_val > 0:
        try:
            kurt_val = round(float(stats.kurtosis(clean.values, nan_policy="omit")), 2)
        except Exception:
            kurt_val = None

    scores_list = [round(float(v), 2) for v in clean.tolist()]

    return ComprehensiveStatItem(
        label=label,
        observations=obs,
        mean=mean_val,
        median=med_val,
        mode=mode_val,
        std_dev=std_val,
        variance=var_val,
        min=min_val,
        max=max_val,
        q1=q1_val,
        q3=q3_val,
        iqr=iqr_val,
        cv=cv_val,
        skewness=skew_val,
        kurtosis=kurt_val,
        scores=scores_list,
    )


class DistributionService:
    """Service providing distribution and statistical comparison engines."""

    def __init__(self) -> None:
        pass

    def _get_df(self) -> pd.DataFrame:
        """Fetch preloaded NIRF master dataset."""
        return dataset_manager.load_dataset()

    def get_top10_comparison(
        self,
        category: str = "Overall",
        year: int = 2025,
    ) -> Top10ComparisonResponse:
        """Q6.1: Compare score distribution of Top 10 institutions versus remaining cohort."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        # Separate Top 10 from Remaining
        if "numeric_rank" in yr_df.columns and yr_df["numeric_rank"].notna().sum() >= 10:
            top10_mask = (yr_df["numeric_rank"] <= 10) & yr_df["numeric_rank"].notna()
            top10_df = yr_df[top10_mask]
            remaining_df = yr_df[~top10_mask]
        else:
            sorted_df = yr_df.sort_values(by="overall_score", ascending=False)
            top10_df = sorted_df.head(10)
            remaining_df = sorted_df.iloc[10:]

        top10_stats = compute_comprehensive_stats(top10_df["overall_score"], label="Top 10 Institutions")
        remaining_stats = compute_comprehensive_stats(remaining_df["overall_score"], label="Remaining Institutions (Rank 11+)")

        mean_diff = round(top10_stats.mean - remaining_stats.mean, 2)
        median_diff = round(top10_stats.median - remaining_stats.median, 2)

        return Top10ComparisonResponse(
            category=category,
            year=year,
            top10_stats=top10_stats,
            remaining_stats=remaining_stats,
            mean_difference=mean_diff,
            median_difference=median_diff,
        )

    def get_score_dispersion(
        self,
        category: str = "Overall",
    ) -> ScoreDispersionResponse:
        """Q6.2: Longitudinal analysis of score dispersion (Variance, Std Dev, IQR, CV across all years)."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]

        if cat_df.empty:
            return ScoreDispersionResponse(
                category=category,
                yearly_dispersions=[],
                max_dispersion_year=2025,
                min_dispersion_year=2025,
                max_std_dev=0.0,
                min_std_dev=0.0,
            )

        years = sorted(cat_df["year"].unique())
        yearly_items: List[YearlyDispersionItem] = []

        for yr in years:
            sub = cat_df[cat_df["year"] == yr]["overall_score"].dropna().astype(float)
            obs = len(sub)
            if obs == 0:
                continue

            mean_val = round(float(sub.mean()), 2)
            med_val = round(float(sub.median()), 2)
            std_val = round(float(sub.std()), 2) if obs > 1 else 0.0
            var_val = round(float(sub.var()), 2) if obs > 1 else 0.0
            min_val = round(float(sub.min()), 2)
            max_val = round(float(sub.max()), 2)
            rng_val = round(max_val - min_val, 2)

            q1_val = round(float(np.percentile(sub, 25)), 2)
            q3_val = round(float(np.percentile(sub, 75)), 2)
            iqr_val = round(q3_val - q1_val, 2)
            cv_val = round((std_val / mean_val) * 100, 2) if mean_val > 0 else None

            skew_val: Optional[float] = None
            if obs > 2 and std_val > 0:
                try:
                    skew_val = round(float(stats.skew(sub.values, nan_policy="omit")), 2)
                except Exception:
                    skew_val = None

            kurt_val: Optional[float] = None
            if obs > 3 and std_val > 0:
                try:
                    kurt_val = round(float(stats.kurtosis(sub.values, nan_policy="omit")), 2)
                except Exception:
                    kurt_val = None

            yearly_items.append(
                YearlyDispersionItem(
                    year=int(yr),
                    observations=obs,
                    mean=mean_val,
                    median=med_val,
                    variance=var_val,
                    std_dev=std_val,
                    q1=q1_val,
                    q3=q3_val,
                    iqr=iqr_val,
                    cv=cv_val,
                    min=min_val,
                    max=max_val,
                    range=rng_val,
                    skewness=skew_val,
                    kurtosis=kurt_val,
                )
            )

        if yearly_items:
            max_item = max(yearly_items, key=lambda x: x.std_dev)
            min_item = min(yearly_items, key=lambda x: x.std_dev)
            max_yr = max_item.year
            min_yr = min_item.year
            max_std = max_item.std_dev
            min_std = min_item.std_dev
        else:
            max_yr = 2025
            min_yr = 2025
            max_std = 0.0
            min_std = 0.0

        return ScoreDispersionResponse(
            category=category,
            yearly_dispersions=yearly_items,
            max_dispersion_year=max_yr,
            min_dispersion_year=min_yr,
            max_std_dev=max_std,
            min_std_dev=min_std,
        )

    def get_parameter_variability(
        self,
        category: str = "Overall",
        year: int = 2025,
    ) -> ParameterVariabilityResponse:
        """Q6.3: Calculate variability metrics across all parameters and rank by Coefficient of Variation."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        # Potential parameter columns
        possible_cols = [
            "tlr_score",
            "rpc_score",
            "go_score",
            "oi_score",
            "pr_score",
            "qnr_score",
            "qlr_score",
            "sfc_score",
            "overall_score",
        ]

        param_items: List[ParameterVariabilityItem] = []

        for col in possible_cols:
            if col in yr_df.columns:
                series = yr_df[col].dropna().astype(float)
                obs = len(series)
                if obs >= 5:
                    mean_val = round(float(series.mean()), 2)
                    med_val = round(float(series.median()), 2)
                    std_val = round(float(series.std()), 2) if obs > 1 else 0.0
                    var_val = round(float(series.var()), 2) if obs > 1 else 0.0
                    min_val = round(float(series.min()), 2)
                    max_val = round(float(series.max()), 2)

                    q1_val = round(float(np.percentile(series, 25)), 2)
                    q3_val = round(float(np.percentile(series, 75)), 2)
                    iqr_val = round(q3_val - q1_val, 2)
                    cv_val = round((std_val / mean_val) * 100, 2) if mean_val > 0 else None

                    skew_val: Optional[float] = None
                    if obs > 2 and std_val > 0:
                        try:
                            skew_val = round(float(stats.skew(series.values, nan_policy="omit")), 2)
                        except Exception:
                            skew_val = None

                    kurt_val: Optional[float] = None
                    if obs > 3 and std_val > 0:
                        try:
                            kurt_val = round(float(stats.kurtosis(series.values, nan_policy="omit")), 2)
                        except Exception:
                            kurt_val = None

                    scores_list = [round(float(v), 2) for v in series.tolist()]

                    param_items.append(
                        ParameterVariabilityItem(
                            parameter=col,
                            parameter_label=PARAMETER_LABELS.get(col, col.replace("_", " ").title()),
                            observations=obs,
                            mean=mean_val,
                            median=med_val,
                            variance=var_val,
                            std_dev=std_val,
                            q1=q1_val,
                            q3=q3_val,
                            iqr=iqr_val,
                            cv=cv_val,
                            min=min_val,
                            max=max_val,
                            skewness=skew_val,
                            kurtosis=kurt_val,
                            scores=scores_list,
                        )
                    )

        # Sort by CV descending
        param_items.sort(key=lambda x: x.cv if x.cv is not None else 0.0, reverse=True)

        highest_cv = param_items[0].parameter_label if param_items else "N/A"
        lowest_cv = param_items[-1].parameter_label if param_items else "N/A"

        return ParameterVariabilityResponse(
            category=category,
            year=year,
            parameters=param_items,
            highest_cv_parameter=highest_cv,
            lowest_cv_parameter=lowest_cv,
        )

    def get_median_iqr_trend(
        self,
        category: str = "Overall",
    ) -> MedianIQRTrendResponse:
        """Q6.4: Compute yearly median, Q1, Q3, and IQR boundaries from 2017 to 2025."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]

        if cat_df.empty:
            return MedianIQRTrendResponse(
                category=category,
                trends=[],
                iqr_trend_direction="Stable",
            )

        years = sorted(cat_df["year"].unique())
        trends: List[MedianIQRTrendItem] = []

        for yr in years:
            sub = cat_df[cat_df["year"] == yr]["overall_score"].dropna().astype(float)
            obs = len(sub)
            if obs == 0:
                continue

            mean_val = round(float(sub.mean()), 2)
            med_val = round(float(sub.median()), 2)
            min_val = round(float(sub.min()), 2)
            max_val = round(float(sub.max()), 2)

            q1_val = round(float(np.percentile(sub, 25)), 2)
            q3_val = round(float(np.percentile(sub, 75)), 2)
            iqr_val = round(q3_val - q1_val, 2)

            trends.append(
                MedianIQRTrendItem(
                    year=int(yr),
                    observations=obs,
                    mean=mean_val,
                    median=med_val,
                    q1=q1_val,
                    q3=q3_val,
                    iqr=iqr_val,
                    min=min_val,
                    max=max_val,
                )
            )

        # Determine IQR direction comparing start vs end
        direction = "Stable"
        if len(trends) >= 2:
            first_iqr = trends[0].iqr
            last_iqr = trends[-1].iqr
            diff = last_iqr - first_iqr
            if diff > 1.0:
                direction = "Expanding (Increased Dispersion)"
            elif diff < -1.0:
                direction = "Contracting (Increased Clustering)"
            else:
                direction = "Stable Dispersion"

        return MedianIQRTrendResponse(
            category=category,
            trends=trends,
            iqr_trend_direction=direction,
        )

    def get_state_distribution(
        self,
        category: str = "Overall",
        year: int = 2025,
        min_institutions: int = 1,
    ) -> StateScoreDistributionResponse:
        """Q6.5: Calculate state-level institutional score distribution metrics and box plot data."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        all_states = sorted(yr_df["state"].dropna().unique().tolist())
        state_items: List[StateScoreDistributionItem] = []

        for st in all_states:
            st_df = yr_df[yr_df["state"] == st]
            scores = st_df["overall_score"].dropna().astype(float)
            obs = len(scores)

            if obs >= min_institutions:
                mean_val = round(float(scores.mean()), 2)
                med_val = round(float(scores.median()), 2)
                std_val = round(float(scores.std()), 2) if obs > 1 else 0.0
                var_val = round(float(scores.var()), 2) if obs > 1 else 0.0
                min_val = round(float(scores.min()), 2)
                max_val = round(float(scores.max()), 2)

                q1_val = round(float(np.percentile(scores, 25)), 2)
                q3_val = round(float(np.percentile(scores, 75)), 2)
                iqr_val = round(q3_val - q1_val, 2)
                cv_val = round((std_val / mean_val) * 100, 2) if mean_val > 0 else None

                skew_val: Optional[float] = None
                if obs > 2 and std_val > 0:
                    try:
                        skew_val = round(float(stats.skew(scores.values, nan_policy="omit")), 2)
                    except Exception:
                        skew_val = None

                kurt_val: Optional[float] = None
                if obs > 3 and std_val > 0:
                    try:
                        kurt_val = round(float(stats.kurtosis(scores.values, nan_policy="omit")), 2)
                    except Exception:
                        kurt_val = None

                top_insts = (
                    st_df.sort_values(by="overall_score", ascending=False)["institution_name"]
                    .head(3)
                    .tolist()
                )

                state_items.append(
                    StateScoreDistributionItem(
                        state=st,
                        observations=obs,
                        mean=mean_val,
                        median=med_val,
                        std_dev=std_val,
                        variance=var_val,
                        q1=q1_val,
                        q3=q3_val,
                        iqr=iqr_val,
                        min=min_val,
                        max=max_val,
                        cv=cv_val,
                        skewness=skew_val,
                        kurtosis=kurt_val,
                        scores=[round(float(v), 2) for v in scores.tolist()],
                        top_institutions=top_insts,
                    )
                )

        # Sort states by median score descending
        state_items.sort(key=lambda s: s.median, reverse=True)

        return StateScoreDistributionResponse(
            category=category,
            year=year,
            states=state_items,
            all_states=all_states,
        )


# Global singleton instance
distribution_service = DistributionService()

