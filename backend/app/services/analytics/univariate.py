"""NIRF Analytics Dashboard — Univariate Analytics Service.

Provides computational engines for:
- Q3.1 Score Distribution & Histogram Bins
- Q3.2 Rank Distribution (Exact Ranks vs Rank Bands & Tiers)
- Q3.3 Descriptive Statistics across NIRF Parameters (Mean, Median, Dispersion, IQR)
- Q3.4 Score Quartiles (Q1–Q4 Boundaries, Frequency, and Share)
- Q3.5 Category Score Spread & Box Plot Distributions
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.core.database import dataset_manager
from app.schemas.analytics import (
    CategorySpreadItem,
    CategorySpreadResponse,
    DescriptiveStatItem,
    DescriptiveStatisticsResponse,
    HistogramBin,
    QuartileItem,
    RankDistributionResponse,
    RankTierItem,
    ScoreDistributionAnalyticsResponse,
    ScoreQuartilesResponse,
)

logger = logging.getLogger("nirf_backend.analytics.univariate")

PARAMETER_LABELS = {
    "overall_score": "Overall Composite Score",
    "tlr_score": "Teaching, Learning & Resources (TLR)",
    "rpc_score": "Research & Professional Practice (RPC)",
    "go_score": "Graduation Outcomes (GO)",
    "oi_score": "Outreach & Inclusivity (OI)",
    "pr_score": "Perception (PR)",
    "qnr_score": "Quantitative Research (QNR)",
    "qlr_score": "Qualitative Research (QLR)",
    "sfc_score": "Students & Faculty Contribution (SFC)",
}


class UnivariateService:
    """Service class executing univariate statistical analytics on numerical variables."""

    def __init__(self) -> None:
        pass

    def _get_df(self) -> pd.DataFrame:
        """Fetch the preloaded validated master dataset."""
        return dataset_manager.load_dataset()

    def get_score_distribution(
        self,
        category: str = "Overall",
        year: int = 2025,
        bins: int = 15,
    ) -> ScoreDistributionAnalyticsResponse:
        """Q3.1: Calculate score distribution histogram with frequency and percentage metrics."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        total_records = len(yr_df)
        scores = yr_df["overall_score"].dropna()
        valid_obs = len(scores)
        missing_obs = total_records - valid_obs

        if valid_obs == 0:
            return ScoreDistributionAnalyticsResponse(
                category=category,
                year=year,
                total_records=total_records,
                valid_observations=0,
                missing_observations=missing_obs,
                mean=None,
                median=None,
                std_dev=None,
                min_score=None,
                max_score=None,
                bin_width=0.0,
                bins=[],
                raw_scores=[],
            )

        mean_val = round(float(scores.mean()), 2)
        med_val = round(float(scores.median()), 2)
        std_val = round(float(scores.std()), 2) if valid_obs > 1 else 0.0
        min_val = round(float(scores.min()), 2)
        max_val = round(float(scores.max()), 2)

        counts, bin_edges = np.histogram(scores, bins=bins)
        bin_width = round(float(bin_edges[1] - bin_edges[0]), 2)

        bins_list: List[HistogramBin] = []
        for i in range(len(counts)):
            b_start = round(float(bin_edges[i]), 2)
            b_end = round(float(bin_edges[i + 1]), 2)
            cnt = int(counts[i])
            pct = round((cnt / valid_obs) * 100, 1)

            bins_list.append(
                HistogramBin(
                    bin_start=b_start,
                    bin_end=b_end,
                    label=f"{b_start:.1f}–{b_end:.1f}",
                    count=cnt,
                    percentage=pct,
                )
            )

        return ScoreDistributionAnalyticsResponse(
            category=category,
            year=year,
            total_records=total_records,
            valid_observations=valid_obs,
            missing_observations=missing_obs,
            mean=mean_val,
            median=med_val,
            std_dev=std_val,
            min_score=min_val,
            max_score=max_val,
            bin_width=bin_width,
            bins=bins_list,
            raw_scores=[round(float(s), 2) for s in scores],
        )

    def get_rank_distribution(
        self,
        category: str = "Overall",
        year: Optional[int] = None,
        min_rank: Optional[int] = None,
        max_rank: Optional[int] = None,
    ) -> RankDistributionResponse:
        """Q3.2: Analyze institutional rank frequency across standardized tiers and exact vs rank-band brackets."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        if year is not None:
            cat_df = cat_df[cat_df["year"] == year]

        total_records = len(cat_df)

        # Distinguish exact ranks vs rank bands
        exact_df = cat_df[cat_df["numeric_rank"].notna()].copy()
        band_df = cat_df[cat_df["numeric_rank"].isna()].copy()

        exact_count = len(exact_df)
        band_count = len(band_df)

        if min_rank is not None:
            exact_df = exact_df[exact_df["numeric_rank"] >= min_rank]
        if max_rank is not None:
            exact_df = exact_df[exact_df["numeric_rank"] <= max_rank]

        ranks = exact_df["numeric_rank"].dropna()
        min_r = int(ranks.min()) if not ranks.empty else None
        max_r = int(ranks.max()) if not ranks.empty else None

        # Build Standardized Rank Tiers
        tier_definitions = [
            ("Top 25 (Rank 1–25)", 1, 25),
            ("Tier 26–50 (Rank 26–50)", 26, 50),
            ("Tier 51–75 (Rank 51–75)", 51, 75),
            ("Tier 76–100 (Rank 76–100)", 76, 100),
            ("Band 101–150 (Rank 101–150)", 101, 150),
            ("Band 151–200 (Rank 151–200)", 151, 200),
            ("Tier 201+ (Rank > 200)", 201, 9999),
        ]

        tiers: List[RankTierItem] = []
        for name, low, high in tier_definitions:
            match = exact_df[(exact_df["numeric_rank"] >= low) & (exact_df["numeric_rank"] <= high)]
            cnt = len(match)
            if cnt > 0:
                pct = round((cnt / (len(exact_df) or 1)) * 100, 1)
                samples = match["institution_name"].head(3).tolist()
                tiers.append(
                    RankTierItem(
                        tier_name=name,
                        min_rank=low,
                        max_rank=high,
                        count=cnt,
                        share_pct=pct,
                        sample_institutions=samples,
                    )
                )

        # Rank Histogram Bins
        hist_bins: List[HistogramBin] = []
        if not ranks.empty:
            counts, edges = np.histogram(ranks, bins=min(10, max(2, len(ranks) // 10)))
            for i in range(len(counts)):
                s = round(float(edges[i]), 0)
                e = round(float(edges[i + 1]), 0)
                c = int(counts[i])
                hist_bins.append(
                    HistogramBin(
                        bin_start=s,
                        bin_end=e,
                        label=f"Rank {int(s)}–{int(e)}",
                        count=c,
                        percentage=round((c / len(ranks)) * 100, 1),
                    )
                )

        return RankDistributionResponse(
            category=category,
            year=year,
            total_records=total_records,
            exact_ranks_count=exact_count,
            rank_bands_count=band_count,
            min_rank=min_r,
            max_rank=max_r,
            tiers=tiers,
            histogram_bins=hist_bins,
        )

    def get_descriptive_statistics(
        self,
        category: str = "Overall",
        year: int = 2025,
    ) -> DescriptiveStatisticsResponse:
        """Q3.3: Calculate comprehensive parametric stats (Mean, Median, Std, Var, Quartiles, Skewness)."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        total_records = len(yr_df)

        param_cols = [
            "overall_score",
            "tlr_score",
            "rpc_score",
            "go_score",
            "oi_score",
            "pr_score",
            "qnr_score",
            "qlr_score",
            "sfc_score",
        ]

        parameters: List[DescriptiveStatItem] = []

        for col in param_cols:
            if col in yr_df.columns:
                series = yr_df[col].dropna()
                obs = len(series)
                missing = total_records - obs

                if obs > 0:
                    mean_val = round(float(series.mean()), 2)
                    med_val = round(float(series.median()), 2)
                    std_val = round(float(series.std()), 2) if obs > 1 else 0.0
                    var_val = round(float(series.var()), 2) if obs > 1 else 0.0
                    min_val = round(float(series.min()), 2)
                    max_val = round(float(series.max()), 2)

                    q1_val = round(float(np.percentile(series, 25)), 2)
                    q2_val = med_val
                    q3_val = round(float(np.percentile(series, 75)), 2)
                    iqr_val = round(q3_val - q1_val, 2)

                    skew_val = round(float(series.skew()), 2) if obs > 2 else None

                    parameters.append(
                        DescriptiveStatItem(
                            parameter=col,
                            parameter_label=PARAMETER_LABELS.get(col, col.replace("_", " ").title()),
                            observations=obs,
                            missing=missing,
                            mean=mean_val,
                            median=med_val,
                            std_dev=std_val,
                            variance=var_val,
                            min=min_val,
                            max=max_val,
                            q1=q1_val,
                            q2=q2_val,
                            q3=q3_val,
                            iqr=iqr_val,
                            skewness=skew_val,
                        )
                    )

        return DescriptiveStatisticsResponse(
            category=category,
            year=year,
            total_records=total_records,
            parameters=parameters,
        )

    def get_score_quartiles(
        self,
        category: str = "Overall",
        year: int = 2025,
    ) -> ScoreQuartilesResponse:
        """Q3.4: Dissect score distribution into statistical quartiles (Q1, Q2, Q3, Q4) with thresholds and shares."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        scores_df = yr_df[yr_df["overall_score"].notna()].sort_values(by="overall_score", ascending=True)
        scores = scores_df["overall_score"].dropna()
        total_obs = len(scores)

        if total_obs == 0:
            return ScoreQuartilesResponse(
                category=category,
                year=year,
                total_observations=0,
                min_score=0.0,
                q1_threshold=0.0,
                median_threshold=0.0,
                q3_threshold=0.0,
                max_score=0.0,
                quartiles=[],
            )

        min_val = round(float(scores.min()), 2)
        q1_val = round(float(np.percentile(scores, 25)), 2)
        med_val = round(float(np.percentile(scores, 50)), 2)
        q3_val = round(float(np.percentile(scores, 75)), 2)
        max_val = round(float(scores.max()), 2)

        # Slice quartiles
        q1_mask = scores <= q1_val
        q2_mask = (scores > q1_val) & (scores <= med_val)
        q3_mask = (scores > med_val) & (scores <= q3_val)
        q4_mask = scores > q3_val

        quartiles_spec = [
            ("Q1 (Bottom 25%)", min_val, q1_val, q1_mask),
            ("Q2 (Lower-Middle 25%)", q1_val, med_val, q2_mask),
            ("Q3 (Upper-Middle 25%)", med_val, q3_val, q3_mask),
            ("Q4 (Top 25% Elite)", q3_val, max_val, q4_mask),
        ]

        items: List[QuartileItem] = []
        for label, low, high, mask in quartiles_spec:
            subset = scores_df[mask]
            cnt = len(subset)
            pct = round((cnt / total_obs) * 100, 1)
            samples = subset["institution_name"].head(3).tolist()

            items.append(
                QuartileItem(
                    quartile=label,
                    lower_bound=low,
                    upper_bound=high,
                    count=cnt,
                    percentage=pct,
                    sample_institutions=samples,
                )
            )

        return ScoreQuartilesResponse(
            category=category,
            year=year,
            total_observations=total_obs,
            min_score=min_val,
            q1_threshold=q1_val,
            median_threshold=med_val,
            q3_threshold=q3_val,
            max_score=max_val,
            quartiles=items,
        )

    def get_category_spread(
        self,
        year: int = 2025,
    ) -> CategorySpreadResponse:
        """Q3.5: Comparative cross-category score distributions, IQR spread, and boxplot data."""
        df = self._get_df()
        yr_df = df[df["year"] == year].copy()

        if yr_df.empty:
            year = int(df["year"].max())
            yr_df = df[df["year"] == year].copy()

        categories: List[CategorySpreadItem] = []
        grouped = yr_df.groupby("category")

        for cat_name, group in grouped:
            scores = group["overall_score"].dropna()
            cnt = len(scores)

            if cnt > 0:
                mean_v = round(float(scores.mean()), 2)
                med_v = round(float(scores.median()), 2)
                std_v = round(float(scores.std()), 2) if cnt > 1 else 0.0
                min_v = round(float(scores.min()), 2)
                max_v = round(float(scores.max()), 2)

                q1_v = round(float(np.percentile(scores, 25)), 2)
                q3_v = round(float(np.percentile(scores, 75)), 2)
                iqr_v = round(q3_v - q1_v, 2)

                categories.append(
                    CategorySpreadItem(
                        category=str(cat_name),
                        observations=cnt,
                        mean=mean_v,
                        median=med_v,
                        std_dev=std_v,
                        min=min_v,
                        max=max_v,
                        q1=q1_v,
                        q3=q3_v,
                        iqr=iqr_v,
                        scores=[round(float(s), 2) for s in scores],
                    )
                )

        # Sort descending by median score
        categories.sort(key=lambda x: (-(x.median or 0), x.category))

        return CategorySpreadResponse(
            year=year,
            total_categories=len(categories),
            categories=categories,
        )


univariate_service = UnivariateService()

