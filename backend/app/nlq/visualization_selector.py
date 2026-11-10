"""NIRF Analytics Dashboard — NLQ Visualization Selector.

Selects the optimal Plotly visualization format and formats traces & layouts
based on analytical intent and payload data with robust axis labels, intelligent text
wrapping, proper margins, and standardized responsive layouts.
"""

from typing import Any, Dict, List, Optional


def wrap_label(text: str, max_width: int = 34) -> str:
    """Intelligently wrap text with <br> break tags for Plotly axis readability without cutting."""
    if not text or len(text) <= max_width:
        return text or ""
    words = text.split(" ")
    lines = []
    current_line = []
    current_len = 0
    for word in words:
        if current_len + len(word) + 1 > max_width and current_line:
            lines.append(" ".join(current_line))
            current_line = [word]
            current_len = len(word)
        else:
            current_line.append(word)
            current_len += len(word) + 1
    if current_line:
        lines.append(" ".join(current_line))
    return "<br>".join(lines)


class VisualizationSelector:
    """Intelligently configures chart traces and layouts for NLQ responses."""

    @staticmethod
    def build_chart_for_intent(
        intent: str,
        data: Dict[str, Any],
        parsed_query: Any,
    ) -> Optional[Dict[str, Any]]:
        """Construct Plotly chart payload from computed analytical data."""

        # ---------------------------------------------------------------------
        # 1. State Leadership / Top States Bar Chart
        # ---------------------------------------------------------------------
        if intent == "STATE_LEADERSHIP":
            states_list = data.get("states", [])[:10]
            if not states_list:
                return None
            return {
                "chart_type": "bar",
                "title": f"Top States by Institution Count in {parsed_query.category} ({parsed_query.year})",
                "traces": [{
                    "type": "bar",
                    "x": [s["state"] for s in states_list],
                    "y": [s["count"] for s in states_list],
                    "text": [str(s["count"]) for s in states_list],
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {
                        "color": "#2563eb",
                        "line": {"color": "#1d4ed8", "width": 1},
                    },
                    "hovertemplate": "<b>%{x}</b><br>Institutions: <b>%{y}</b><extra></extra>",
                }],
                "layout": {
                    "height": 420,
                    "margin": {"l": 65, "r": 30, "t": 35, "b": 90},
                    "xaxis": {
                        "title": {"text": "State / UT", "font": {"size": 12, "color": "#475569"}},
                        "tickangle": -25,
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "Number of Institutions", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 2. Top N Institutions Bar Chart
        # ---------------------------------------------------------------------
        if intent == "TOP_N_INSTITUTIONS":
            insts = data.get("institutions", [])[:parsed_query.limit or 10]
            if not insts:
                return None
            
            wrapped_x = [wrap_label(i["institution_name"], 24) for i in insts]
            custom_data = [
                [i["institution_name"], i.get("rank", idx + 1)]
                for idx, i in enumerate(insts)
            ]
            y_scores = [round(float(i.get("overall_score") or 0.0), 2) for i in insts]

            return {
                "chart_type": "bar",
                "title": f"Top {len(insts)} Institutions in {parsed_query.category} ({parsed_query.year})",
                "traces": [{
                    "type": "bar",
                    "x": wrapped_x,
                    "y": y_scores,
                    "text": [f"{s:.1f}" for s in y_scores],
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {
                        "color": "#2563eb",
                        "line": {"color": "#1d4ed8", "width": 1},
                    },
                    "customdata": custom_data,
                    "hovertemplate": "<b>%{customdata[0]}</b> (Rank #%{customdata[1]})<br>Overall Score: <b>%{y:.2f}</b><extra></extra>",
                }],
                "layout": {
                    "height": 440,
                    "margin": {"l": 65, "r": 30, "t": 35, "b": 130},
                    "xaxis": {
                        "title": {"text": "Institution", "font": {"size": 12, "color": "#475569"}},
                        "tickangle": -35,
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "Overall NIRF Score", "font": {"size": 12, "color": "#475569"}},
                        "range": [0, 100],
                        "automargin": True,
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 3. Institution Multi-Year Trajectory Line Chart
        # ---------------------------------------------------------------------
        if intent == "INSTITUTION_TRAJECTORY":
            records = data.get("records", [])
            if not records:
                return None
            inst_name = data.get("institution_name") or (parsed_query.institution_name if hasattr(parsed_query, "institution_name") and parsed_query.institution_name else "Institution")
            years = [r["year"] for r in records]
            ranks = [r["rank"] for r in records]
            scores = [r.get("overall_score") for r in records]

            param_col = parsed_query.parameter if hasattr(parsed_query, "parameter") and parsed_query.parameter and parsed_query.parameter != "overall_score" else None

            traces = [
                {
                    "type": "scatter",
                    "mode": "lines+markers",
                    "name": "Rank (Lower is Better)",
                    "x": years,
                    "y": ranks,
                    "yaxis": "y1",
                    "line": {"color": "#2563eb", "width": 3},
                    "marker": {"size": 8, "color": "#1d4ed8"},
                    "hovertemplate": "<b>Year %{x}</b><br>Rank: #%{y}<extra></extra>",
                }
            ]

            if param_col:
                param_name = param_col.replace("_score", "").upper() + " Score"
                p_vals = [r.get(param_col) for r in records]
                traces.append({
                    "type": "scatter",
                    "mode": "lines+markers",
                    "name": param_name,
                    "x": years,
                    "y": p_vals,
                    "yaxis": "y2",
                    "line": {"color": "#8b5cf6", "width": 3},
                    "marker": {"size": 8, "color": "#7c3aed"},
                    "hovertemplate": f"<b>Year %{{x}}</b><br>{param_name}: %{{y:.2f}}<extra></extra>",
                })
                traces.append({
                    "type": "scatter",
                    "mode": "lines+markers",
                    "name": "Overall Score",
                    "x": years,
                    "y": scores,
                    "yaxis": "y2",
                    "line": {"color": "#10b981", "width": 2, "dash": "dot"},
                    "marker": {"size": 6, "color": "#059669"},
                    "hovertemplate": "<b>Year %{x}</b><br>Overall Score: %{y:.2f}<extra></extra>",
                })
                chart_title = f"{inst_name} — {param_name} & Rank Trajectory ({parsed_query.start_year}–{parsed_query.end_year})"
                y2_title = f"{param_name} / Overall Score"
            else:
                traces.append({
                    "type": "scatter",
                    "mode": "lines+markers",
                    "name": "Overall Score",
                    "x": years,
                    "y": scores,
                    "yaxis": "y2",
                    "line": {"color": "#10b981", "width": 2.5, "dash": "dot"},
                    "marker": {"size": 7, "color": "#059669"},
                    "hovertemplate": "<b>Year %{x}</b><br>Overall Score: %{y:.2f}<extra></extra>",
                })
                chart_title = f"{inst_name} Trajectory ({parsed_query.start_year}–{parsed_query.end_year})"
                y2_title = "Overall Score"

            return {
                "chart_type": "line",
                "title": chart_title,
                "traces": traces,
                "layout": {
                    "height": 430,
                    "margin": {"l": 65, "r": 65, "t": 35, "b": 60},
                    "xaxis": {
                        "title": {"text": "Ranking Cycle Year", "font": {"size": 12, "color": "#475569"}},
                        "dtick": 1,
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "Rank", "font": {"size": 12, "color": "#2563eb"}},
                        "autorange": "reversed",
                        "automargin": True,
                    },
                    "yaxis2": {
                        "title": {"text": y2_title, "font": {"size": 12, "color": "#8b5cf6" if param_col else "#10b981"}},
                        "overlaying": "y",
                        "side": "right",
                        "range": [0, 105],
                        "automargin": True,
                    },
                    "legend": {"orientation": "h", "y": -0.22, "x": 0.15},
                },
            }

        # ---------------------------------------------------------------------
        # 3b. Institution Comparison (Multi-Year Trajectory or Single-Year)
        # ---------------------------------------------------------------------
        if intent == "INSTITUTION_COMPARISON":
            if data.get("multi_year"):
                name_a = data.get("institution_a", "Institution A")
                name_b = data.get("institution_b", "Institution B")
                recs_a = data.get("records_a", [])
                recs_b = data.get("records_b", [])
                all_years = sorted(list(set([r["year"] for r in recs_a + recs_b])))
                ranks_a = [next((r["rank"] for r in recs_a if r["year"] == y), None) for y in all_years]
                ranks_b = [next((r["rank"] for r in recs_b if r["year"] == y), None) for y in all_years]
                return {
                    "chart_type": "line",
                    "title": f"Trajectory Comparison: {name_a} vs {name_b} ({parsed_query.start_year}–{parsed_query.end_year})",
                    "traces": [
                        {
                            "type": "scatter",
                            "mode": "lines+markers",
                            "name": f"{name_a} Rank",
                            "x": all_years,
                            "y": ranks_a,
                            "line": {"color": "#2563eb", "width": 3},
                            "marker": {"size": 8, "color": "#1d4ed8"},
                            "hovertemplate": f"<b>{name_a}</b><br>Year %{{x}}: Rank #%{{y}}<extra></extra>",
                        },
                        {
                            "type": "scatter",
                            "mode": "lines+markers",
                            "name": f"{name_b} Rank",
                            "x": all_years,
                            "y": ranks_b,
                            "line": {"color": "#f59e0b", "width": 3},
                            "marker": {"size": 8, "color": "#d97706"},
                            "hovertemplate": f"<b>{name_b}</b><br>Year %{{x}}: Rank #%{{y}}<extra></extra>",
                        },
                    ],
                    "layout": {
                        "height": 430,
                        "margin": {"l": 65, "r": 35, "t": 35, "b": 60},
                        "xaxis": {
                            "title": {"text": "Ranking Cycle Year", "font": {"size": 12, "color": "#475569"}},
                            "dtick": 1,
                            "automargin": True,
                        },
                        "yaxis": {
                            "title": {"text": "Rank (Lower is Better)", "font": {"size": 12, "color": "#475569"}},
                            "autorange": "reversed",
                            "dtick": 1,
                            "automargin": True,
                        },
                        "legend": {"orientation": "h", "y": -0.20, "x": 0.15},
                    },
                }

        # ---------------------------------------------------------------------
        # 4. State Comparison Grouped Bar Chart
        # ---------------------------------------------------------------------
        if intent == "STATE_COMPARISON":
            comp = data.get("comparison", {})
            st1, st2 = comp.get("state_1", "State 1"), comp.get("state_2", "State 2")
            categories = ["Institutions Count", "Average Score", "Average TLR", "Average RPC"]
            return {
                "chart_type": "grouped_bar",
                "title": f"Regional Comparison: {st1} vs {st2} ({parsed_query.category} {parsed_query.year})",
                "traces": [
                    {
                        "type": "bar",
                        "name": st1,
                        "x": categories,
                        "y": [
                            comp.get("inst_count_1", 0),
                            comp.get("mean_score_1", 0),
                            comp.get("mean_tlr_1", 0),
                            comp.get("mean_rpc_1", 0),
                        ],
                        "marker": {"color": "#2563eb"},
                        "hovertemplate": f"<b>{st1}</b><br>%{{x}}: <b>%{{y:.1f}}</b><extra></extra>",
                    },
                    {
                        "type": "bar",
                        "name": st2,
                        "x": categories,
                        "y": [
                            comp.get("inst_count_2", 0),
                            comp.get("mean_score_2", 0),
                            comp.get("mean_tlr_2", 0),
                            comp.get("mean_rpc_2", 0),
                        ],
                        "marker": {"color": "#f59e0b"},
                        "hovertemplate": f"<b>{st2}</b><br>%{{x}}: <b>%{{y:.1f}}</b><extra></extra>",
                    },
                ],
                "layout": {
                    "barmode": "group",
                    "height": 430,
                    "margin": {"l": 65, "r": 35, "t": 35, "b": 60},
                    "xaxis": {"automargin": True},
                    "yaxis": {
                        "title": {"text": "Metric Value", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                    "legend": {"orientation": "h", "y": -0.18, "x": 0.25},
                },
            }

        # ---------------------------------------------------------------------
        # 5. Parameter Correlation Horizontal Bar
        # ---------------------------------------------------------------------
        if intent == "PARAMETER_CORRELATION":
            params = data.get("correlations", [])
            if not params:
                return None
            
            # Sort ascending so highest correlation is at top of horizontal bar
            sorted_params = list(reversed(params))
            y_labels = [wrap_label(p["parameter_name"], 30) for p in sorted_params]
            x_vals = [p["correlation"] for p in sorted_params]

            return {
                "chart_type": "bar",
                "title": f"Correlation with Overall Score in {parsed_query.category} ({parsed_query.year})",
                "traces": [{
                    "type": "bar",
                    "orientation": "h",
                    "y": y_labels,
                    "x": x_vals,
                    "text": [f"r = {v:.3f}" for v in x_vals],
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {
                        "color": ["#2563eb" if idx == len(sorted_params) - 1 else "#60a5fa" for idx in range(len(sorted_params))]
                    },
                    "hovertemplate": "<b>%{y}</b><br>Pearson r: <b>%{x:.4f}</b><extra></extra>",
                }],
                "layout": {
                    "height": 400,
                    "margin": {"l": 240, "r": 60, "t": 35, "b": 50},
                    "xaxis": {
                        "title": {"text": "Pearson Correlation (r)", "font": {"size": 12, "color": "#475569"}},
                        "range": [0, 1.05],
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "NIRF Parameter", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 6. Research vs Teaching Divergence Scatter Plot
        # ---------------------------------------------------------------------
        if intent == "RESEARCH_VS_TEACHING":
            insts = data.get("institutions", [])
            if not insts:
                return None
            return {
                "chart_type": "scatter",
                "title": f"Research (RPC) vs Teaching (TLR) in {parsed_query.category} ({parsed_query.year})",
                "traces": [{
                    "type": "scatter",
                    "mode": "markers",
                    "name": "Institutions",
                    "x": [round(float(i.get("tlr_score") or 0.0), 2) for i in insts],
                    "y": [round(float(i.get("rpc_score") or 0.0), 2) for i in insts],
                    "marker": {
                        "size": 8,
                        "color": "#2563eb",
                        "opacity": 0.82,
                        "line": {"color": "#1e40af", "width": 1},
                    },
                    "customdata": [[i.get("institution_name", "N/A"), i.get("rank", "N/A")] for i in insts],
                    "hovertemplate": "<b>%{customdata[0]}</b> (Rank #%{customdata[1]})<br>Teaching (TLR): <b>%{x:.2f}</b><br>Research (RPC): <b>%{y:.2f}</b><extra></extra>",
                }],
                "layout": {
                    "height": 430,
                    "margin": {"l": 65, "r": 35, "t": 35, "b": 60},
                    "xaxis": {
                        "title": {"text": "Teaching, Learning & Resources (TLR)", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "Research & Professional Practice (RPC)", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 7. Ranking Improvements Horizontal Bar (Top Climbers)
        # ---------------------------------------------------------------------
        if intent == "RANK_IMPROVEMENTS":
            climbers = data.get("improvements", [])[:10]
            if not climbers:
                return None

            # Reverse so that top climber (+ highest places gained) is rendered at the top
            reversed_climbers = list(reversed(climbers))
            y_labels = [wrap_label(c["institution_name"], 34) for c in reversed_climbers]
            x_vals = [c["places_gained"] for c in reversed_climbers]
            text_labels = [f"+{c['places_gained']}" for c in reversed_climbers]
            custom_data = [
                [
                    c["institution_name"],
                    c.get("start_rank", "N/A"),
                    c.get("end_rank", "N/A"),
                    c.get("score_change", "N/A"),
                ]
                for c in reversed_climbers
            ]

            return {
                "chart_type": "bar",
                "title": f"Top Ranking Climbers ({parsed_query.start_year} to {parsed_query.end_year})",
                "traces": [{
                    "type": "bar",
                    "orientation": "h",
                    "y": y_labels,
                    "x": x_vals,
                    "text": text_labels,
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {
                        "color": "#10b981",
                        "line": {"color": "#059669", "width": 1.2},
                    },
                    "customdata": custom_data,
                    "hovertemplate": (
                        "<b>%{customdata[0]}</b><br>"
                        f"• Rank ({parsed_query.start_year}): <b>#%{{customdata[1]}}</b><br>"
                        f"• Rank ({parsed_query.end_year}): <b>#%{{customdata[2]}}</b><br>"
                        "• Rank Improvement: <b>+%{x} places</b><extra></extra>"
                    ),
                }],
                "layout": {
                    "height": max(460, len(climbers) * 42 + 90),
                    "margin": {"l": 270, "r": 55, "t": 40, "b": 60},
                    "bargap": 0.28,
                    "xaxis": {
                        "title": {"text": "Positions Gained (Ranks)", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                        "zeroline": True,
                        "zerolinecolor": "#e2e8f0",
                        "tickfont": {"size": 11, "color": "#64748b"},
                    },
                    "yaxis": {
                        "title": {"text": "Institution", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                        "type": "category",
                        "categoryorder": "array",
                        "categoryarray": y_labels,
                        "tickfont": {"size": 11, "color": "#0f172a"},
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 8. Ranking Declines Horizontal Bar (Top Fallers)
        # ---------------------------------------------------------------------
        if intent == "RANK_DECLINES":
            fallers = data.get("declines", [])[:10]
            if not fallers:
                return None

            reversed_fallers = list(reversed(fallers))
            y_labels = [wrap_label(f["institution_name"], 34) for f in reversed_fallers]
            x_vals = [-abs(f["places_lost"]) for f in reversed_fallers]
            text_labels = [f"-{abs(f['places_lost'])}" for f in reversed_fallers]
            custom_data = [
                [
                    f["institution_name"],
                    f.get("start_rank", "N/A"),
                    f.get("end_rank", "N/A"),
                ]
                for f in reversed_fallers
            ]

            return {
                "chart_type": "bar",
                "title": f"Top Ranking Declines ({parsed_query.start_year} to {parsed_query.end_year})",
                "traces": [{
                    "type": "bar",
                    "orientation": "h",
                    "y": y_labels,
                    "x": x_vals,
                    "text": text_labels,
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {
                        "color": "#ef4444",
                        "line": {"color": "#b91c1c", "width": 1.2},
                    },
                    "customdata": custom_data,
                    "hovertemplate": (
                        "<b>%{customdata[0]}</b><br>"
                        f"• Rank ({parsed_query.start_year}): <b>#%{{customdata[1]}}</b><br>"
                        f"• Rank ({parsed_query.end_year}): <b>#%{{customdata[2]}}</b><br>"
                        "• Rank Decline: <b>%{x} places</b><extra></extra>"
                    ),
                }],
                "layout": {
                    "height": max(460, len(fallers) * 42 + 90),
                    "margin": {"l": 270, "r": 55, "t": 40, "b": 60},
                    "bargap": 0.28,
                    "xaxis": {
                        "title": {"text": "Positions Lost (Ranks)", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                        "zeroline": True,
                        "zerolinecolor": "#e2e8f0",
                        "tickfont": {"size": 11, "color": "#64748b"},
                    },
                    "yaxis": {
                        "title": {"text": "Institution", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                        "type": "category",
                        "categoryorder": "array",
                        "categoryarray": y_labels,
                        "tickfont": {"size": 11, "color": "#0f172a"},
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 9. Score Distribution Histogram
        # ---------------------------------------------------------------------
        if intent == "SCORE_DISTRIBUTION":
            bins = data.get("bins", [])
            if not bins:
                return None
            return {
                "chart_type": "bar",
                "title": f"Score Distribution for {parsed_query.category} ({parsed_query.year})",
                "traces": [{
                    "type": "bar",
                    "x": [b["bin_range"] for b in bins],
                    "y": [b["count"] for b in bins],
                    "text": [str(b["count"]) for b in bins],
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {"color": "#3b82f6", "line": {"color": "#1d4ed8", "width": 1}},
                    "hovertemplate": "Score Bracket: <b>%{x}</b><br>Institutions: <b>%{y}</b><extra></extra>",
                }],
                "layout": {
                    "height": 400,
                    "margin": {"l": 65, "r": 30, "t": 35, "b": 70},
                    "xaxis": {
                        "title": {"text": "Score Bracket", "font": {"size": 12, "color": "#475569"}},
                        "tickangle": -25,
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "Number of Institutions", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 10. Top 10 Entries and Exits
        # ---------------------------------------------------------------------
        if intent == "TOP_10_ENTRIES_EXITS":
            entrants = data.get("entrants", [])
            exits = data.get("exits", [])
            return {
                "chart_type": "bar",
                "title": f"Top 10 Turnover between {parsed_query.start_year} and {parsed_query.end_year}",
                "traces": [
                    {
                        "type": "bar",
                        "name": "New Entrants into Top 10",
                        "x": [wrap_label(e["institution_name"], 22) for e in entrants] or ["None"],
                        "y": [1] * max(len(entrants), 1),
                        "marker": {"color": "#10b981"},
                        "customdata": [e.get("institution_name", "None") for e in entrants] or ["None"],
                        "hovertemplate": "<b>%{customdata}</b><br>Entered Top 10<extra></extra>",
                    },
                    {
                        "type": "bar",
                        "name": "Exited Top 10",
                        "x": [wrap_label(ex["institution_name"], 22) for ex in exits] or ["None"],
                        "y": [-1] * max(len(exits), 1),
                        "marker": {"color": "#ef4444"},
                        "customdata": [ex.get("institution_name", "None") for ex in exits] or ["None"],
                        "hovertemplate": "<b>%{customdata}</b><br>Exited Top 10<extra></extra>",
                    },
                ],
                "layout": {
                    "height": 440,
                    "margin": {"l": 65, "r": 30, "t": 35, "b": 130},
                    "yaxis": {"visible": False},
                    "xaxis": {
                        "tickangle": -30,
                        "automargin": True,
                        "title": {"text": "Institution", "font": {"size": 12, "color": "#475569"}},
                    },
                    "legend": {"orientation": "h", "y": -0.25},
                },
            }

        # ---------------------------------------------------------------------
        # 11. Top 5 Radar Comparison
        # ---------------------------------------------------------------------
        if intent == "TOP_FIVE_COMPARISON":
            insts = data.get("institutions", [])[:5]
            if not insts:
                return None
            categories = ["TLR", "RPC", "GO", "OI", "PR"]
            palette = ["#2563eb", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"]

            traces = []
            for idx, inst in enumerate(insts):
                r_vals = [
                    inst.get("tlr_score", 0),
                    inst.get("rpc_score", 0),
                    inst.get("go_score", 0),
                    inst.get("oi_score", 0),
                    inst.get("pr_score", 0),
                ]
                # Close polygon
                r_vals.append(r_vals[0])
                theta_vals = categories + [categories[0]]

                # Keep full un-truncated name in trace name
                full_name = inst.get("institution_name", f"Rank {idx+1}")
                traces.append({
                    "type": "scatterpolar",
                    "r": r_vals,
                    "theta": theta_vals,
                    "fill": "toself",
                    "name": full_name,
                    "line": {"color": palette[idx % len(palette)], "width": 2},
                    "opacity": 0.65,
                    "hovertemplate": f"<b>{full_name}</b><br>%{{theta}}: <b>%{{r:.1f}}</b><extra></extra>",
                })

            return {
                "chart_type": "radar",
                "title": f"5-Parameter Evaluation: Top 5 Institutions in {parsed_query.category} ({parsed_query.year})",
                "traces": traces,
                "layout": {
                    "height": 440,
                    "margin": {"l": 60, "r": 60, "t": 35, "b": 75},
                    "polar": {
                        "radialaxis": {"visible": True, "range": [0, 100]},
                    },
                    "legend": {"orientation": "h", "y": -0.22, "x": 0.05},
                },
            }

        # ---------------------------------------------------------------------
        # 12. Donut / Pie Chart: State Share of Institutions
        # ---------------------------------------------------------------------
        if intent == "STATE_SHARE_PIE":
            states_list = data.get("states", [])[:8]
            if not states_list:
                return None
            return {
                "chart_type": "pie",
                "title": f"Institutional Representation by State in {parsed_query.category} ({parsed_query.year})",
                "traces": [{
                    "type": "pie",
                    "hole": 0.44,
                    "labels": [s["state"] for s in states_list],
                    "values": [s["count"] for s in states_list],
                    "textinfo": "percent+label",
                    "textposition": "inside",
                    "marker": {
                        "colors": ["#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#cbd5e1", "#e2e8f0"]
                    },
                    "hovertemplate": "<b>%{label}</b><br>Institutions: <b>%{value}</b> (%{percent})<extra></extra>",
                }],
                "layout": {
                    "height": 420,
                    "margin": {"l": 30, "r": 30, "t": 35, "b": 40},
                    "showlegend": True,
                    "legend": {"orientation": "h", "y": -0.15},
                },
            }

        # ---------------------------------------------------------------------
        # 13. Heatmap: 5-Parameter Correlation Matrix
        # ---------------------------------------------------------------------
        if intent == "CORRELATION_HEATMAP":
            corr_matrix = data.get("matrix", [])
            labels = ["TLR", "RPC", "GO", "OI", "PR"]
            if not corr_matrix:
                return None
            return {
                "chart_type": "heatmap",
                "title": f"5-Parameter Inter-Correlation Matrix ({parsed_query.category} {parsed_query.year})",
                "traces": [{
                    "type": "heatmap",
                    "z": corr_matrix,
                    "x": labels,
                    "y": labels,
                    "colorscale": "Blues",
                    "text": [[f"{val:.2f}" for val in row] for row in corr_matrix],
                    "texttemplate": "%{text}",
                    "textfont": {"size": 12, "color": "#0f172a"},
                    "hovertemplate": "<b>%{y} vs %{x}</b><br>Correlation (r): <b>%{z:.3f}</b><extra></extra>",
                }],
                "layout": {
                    "height": 430,
                    "margin": {"l": 75, "r": 40, "t": 40, "b": 75},
                    "xaxis": {"title": "Parameter", "automargin": True},
                    "yaxis": {"title": "Parameter", "automargin": True},
                },
            }

        # ---------------------------------------------------------------------
        # 14. Box Plot: Score Dispersion
        # ---------------------------------------------------------------------
        if intent == "SCORE_BOXPLOT":
            box_data = data.get("scores", [])
            if not box_data:
                return None
            return {
                "chart_type": "box",
                "title": f"Score Distribution Box Plot for {parsed_query.category} ({parsed_query.year})",
                "traces": [{
                    "type": "box",
                    "y": box_data,
                    "name": parsed_query.category,
                    "boxpoints": "outliers",
                    "jitter": 0.3,
                    "pointpos": -1.8,
                    "marker": {"color": "#2563eb", "size": 5},
                    "line": {"color": "#1d4ed8", "width": 1.5},
                    "hovertemplate": "Score: <b>%{y:.2f}</b><extra></extra>",
                }],
                "layout": {
                    "height": 420,
                    "margin": {"l": 65, "r": 30, "t": 35, "b": 60},
                    "yaxis": {
                        "title": {"text": "Overall NIRF Score", "font": {"size": 12, "color": "#475569"}},
                        "range": [0, 100],
                        "automargin": True,
                    },
                    "xaxis": {"automargin": True},
                },
            }

        # ---------------------------------------------------------------------
        # 15. Ranking Volatility Horizontal Bar
        # ---------------------------------------------------------------------
        if intent == "RANKING_VOLATILITY":
            items = data.get("volatility", [])[:10]
            if not items:
                return None
            rev_items = list(reversed(items))
            return {
                "chart_type": "bar",
                "title": f"Most Volatile Institutions by Rank Variation ({parsed_query.category})",
                "traces": [{
                    "type": "bar",
                    "orientation": "h",
                    "y": [wrap_label(i["institution_name"], 34) for i in rev_items],
                    "x": [i["std_rank"] for i in rev_items],
                    "text": [f"&plusmn;{i['std_rank']:.1f}" for i in rev_items],
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {"color": "#f59e0b", "line": {"color": "#d97706", "width": 1.2}},
                    "customdata": [[i["institution_name"], i.get("min_rank"), i.get("max_rank")] for i in rev_items],
                    "hovertemplate": "<b>%{customdata[0]}</b><br>Rank Std Dev: <b>&plusmn;%{x:.2f}</b><br>Rank Range: #%{customdata[1]} &ndash; #%{customdata[2]}<extra></extra>",
                }],
                "layout": {
                    "height": max(450, len(items) * 42 + 90),
                    "margin": {"l": 270, "r": 60, "t": 40, "b": 60},
                    "bargap": 0.28,
                    "xaxis": {
                        "title": {"text": "Rank Standard Deviation (&sigma;)", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "Institution", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                        "type": "category",
                        "categoryorder": "array",
                        "categoryarray": y_labels,
                        "tickfont": {"size": 11, "color": "#0f172a"},
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 16. Outlier Detection Scatter
        # ---------------------------------------------------------------------
        if intent == "OUTLIER_DETECTION":
            outliers = data.get("outliers", [])
            if not outliers:
                return None
            return {
                "chart_type": "scatter",
                "title": f"Research vs Teaching Outliers in {parsed_query.category} ({parsed_query.year})",
                "traces": [
                    {
                        "type": "scatter",
                        "mode": "markers",
                        "name": "Outliers",
                        "x": [o.get("tlr_score", 0) for o in outliers],
                        "y": [o.get("rpc_score", 0) for o in outliers],
                        "marker": {"size": 10, "color": "#ef4444", "line": {"color": "#991b1b", "width": 1.5}},
                        "customdata": [o.get("institution_name", "N/A") for o in outliers],
                        "hovertemplate": "<b>%{customdata}</b><br>Teaching: %{x:.1f}<br>Research: %{y:.1f}<extra></extra>",
                    }
                ],
                "layout": {
                    "height": 430,
                    "margin": {"l": 65, "r": 35, "t": 35, "b": 60},
                    "xaxis": {
                        "title": {"text": "Teaching (TLR)", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "Research (RPC)", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 17. Single-Year Factual Lookup Parameter Profile
        # ---------------------------------------------------------------------
        if intent == "FACTUAL_LOOKUP":
            inst_name = data.get("institution_name") or (parsed_query.institution_name if hasattr(parsed_query, "institution_name") and parsed_query.institution_name else "Institution")
            year = data.get("year", 2025)
            cat = data.get("category", "Overall")
            rank = data.get("rank", "N/A")
            params = [
                ("TLR (Teaching)", data.get("tlr_score")),
                ("RPC (Research)", data.get("rpc_score")),
                ("GO (Graduation)", data.get("go_score")),
                ("OI (Inclusivity)", data.get("oi_score")),
                ("PR (Perception)", data.get("pr_score")),
                ("Overall Score", data.get("overall_score")),
            ]
            valid_params = [(lbl, val) for lbl, val in params if val is not None]
            if not valid_params:
                return None
            x_labels = [p[0] for p in valid_params]
            y_vals = [p[1] for p in valid_params]
            colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#2563eb"][:len(valid_params)]
            return {
                "chart_type": "bar",
                "title": f"{inst_name} — Parameter Profile ({cat} {year}, Rank #{rank})",
                "traces": [{
                    "type": "bar",
                    "x": x_labels,
                    "y": y_vals,
                    "text": [f"{v:.1f}" for v in y_vals],
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {
                        "color": colors,
                        "line": {"color": "#1e293b", "width": 1},
                    },
                    "hovertemplate": "<b>%{x}</b><br>Score: <b>%{y:.2f}</b><extra></extra>",
                }],
                "layout": {
                    "height": 420,
                    "margin": {"l": 65, "r": 30, "t": 40, "b": 80},
                    "xaxis": {
                        "title": {"text": "NIRF Parameter", "font": {"size": 12, "color": "#475569"}},
                        "tickangle": -15,
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "Score (out of 100)", "font": {"size": 12, "color": "#475569"}},
                        "range": [0, 105],
                        "automargin": True,
                    },
                },
            }

        # ---------------------------------------------------------------------
        # 18. Data Continuity Analysis Bar Chart
        # ---------------------------------------------------------------------
        if intent == "DATA_CONTINUITY_ANALYSIS":
            brackets = data.get("continuity_brackets", [])
            if not brackets:
                return None
            x_labels = [b["label"] for b in brackets]
            y_counts = [b["count"] for b in brackets]
            return {
                "chart_type": "bar",
                "title": f"Participation Continuity in {parsed_query.category} (2017–2025)",
                "traces": [{
                    "type": "bar",
                    "x": x_labels,
                    "y": y_counts,
                    "text": [str(c) for c in y_counts],
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {
                        "color": ["#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#f59e0b", "#ef4444"][:len(x_labels)],
                        "line": {"color": "#1e293b", "width": 1},
                    },
                    "hovertemplate": "<b>%{x}</b><br>Institutions: <b>%{y}</b><extra></extra>",
                }],
                "layout": {
                    "height": 420,
                    "margin": {"l": 65, "r": 30, "t": 40, "b": 80},
                    "xaxis": {
                        "title": {"text": "Participation Category", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                    "yaxis": {
                        "title": {"text": "Number of Institutions", "font": {"size": 12, "color": "#475569"}},
                        "automargin": True,
                    },
                },
            }

        return None

    @staticmethod
    def get_follow_up_suggestions(intent: str, parsed_query: Any) -> List[str]:
        """Generate contextual, intelligent follow-up suggestions."""
        if intent == "FACTUAL_LOOKUP":
            inst = getattr(parsed_query, "institution_name", None) or "this institution"
            cat = getattr(parsed_query, "category", "Overall")
            yr = getattr(parsed_query, "year", 2025)
            return [
                f"How has {inst} performed from 2017 to 2025?",
                f"Show the top 10 institutions in {cat} in {yr}",
                "Which institutions improved their rankings the most from 2017 to 2025?",
            ]
        if intent == "METHODOLOGY_EXPLANATION":
            return [
                "What is TLR in NIRF ranking?",
                "What is RPC in NIRF ranking?",
                "Show the top 10 institutions in Overall category in 2025",
            ]
        if intent == "DATA_CONTINUITY_ANALYSIS":
            return [
                "Which institutions improved their rankings the most from 2017 to 2025?",
                "Show the top 10 institutions in Overall category in 2025",
                "Which state has the highest number of Engineering institutions in 2025?",
            ]
        if intent == "STATE_LEADERSHIP":
            return [
                f"Compare {parsed_query.category} representation between Tamil Nadu and Maharashtra",
                f"Show the top 10 institutions in {parsed_query.category} in {parsed_query.year}",
                f"Which institutions improved their rankings the most from {parsed_query.start_year} to {parsed_query.end_year}?",
            ]
        if intent == "TOP_N_INSTITUTIONS":
            return [
                f"Top Ranking Climbers ({parsed_query.start_year} to {parsed_query.end_year})",
                "Compare the five parameters for the top five institutions",
                f"Which state has the highest number of institutions in {parsed_query.category} in {parsed_query.year}?",
            ]
        if intent == "RANK_IMPROVEMENTS":
            return [
                f"Which institutions declined the most between {parsed_query.start_year} and {parsed_query.end_year}?",
                f"Show the top 10 institutions in {parsed_query.category} in {parsed_query.end_year}",
                "Which institutions entered the top 10 between 2024 and 2025?",
            ]
        if intent == "INSTITUTION_TRAJECTORY":
            return [
                "Which institutions improved their rankings the most from 2017 to 2025?",
                "Show institutions with high research scores but low teaching scores",
                f"Compare {parsed_query.category} representation between Karnataka and Tamil Nadu",
            ]
        if intent == "STATE_COMPARISON":
            return [
                "Which state has the highest number of Engineering institutions in 2025?",
                "Show score distribution for Overall in 2025",
                "Which parameter has the strongest correlation with overall score?",
            ]
        if intent == "PARAMETER_CORRELATION":
            return [
                "Show correlation heatmap across all 5 parameters",
                "Show institutions with high research scores but low teaching scores",
                "Compare the five parameters for the top five institutions",
            ]

        return [
            "Top Ranking Climbers (2017 to 2025)",
            "Show the top 10 institutions in Overall category in 2025",
            "Which state has the highest number of Engineering institutions in 2025?",
            "Which parameter has the strongest correlation with overall score?",
        ]


visualization_selector = VisualizationSelector()
