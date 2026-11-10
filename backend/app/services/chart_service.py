"""NIRF Analytics Dashboard — Dynamic Explorer Chart Service.

Safe, schema-aware analytical query and visualization engine.
Provides:
- Schema introspection with variable classifications and constraints
- Automated intelligent chart recommendation
- Dynamic multi-dimensional filtering
- Generation of Plotly traces and layout payloads for 14 chart types:
  1. Bar, 2. Grouped Bar, 3. Stacked Bar, 4. Line, 5. Scatter, 6. Histogram,
  7. Box, 8. Violin, 9. Heatmap, 10. Correlation Heatmap, 11. Radar,
  12. Pie, 13. Area, 14. Parallel Coordinates
- Descriptive statistics computation
- Safe execution: strictly whitelisted columns and aggregation operations.
"""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from app.services.data_loader import DataLoader
from app.schemas.responses import (
    ChartTypeOption,
    DescriptiveStatsItem,
    DynamicChartResponse,
    DynamicFilterParams,
    DynamicQueryRequest,
    ExplorerSchemaResponse,
    RecommendedChartInfo,
    VariableMetadata,
)


class ChartServiceError(Exception):
    """Custom exception raised for invalid dynamic chart requests."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ChartService:
    """Safe analytical query and dynamic visualization generator."""

    # Whitelist column definitions
    ALLOWED_NUMERICAL_COLUMNS: Dict[str, str] = {
        "overall_score": "NIRF Overall Score (0–100)",
        "numeric_rank": "NIRF Rank (Lower Rank = Better Performance)",
        "tlr_score": "Teaching, Learning & Resources (TLR: 0–100)",
        "rpc_score": "Research & Professional Practice (RPC: 0–100)",
        "go_score": "Graduation Outcomes (GO: 0–100)",
        "oi_score": "Outreach & Inclusivity (OI: 0–100)",
        "pr_score": "Perception (PR: 0–100)",
        "qnr_score": "Quantitative Research (QNR: 0–100)",
        "qlr_score": "Qualitative Research (QLR: 0–100)",
        "sfc_score": "Students & Faculty Contribution (SFC: 0–100)",
        "year": "Academic Year",
    }

    ALLOWED_CATEGORICAL_COLUMNS: Dict[str, str] = {
        "institution_name": "Institution Name",
        "category": "Discipline Category",
        "state": "State / Union Territory",
        "city": "City",
        "rank": "NIRF Rank",
        "institute_id": "Institute Identifier",
    }

    ALLOWED_AGGREGATIONS = {"mean", "median", "sum", "count", "min", "max"}

    CHART_TYPES_METADATA: List[Dict[str, Any]] = [
        {
            "id": "bar",
            "name": "Bar Chart",
            "description": "Compare discrete institutional or categorical metrics with sorted columns.",
            "required_variables": ["x_variable"],
            "optional_variables": ["y_variable", "color_variable"],
            "suitable_for": ["Categorical vs Numerical", "Institutional Rankings", "Aggregates"],
        },
        {
            "id": "grouped_bar",
            "name": "Grouped Bar Chart",
            "description": "Compare metrics across two discrete categorical dimensions side-by-side.",
            "required_variables": ["x_variable", "y_variable", "group_variable"],
            "optional_variables": ["color_variable"],
            "suitable_for": ["Category vs State", "Year vs Category", "Multi-series comparison"],
        },
        {
            "id": "stacked_bar",
            "name": "Stacked Bar Chart",
            "description": "Show cumulative parameter composition and proportional shares.",
            "required_variables": ["x_variable", "y_variable"],
            "optional_variables": ["group_variable"],
            "suitable_for": ["Parameter Breakdown", "Total Accumulation", "Proportions"],
        },
        {
            "id": "line",
            "name": "Line Chart",
            "description": "Track trajectories, historical trends, and sequential ranking movements.",
            "required_variables": ["x_variable", "y_variable"],
            "optional_variables": ["group_variable", "color_variable"],
            "suitable_for": ["Time Series", "Year-over-Year Trend", "Progression"],
        },
        {
            "id": "scatter",
            "name": "Scatter Plot",
            "description": "Analyze bivariate relationships, clustering, and correlation with optional size scaling.",
            "required_variables": ["x_variable", "y_variable"],
            "optional_variables": ["color_variable", "size_variable"],
            "suitable_for": ["Numerical vs Numerical", "Correlation", "Outlier Discovery"],
        },
        {
            "id": "histogram",
            "name": "Histogram",
            "description": "Examine frequency distribution, modality, and dispersion of a continuous metric.",
            "required_variables": ["x_variable"],
            "optional_variables": [],
            "suitable_for": ["Single Numerical Distribution", "Spread Analysis"],
        },
        {
            "id": "box",
            "name": "Box Plot",
            "description": "Compare medians, quartiles, and statistical outliers across cohorts.",
            "required_variables": ["x_variable"],
            "optional_variables": ["y_variable"],
            "suitable_for": ["Distribution Comparison", "Quartile Analysis", "Outlier Identification"],
        },
        {
            "id": "violin",
            "name": "Violin Plot",
            "description": "Combine kernel density estimates with quartile markers for continuous scores.",
            "required_variables": ["x_variable"],
            "optional_variables": ["y_variable"],
            "suitable_for": ["Density Profiles", "Bimodal Distributions", "Group Dispersion"],
        },
        {
            "id": "heatmap",
            "name": "Heatmap Matrix",
            "description": "2D cross-tabulation grid displaying density or metric intensity across two categorical dimensions.",
            "required_variables": ["x_variable", "y_variable"],
            "optional_variables": ["size_variable"],
            "suitable_for": ["Cross-Tabulation", "State vs Year", "Category vs State"],
        },
        {
            "id": "correlation_heatmap",
            "name": "Correlation Heatmap",
            "description": "Symmetric Pearson correlation coefficient matrix between NIRF evaluation pillars.",
            "required_variables": [],
            "optional_variables": ["x_variable", "y_variable"],
            "suitable_for": ["Multi-Parameter Correlation", "Collinearity Inspection"],
        },
        {
            "id": "radar",
            "name": "Radar Chart",
            "description": "Spider/polar chart comparing institutional profiles across all 5 evaluation pillars.",
            "required_variables": ["x_variable"],
            "optional_variables": ["group_variable"],
            "suitable_for": ["Institutional Profiles", "5-Pillar Diagnostics", "Peer Comparison"],
        },
        {
            "id": "pie",
            "name": "Pie / Donut Chart",
            "description": "Part-to-whole proportional representation for low-cardinality categorical distributions.",
            "required_variables": ["x_variable"],
            "optional_variables": ["y_variable"],
            "suitable_for": ["Category Shares", "State Distribution (<8 categories)", "Proportions"],
        },
        {
            "id": "area",
            "name": "Area Chart",
            "description": "Continuous trend with filled volume emphasizing cumulative trajectory over time.",
            "required_variables": ["x_variable", "y_variable"],
            "optional_variables": ["group_variable"],
            "suitable_for": ["Longitudinal Volume", "Cumulative Trends", "Time Progression"],
        },
        {
            "id": "parallel_coordinates",
            "name": "Parallel Coordinates",
            "description": "High-dimensional multi-axis profile mapping individual institutions across all pillars.",
            "required_variables": [],
            "optional_variables": ["color_variable"],
            "suitable_for": ["High-Dimensional Trade-Offs", "Multivariate Clustering"],
        },
    ]

    def __init__(self) -> None:
        self.data_loader = DataLoader.get_instance()

    def get_df(self) -> pd.DataFrame:
        """Fetch the loaded master dataframe."""
        return self.data_loader.load_dataset()

    def get_explorer_schema(self) -> ExplorerSchemaResponse:
        """Introspect dataset schema and return available variables, domains, and chart types."""
        df = self.get_df()

        variables: List[VariableMetadata] = []

        # 1. Numerical Variables
        for col, label in self.ALLOWED_NUMERICAL_COLUMNS.items():
            if col in df.columns:
                s = pd.to_numeric(df[col], errors="coerce").dropna()
                variables.append(
                    VariableMetadata(
                        name=col,
                        label=label,
                        data_type="numerical",
                        description=f"Continuous numerical metric ({label})",
                        allowed_roles=["x", "y", "color", "size"],
                        min_val=round(float(s.min()), 2) if not s.empty else None,
                        max_val=round(float(s.max()), 2) if not s.empty else None,
                        unique_count=int(s.nunique()) if not s.empty else 0,
                    )
                )

        # 2. Categorical Variables
        for col, label in self.ALLOWED_CATEGORICAL_COLUMNS.items():
            if col in df.columns:
                s = df[col].dropna()
                variables.append(
                    VariableMetadata(
                        name=col,
                        label=label,
                        data_type="categorical",
                        description=f"Categorical dimension ({label})",
                        allowed_roles=["x", "y", "group", "color"],
                        min_val=None,
                        max_val=None,
                        unique_count=int(s.nunique()) if not s.empty else 0,
                    )
                )

        # 3. Available domain values
        categories = sorted([str(c) for c in df["category"].dropna().unique().tolist()])
        years = sorted([int(y) for y in df["year"].dropna().unique().tolist()])
        states = sorted([str(s) for s in df["state"].dropna().unique().tolist()])

        chart_type_options = [ChartTypeOption(**item) for item in self.CHART_TYPES_METADATA]

        return ExplorerSchemaResponse(
            variables=variables,
            categories=categories,
            years=years,
            states=states,
            chart_types=chart_type_options,
            total_records=len(df),
        )

    def filter_dataset(
        self, df: pd.DataFrame, filters: Optional[DynamicFilterParams]
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Apply safe faceted filters to the master dataset."""
        filtered = df.copy()
        applied: Dict[str, Any] = {}

        if not filters:
            return filtered, applied

        # Category filter
        if filters.category and filters.category.strip() and filters.category.lower() not in ("all", "all categories"):
            cat_name = filters.category.strip()
            filtered = filtered[filtered["category"].str.lower() == cat_name.lower()]
            applied["category"] = cat_name

        # Year filter
        if filters.year is not None:
            filtered = filtered[filtered["year"] == filters.year]
            applied["year"] = filters.year

        # State filter
        if filters.state and filters.state.strip() and filters.state.lower() not in ("all", "all states"):
            st_name = filters.state.strip()
            filtered = filtered[filtered["state"].str.lower() == st_name.lower()]
            applied["state"] = st_name

        # Institution search query
        if filters.institution_query and filters.institution_query.strip():
            iq = filters.institution_query.strip().lower()
            mask = (
                filtered["institution_name"].astype(str).str.lower().str.contains(iq, na=False)
                | filtered["city"].astype(str).str.lower().str.contains(iq, na=False)
                | filtered["institute_id"].astype(str).str.lower().str.contains(iq, na=False)
            )
            filtered = filtered[mask]
            applied["institution_query"] = filters.institution_query.strip()

        # Rank range
        if filters.rank_min is not None:
            filtered = filtered[filtered["numeric_rank"] >= float(filters.rank_min)]
            applied["rank_min"] = filters.rank_min
        if filters.rank_max is not None:
            filtered = filtered[filtered["numeric_rank"] <= float(filters.rank_max)]
            applied["rank_max"] = filters.rank_max

        # Score range
        if filters.score_min is not None:
            filtered = filtered[filtered["overall_score"] >= float(filters.score_min)]
            applied["score_min"] = filters.score_min
        if filters.score_max is not None:
            filtered = filtered[filtered["overall_score"] <= float(filters.score_max)]
            applied["score_max"] = filters.score_max

        return filtered, applied

    def recommend_chart(
        self,
        x_var: Optional[str],
        y_var: Optional[str],
        group_var: Optional[str] = None,
        color_var: Optional[str] = None,
        size_var: Optional[str] = None,
        analysis_purpose: Optional[str] = None,
        df_filtered: Optional[pd.DataFrame] = None,
    ) -> RecommendedChartInfo:
        """Evaluate variable types, cardinality, and analytical goal to recommend the optimal chart."""
        purpose = (analysis_purpose or "").strip().lower()

        is_x_num = x_var in self.ALLOWED_NUMERICAL_COLUMNS
        is_x_cat = x_var in self.ALLOWED_CATEGORICAL_COLUMNS
        is_y_num = y_var in self.ALLOWED_NUMERICAL_COLUMNS
        is_y_cat = y_var in self.ALLOWED_CATEGORICAL_COLUMNS

        # 1. Purpose-driven recommendations
        if purpose == "correlation":
            if is_x_num and is_y_num:
                return RecommendedChartInfo(
                    chart_type="scatter",
                    name="Scatter Plot",
                    reason="Ideal for analyzing bivariate correlation, cluster distribution, and regression fit.",
                    confidence=0.95,
                )
            return RecommendedChartInfo(
                chart_type="correlation_heatmap",
                name="Correlation Heatmap",
                reason="Provides comprehensive Pearson correlation matrix across multiple parameters.",
                confidence=0.90,
            )

        if purpose == "trend":
            return RecommendedChartInfo(
                chart_type="line",
                name="Line Chart",
                reason="Standard visualization for longitudinal movement and progression over time.",
                confidence=0.95,
            )

        if purpose == "distribution":
            if not y_var or y_var == "none":
                return RecommendedChartInfo(
                    chart_type="histogram",
                    name="Histogram",
                    reason="Reveals univariate continuous score distribution, modality, and skewness.",
                    confidence=0.92,
                )
            return RecommendedChartInfo(
                chart_type="box",
                name="Box Plot",
                reason="Compares medians, interquartile ranges, and outliers across cohorts.",
                confidence=0.90,
            )

        if purpose == "composition":
            if is_x_cat and (not y_var or is_y_num):
                return RecommendedChartInfo(
                    chart_type="pie",
                    name="Pie / Donut Chart",
                    reason="Represents proportional contribution and shares within a whole.",
                    confidence=0.88,
                )
            return RecommendedChartInfo(
                chart_type="stacked_bar",
                name="Stacked Bar Chart",
                reason="Compares cumulative component parameter values across entities.",
                confidence=0.88,
            )

        if purpose == "multivariate":
            return RecommendedChartInfo(
                chart_type="radar",
                name="Radar Chart",
                reason="Visualizes multi-pillar institutional balance across all 5 NIRF dimensions.",
                confidence=0.92,
            )

        # 2. Structural variable type heuristics
        if x_var == "year" and is_y_num:
            return RecommendedChartInfo(
                chart_type="line",
                name="Line Chart",
                reason="Ranking year on the horizontal axis is best visualized as a time series line trend.",
                confidence=0.94,
            )

        if is_x_num and (not y_var or y_var == "none"):
            return RecommendedChartInfo(
                chart_type="histogram",
                name="Histogram",
                reason="Single continuous numerical variable is best visualized as a frequency distribution.",
                confidence=0.92,
            )

        if is_x_num and is_y_num:
            return RecommendedChartInfo(
                chart_type="scatter",
                name="Scatter Plot",
                reason="Two continuous numerical variables are best explored via a bivariate scatter plot.",
                confidence=0.93,
            )

        if is_x_cat and is_y_num:
            if group_var and group_var != "none":
                return RecommendedChartInfo(
                    chart_type="grouped_bar",
                    name="Grouped Bar Chart",
                    reason="Comparing numerical values across two categorical dimensions is best shown with grouped bars.",
                    confidence=0.90,
                )
            # Check cardinality
            unique_x = df_filtered[x_var].nunique() if df_filtered is not None and x_var in df_filtered.columns else 20
            if unique_x <= 8 and purpose == "composition":
                return RecommendedChartInfo(
                    chart_type="pie",
                    name="Pie Chart",
                    reason="Low categorical cardinality makes pie chart suitable for displaying component shares.",
                    confidence=0.85,
                )
            return RecommendedChartInfo(
                chart_type="bar",
                name="Bar Chart",
                reason="Categorical dimension versus continuous metric is optimal with ranked bar charts.",
                confidence=0.92,
            )

        if is_x_cat and is_y_cat:
            return RecommendedChartInfo(
                chart_type="heatmap",
                name="Heatmap",
                reason="Two categorical dimensions cross-tabulate effectively into a 2D density heatmap.",
                confidence=0.88,
            )

        # Default fallback
        return RecommendedChartInfo(
            chart_type="bar",
            name="Bar Chart",
            reason="Standard comparative bar chart for categorical and numerical metrics.",
            confidence=0.80,
        )

    def calculate_statistics(
        self, df: pd.DataFrame, variables: List[str]
    ) -> List[DescriptiveStatsItem]:
        """Compute basic descriptive statistics for requested numerical columns."""
        stats_list: List[DescriptiveStatsItem] = []
        for var in variables:
            if var not in self.ALLOWED_NUMERICAL_COLUMNS or var not in df.columns:
                continue

            s = pd.to_numeric(df[var], errors="coerce").dropna()
            if s.empty:
                continue

            label = self.ALLOWED_NUMERICAL_COLUMNS[var]
            q1 = float(s.quantile(0.25))
            q3 = float(s.quantile(0.75))
            iqr = round(q3 - q1, 2)

            stats_list.append(
                DescriptiveStatsItem(
                    variable=var,
                    label=label,
                    count=len(s),
                    mean=round(float(s.mean()), 2),
                    std=round(float(s.std()), 2) if len(s) > 1 else 0.0,
                    min=round(float(s.min()), 2),
                    q1=round(q1, 2),
                    median=round(float(s.median()), 2),
                    q3=round(q3, 2),
                    max=round(float(s.max()), 2),
                    iqr=iqr,
                )
            )

        return stats_list

    def execute_query(self, query: DynamicQueryRequest) -> DynamicChartResponse:
        """Execute dynamic query, build Plotly traces & layout, and compute statistics."""
        df_master = self.get_df()
        filtered_df, applied_filters = self.filter_dataset(df_master, query.filters)

        # Validate variables against whitelist
        all_allowed = set(self.ALLOWED_NUMERICAL_COLUMNS.keys()) | set(self.ALLOWED_CATEGORICAL_COLUMNS.keys())

        x_var = query.x_variable
        y_var = query.y_variable if query.y_variable and query.y_variable != "none" else None
        group_var = query.group_variable if query.group_variable and query.group_variable != "none" else None
        color_var = query.color_variable if query.color_variable and query.color_variable != "none" else None
        size_var = query.size_variable if query.size_variable and query.size_variable != "none" else None

        for var, name in [(x_var, "X-axis"), (y_var, "Y-axis"), (group_var, "Group"), (color_var, "Color"), (size_var, "Size")]:
            if var and var not in all_allowed:
                raise ChartServiceError(f"Invalid column selected for {name}: '{var}'. Allowed: {sorted(all_allowed)}")

        chart_type = query.chart_type.lower().strip()
        allowed_charts = {c["id"] for c in self.CHART_TYPES_METADATA}
        if chart_type not in allowed_charts:
            raise ChartServiceError(f"Unsupported chart type '{chart_type}'. Supported: {sorted(allowed_charts)}")

        # Automated recommendation
        recommendation = self.recommend_chart(
            x_var=x_var,
            y_var=y_var,
            group_var=group_var,
            color_var=color_var,
            size_var=size_var,
            analysis_purpose=query.analysis_purpose,
            df_filtered=filtered_df,
        )

        # Compute descriptive statistics
        num_vars_to_stat = []
        for v in [x_var, y_var, size_var]:
            if v and v in self.ALLOWED_NUMERICAL_COLUMNS:
                num_vars_to_stat.append(v)
        stats = self.calculate_statistics(filtered_df, list(set(num_vars_to_stat)))

        # Format labels
        def get_label(col: Optional[str]) -> str:
            if not col:
                return ""
            if col in self.ALLOWED_NUMERICAL_COLUMNS:
                return self.ALLOWED_NUMERICAL_COLUMNS[col]
            if col in self.ALLOWED_CATEGORICAL_COLUMNS:
                return self.ALLOWED_CATEGORICAL_COLUMNS[col]
            return col.replace("_", " ").title()

        x_label = get_label(x_var)
        y_label = get_label(y_var) if y_var else "Frequency / Count"

        # Generate Plotly traces and layout according to chart_type
        traces: List[Dict[str, Any]] = []
        layout: Dict[str, Any] = {
            "autosize": True,
            "margin": {"l": 55, "r": 25, "t": 40, "b": 60},
            "paper_bgcolor": "transparent",
            "plot_bgcolor": "transparent",
            "hovermode": "closest",
        }
        title = f"{y_label} by {x_label}" if y_var else f"Distribution of {x_label}"

        # -------------------------------------------------------------
        # 1. Bar Chart
        # -------------------------------------------------------------
        if chart_type == "bar":
            if y_var and y_var in self.ALLOWED_NUMERICAL_COLUMNS:
                agg_op = query.aggregation if query.aggregation in self.ALLOWED_AGGREGATIONS else "mean"
                agg_df = filtered_df.dropna(subset=[x_var, y_var]).groupby(x_var)[y_var].agg(agg_op).reset_index()
                # Sorting
                if query.sort_by == "y_asc":
                    agg_df = agg_df.sort_values(y_var, ascending=True)
                elif query.sort_by == "x_asc":
                    agg_df = agg_df.sort_values(x_var, ascending=True)
                elif query.sort_by == "x_desc":
                    agg_df = agg_df.sort_values(x_var, ascending=False)
                else:  # default y_desc
                    agg_df = agg_df.sort_values(y_var, ascending=False)

                agg_df = agg_df.head(query.limit or 50)
                traces.append({
                    "type": "bar",
                    "x": agg_df[x_var].tolist(),
                    "y": [round(float(v), 2) for v in agg_df[y_var]],
                    "name": f"{agg_op.title()} {y_label}",
                    "marker": {"color": "#2563eb", "line": {"color": "#1d4ed8", "width": 1}},
                    "hovertemplate": f"<b>%{{x}}</b><br>{agg_op.title()} {y_label}: %{{y:.2f}}<extra></extra>",
                })
                title = f"{agg_op.title()} {y_label} across {x_label}"
            else:
                # Count of records per X
                cnt_df = filtered_df.dropna(subset=[x_var])[x_var].value_counts().reset_index()
                cnt_df.columns = [x_var, "count"]
                cnt_df = cnt_df.head(query.limit or 50)
                traces.append({
                    "type": "bar",
                    "x": cnt_df[x_var].tolist(),
                    "y": cnt_df["count"].tolist(),
                    "name": "Institution Count",
                    "marker": {"color": "#3b82f6"},
                    "hovertemplate": "<b>%{x}</b><br>Count: %{y:,}<extra></extra>",
                })
                title = f"Institution Count by {x_label}"
                y_label = "Count of Institutions"

        # -------------------------------------------------------------
        # 2. Grouped Bar Chart
        # -------------------------------------------------------------
        elif chart_type == "grouped_bar":
            g_col = group_var or color_var or "category"
            if g_col not in filtered_df.columns:
                g_col = "category"
            y_col = y_var if (y_var and y_var in self.ALLOWED_NUMERICAL_COLUMNS) else "overall_score"
            agg_op = query.aggregation if query.aggregation in self.ALLOWED_AGGREGATIONS else "mean"

            pivot = (
                filtered_df.dropna(subset=[x_var, g_col, y_col])
                .groupby([x_var, g_col])[y_col]
                .agg(agg_op)
                .unstack(fill_value=0)
            )
            # Limit top X categories
            pivot = pivot.head(query.limit or 20)

            palette = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#64748b"]
            for idx, g_val in enumerate(pivot.columns):
                traces.append({
                    "type": "bar",
                    "name": str(g_val),
                    "x": pivot.index.tolist(),
                    "y": [round(float(v), 2) for v in pivot[g_val]],
                    "marker": {"color": palette[idx % len(palette)]},
                    "hovertemplate": f"<b>%{{x}}</b> ({g_val})<br>{get_label(y_col)}: %{{y:.2f}}<extra></extra>",
                })
            layout["barmode"] = "group"
            title = f"{get_label(y_col)} Comparison across {x_label} grouped by {get_label(g_col)}"

        # -------------------------------------------------------------
        # 3. Stacked Bar Chart
        # -------------------------------------------------------------
        elif chart_type == "stacked_bar":
            g_col = group_var or color_var
            y_col = y_var if (y_var and y_var in self.ALLOWED_NUMERICAL_COLUMNS) else "overall_score"

            if g_col and g_col in filtered_df.columns:
                pivot = (
                    filtered_df.dropna(subset=[x_var, g_col, y_col])
                    .groupby([x_var, g_col])[y_col]
                    .mean()
                    .unstack(fill_value=0)
                    .head(query.limit or 25)
                )
                palette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]
                for idx, col_name in enumerate(pivot.columns):
                    traces.append({
                        "type": "bar",
                        "name": str(col_name),
                        "x": pivot.index.tolist(),
                        "y": [round(float(v), 2) for v in pivot[col_name]],
                        "marker": {"color": palette[idx % len(palette)]},
                    })
            else:
                # Default stacked breakdown of 5 core parameters (TLR, RPC, GO, OI, PR) across top entities
                pillars = [("tlr_score", "TLR (Teaching)", "#3b82f6"),
                           ("rpc_score", "RPC (Research)", "#10b981"),
                           ("go_score", "GO (Graduation)", "#f59e0b"),
                           ("oi_score", "OI (Inclusivity)", "#8b5cf6"),
                           ("pr_score", "PR (Perception)", "#ec4899")]
                top_sub = filtered_df.dropna(subset=[x_var, "overall_score"]).sort_values("overall_score", ascending=False).head(query.limit or 15)
                for p_col, p_name, p_color in pillars:
                    if p_col in top_sub.columns:
                        traces.append({
                            "type": "bar",
                            "name": p_name,
                            "x": top_sub[x_var].tolist(),
                            "y": [round(float(v), 2) for v in top_sub[p_col].fillna(0)],
                            "marker": {"color": p_color},
                            "hovertemplate": f"<b>%{{x}}</b><br>{p_name}: %{{y:.2f}}<extra></extra>",
                        })
                y_label = "Cumulative Parameter Score (0–500)"

            layout["barmode"] = "stack"
            layout["legend"] = {
                "orientation": "h",
                "x": 0.5,
                "y": 1.15,
                "xanchor": "center",
                "yanchor": "bottom",
                "font": {"size": 11, "color": "#334155"},
            }
            layout["margin"] = {"l": 70, "r": 30, "t": 60, "b": 110}
            title = f"Component Parameter Composition across {x_label}"

        # -------------------------------------------------------------
        # 4. Line Chart
        # -------------------------------------------------------------
        elif chart_type == "line":
            y_col = y_var if (y_var and y_var in self.ALLOWED_NUMERICAL_COLUMNS) else "overall_score"
            g_col = group_var or color_var

            if g_col and g_col in filtered_df.columns:
                # Multi-series line chart (e.g. top 8 institutions over years)
                top_groups = filtered_df[g_col].value_counts().head(8).index.tolist()
                palette = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#e11d48", "#64748b"]

                for idx, g_val in enumerate(top_groups):
                    sub = filtered_df[filtered_df[g_col] == g_val].dropna(subset=[x_var, y_col]).sort_values(x_var)
                    traces.append({
                        "type": "scatter",
                        "mode": "lines+markers",
                        "name": str(g_val)[:28],
                        "x": sub[x_var].tolist(),
                        "y": [round(float(v), 2) for v in sub[y_col]],
                        "line": {"color": palette[idx % len(palette)], "width": 2.5},
                        "marker": {"size": 6},
                        "hovertemplate": f"<b>{g_val}</b><br>{x_label}: %{{x}}<br>{get_label(y_col)}: %{{y:.2f}}<extra></extra>",
                    })
                title = f"{get_label(y_col)} Trajectory by {get_label(g_col)}"
            else:
                # Single aggregate trend line
                line_df = (
                    filtered_df.dropna(subset=[x_var, y_col])
                    .groupby(x_var)[y_col]
                    .mean()
                    .reset_index()
                    .sort_values(x_var)
                )
                traces.append({
                    "type": "scatter",
                    "mode": "lines+markers",
                    "name": f"Mean {get_label(y_col)}",
                    "x": line_df[x_var].tolist(),
                    "y": [round(float(v), 2) for v in line_df[y_col]],
                    "line": {"color": "#2563eb", "width": 3},
                    "marker": {"size": 8, "color": "#1d4ed8"},
                    "hovertemplate": f"<b>%{{x}}</b><br>Mean {get_label(y_col)}: %{{y:.2f}}<extra></extra>",
                })
                title = f"Longitudinal {get_label(y_col)} Trend across {x_label}"

        # -------------------------------------------------------------
        # 5. Scatter Plot
        # -------------------------------------------------------------
        elif chart_type == "scatter":
            x_col = x_var if x_var in self.ALLOWED_NUMERICAL_COLUMNS else "overall_score"
            y_col = y_var if (y_var and y_var in self.ALLOWED_NUMERICAL_COLUMNS) else "rpc_score"

            scatter_df = filtered_df.dropna(subset=[x_col, y_col]).head(query.limit or 300)

            # Bubble size calculation
            marker_dict: Dict[str, Any] = {
                "size": 8,
                "opacity": 0.82,
                "line": {"color": "#ffffff", "width": 1},
            }
            if size_var and size_var in self.ALLOWED_NUMERICAL_COLUMNS:
                s_series = scatter_df[size_var].fillna(0)
                min_s, max_s = float(s_series.min()), float(s_series.max())
                scaled_sizes = [
                    round(6 + (float(val) - min_s) / (max_s - min_s + 1e-6) * 18, 1)
                    for val in s_series
                ]
                marker_dict["size"] = scaled_sizes

            # Color coding
            if color_var and color_var in self.ALLOWED_NUMERICAL_COLUMNS:
                marker_dict["color"] = scatter_df[color_var].tolist()
                marker_dict["colorscale"] = "Viridis"
                marker_dict["showscale"] = True
                marker_dict["colorbar"] = {"title": get_label(color_var), "len": 0.8}
            else:
                marker_dict["color"] = "#2563eb"

            customdata = [
                [row.get("institution_name", ""), str(row.get("rank", "")), row.get("state", ""), row.get("city", "")]
                for _, row in scatter_df.iterrows()
            ]

            traces.append({
                "type": "scatter",
                "mode": "markers",
                "name": "Institutions",
                "x": [round(float(v), 2) for v in scatter_df[x_col]],
                "y": [round(float(v), 2) for v in scatter_df[y_col]],
                "marker": marker_dict,
                "customdata": customdata,
                "hovertemplate": (
                    "<b>%{customdata[0]}</b> (Rank #%{customdata[1]})<br>"
                    f"{get_label(x_col)}: %{{x:.2f}}<br>"
                    f"{get_label(y_col)}: %{{y:.2f}}<br>"
                    "State: %{customdata[2]}<extra></extra>"
                ),
            })

            # Add OLS trend line if >= 3 points
            if len(scatter_df) >= 3:
                x_vals = scatter_df[x_col].astype(float).values
                y_vals = scatter_df[y_col].astype(float).values
                slope, intercept = np.polyfit(x_vals, y_vals, 1)
                x_sorted = np.sort(x_vals)
                y_fit = slope * x_sorted + intercept

                traces.append({
                    "type": "scatter",
                    "mode": "lines",
                    "name": f"OLS Fit (y={slope:.2f}x + {intercept:.1f})",
                    "x": [round(float(x), 2) for x in x_sorted],
                    "y": [round(float(y), 2) for y in y_fit],
                    "line": {"color": "#ef4444", "width": 2, "dash": "dash"},
                    "hoverinfo": "none",
                })

            title = f"{get_label(y_col)} vs {get_label(x_col)} Scatter Analysis"

        # -------------------------------------------------------------
        # 6. Histogram
        # -------------------------------------------------------------
        elif chart_type == "histogram":
            x_col = x_var if x_var in self.ALLOWED_NUMERICAL_COLUMNS else "overall_score"
            vals = filtered_df[x_col].dropna().tolist()

            traces.append({
                "type": "histogram",
                "x": [round(float(v), 2) for v in vals],
                "nbinsx": 20,
                "marker": {"color": "#3b82f6", "line": {"color": "#ffffff", "width": 1}},
                "name": get_label(x_col),
                "hovertemplate": f"Score Bin: %{{x}}<br>Count: %{{y:,}}<extra></extra>",
            })
            title = f"{get_label(x_col)} Frequency Distribution"
            y_label = "Number of Institutions"

        # -------------------------------------------------------------
        # 7. Box Plot
        # -------------------------------------------------------------
        elif chart_type == "box":
            # Determine target numeric metric
            if y_var and y_var in self.ALLOWED_NUMERICAL_COLUMNS:
                metric_col = y_var
            elif x_var in self.ALLOWED_NUMERICAL_COLUMNS:
                metric_col = x_var
            else:
                metric_col = "overall_score"

            # Cohort grouping columns with multiple entities
            valid_cohort_cols = ("category", "state", "city", "year")
            group_col = None
            if group_var and group_var in valid_cohort_cols:
                group_col = group_var
            elif color_var and color_var in valid_cohort_cols:
                group_col = color_var
            elif x_var in valid_cohort_cols:
                group_col = x_var

            palette = [
                "#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899",
                "#06b6d4", "#f97316", "#14b8a6", "#6366f1", "#84cc16",
                "#d946ef", "#0ea5e9"
            ]

            if group_col and group_col in filtered_df.columns:
                # Multi-cohort comparative box plot across groups
                top_cats = filtered_df[group_col].dropna().value_counts().head(12).index.tolist()
                for idx, cat_val in enumerate(top_cats):
                    sub_vals = filtered_df[filtered_df[group_col] == cat_val][metric_col].dropna().tolist()
                    if sub_vals:
                        c_name = str(cat_val).strip()
                        c_color = palette[idx % len(palette)]
                        traces.append({
                            "type": "box",
                            "name": c_name,
                            "x": [c_name] * len(sub_vals),
                            "y": [round(float(v), 2) for v in sub_vals],
                            "boxpoints": "outliers",
                            "boxmean": True,
                            "jitter": 0.28,
                            "pointpos": -1.6,
                            "whiskerwidth": 0.5,
                            "marker": {
                                "color": c_color,
                                "outliercolor": "#dc2626",
                                "size": 5,
                                "line": {"outliercolor": "#991b1b", "outlierwidth": 1},
                            },
                            "line": {"color": c_color, "width": 1.8},
                            "fillcolor": f"{c_color}25",
                            "hovertemplate": f"<b>{c_name}</b><br>{get_label(metric_col)}: <b>%{{y:.2f}}</b><extra></extra>",
                        })
                title = f"{get_label(metric_col)} Quartile Dispersion across {get_label(group_col)}"
                x_label = get_label(group_col)
                y_label = get_label(metric_col)
                layout["showlegend"] = False
                layout["xaxis"] = {"title": x_label, "automargin": True, "tickangle": -35 if len(top_cats) > 4 else 0}
            else:
                # Single cohort comprehensive box plot over filtered institutions
                vals = filtered_df[metric_col].dropna().tolist()
                cat_n = applied_filters.get("category") or "Cohort"
                yr_n = applied_filters.get("year")
                cohort_label = f"{cat_n} ({yr_n})" if yr_n else cat_n

                if vals:
                    traces.append({
                        "type": "box",
                        "name": cohort_label,
                        "x": [cohort_label] * len(vals),
                        "y": [round(float(v), 2) for v in vals],
                        "boxpoints": "outliers",
                        "boxmean": True,
                        "jitter": 0.28,
                        "pointpos": -1.6,
                        "whiskerwidth": 0.5,
                        "marker": {
                            "color": "#2563eb",
                            "outliercolor": "#dc2626",
                            "size": 5,
                            "line": {"outliercolor": "#991b1b", "outlierwidth": 1},
                        },
                        "line": {"color": "#2563eb", "width": 2},
                        "fillcolor": "rgba(37, 99, 235, 0.2)",
                        "hovertemplate": f"<b>{cohort_label}</b><br>{get_label(metric_col)}: <b>%{{y:.2f}}</b><extra></extra>",
                    })
                title = f"{get_label(metric_col)} Statistical Box Plot ({cohort_label})"
                x_label = "Institutional Cohort"
                y_label = get_label(metric_col)
                layout["showlegend"] = False
                layout["xaxis"] = {"title": x_label, "automargin": True, "tickangle": 0}

            layout["yaxis"] = {"title": y_label, "rangemode": "tozero", "automargin": True}

        # -------------------------------------------------------------
        # 8. Violin Plot
        # -------------------------------------------------------------
        elif chart_type == "violin":
            # Determine target numeric metric
            if y_var and y_var in self.ALLOWED_NUMERICAL_COLUMNS:
                metric_col = y_var
            elif x_var in self.ALLOWED_NUMERICAL_COLUMNS:
                metric_col = x_var
            else:
                metric_col = "overall_score"

            # Cohort grouping columns with multiple entities
            valid_cohort_cols = ("category", "state", "city", "year")
            group_col = None
            if group_var and group_var in valid_cohort_cols:
                group_col = group_var
            elif color_var and color_var in valid_cohort_cols:
                group_col = color_var
            elif x_var in valid_cohort_cols:
                group_col = x_var

            palette = [
                "#8b5cf6", "#2563eb", "#10b981", "#f59e0b", "#ec4899",
                "#06b6d4", "#f97316", "#14b8a6", "#6366f1", "#84cc16"
            ]

            if group_col and group_col in filtered_df.columns:
                top_cats = filtered_df[group_col].dropna().value_counts().head(8).index.tolist()
                for idx, cat_val in enumerate(top_cats):
                    sub_vals = filtered_df[filtered_df[group_col] == cat_val][metric_col].dropna().tolist()
                    if sub_vals:
                        c_name = str(cat_val).strip()
                        c_color = palette[idx % len(palette)]
                        has_kde = len(sub_vals) >= 3
                        traces.append({
                            "type": "violin",
                            "name": c_name,
                            "x": [c_name] * len(sub_vals),
                            "y": [round(float(v), 2) for v in sub_vals],
                            "scalemode": "width",
                            "spanmode": "soft",
                            "box": {
                                "visible": True,
                                "width": 0.28,
                                "line": {"color": "#0f172a", "width": 1.5},
                                "fillcolor": "#ffffff",
                            },
                            "meanline": {"visible": True, "color": "#dc2626", "width": 1.8},
                            "points": "outliers" if has_kde else "all",
                            "jitter": 0.25,
                            "pointpos": -1.5,
                            "marker": {"color": c_color, "size": 5},
                            "line": {"color": c_color, "width": 1.8},
                            "fillcolor": f"{c_color}28",
                            "hovertemplate": f"<b>{c_name}</b><br>{get_label(metric_col)}: <b>%{{y:.2f}}</b><extra></extra>",
                        })
                title = f"{get_label(metric_col)} Kernel Density Profiles across {get_label(group_col)}"
                x_label = get_label(group_col)
                y_label = get_label(metric_col)
                layout["showlegend"] = False
                layout["xaxis"] = {"title": x_label, "automargin": True, "tickangle": -35 if len(top_cats) > 4 else 0}
            else:
                vals = filtered_df[metric_col].dropna().tolist()
                cat_n = applied_filters.get("category") or "Cohort"
                yr_n = applied_filters.get("year")
                cohort_label = f"{cat_n} ({yr_n})" if yr_n else cat_n
                has_kde = len(vals) >= 3

                if vals:
                    traces.append({
                        "type": "violin",
                        "name": cohort_label,
                        "x": [cohort_label] * len(vals),
                        "y": [round(float(v), 2) for v in vals],
                        "scalemode": "width",
                        "spanmode": "soft",
                        "box": {
                            "visible": True,
                            "width": 0.28,
                            "line": {"color": "#0f172a", "width": 1.5},
                            "fillcolor": "#ffffff",
                        },
                        "meanline": {"visible": True, "color": "#dc2626", "width": 1.8},
                        "points": "outliers" if has_kde else "all",
                        "jitter": 0.25,
                        "pointpos": -1.5,
                        "marker": {"color": "#8b5cf6", "size": 5},
                        "line": {"color": "#8b5cf6", "width": 2},
                        "fillcolor": "rgba(139, 92, 246, 0.25)",
                        "hovertemplate": f"<b>{cohort_label}</b><br>{get_label(metric_col)}: <b>%{{y:.2f}}</b><extra></extra>",
                    })
                title = f"{get_label(metric_col)} Kernel Density Estimation ({cohort_label})"
                x_label = "Institutional Cohort"
                y_label = get_label(metric_col)
                layout["showlegend"] = False
                layout["xaxis"] = {"title": x_label, "automargin": True, "tickangle": 0}

            layout["yaxis"] = {"title": y_label, "rangemode": "tozero", "automargin": True}

        # -------------------------------------------------------------
        # 9. Heatmap (Cross-Tabulation Matrix)
        # -------------------------------------------------------------
        elif chart_type == "heatmap":
            x_col = x_var if x_var in filtered_df.columns else "year"
            y_col = y_var if y_var in filtered_df.columns else "state"
            metric = size_var if (size_var and size_var in self.ALLOWED_NUMERICAL_COLUMNS) else "overall_score"

            # Top Y categories
            top_y = filtered_df[y_col].value_counts().head(15).index.tolist()
            sub_heat = filtered_df[filtered_df[y_col].isin(top_y)]

            if metric in sub_heat.columns and sub_heat[metric].notna().any():
                pivot = sub_heat.pivot_table(index=y_col, columns=x_col, values=metric, aggfunc="mean").round(2)
            else:
                pivot = sub_heat.pivot_table(index=y_col, columns=x_col, values="institution_name", aggfunc="count").fillna(0)

            x_cols = [str(c) for c in pivot.columns]
            y_rows = [str(r) for r in pivot.index]
            z_vals = pivot.fillna(0).values.tolist()

            traces.append({
                "type": "heatmap",
                "x": x_cols,
                "y": y_rows,
                "z": z_vals,
                "colorscale": "Blues",
                "hovertemplate": f"{get_label(y_col)}: %{{y}}<br>{get_label(x_col)}: %{{x}}<br>Value: %{{z:.2f}}<extra></extra>",
            })
            title = f"{get_label(y_col)} vs {get_label(x_col)} Matrix Heatmap"

        # -------------------------------------------------------------
        # 10. Correlation Heatmap
        # -------------------------------------------------------------
        elif chart_type == "correlation_heatmap":
            core_params = ["overall_score", "tlr_score", "rpc_score", "go_score", "oi_score", "pr_score"]
            avail_params = [p for p in core_params if p in filtered_df.columns and filtered_df[p].notna().sum() >= 5]

            corr_matrix = filtered_df[avail_params].corr(method="pearson").round(2)
            labels = [get_label(p) for p in avail_params]
            z_vals = corr_matrix.values.tolist()

            traces.append({
                "type": "heatmap",
                "x": labels,
                "y": labels,
                "z": z_vals,
                "text": [[f"{val:.2f}" for val in row] for row in z_vals],
                "texttemplate": "%{text}",
                "colorscale": "RdBu",
                "zmin": -1.0,
                "zmax": 1.0,
                "hovertemplate": "<b>%{y}</b> & <b>%{x}</b><br>Pearson r: %{z:.2f}<extra></extra>",
            })
            layout["xaxis"] = {"tickangle": -30}
            title = "NIRF Parameter Pearson Correlation Matrix"

        # -------------------------------------------------------------
        # 11. Radar Chart
        # -------------------------------------------------------------
        elif chart_type == "radar":
            pillars = ["tlr_score", "rpc_score", "go_score", "oi_score", "pr_score"]
            theta_labels = ["TLR", "RPC", "GO", "OI", "PR"]

            # Top 4 institutions to compare
            top_insts = (
                filtered_df.dropna(subset=["institution_name", "overall_score"])
                .sort_values("overall_score", ascending=False)
                .head(4)
            )

            palette = ["#2563eb", "#10b981", "#f59e0b", "#ec4899"]
            for idx, (_, row) in enumerate(top_insts.iterrows()):
                r_scores = [round(float(row.get(p, 0.0) or 0.0), 2) for p in pillars]
                # Close the polygon
                r_scores_closed = r_scores + [r_scores[0]]
                theta_closed = theta_labels + [theta_labels[0]]

                inst_name = str(row["institution_name"]).strip()
                rank_val = row.get("numeric_rank") or row.get("rank")
                rank_prefix = f"#{int(rank_val)} " if rank_val and str(rank_val).isdigit() else f"#{idx+1} "
                clean_name = (
                    inst_name
                    .replace("Indian Institute of Technology", "IIT")
                    .replace("National Institute of Technology", "NIT")
                    .replace("Indian Institute of Science", "IISc")
                    .replace("All India Institute of Medical Sciences", "AIIMS")
                )
                display_name = f"{rank_prefix}{clean_name}"
                if len(display_name) > 30:
                    display_name = f"{display_name[:28]}..."

                traces.append({
                    "type": "scatterpolar",
                    "r": r_scores_closed,
                    "theta": theta_closed,
                    "fill": "toself",
                    "name": display_name,
                    "line": {"color": palette[idx % len(palette)], "width": 2},
                    "opacity": 0.7,
                    "hovertemplate": f"<b>{inst_name}</b> ({rank_prefix.strip()})<br>%{{theta}}: <b>%{{r:.2f}}</b> / 100<extra></extra>",
                })

            layout["polar"] = {
                "radialaxis": {"visible": True, "range": [0, 100], "tickfont": {"size": 10}},
            }
            layout["legend"] = {
                "orientation": "h",
                "x": 0.5,
                "y": -0.16,
                "xanchor": "center",
                "yanchor": "top",
                "font": {"size": 11, "color": "#334155"},
            }
            layout["margin"] = {"l": 50, "r": 50, "t": 45, "b": 65}
            title = "Multi-Pillar Institutional Radar Comparison"

        # -------------------------------------------------------------
        # 12. Pie / Donut Chart
        # -------------------------------------------------------------
        elif chart_type == "pie":
            y_col = y_var if (y_var and y_var in self.ALLOWED_NUMERICAL_COLUMNS) else None
            x_col = x_var if x_var in self.ALLOWED_CATEGORICAL_COLUMNS else "state"

            if y_col:
                pie_df = filtered_df.dropna(subset=[x_col, y_col]).groupby(x_col)[y_col].sum().reset_index()
                pie_df = pie_df.sort_values(y_col, ascending=False).head(10)
                labels = pie_df[x_col].tolist()
                values = [round(float(v), 2) for v in pie_df[y_col]]
            else:
                cnt_series = filtered_df[x_col].dropna().value_counts().head(10)
                labels = cnt_series.index.tolist()
                values = cnt_series.values.tolist()

            traces.append({
                "type": "pie",
                "labels": [str(l)[:24] for l in labels],
                "values": values,
                "hole": 0.45,
                "textinfo": "percent+label",
                "hovertemplate": "<b>%{label}</b><br>Value: %{value:,}<br>Share: %{percent}<extra></extra>",
            })
            title = f"{x_label} Proportional Share"

        # -------------------------------------------------------------
        # 13. Area Chart
        # -------------------------------------------------------------
        elif chart_type == "area":
            y_col = y_var if (y_var and y_var in self.ALLOWED_NUMERICAL_COLUMNS) else "overall_score"
            area_df = (
                filtered_df.dropna(subset=[x_var, y_col])
                .groupby(x_var)[y_col]
                .mean()
                .reset_index()
                .sort_values(x_var)
            )

            traces.append({
                "type": "scatter",
                "mode": "lines",
                "fill": "tozeroy",
                "name": f"Mean {get_label(y_col)}",
                "x": area_df[x_var].tolist(),
                "y": [round(float(v), 2) for v in area_df[y_col]],
                "line": {"color": "#2563eb", "width": 2},
                "fillcolor": "rgba(37, 99, 235, 0.2)",
                "hovertemplate": f"<b>%{{x}}</b><br>Mean {get_label(y_col)}: %{{y:.2f}}<extra></extra>",
            })
            title = f"Longitudinal {get_label(y_col)} Area Trend by {x_label}"

        # -------------------------------------------------------------
        # 14. Parallel Coordinates
        # -------------------------------------------------------------
        elif chart_type == "parallel_coordinates":
            dims_cols = ["overall_score", "tlr_score", "rpc_score", "go_score", "oi_score", "pr_score", "numeric_rank"]
            valid_dims = [c for c in dims_cols if c in filtered_df.columns and filtered_df[c].notna().any()]

            sub_par = filtered_df.dropna(subset=["overall_score"]).head(query.limit or 150)
            dimensions = []
            for d in valid_dims:
                s = sub_par[d].fillna(0)
                dim_dict = {
                    "label": get_label(d),
                    "values": s.tolist(),
                    "range": [float(s.min()), float(s.max())],
                }
                if d == "numeric_rank":
                    dim_dict["range"] = [float(s.max()), float(s.min())]  # invert rank
                dimensions.append(dim_dict)

            color_series = sub_par["overall_score"].tolist()
            traces.append({
                "type": "parcoords",
                "line": {
                    "color": color_series,
                    "colorscale": "Viridis",
                    "showscale": True,
                    "colorbar": {"title": "Overall Score"},
                },
                "dimensions": dimensions,
            })
            title = "Multi-Parameter Institutional Parallel Coordinates"

        # Preview table records (clean dictionary records, limited to 100)
        table_cols = [
            "rank", "institution_name", "category", "year", "state", "city",
            "overall_score", "tlr_score", "rpc_score", "go_score", "oi_score", "pr_score"
        ]
        active_table_cols = [c for c in table_cols if c in filtered_df.columns]
        table_records = (
            filtered_df[active_table_cols]
            .head(100)
            .replace({np.nan: None})
            .to_dict(orient="records")
        )

        # Final layout adjustments
        layout["title"] = {
            "text": title,
            "font": {"size": 14, "color": "#0f172a", "family": "Inter, sans-serif"},
        }
        if "xaxis" not in layout:
            layout["xaxis"] = {"title": x_label}
        if "yaxis" not in layout and chart_type not in ("pie", "radar", "parallel_coordinates"):
            layout["yaxis"] = {"title": y_label}

        return DynamicChartResponse(
            chart_type=chart_type,
            title=title,
            x_title=x_label,
            y_title=y_label,
            traces=traces,
            layout=layout,
            statistics=stats,
            records_count=len(filtered_df),
            total_dataset_count=len(df_master),
            applied_filters=applied_filters,
            table_records=table_records,
            recommendation=recommendation,
        )


# Global singleton instance
chart_service = ChartService()

