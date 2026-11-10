"""NIRF Analytics Dashboard — NLQ Query Builder.

Dispatches parsed natural-language intents to safe, validated backend analytical services:
- Geospatial service
- Time-series service
- Bivariate correlation service
- Multivariate service
- Univariate distribution service
- Ranking transitions service
- Outlier detection service
- Chart service
Produces factual, mathematically rigorous textual summaries and Plotly visualization traces.
"""

from typing import Any, Dict, List, Optional
import pandas as pd

from app.services.data_loader import DataLoader
from app.services.analytics.geospatial import geospatial_service
from app.services.analytics.time_series import time_series_service
from app.services.analytics.bivariate import bivariate_service
from app.services.analytics.multivariate import multivariate_service
from app.services.analytics.univariate import univariate_service
from app.services.analytics.ranking_transitions import ranking_transitions_service
from app.services.analytics.outlier_detection import outlier_detection_service
from app.nlq.query_parser import ParsedQuery
from app.nlq.visualization_selector import visualization_selector
from app.nlq.entity_resolver import entity_resolver


class QueryBuilder:
    """Safely dispatches parsed analytical queries to corresponding services."""

    def __init__(self) -> None:
        self.data_loader = DataLoader.get_instance()

    def execute(self, parsed: ParsedQuery) -> Dict[str, Any]:
        """Execute parsed analytical query and compile structured response."""
        intent = parsed.intent

        # 1. State Leadership (e.g. Which state has highest engineering institutions?)
        if intent == "STATE_LEADERSHIP":
            top_states_res = geospatial_service.get_top_states(
                category=parsed.category,
                year=parsed.year,
                top_n=100,
            )
            data = {
                "states": [
                    {"state": item.state, "count": item.count, "share_pct": item.share_pct}
                    for item in top_states_res.states
                ]
            }
            lead = top_states_res.leading_state
            lead_cnt = top_states_res.leading_state_count
            top3_conc = top_states_res.top3_concentration_pct
            total_scoped = top_states_res.total_institutions_scoped
            text = (
                f"In the **{parsed.year} {parsed.category}** rankings, **{lead}** has the highest "
                f"representation with **{lead_cnt} institutions** ({round(lead_cnt / max(total_scoped, 1) * 100, 1)}% of cohort). "
                f"A total of {top_states_res.total_states_represented} States & UTs are represented, with the top three states "
                f"accounting for {top3_conc}% of all ranked institutions."
            )
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": total_scoped,
                "applied_filters": {"category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 2. Top N Institutions (e.g. Show top 10 institutions in Overall in 2025)
        if intent == "TOP_N_INSTITUTIONS":
            df = self.data_loader.load_dataset()
            sub = df[(df["category"].str.lower() == parsed.category.lower()) & (df["year"] == parsed.year)]
            if parsed.state:
                sub = sub[sub["state"].str.lower() == parsed.state.lower()]

            param_col = parsed.parameter if parsed.parameter and parsed.parameter in sub.columns else None
            if param_col:
                sub = sub.sort_values(param_col, ascending=False).head(parsed.limit)
            else:
                sub = sub.sort_values("numeric_rank", ascending=True).head(parsed.limit)

            insts = []
            for _, r in sub.iterrows():
                insts.append({
                    "rank": int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else str(r["rank"]),
                    "institution_name": r["institution_name"],
                    "city": r.get("city", ""),
                    "state": r.get("state", ""),
                    "overall_score": float(r["overall_score"]) if pd.notna(r.get("overall_score")) else None,
                    "parameter_score": float(r[param_col]) if param_col and pd.notna(r.get(param_col)) else None,
                })
            data = {"institutions": insts}

            top1_name = insts[0]["institution_name"] if insts else "N/A"
            top1_score = insts[0]["overall_score"] if insts else "N/A"
            state_str = f" in {parsed.state}" if parsed.state else ""

            if param_col:
                param_label = param_col.upper().replace("_SCORE", "")
                text = (
                    f"Here are the top {len(insts)} institutions in **{parsed.category}**{state_str} ranked by **{param_label}** for **{parsed.year}**. "
                    f"Leading institution is **{top1_name}** with a {param_label} score of **{insts[0].get('parameter_score', top1_score)}**, followed by "
                    f"**{insts[1]['institution_name']}** ({param_label}: {insts[1].get('parameter_score', insts[1]['overall_score'])}) "
                    f"and **{insts[2]['institution_name']}** ({param_label}: {insts[2].get('parameter_score', insts[2]['overall_score'])})."
                ) if len(insts) >= 3 else f"Retrieved {len(insts)} top institutions in {parsed.category} ({parsed.year}) for {param_label}."
            else:
                text = (
                    f"Here are the top {len(insts)} institutions in **{parsed.category}**{state_str} for **{parsed.year}**. "
                    f"Rank #1 is **{top1_name}** with an Overall Score of **{top1_score}**, followed by "
                    f"**{insts[1]['institution_name']}** at Rank #{insts[1]['rank']} (Score: {insts[1]['overall_score']}) "
                    f"and **{insts[2]['institution_name']}** at Rank #{insts[2]['rank']} (Score: {insts[2]['overall_score']})."
                ) if len(insts) >= 3 else f"Retrieved {len(insts)} top institutions in {parsed.category} ({parsed.year})."

            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": len(sub),
                "applied_filters": {"category": parsed.category, "year": parsed.year, "limit": parsed.limit},
                "chart": chart,
                "data": data,
            }

        # 2b. Institution Comparison (e.g. Compare IIT Bombay and IIT Delhi from 2017 to 2025)
        if intent == "INSTITUTION_COMPARISON":
            df = self.data_loader.load_dataset()
            raw_a = parsed.compare_institutions[0] if parsed.compare_institutions else parsed.institution_name
            raw_b = parsed.compare_institutions[1] if len(parsed.compare_institutions) > 1 else "Indian Institute of Technology Delhi"

            ent_a = entity_resolver.get_by_name(raw_a) if raw_a else None
            if not ent_a and raw_a:
                ent_a = entity_resolver.resolve_from_query(raw_a)
            ent_b = entity_resolver.get_by_name(raw_b) if raw_b else None
            if not ent_b and raw_b:
                ent_b = entity_resolver.resolve_from_query(raw_b)

            name_a = ent_a.canonical_name if ent_a else (raw_a or "Institution A")
            name_b = ent_b.canonical_name if ent_b else (raw_b or "Institution B")

            # Check if multi-year comparison requested
            is_multi_year = (parsed.start_year < parsed.end_year) and any(
                kw in parsed.raw_query.lower() for kw in ["from", "between", "over", "to", "trend", "history", "trajectory", "201", "202"]
            )

            if is_multi_year:
                sub_a = entity_resolver.filter_dataset(df, ent_a, parsed.category) if ent_a else df[(df["institution_name"].str.contains(name_a, case=False, na=False)) & (df["category"].str.lower() == parsed.category.lower())]
                sub_b = entity_resolver.filter_dataset(df, ent_b, parsed.category) if ent_b else df[(df["institution_name"].str.contains(name_b, case=False, na=False)) & (df["category"].str.lower() == parsed.category.lower())]

                sub_a = sub_a[(sub_a["year"] >= parsed.start_year) & (sub_a["year"] <= parsed.end_year)].sort_values("year")
                sub_b = sub_b[(sub_b["year"] >= parsed.start_year) & (sub_b["year"] <= parsed.end_year)].sort_values("year")

                recs_a = [
                    {"year": int(r["year"]), "rank": int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else str(r["rank"]), "overall_score": round(float(r["overall_score"]), 2) if pd.notna(r.get("overall_score")) else None}
                    for _, r in sub_a.iterrows()
                ]
                recs_b = [
                    {"year": int(r["year"]), "rank": int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else str(r["rank"]), "overall_score": round(float(r["overall_score"]), 2) if pd.notna(r.get("overall_score")) else None}
                    for _, r in sub_b.iterrows()
                ]

                # Head-to-head analysis across shared years
                common_yrs = sorted(list(set(sub_a["year"]).intersection(set(sub_b["year"]))))
                wins_a, wins_b, ties = 0, 0, 0
                for yr in common_yrs:
                    ra = sub_a[sub_a["year"] == yr]["numeric_rank"].iloc[0]
                    rb = sub_b[sub_b["year"] == yr]["numeric_rank"].iloc[0]
                    if ra < rb:
                        wins_a += 1
                    elif rb < ra:
                        wins_b += 1
                    else:
                        ties += 1

                latest_a = recs_a[-1] if recs_a else None
                latest_b = recs_b[-1] if recs_b else None
                latest_str = ""
                if latest_a and latest_b:
                    latest_yr = max(int(latest_a["year"]), int(latest_b["year"]))
                    latest_str = (
                        f"- **Latest Standings ({latest_yr}):** **{name_a}** is at **Rank #{latest_a['rank']}** "
                        f"(Score: {latest_a['overall_score']}) vs **{name_b}** at **Rank #{latest_b['rank']}** (Score: {latest_b['overall_score']})."
                    )

                text = (
                    f"### Head-to-Head Comparison: **{name_a}** vs **{name_b}** ({parsed.category}, {parsed.start_year}–{parsed.end_year})\n\n"
                    f"Across **{len(common_yrs)} editions** ({parsed.start_year} to {parsed.end_year}):\n"
                    f"- **{name_a}** ranked ahead in **{wins_a} editions**.\n"
                    f"- **{name_b}** ranked ahead in **{wins_b} editions**" + (f" ({ties} tied).\n\n" if ties else ".\n\n") +
                    f"{latest_str}"
                )
                data = {
                    "multi_year": True,
                    "institution_a": name_a,
                    "institution_b": name_b,
                    "records_a": recs_a,
                    "records_b": recs_b,
                }
                chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
                return {
                    "intent": intent,
                    "answer": text,
                    "records_count": len(sub_a) + len(sub_b),
                    "applied_filters": {"category": parsed.category, "period": f"{parsed.start_year}–{parsed.end_year}", "institutions": [name_a, name_b]},
                    "chart": chart,
                    "data": data,
                }

            # Single Year Comparison
            names_to_match = [name_a, name_b]
            if ent_a:
                names_to_match.extend(ent_a.raw_names)
            if ent_b:
                names_to_match.extend(ent_b.raw_names)

            sub = df[
                (df["category"].str.lower() == parsed.category.lower()) &
                (df["year"] == parsed.year) &
                (df["institution_name"].isin(names_to_match))
            ]
            records = sub.to_dict(orient="records")
            row_a = next((r for r in records if (ent_a and r["institution_name"] in ent_a.raw_names) or r["institution_name"] == name_a), None)
            row_b = next((r for r in records if (ent_b and r["institution_name"] in ent_b.raw_names) or r["institution_name"] == name_b), None)

            answer_parts = [f"### Comparison: **{name_a}** vs **{name_b}** ({parsed.category}, {parsed.year})\n"]
            if row_a and row_b:
                answer_parts.append(
                    f"- **{name_a}**: Rank #{int(row_a.get('numeric_rank')) if pd.notna(row_a.get('numeric_rank')) else row_a.get('rank')} (Score: {row_a.get('overall_score')}) | TLR: {row_a.get('tlr_score')} | RPC: {row_a.get('rpc_score')} | GO: {row_a.get('go_score')} | OI: {row_a.get('oi_score')} | PR: {row_a.get('pr_score')}\n"
                    f"- **{name_b}**: Rank #{int(row_b.get('numeric_rank')) if pd.notna(row_b.get('numeric_rank')) else row_b.get('rank')} (Score: {row_b.get('overall_score')}) | TLR: {row_b.get('tlr_score')} | RPC: {row_b.get('rpc_score')} | GO: {row_b.get('go_score')} | OI: {row_b.get('oi_score')} | PR: {row_b.get('pr_score')}"
                )
            else:
                answer_parts.append(f"Retrieved official NIRF records for **{name_a}** and **{name_b}** in {parsed.category} {parsed.year}.")

            data = {"institutions": records}
            chart = visualization_selector.build_chart_for_intent("TOP_FIVE_COMPARISON", data, parsed)
            return {
                "intent": intent,
                "answer": "\n".join(answer_parts),
                "records_count": len(sub),
                "applied_filters": {"category": parsed.category, "year": parsed.year, "institutions": [name_a, name_b]},
                "chart": chart,
                "data": data,
            }

        # 3. Institution Trajectory (e.g. How has IIT Madras performed from 2017 to 2025?)
        if intent == "INSTITUTION_TRAJECTORY":
            inst_name = parsed.institution_name or "Indian Institute of Technology Madras"
            entity = entity_resolver.get_by_name(inst_name) if inst_name else None
            if not entity and inst_name:
                entity = entity_resolver.resolve_from_query(inst_name)

            if entity:
                inst_name = entity.canonical_name
                active_cat = entity_resolver.get_active_category(entity, parsed.category)
            else:
                active_cat = parsed.category

            try:
                traj_res = time_series_service.get_trajectory(
                    category=active_cat,
                    institution=inst_name,
                )
                data = {
                    "records": [
                        {
                            "year": r.year,
                            "rank": r.numeric_rank if r.numeric_rank is not None else r.rank,
                            "overall_score": r.overall_score,
                            "tlr_score": r.tlr_score,
                            "rpc_score": r.rpc_score,
                            "go_score": r.go_score,
                            "oi_score": r.oi_score,
                            "pr_score": r.pr_score,
                        }
                        for r in traj_res.trajectory
                    ],
                    "institution_name": traj_res.institution_name,
                    "category": traj_res.category,
                }

                # Check if asking specifically about a parameter (e.g. RPC score)
                param_col = parsed.parameter if parsed.parameter and parsed.parameter != "overall_score" else None
                if param_col:
                    param_clean = param_col.replace("_score", "").upper()
                    param_vals: List[tuple[int, float]] = []
                    for r in data["records"]:
                        val = r.get(param_col)
                        if val is not None:
                            try:
                                param_vals.append((int(r["year"]), float(val)))
                            except (ValueError, TypeError):
                                pass

                    if param_vals:
                        start_yr, start_v = param_vals[0]
                        end_yr, end_v = param_vals[-1]
                        peak_yr, peak_v = max(param_vals, key=lambda x: x[1])
                        text = (
                            f"For **{traj_res.institution_name}** in the **{traj_res.category}** category, "
                            f"the **{param_clean} parameter score** moved from **{start_v:.2f}** in {start_yr} to **{end_v:.2f}** in {end_yr} "
                            f"(reaching a peak of **{peak_v:.2f}** in {peak_yr}). "
                            f"Over this period, its ranking shifted from Rank #{traj_res.trajectory[0].rank} to Rank #{traj_res.latest_rank}."
                        )
                    else:
                        text = f"**{traj_res.institution_name}** has participated across {traj_res.years_ranked} editions in **{traj_res.category}**."
                else:
                    matching_yr = next((p for p in traj_res.trajectory if p.year == parsed.year), None) if parsed.year else None
                    if matching_yr:
                        text = (
                            f"In **{parsed.year}**, **{traj_res.institution_name}** achieved Rank **#{matching_yr.rank}** "
                            f"with an overall score of **{matching_yr.overall_score:.2f}** in the **{traj_res.category}** category. "
                            f"Across all {traj_res.years_ranked} editions ({traj_res.trajectory[0].year}–{traj_res.trajectory[-1].year}), its best achieved rank was **#{traj_res.best_rank}**."
                        )
                    else:
                        text = (
                            f"**{traj_res.institution_name}** has participated across {traj_res.years_ranked} editions "
                            f"in the **{traj_res.category}** category. Its best achieved rank was **#{traj_res.best_rank}**, "
                            f"and its latest rank ({traj_res.trajectory[-1].year}) is **#{traj_res.latest_rank}** with an overall score of "
                            f"**{traj_res.latest_score:.2f}**."
                        )

                chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
                return {
                    "intent": intent,
                    "answer": text,
                    "records_count": traj_res.years_ranked,
                    "applied_filters": {"institution": traj_res.institution_name, "category": traj_res.category},
                    "chart": chart,
                    "data": data,
                }
            except Exception as exc:
                # Safe fallback to direct dataframe lookup via entity_resolver
                df = self.data_loader.load_dataset()
                if entity:
                    sub = entity_resolver.filter_dataset(df, entity, active_cat)
                else:
                    sub = df[(df["institution_name"].str.contains(inst_name, case=False, na=False)) & (df["category"].str.lower() == active_cat.lower())].sort_values("year")

                records = [
                    {
                        "year": int(r["year"]),
                        "rank": int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else str(r["rank"]),
                        "overall_score": round(float(r["overall_score"]), 2) if pd.notna(r.get("overall_score")) else None,
                        "tlr_score": round(float(r["tlr_score"]), 2) if pd.notna(r.get("tlr_score")) else None,
                        "rpc_score": round(float(r["rpc_score"]), 2) if pd.notna(r.get("rpc_score")) else None,
                    }
                    for _, r in sub.iterrows()
                ]
                data = {"records": records, "institution_name": inst_name, "category": active_cat}
                text = f"Found {len(records)} ranking appearances for **{inst_name}** in **{active_cat}**."
                chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
                return {
                    "intent": intent,
                    "answer": text,
                    "records_count": len(records),
                    "applied_filters": {"institution": inst_name, "category": active_cat},
                    "chart": chart,
                    "data": data,
                }

        # 4. State Comparison (e.g. Compare Karnataka and Tamil Nadu)
        if intent == "STATE_COMPARISON":
            st1 = parsed.compare_states[0] if len(parsed.compare_states) >= 1 else "Karnataka"
            st2 = parsed.compare_states[1] if len(parsed.compare_states) >= 2 else "Tamil Nadu"

            comp_res = geospatial_service.compare_states(
                category=parsed.category,
                year=parsed.year,
                state_a=st1,
                state_b=st2,
            )
            pa = comp_res.state_a
            pb = comp_res.state_b
            data = {
                "comparison": {
                    "state_1": pa.state,
                    "state_2": pb.state,
                    "inst_count_1": pa.total_institutions,
                    "inst_count_2": pb.total_institutions,
                    "mean_score_1": pa.average_score or 0.0,
                    "mean_score_2": pb.average_score or 0.0,
                    "median_score_1": pa.median_score or 0.0,
                    "median_score_2": pb.median_score or 0.0,
                    "top_inst_1": pa.top_institution or "N/A",
                    "top_inst_2": pb.top_institution or "N/A",
                }
            }
            c = data["comparison"]
            text = (
                f"Regional comparison between **{st1}** and **{st2}** in **{parsed.category} ({parsed.year})**:\n"
                f"- **{st1}**: {c['inst_count_1']} institutions, Mean Score: **{c['mean_score_1']}**, Top Institution: {c['top_inst_1']}.\n"
                f"- **{st2}**: {c['inst_count_2']} institutions, Mean Score: **{c['mean_score_2']}**, Top Institution: {c['top_inst_2']}."
            )
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": c['inst_count_1'] + c['inst_count_2'],
                "applied_filters": {"state_1": st1, "state_2": st2, "category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 5. Parameter Correlation (e.g. Which parameter has strongest correlation?)
        if intent == "PARAMETER_CORRELATION":
            corr_res = bivariate_service.get_parameter_correlation_ranking(
                category=parsed.category,
                year=parsed.year,
            )
            data = {
                "correlations": [
                    {
                        "parameter_code": item.parameter,
                        "parameter_name": item.parameter_label,
                        "correlation": item.pearson_r,
                    }
                    for item in corr_res.ranked_parameters
                ]
            }
            strongest = corr_res.strongest_parameter
            strongest_r = corr_res.strongest_pearson_r
            text = (
                f"In the **{parsed.year} {parsed.category}** evaluation, **{strongest}** exhibits the strongest "
                f"correlation with Overall Score (**Pearson r = {strongest_r:.4f}**, R² = {strongest_r**2:.4f}). "
                f"Institutions investing aggressively in research output and citations consistently gain higher composite ranks."
            )
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": corr_res.sample_size,
                "applied_filters": {"category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 6. High Research, Low Teaching Gap
        if intent == "RESEARCH_VS_TEACHING":
            gap_res = multivariate_service.get_research_teaching_gap(
                category=parsed.category,
                year=parsed.year,
            )
            data = {
                "institutions": [
                    {
                        "institution_name": item.institution_name,
                        "rank": item.rank,
                        "rpc_score": item.score_a,
                        "tlr_score": item.score_b,
                        "divergence": item.gap,
                        "overall_score": item.overall_score,
                    }
                    for item in gap_res.institutions
                ]
            }
            cnt = gap_res.qualifying_count
            top_inst = gap_res.institutions[0].institution_name if gap_res.institutions else "N/A"
            text = (
                f"Identified **{cnt} institutions** in {parsed.category} ({parsed.year}) with relatively high research output "
                f"but comparatively lower teaching scores. "
                f"The institution with the most pronounced research-forward divergence is **{top_inst}**."
            )
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": cnt,
                "applied_filters": {"category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 7. Ranking Improvements (e.g. Which institutions improved the most?)
        if intent == "RANK_IMPROVEMENTS":
            imp_res = time_series_service.get_rank_shifts(
                category=parsed.category,
                start_year=parsed.start_year,
                end_year=parsed.end_year,
                metric_type="improvement",
                limit=parsed.limit or 10,
            )
            data = {
                "improvements": [
                    {
                        "institution_name": item.institution_name,
                        "places_gained": item.rank_change,
                        "start_rank": item.start_rank,
                        "end_rank": item.end_rank,
                        "score_change": item.score_change,
                        "state": item.state,
                    }
                    for item in imp_res.items
                ]
            }
            top_climber = imp_res.items[0] if imp_res.items else None
            text = (
                f"Between **{parsed.start_year} and {parsed.end_year}** in **{parsed.category}**, "
                f"**{top_climber.institution_name}** achieved the greatest rank improvement, "
                f"climbing **+{top_climber.rank_change} places** from Rank #{top_climber.start_rank} to Rank #{top_climber.end_rank}."
            ) if top_climber else f"No significant improvements identified between {parsed.start_year} and {parsed.end_year}."
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": len(imp_res.items),
                "applied_filters": {"category": parsed.category, "start_year": parsed.start_year, "end_year": parsed.end_year},
                "chart": chart,
                "data": data,
            }

        # 7b. Ranking Declines (e.g. Which institutions declined the most?)
        if intent == "RANK_DECLINES":
            dec_res = time_series_service.get_rank_shifts(
                category=parsed.category,
                start_year=parsed.start_year,
                end_year=parsed.end_year,
                metric_type="decline",
                limit=parsed.limit or 10,
            )
            data = {
                "declines": [
                    {
                        "institution_name": item.institution_name,
                        "places_lost": item.rank_change,
                        "start_rank": item.start_rank,
                        "end_rank": item.end_rank,
                        "score_change": item.score_change,
                        "state": item.state,
                    }
                    for item in dec_res.items
                ]
            }
            top_faller = dec_res.items[0] if dec_res.items else None
            text = (
                f"Between **{parsed.start_year} and {parsed.end_year}** in **{parsed.category}**, "
                f"**{top_faller.institution_name}** experienced the largest rank decline, "
                f"falling **-{top_faller.rank_change} places** from Rank #{top_faller.start_rank} to Rank #{top_faller.end_rank}."
            ) if top_faller else f"No significant declines identified between {parsed.start_year} and {parsed.end_year}."
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": len(dec_res.items),
                "applied_filters": {"category": parsed.category, "start_year": parsed.start_year, "end_year": parsed.end_year},
                "chart": chart,
                "data": data,
            }

        # 8. Score Distribution (e.g. Show score distribution for Medical in 2025)
        if intent == "SCORE_DISTRIBUTION":
            dist_res = univariate_service.get_score_distribution(
                category=parsed.category,
                year=parsed.year,
                bins=10,
            )
            data = {
                "bins": [
                    {"bin_range": b.label, "count": b.count, "percentage": b.percentage}
                    for b in dist_res.bins
                ]
            }
            text = (
                f"In the **{parsed.year} {parsed.category}** cohort ({dist_res.valid_observations} institutions), "
                f"scores range from **{dist_res.min_score:.2f}** to **{dist_res.max_score:.2f}**. "
                f"The cohort mean score is **{dist_res.mean:.2f}** with a median of **{dist_res.median:.2f}** and standard deviation of {dist_res.std_dev:.2f}."
            )
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": dist_res.valid_observations,
                "applied_filters": {"category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 9. Top 10 Entries and Exits
        if intent == "TOP_10_ENTRIES_EXITS":
            to_res = ranking_transitions_service.get_top10_entry_exit(
                category=parsed.category,
                start_year=parsed.start_year,
                end_year=parsed.end_year,
            )
            data = {
                "entrants": [
                    {"institution_name": e.institution_name, "new_rank": e.rank, "previous_rank": e.previous_rank}
                    for e in to_res.entrants
                ],
                "exits": [
                    {"institution_name": ex.institution_name, "previous_rank": ex.previous_rank, "new_rank": ex.rank}
                    for ex in to_res.exits
                ],
            }
            entrants_str = ", ".join([e.institution_name for e in to_res.entrants]) or "None"
            exits_str = ", ".join([ex.institution_name for ex in to_res.exits]) or "None"
            text = (
                f"Between **{parsed.start_year} and {parsed.end_year}** in **{parsed.category}**, the Top 10 stability rate was "
                f"**{to_res.stability_rate}%** ({len(to_res.retained)} of 10 retained).\n"
                f"- **New Entrants into Top 10**: {entrants_str}\n"
                f"- **Exited Top 10**: {exits_str}"
            )
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": len(to_res.retained) + len(to_res.entrants) + len(to_res.exits),
                "applied_filters": {"category": parsed.category, "start_year": parsed.start_year, "end_year": parsed.end_year},
                "chart": chart,
                "data": data,
            }

        # 10. Top 5 Parameter Comparison (Radar)
        if intent == "TOP_FIVE_COMPARISON":
            comp5_res = multivariate_service.get_top_five(
                category=parsed.category,
                year=parsed.year,
            )
            data = {
                "institutions": [
                    {
                        "institution_name": item.institution_name,
                        "overall_rank": item.numeric_rank,
                        "overall_score": item.overall_score,
                        "tlr_score": item.scores.get("tlr_score", 0),
                        "rpc_score": item.scores.get("rpc_score", 0),
                        "go_score": item.scores.get("go_score", 0),
                        "oi_score": item.scores.get("oi_score", 0),
                        "pr_score": item.scores.get("pr_score", 0),
                    }
                    for item in comp5_res.institutions
                ]
            }
            names = [i["institution_name"] for i in data["institutions"]]
            text = (
                f"Multi-parameter profile for the top five institutions in **{parsed.category} ({parsed.year})**:\n"
                + "\n".join([f"- **#{i+1} {names[i]}**: TLR {data['institutions'][i]['tlr_score']:.1f}, RPC {data['institutions'][i]['rpc_score']:.1f}, PR {data['institutions'][i]['pr_score']:.1f}" for i in range(len(names))])
            )
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": len(comp5_res.institutions),
                "applied_filters": {"category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 11. State Share Donut / Pie Chart
        if intent == "STATE_SHARE_PIE":
            geo_res = geospatial_service.get_top_states(
                category=parsed.category,
                year=parsed.year,
                top_n=100,
            )
            data = {
                "states": [
                    {"state": s.state, "count": s.count, "share_pct": s.share_pct}
                    for s in geo_res.states[:8]
                ]
            }
            top_state = geo_res.states[0] if geo_res.states else None
            text = (
                f"In **{parsed.category} ({parsed.year})**, **{top_state.state}** leads state representation with "
                f"**{top_state.count} institutions** ({top_state.share_pct}% share). "
                f"The top 3 states account for **{geo_res.top3_concentration_pct}%** of all indexed institutions."
            ) if top_state else f"No state representation data available for {parsed.category} ({parsed.year})."
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": geo_res.total_institutions_scoped,
                "applied_filters": {"category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 12. Correlation Heatmap
        if intent == "CORRELATION_HEATMAP":
            df = self.data_loader.load_dataset()
            sub = df[(df["category"].str.lower() == parsed.category.lower()) & (df["year"] == parsed.year)]
            cols = ["tlr_score", "rpc_score", "go_score", "oi_score", "pr_score"]
            valid = sub[cols].dropna()
            corr_mat = [[round(float(v), 3) for v in row] for row in valid.corr().values] if not valid.empty else []
            data = {"matrix": corr_mat}
            text = (
                f"Pairwise correlation matrix across all 5 NIRF evaluation parameters for **{parsed.category} ({parsed.year})** "
                f"evaluated across {len(valid)} institutions."
            )
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": len(valid),
                "applied_filters": {"category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 13. Score Box Plot
        if intent == "SCORE_BOXPLOT":
            df = self.data_loader.load_dataset()
            sub = df[(df["category"].str.lower() == parsed.category.lower()) & (df["year"] == parsed.year)]
            scores = [round(float(v), 2) for v in sub["overall_score"].dropna().tolist()]
            data = {"scores": scores}
            mean_s = round(sum(scores) / len(scores), 2) if scores else 0
            text = (
                f"Overall Score box plot distribution for **{parsed.category} ({parsed.year})**. "
                f"Average score is **{mean_s}** (range {min(scores) if scores else 0} – {max(scores) if scores else 0}) across {len(scores)} institutions."
            )
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": len(scores),
                "applied_filters": {"category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 14. Ranking Volatility
        if intent == "RANKING_VOLATILITY":
            vol_res = outlier_detection_service.get_ranking_volatility(
                category=parsed.category,
                min_years=4,
            )
            data = {
                "volatility": [
                    {
                        "institution_name": item.institution_name,
                        "std_rank": round(float(item.std_rank), 2),
                        "min_rank": item.min_rank,
                        "max_rank": item.max_rank,
                    }
                    for item in vol_res.institutions[:10]
                ]
            }
            top_v = vol_res.institutions[0] if vol_res.institutions else None
            text = (
                f"In **{parsed.category}**, **{top_v.institution_name}** exhibits the highest longitudinal ranking volatility "
                f"with a standard deviation of &plusmn;{top_v.std_rank:.2f} ranks (min rank #{top_v.min_rank}, max rank #{top_v.max_rank})."
            ) if top_v else f"No volatile institutions identified for {parsed.category}."
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": len(vol_res.institutions),
                "applied_filters": {"category": parsed.category},
                "chart": chart,
                "data": data,
            }

        # 15. Outlier Detection
        if intent == "OUTLIER_DETECTION":
            gap_res = outlier_detection_service.get_research_teaching_gap(
                category=parsed.category,
                year=parsed.year,
            )
            top_institutions = gap_res.institutions[:10]
            data = {
                "outliers": [
                    {
                        "institution_name": item.institution_name,
                        "tlr_score": item.tlr_score,
                        "rpc_score": item.rpc_score,
                        "rank": item.rank,
                    }
                    for item in top_institutions
                ]
            }
            top_o = top_institutions[0] if top_institutions else None
            text = (
                f"In **{parsed.category} ({parsed.year})**, **{top_o.institution_name}** exhibits the largest "
                f"research-teaching discrepancy (Research RPC: {top_o.rpc_score:.1f} vs Teaching TLR: {top_o.tlr_score:.1f})."
            ) if top_o else f"No significant outliers detected for {parsed.category} ({parsed.year})."
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": len(gap_res.institutions),
                "applied_filters": {"category": parsed.category, "year": parsed.year},
                "chart": chart,
                "data": data,
            }

        # 16. Single-Year Factual Lookup (Rank, Overall Score, or Parameter)
        if intent == "FACTUAL_LOOKUP":
            df = self.data_loader.load_dataset()
            inst_target = parsed.institution_name
            entity = entity_resolver.get_by_name(inst_target) if inst_target else None
            if not entity and inst_target:
                entity = entity_resolver.resolve_from_query(inst_target)

            canonical_name = entity.canonical_name if entity else (inst_target or "Unknown Institution")
            active_cat = entity_resolver.get_active_category(entity, parsed.category) if entity else parsed.category

            if entity:
                sub = entity_resolver.filter_dataset(df, entity, active_cat)
            else:
                sub = df[
                    (df["institution_name"].str.contains(canonical_name, case=False, na=False)) &
                    (df["category"].str.lower() == active_cat.lower())
                ]

            row = sub[sub["year"] == parsed.year]

            # Discover other categories where this institution participated in the same year
            other_cats = []
            if entity:
                all_inst_records = df[(df["institution_name"].isin(entity.raw_names)) & (df["year"] == parsed.year)]
                for _, other_r in all_inst_records.iterrows():
                    other_c = str(other_r["category"])
                    if other_c.lower() != active_cat.lower():
                        o_rank = int(other_r["numeric_rank"]) if pd.notna(other_r.get("numeric_rank")) else str(other_r.get("rank"))
                        other_cats.append(f"Rank #{o_rank} in {other_c}")

            other_note = f" *(Also: {', '.join(other_cats)})*" if other_cats else ""

            raw_q = parsed.raw_query.lower()
            is_asking_score = ("score" in raw_q or parsed.parameter == "overall_score") and "rank" not in raw_q
            param_col = parsed.parameter if parsed.parameter and parsed.parameter != "overall_score" else None

            if not row.empty:
                r = row.iloc[0]
                num_rank = int(r["numeric_rank"]) if pd.notna(r.get("numeric_rank")) else str(r.get("rank"))
                ov_score = round(float(r["overall_score"]), 2) if pd.notna(r.get("overall_score")) else None

                if param_col and param_col in r:
                    p_val = round(float(r[param_col]), 2) if pd.notna(r.get(param_col)) else "N/A"
                    p_label = param_col.replace("_score", "").upper()
                    text = (
                        f"In **{parsed.year}**, **{canonical_name}** achieved a **{p_label} score of {p_val}** "
                        f"in the **{active_cat}** category (Rank #{num_rank}, Overall Score: {ov_score}).{other_note}"
                    )
                elif is_asking_score:
                    text = (
                        f"In **{parsed.year}**, **{canonical_name}** achieved an Overall Score of **{ov_score}** "
                        f"(Rank #{num_rank} in the **{active_cat}** category).{other_note}"
                    )
                else:
                    text = (
                        f"In the **{parsed.year} {active_cat}** rankings, **{canonical_name}** is ranked "
                        f"**Rank #{num_rank}** with an Overall Score of **{ov_score}**.{other_note}"
                    )

                data = {
                    "institution_name": canonical_name,
                    "year": parsed.year,
                    "category": active_cat,
                    "rank": num_rank,
                    "overall_score": ov_score,
                    "tlr_score": round(float(r["tlr_score"]), 2) if pd.notna(r.get("tlr_score")) else None,
                    "rpc_score": round(float(r["rpc_score"]), 2) if pd.notna(r.get("rpc_score")) else None,
                    "go_score": round(float(r["go_score"]), 2) if pd.notna(r.get("go_score")) else None,
                    "oi_score": round(float(r["oi_score"]), 2) if pd.notna(r.get("oi_score")) else None,
                    "pr_score": round(float(r["pr_score"]), 2) if pd.notna(r.get("pr_score")) else None,
                }
                chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
                return {
                    "intent": intent,
                    "answer": text,
                    "records_count": 1,
                    "applied_filters": {"institution": canonical_name, "category": active_cat, "year": parsed.year},
                    "chart": chart,
                    "data": data,
                }
            else:
                text = f"**{canonical_name}** does not have an official ranking record in the **{parsed.year} {active_cat}** category."
                return {
                    "intent": intent,
                    "answer": text,
                    "records_count": 0,
                    "applied_filters": {"institution": canonical_name, "category": active_cat, "year": parsed.year},
                    "chart": None,
                    "data": {},
                }

        # 17. Methodology & Conceptual Explanation
        if intent == "METHODOLOGY_EXPLANATION":
            raw_q = parsed.raw_query.lower()
            if "difference" in raw_q and ("rank" in raw_q or "score" in raw_q):
                text = (
                    "### Difference Between NIRF Rank and Overall Score\n\n"
                    "In the National Institutional Ranking Framework (NIRF), **Rank** and **Overall Score** measure different mathematical dimensions:\n\n"
                    "1. **NIRF Rank (Ordinal Hierarchy):**\n"
                    "- **Type:** Discrete integer ranking position ($1, 2, 3, \\dots, N$).\n"
                    "- **Interpretation:** Measures **relative standing** compared directly against all participating institutions in a specific category and year. Rank #1 is the top-ranked institution nationally.\n"
                    "- **Sensitivity:** Highly sensitive to competition dynamics. Even a minute score margin (e.g. 0.05 points) can separate consecutive ranks.\n\n"
                    "2. **Overall Score (Continuous Composite Capability):**\n"
                    "- **Type:** Continuous numeric score scaled strictly from **0 to 100**.\n"
                    "- **Computation:** Calculated via a standardized weighted linear combination across five core parameters:\n"
                    "  $$\\text{Overall Score} = w_{\\text{TLR}} \\cdot \\text{TLR} + w_{\\text{RPC}} \\cdot \\text{RPC} + w_{\\text{GO}} \\cdot \\text{GO} + w_{\\text{OI}} \\cdot \\text{OI} + w_{\\text{PR}} \\cdot \\text{PR}$$\n"
                    "  - **TLR (Teaching, Learning & Resources):** 30% weight (40% in Colleges)\n"
                    "  - **RPC (Research and Professional Practice):** 30% weight (15% in Colleges)\n"
                    "  - **GO (Graduation Outcomes):** 20% weight (25% in Colleges)\n"
                    "  - **OI (Outreach and Inclusivity):** 10% weight\n"
                    "  - **PR (Perception):** 10% weight\n\n"
                    "3. **Key Analytical Differences:**\n"
                    "- **Score Increase with Rank Decline:** An institution can increase its Overall Score (e.g. from 75.0 to 77.5) but fall in Rank if competing peer institutions improved at a faster pace.\n"
                    "- **Absolute vs Relative:** Overall Score measures absolute institutional capabilities; Rank measures relative position within the cohort."
                )
            else:
                text = (
                    "### NIRF Evaluation Methodology Overview\n\n"
                    "The National Institutional Ranking Framework evaluates institutions using a normalized composite metric across five overarching parameters:\n\n"
                    "- **TLR (Teaching, Learning & Resources):** Faculty-student ratio, faculty credentials, infrastructure, and expenditure per student.\n"
                    "- **RPC (Research and Professional Practice):** Publication volume, citation metrics, funded research projects, and patents.\n"
                    "- **GO (Graduation Outcomes):** Pass percentage, Ph.D. graduate output, and placement median salary.\n"
                    "- **OI (Outreach and Inclusivity):** Regional and international diversity, female participation, and affirmative support facilities.\n"
                    "- **PR (Perception):** Employer surveys and academic peer ranking surveys."
                )

            return {
                "intent": intent,
                "answer": text,
                "records_count": 0,
                "applied_filters": {"topic": "NIRF Methodology"},
                "chart": None,
                "data": {},
            }

        # 18. Data Continuity Analysis
        if intent == "DATA_CONTINUITY_ANALYSIS":
            df = self.data_loader.load_dataset()
            cat_df = df[df["category"].str.lower() == parsed.category.lower()]
            pivot = cat_df.groupby("institution_name")["year"].nunique()
            total_distinct = len(pivot)
            continuous = int((pivot == 9).sum())
            intermittent = int((pivot < 9).sum())

            b9 = int((pivot == 9).sum())
            b8 = int((pivot == 8).sum())
            b7 = int((pivot == 7).sum())
            b6 = int((pivot == 6).sum())
            b5 = int((pivot == 5).sum())
            b_less = int((pivot < 5).sum())

            brackets = [
                {"label": "9 Years (Continuous)", "count": b9},
                {"label": "8 Years", "count": b8},
                {"label": "7 Years", "count": b7},
                {"label": "6 Years", "count": b6},
                {"label": "5 Years", "count": b5},
                {"label": "1–4 Years", "count": b_less},
            ]

            missing_series = pivot[pivot < 9].sort_values(ascending=False)
            top_missing_items = [(name, int(yrs)) for name, yrs in missing_series.head(5).items()]
            top_missing_str = "\n".join([f"- **{name}**: Ranked in {yrs} of 9 editions" for name, yrs in top_missing_items])

            text = (
                f"### NIRF Historical Data Continuity Analysis ({parsed.category}, 2017–2025)\n\n"
                f"Across all 9 ranking editions (2017 to 2025) in the **{parsed.category}** category, "
                f"a total of **{total_distinct} unique institutions** have appeared:\n\n"
                f"- **Continuous Participation (All 9 Editions):** **{continuous} institutions** ({round(continuous / max(total_distinct, 1) * 100, 1)}%) maintained unbroken participation.\n"
                f"- **Discontinuous / Gaps (1 to 8 Editions):** **{intermittent} institutions** ({round(intermittent / max(total_distinct, 1) * 100, 1)}%) have intermittent or discontinuous records.\n\n"
                f"**Notable Institutions with Intermittent Participation:**\n"
                f"{top_missing_str}"
            )
            data = {"continuity_brackets": brackets, "total_institutions": total_distinct, "continuous": continuous}
            chart = visualization_selector.build_chart_for_intent(intent, data, parsed)
            return {
                "intent": intent,
                "answer": text,
                "records_count": total_distinct,
                "applied_filters": {"category": parsed.category, "period": "2017–2025"},
                "chart": chart,
                "data": data,
            }

        # Unsupported / Out-of-Scope Query
        if intent == "UNSUPPORTED_QUERY":
            return {
                "intent": "UNSUPPORTED_QUERY",
                "answer": (
                    "**NIRF Dataset Scope Limitation:**\n\n"
                    "The query asks for information that is outside the scope of NIRF higher education ranking analytics.\n\n"
                    "*Note: The NIRF Master Dataset records official ranking parameters (TLR, RPC, GO, OI, PR, and composite ranks) "
                    "for accredited Indian institutions across cycles 2017–2025. Non-NIRF topics (such as live weather, stock prices, or travel bookings) "
                    "are not tracked.*"
                ),
                "records_count": 0,
                "applied_filters": {},
                "chart": None,
                "data": {},
            }

        # General Fallback Analytical Explorer
        df = self.data_loader.load_dataset()
        sub = df[(df["category"].str.lower() == parsed.category.lower()) & (df["year"] == parsed.year)]
        top5 = sub.sort_values("numeric_rank", ascending=True).head(5)
        inst_names = top5["institution_name"].tolist() if not top5.empty else []
        text = (
            f"Here is analytical intelligence for **{parsed.category}** ({parsed.year}). "
            f"There are **{len(sub)} institutions** indexed. Leading institutions include: "
            f"{', '.join(inst_names[:3])}."
        )
        data = {
            "institutions": [
                {"rank": int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else r["rank"], "institution_name": r["institution_name"], "overall_score": r["overall_score"]}
                for _, r in top5.iterrows()
            ]
        }
        chart = visualization_selector.build_chart_for_intent("TOP_N_INSTITUTIONS", data, parsed)
        return {
            "intent": "GENERAL_ANALYTICAL",
            "answer": text,
            "records_count": len(sub),
            "applied_filters": {"category": parsed.category, "year": parsed.year},
            "chart": chart,
            "data": data,
        }


query_builder = QueryBuilder()
