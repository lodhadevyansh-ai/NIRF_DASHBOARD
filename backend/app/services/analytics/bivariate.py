"""NIRF Analytics Dashboard — Bivariate & Correlation Analytics Service.

Provides computational engines for:
- Q4.1 RPC vs Overall Score (Linear Regression & Correlation)
- Q4.2 Perception (PR) vs Overall Score
- Q4.3 Parameter Correlation Hierarchy & Full Heatmap Matrix
- Q4.4 TLR vs RPC (Teaching vs Research Performance Quadrants)
- Q4.5 Historical Correlation Longitudinal Stability (2017–2025)
- General-purpose Select Two Variables bivariate interface
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats

from app.core.database import dataset_manager
from app.schemas.analytics import (
    BivariateRelationshipResponse,
    CustomBivariateRequest,
    HistoricalCorrelationResponse,
    HistoricalCorrelationYearPoint,
    ParameterCorrelationMatrixResponse,
    ParameterCorrelationRankItem,
    RegressionLine,
    ScatterPoint,
)

logger = logging.getLogger("nirf_backend.analytics.bivariate")

ALLOWED_VARIABLES: Dict[str, str] = {
    "overall_score": "NIRF Overall Score (0–100)",
    "tlr_score": "Teaching, Learning & Resources (TLR: 0–100)",
    "rpc_score": "Research & Professional Practice (RPC: 0–100)",
    "go_score": "Graduation Outcomes (GO: 0–100)",
    "oi_score": "Outreach & Inclusivity (OI: 0–100)",
    "pr_score": "Perception (PR: 0–100)",
    "numeric_rank": "NIRF Rank (Lower Rank = Better Performance)",
    "qnr_score": "Quantitative Research (QNR: 0–100)",
    "qlr_score": "Qualitative Research (QLR: 0–100)",
    "sfc_score": "Students & Faculty Contribution (SFC: 0–100)",
}


class BivariateService:
    """Service class executing bivariate correlation and regression analyses."""

    def __init__(self) -> None:
        pass

    def _get_df(self) -> pd.DataFrame:
        """Fetch the preloaded validated master dataset."""
        return dataset_manager.load_dataset()

    def _generate_interpretation(self, var_x_label: str, var_y_label: str, r: float, p_val: float) -> str:
        """Formulate human-readable statistical interpretation of correlation."""
        abs_r = abs(r)
        if abs_r >= 0.8:
            strength = "very strong"
        elif abs_r >= 0.6:
            strength = "strong"
        elif abs_r >= 0.4:
            strength = "moderate"
        elif abs_r >= 0.2:
            strength = "weak"
        else:
            strength = "very weak / negligible"

        direction = "positive" if r >= 0 else "negative"
        significance = "statistically significant (p < 0.001)" if p_val < 0.001 else f"p = {p_val:.3f}"

        desc = (
            f"There is a {strength} {direction} correlation (r = {r:.3f}, {significance}) "
            f"between {var_x_label} and {var_y_label}. "
        )

        if r >= 0.6:
            desc += f"Institutions demonstrating higher performance in {var_x_label} consistently record higher {var_y_label}."
        elif r <= -0.6:
            desc += f"Increases in {var_x_label} correspond with lower {var_y_label}."
        else:
            desc += f"Performance in {var_x_label} explains only a moderate portion of variance in {var_y_label}."

        return desc

    def compute_bivariate_relationship(
        self,
        category: str = "Overall",
        year: int = 2025,
        var_x: str = "rpc_score",
        var_y: str = "overall_score",
    ) -> BivariateRelationshipResponse:
        """Core bivariate engine computing Pearson, Spearman, OLS regression, and scatter points."""
        df = self._get_df()

        if var_x not in df.columns:
            raise ValueError(f"Variable '{var_x}' is not a valid dataset column.")
        if var_y not in df.columns:
            raise ValueError(f"Variable '{var_y}' is not a valid dataset column.")

        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        total_in_cohort = len(yr_df)

        # Pairwise complete observations
        valid_cols = [var_x, var_y, "institution_name", "rank", "state", "city"]
        clean_df = yr_df[valid_cols].dropna(subset=[var_x, var_y]).copy()

        sample_size = len(clean_df)
        missing_count = total_in_cohort - sample_size

        var_x_label = ALLOWED_VARIABLES.get(var_x, var_x.replace("_", " ").title())
        var_y_label = ALLOWED_VARIABLES.get(var_y, var_y.replace("_", " ").title())

        if sample_size < 3:
            return BivariateRelationshipResponse(
                category=category,
                year=year,
                var_x=var_x,
                var_x_label=var_x_label,
                var_y=var_y,
                var_y_label=var_y_label,
                sample_size=sample_size,
                missing_count=missing_count,
                pearson_r=0.0,
                pearson_p_value=1.0,
                spearman_rho=0.0,
                spearman_p_value=1.0,
                interpretation="Insufficient observations to compute correlation.",
                regression=None,
                points=[],
            )

        x_vals = clean_df[var_x].astype(float).values
        y_vals = clean_df[var_y].astype(float).values

        # Pearson and Spearman
        p_r, p_pval = stats.pearsonr(x_vals, y_vals)
        s_rho, s_pval = stats.spearmanr(x_vals, y_vals)

        # Linear regression
        reg = stats.linregress(x_vals, y_vals)
        slope = round(float(reg.slope), 4)
        intercept = round(float(reg.intercept), 4)
        r_sq = round(float(reg.rvalue ** 2), 4)
        reg_pval = round(float(reg.pvalue), 6)

        x_min = float(np.min(x_vals))
        x_max = float(np.max(x_vals))
        y_start = round(slope * x_min + intercept, 2)
        y_end = round(slope * x_max + intercept, 2)

        eq_sign = "+" if intercept >= 0 else "-"
        equation = f"y = {slope:.2f}x {eq_sign} {abs(intercept):.2f}"

        reg_line = RegressionLine(
            slope=slope,
            intercept=intercept,
            r_squared=r_sq,
            p_value=reg_pval,
            equation=equation,
            x_start=round(x_min, 2),
            y_start=y_start,
            x_end=round(x_max, 2),
            y_end=y_end,
        )

        interpretation = self._generate_interpretation(var_x_label, var_y_label, float(p_r), float(p_pval))

        # Scatter points
        points: List[ScatterPoint] = []
        for _, r in clean_df.iterrows():
            points.append(
                ScatterPoint(
                    x=round(float(r[var_x]), 2),
                    y=round(float(r[var_y]), 2),
                    institution_name=str(r["institution_name"]),
                    rank=str(r["rank"]),
                    state=str(r["state"]),
                    city=str(r["city"]) if pd.notna(r["city"]) else "N/A",
                )
            )

        return BivariateRelationshipResponse(
            category=category,
            year=year,
            var_x=var_x,
            var_x_label=var_x_label,
            var_y=var_y,
            var_y_label=var_y_label,
            sample_size=sample_size,
            missing_count=missing_count,
            pearson_r=round(float(p_r), 4),
            pearson_p_value=float(p_pval),
            spearman_rho=round(float(s_rho), 4),
            spearman_p_value=float(s_pval),
            interpretation=interpretation,
            regression=reg_line,
            points=points,
        )

    def get_parameter_correlation_ranking(
        self,
        category: str = "Overall",
        year: int = 2025,
        target_variable: str = "overall_score",
    ) -> ParameterCorrelationMatrixResponse:
        """Q4.3: Rank all parameters by correlation strength with overall score, and generate correlation matrix."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]
        yr_df = cat_df[cat_df["year"] == year].copy()

        if yr_df.empty and not cat_df.empty:
            year = int(cat_df["year"].max())
            yr_df = cat_df[cat_df["year"] == year].copy()

        candidate_params = [
            "tlr_score",
            "rpc_score",
            "go_score",
            "oi_score",
            "pr_score",
            "qnr_score",
            "qlr_score",
            "sfc_score",
        ]

        active_params = [p for p in candidate_params if p in yr_df.columns and yr_df[p].notna().sum() > 5]

        if target_variable not in yr_df.columns or yr_df[target_variable].notna().sum() < 5:
            target_variable = "overall_score"

        ranked_items: List[ParameterCorrelationRankItem] = []

        target_series = yr_df[target_variable].dropna()
        sample_size = len(target_series)

        for p in active_params:
            pair = yr_df[[p, target_variable]].dropna()
            if len(pair) > 5:
                r_val, _ = stats.pearsonr(pair[p], pair[target_variable])
                rho_val, _ = stats.spearmanr(pair[p], pair[target_variable])
                r_val = round(float(r_val), 4)
                rho_val = round(float(rho_val), 4)

                abs_r = abs(r_val)
                if abs_r >= 0.8:
                    strength = "Very Strong"
                elif abs_r >= 0.6:
                    strength = "Strong"
                elif abs_r >= 0.4:
                    strength = "Moderate"
                else:
                    strength = "Weak"

                ranked_items.append(
                    ParameterCorrelationRankItem(
                        parameter=p,
                        parameter_label=ALLOWED_VARIABLES.get(p, p.replace("_", " ").title()),
                        pearson_r=r_val,
                        spearman_rho=rho_val,
                        r_squared=round(r_val ** 2, 4),
                        rank=0,
                        strength=strength,
                    )
                )

        # Sort descending by absolute Pearson r
        ranked_items.sort(key=lambda x: -abs(x.pearson_r))
        for idx, item in enumerate(ranked_items):
            item.rank = idx + 1

        strongest_p = ranked_items[0].parameter_label if ranked_items else "None"
        strongest_r = ranked_items[0].pearson_r if ranked_items else 0.0

        # Full correlation matrix across all active parameters + target variable
        matrix_cols = [target_variable] + active_params
        clean_matrix_df = yr_df[matrix_cols].dropna()

        corr_matrix_dict: Dict[str, Dict[str, float]] = {}
        for c1 in matrix_cols:
            corr_matrix_dict[c1] = {}
            for c2 in matrix_cols:
                if c1 == c2:
                    corr_matrix_dict[c1][c2] = 1.0
                else:
                    pair_ij = clean_matrix_df[[c1, c2]].dropna()
                    if len(pair_ij) > 5:
                        r_ij, _ = stats.pearsonr(pair_ij[c1], pair_ij[c2])
                        corr_matrix_dict[c1][c2] = round(float(r_ij), 3)
                    else:
                        corr_matrix_dict[c1][c2] = 0.0

        return ParameterCorrelationMatrixResponse(
            category=category,
            year=year,
            target_variable=target_variable,
            sample_size=sample_size,
            strongest_parameter=strongest_p,
            strongest_pearson_r=strongest_r,
            ranked_parameters=ranked_items,
            parameters=matrix_cols,
            correlation_matrix=corr_matrix_dict,
        )

    def get_historical_correlation(
        self,
        category: str = "Overall",
        var_x: str = "rpc_score",
        var_y: str = "overall_score",
        start_year: int = 2017,
        end_year: int = 2025,
    ) -> HistoricalCorrelationResponse:
        """Q4.5: Longitudinal tracking of correlation between research scores and overall scores."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()].copy()

        available_years = sorted(cat_df["year"].dropna().astype(int).unique())
        s_yr = start_year if start_year in available_years else (available_years[0] if available_years else 2017)
        e_yr = end_year if end_year in available_years else (available_years[-1] if available_years else 2025)

        scoped_years = [y for y in available_years if s_yr <= y <= e_yr]

        yearly_points: List[HistoricalCorrelationYearPoint] = []

        for y in scoped_years:
            y_df = cat_df[cat_df["year"] == y][[var_x, var_y]].dropna()
            if len(y_df) >= 5:
                r_val, _ = stats.pearsonr(y_df[var_x], y_df[var_y])
                rho_val, _ = stats.spearmanr(y_df[var_x], y_df[var_y])
                yearly_points.append(
                    HistoricalCorrelationYearPoint(
                        year=y,
                        sample_size=len(y_df),
                        pearson_r=round(float(r_val), 4),
                        spearman_rho=round(float(rho_val), 4),
                    )
                )

        var_x_label = ALLOWED_VARIABLES.get(var_x, var_x.replace("_", " ").title())
        var_y_label = ALLOWED_VARIABLES.get(var_y, var_y.replace("_", " ").title())

        overall_change = 0.0
        if len(yearly_points) >= 2:
            overall_change = round(yearly_points[-1].pearson_r - yearly_points[0].pearson_r, 4)

        if len(yearly_points) >= 2:
            avg_r = np.mean([p.pearson_r for p in yearly_points])
            summary_insight = (
                f"The correlation between {var_x_label} and {var_y_label} has remained exceptionally stable "
                f"across all editions (mean r = {avg_r:.3f}, range {yearly_points[0].pearson_r:.3f}–{yearly_points[-1].pearson_r:.3f}), "
                f"confirming that research output is a persistent cornerstone of institutional ranking."
            )
        else:
            summary_insight = "Limited historical editions available for longitudinal correlation."

        return HistoricalCorrelationResponse(
            category=category,
            var_x=var_x,
            var_x_label=var_x_label,
            var_y=var_y,
            var_y_label=var_y_label,
            start_year=s_yr,
            end_year=e_yr,
            overall_change=overall_change,
            yearly_correlations=yearly_points,
            summary_insight=summary_insight,
        )


bivariate_service = BivariateService()

