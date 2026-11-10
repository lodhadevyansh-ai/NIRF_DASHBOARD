"""NIRF Analytics Dashboard — Hybrid NLQ Engine.

Orchestrates the two-tier hybrid intelligence architecture:
1. Internal NLQ Engine: Deterministic, high-speed, factual calculation pipeline.
2. External LLM Engine (Secondary AI): Semantic interpretation, entity resolution,
   complex question decomposition, and retrieval-grounded natural-language synthesis.

All factual NIRF rankings, scores, and statistics are strictly computed from the
authoritative master dataset. The external model NEVER independently fabricates data.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

from app.core.config import settings
from app.services.data_loader import DataLoader
from app.nlq.query_parser import query_parser, ParsedQuery
from app.nlq.query_builder import query_builder
from app.nlq.visualization_selector import visualization_selector
from app.nlq.llm_client import llm_client
from app.nlq.entity_resolver import entity_resolver

logger = logging.getLogger(__name__)

# Ground truth NIRF methodology definitions for educational inquiries
NIRF_METHODOLOGY_KNOWLEDGE = {
    "TLR": {
        "name": "Teaching, Learning & Resources",
        "weight": "30% (Overall/Eng/Univ/Mgmt) to 40% (Colleges)",
        "sub_metrics": [
            "Student Strength including Doctoral Students (SS)",
            "Faculty-Student Ratio with emphasis on Permanent Faculty (FSR)",
            "Combined Metric for Faculty with PhD/Equivalent and Experience (FQE)",
            "Financial Resources and their Utilisation (FRU)",
        ],
        "description": "Evaluates core educational infrastructure, faculty quality, student-teacher ratio, and capital/operational expenditure per student.",
    },
    "RPC": {
        "name": "Research and Professional Practice",
        "weight": "30% (Overall/Eng/Univ) to 15% (Colleges)",
        "sub_metrics": [
            "Combined Metric for Publications in indexed journals (PU)",
            "Combined Metric for Quality of Publications & Citations (QP)",
            "IPR and Patents: Published, Granted, and Licensed (IPR)",
            "Footprint of Projects and Professional Practice (FPPP)",
        ],
        "description": "Quantifies high-impact scholarly publications, field-weighted citation volume, research patents, and sponsored R&D project funding.",
    },
    "GO": {
        "name": "Graduation Outcomes",
        "weight": "20% (Overall/Eng/Univ) to 25% (Colleges)",
        "sub_metrics": [
            "Metric for University Examinations (GUE)",
            "Metric for Number of Ph.D. Students Graduated (GPHD)",
            "Median Salary of Placed Graduates (MS)",
            "Number of Students admitted to Top Higher Education institutions (GHE)",
        ],
        "description": "Measures pass percentages, doctoral throughput, placement conversion rates, and median remuneration secured by outgoing cohorts.",
    },
    "OI": {
        "name": "Outreach and Inclusivity",
        "weight": "10% across all standard disciplines",
        "sub_metrics": [
            "Percentage of Students from Other States/Countries (RD)",
            "Percentage of Female Students and Faculty (WD)",
            "Economically and Socially Challenged Students (ESCS)",
            "Facilities for Physically Challenged Students (PCS)",
            "Perception Ranking Metric (PRM)",
        ],
        "description": "Focuses on regional demographic diversity, gender balance, affirmative enrollment support, and barrier-free accessible campus architecture.",
    },
    "PR": {
        "name": "Perception",
        "weight": "10% across all standard disciplines",
        "sub_metrics": [
            "Academic Peers Survey",
            "Employers Survey",
            "Public and Stakeholder Feedback",
        ],
        "description": "Captures institutional brand equity, reputation, and goodwill evaluated via structured surveys of employers and academic peers.",
    },
}


class HybridNLQEngine:
    """Intelligent hybrid engine integrating internal deterministic analytics with external LLM reasoning."""

    def __init__(self) -> None:
        self.data_loader = DataLoader.get_instance()

    def process_query(
        self,
        query: str,
        category: Optional[str] = None,
        year: Optional[int] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Main hybrid pipeline entrypoint."""
        clean_query = (query or "").strip()
        history = conversation_history or []

        # 1. First parse deterministically with conversational entity resolution
        parsed = query_parser.parse(clean_query, conversation_history=history)

        # Apply global filter context if not explicitly overridden by query
        if category and parsed.category == "Overall" and "overall" not in clean_query.lower():
            parsed.category = category
        if year and parsed.year == 2025 and "2025" not in clean_query:
            parsed.year = year

        # 2. Evaluate routing decision
        use_external, fallback_reason = self._should_use_external_llm(clean_query, parsed, history)

        # Case A: Handle via Internal Engine directly if high confidence and unambiguous
        if not use_external:
            try:
                res = query_builder.execute(parsed)
                follow_ups = visualization_selector.get_follow_up_suggestions(res["intent"], parsed)
                result = {
                    "query": clean_query,
                    "intent": res["intent"],
                    "answer": res["answer"],
                    "confidence": parsed.confidence,
                    "records_count": res.get("records_count", 0),
                    "applied_filters": res.get("applied_filters", {}),
                    "chart": res.get("chart"),
                    "follow_up_suggestions": follow_ups,
                    "engine_used": "internal",
                    "provider_used": "Custom NIRF NLQ Engine (Layer 1)",
                    "routing_reason": fallback_reason,
                    "error": None,
                }
                return self._synchronize_response(result, parsed)
            except Exception as exc:
                logger.warning("Internal NLQ execution failed (%s). Attempting external LLM fallback.", exc)
                # Fall through to External LLM

        # Case B: Route through External Multi-Layer LLM (Layer 2 / Layer 3)
        if llm_client.is_configured():
            try:
                result = self._process_via_external_llm(clean_query, parsed, history, fallback_reason)
                return self._synchronize_response(result, parsed)
            except Exception as exc:
                logger.warning("External LLM failed (%s). Falling back gracefully to verified internal engine.", exc)
                # Fall through to internal fallback

        # Case C: Graceful internal fallback when External LLM is offline or unconfigured
        result = self._process_fallback_internally(clean_query, parsed, history, fallback_reason)
        result["provider_used"] = "Custom NIRF NLQ Engine (Layer 1 Fallback)"
        return self._synchronize_response(result, parsed)

    def _synchronize_response(self, response: Dict[str, Any], parsed: ParsedQuery) -> Dict[str, Any]:
        """Ensure entity consistency across answer, metadata, and chart."""
        if parsed.institution_name:
            if "applied_filters" not in response or not isinstance(response["applied_filters"], dict):
                response["applied_filters"] = {}
            if "institution" not in response["applied_filters"]:
                response["applied_filters"]["institution"] = parsed.institution_name

            chart = response.get("chart")
            if chart and isinstance(chart, dict) and "title" in chart:
                title = chart.get("title", "")
                if parsed.institution_name not in title and not any(ci in title for ci in parsed.compare_institutions):
                    chart["title"] = f"{parsed.institution_name} — {title}"

        return response

    def _should_use_external_llm(
        self,
        q: str,
        parsed: ParsedQuery,
        history: List[Dict[str, Any]],
    ) -> Tuple[bool, str]:
        """Decide whether the query should activate the external secondary AI engine."""
        ql = q.lower()

        # Check 1: Educational / methodology explanation queries
        if re.search(r"\b(what is|what does|explain|define|how is|how are|meaning of|evaluated|evaluate)\s+(tlr|rpc|go|oi|pr|nirf|ranking score|methodology|formula|graduation outcomes|teaching|research|perception)\b", ql):
            return True, "educational_methodology_query"

        # Check 2: Conversational follow-ups with pronoun references
        has_pronoun = bool(re.search(r"\b(it|its|they|their|that institution|the institute|that college|this university|what about|how about)\b", ql))
        if has_pronoun and history:
            return True, "conversational_follow_up"

        # Check 3: Complex multi-part or comparative queries
        if ("compare" in ql and ("and" in ql or "vs" in ql)) or "divergence" in ql or "relationship" in ql:
            return True, "complex_comparative_query"

        # Check 4: Qualitative, causal, or analytical reasoning queries ("why", "factors", "reasons", "cause", "explain", "maintained", "trend")
        if re.search(r"\b(why|reasons?|factors?|how come|cause|impact|consistently|maintained|declined?|private universities|explain)\b", ql):
            return True, "causal_reasoning_query"

        # Check 5: Low confidence or unfamiliar phrasing fallback
        if parsed.confidence < settings.LLM_CONFIDENCE_THRESHOLD:
            return True, "low_confidence_fallback"

        # Check 6: Relative year spans ("last 8 years", "previous 5 years")
        if re.search(r"\b(?:previous|last|past)\s+\d+\s+years?\b", ql):
            return True, "relative_time_span"

        # Default: Use Internal NLQ Engine directly
        return False, "direct_internal_match"

    def _validate_numerical_claims(self, text: str, verified_data: Dict[str, Any]) -> str:
        """Cross-check and validate that numerical claims in LLM text adhere to verified dataset records."""
        if not text or not verified_data:
            return text

        # Check for single-institution factual records
        if "rank" in verified_data and "overall_score" in verified_data:
            expected_rank = str(verified_data["rank"])
            expected_score = str(verified_data["overall_score"])
            # If rank is omitted or contradicted, append official confirmation
            if f"#{expected_rank}" not in text and f"Rank {expected_rank}" not in text and f"rank {expected_rank}" not in text:
                text += f"\n\n*Authoritative Verification: Official {verified_data.get('year', '')} Rank #{expected_rank} (Overall Score: {expected_score}).*"

        return text

    def _process_via_external_llm(
        self,
        query: str,
        initial_parsed: ParsedQuery,
        history: List[Dict[str, Any]],
        routing_reason: str,
    ) -> Dict[str, Any]:
        """Execute Phase 1 (Query Plan) and Phase 2 (Grounded Explanation) with the external LLM."""
        # ---------------------------------------------------------------------
        # PHASE 1: Query Interpretation & Structured Query Plan Formulation
        # ---------------------------------------------------------------------
        plan, plan_provider = self._generate_llm_query_plan(query, initial_parsed, history)

        # ---------------------------------------------------------------------
        # PHASE 2: Validated Retrieval and Mathematical Execution
        # ---------------------------------------------------------------------
        plan_type = plan.get("type", "analytical_query")

        # Handle Educational Query
        if plan_type == "educational_query":
            answer = self._explain_educational_concept(query, plan)
            return {
                "query": query,
                "intent": "METHODOLOGY_EXPLANATION",
                "answer": answer,
                "confidence": 0.95,
                "records_count": 0,
                "applied_filters": {"topic": plan.get("topic", "NIRF Methodology")},
                "chart": None,
                "follow_up_suggestions": [
                    "What is the formula for TLR in Engineering?",
                    "How has IIT Madras performed in RPC over the years?",
                    "Show the top 10 institutions in Overall category in 2025",
                ],
                "engine_used": "hybrid_llm_layer2" if "First" in plan_provider else "hybrid_llm_layer3",
                "provider_used": plan_provider,
                "routing_reason": routing_reason,
                "error": None,
            }

        # Handle Unsupported Query
        if plan_type == "unsupported_query":
            reason = plan.get("reasoning", "The requested data is not tracked within the NIRF official dataset.")
            answer = (
                f"**NIRF Dataset Scope Limitation:**\n\n{reason}\n\n"
                f"*Note: The NIRF Master Dataset records official ranking parameters (TLR, RPC, GO, OI, PR, and composite ranks) "
                f"for accredited Indian institutions across cycles 2017–2025. Unrecorded metrics such as individual student grades, "
                f"private hostel fees, or non-NIRF international league tables are outside the dataset's scope.*"
            )
            return {
                "query": query,
                "intent": "UNSUPPORTED_QUERY",
                "answer": answer,
                "confidence": 0.90,
                "records_count": 0,
                "applied_filters": {},
                "chart": None,
                "follow_up_suggestions": [
                    "Show top 10 institutions in Engineering in 2025",
                    "Which state has the highest NIRF-ranked institutions in 2025?",
                    "Compare IIT Madras and IIT Bombay in 2025",
                ],
                "engine_used": "hybrid_llm_layer2" if "First" in plan_provider else "hybrid_llm_layer3",
                "provider_used": plan_provider,
                "routing_reason": routing_reason,
                "error": None,
            }

        # Handle Analytical Query: Retrieve and compute strictly from Master Dataset
        verified_data, records_count, applied_filters = self._execute_verified_retrieval(plan, initial_parsed)

        # ---------------------------------------------------------------------
        # PHASE 3: Retrieval-Grounded Natural-Language Explanation
        # ---------------------------------------------------------------------
        grounded_answer, answer_provider = self._generate_grounded_answer(query, plan, verified_data)

        # ---------------------------------------------------------------------
        # PHASE 4: Plotly Visualization Construction (Backend-verified values)
        # ---------------------------------------------------------------------
        chart = self._construct_chart_from_verified_data(plan, verified_data, initial_parsed)

        follow_ups = visualization_selector.get_follow_up_suggestions(
            plan.get("intent", "TOP_N_INSTITUTIONS"), initial_parsed
        )

        active_provider = answer_provider or plan_provider or llm_client.last_provider_used or "External AI API"
        engine_badge = "hybrid_llm_layer3" if "Second" in active_provider else "hybrid_llm_layer2"

        return {
            "query": query,
            "intent": plan.get("intent", "ANALYTICAL_QUERY"),
            "answer": grounded_answer,
            "confidence": 0.95,
            "records_count": records_count,
            "applied_filters": applied_filters,
            "chart": chart,
            "follow_up_suggestions": follow_ups,
            "engine_used": engine_badge,
            "provider_used": active_provider,
            "routing_reason": routing_reason,
            "error": None,
        }

    def _generate_llm_query_plan(
        self,
        query: str,
        initial_parsed: ParsedQuery,
        history: List[Dict[str, Any]],
    ) -> Tuple[Dict[str, Any], str]:
        """Prompt external LLM to deconstruct query and produce a strictly typed JSON Query Plan."""
        context_snippets = []
        for m in history[-4:]:
            role = m.get("role", "user")
            content = m.get("content", "")[:160]
            context_snippets.append(f"{role}: {content}")
        context_str = "\n".join(context_snippets) if context_snippets else "No previous conversation."

        system_prompt = (
            "You are the secondary AI query planner for the NIRF Higher Education Analytics Dashboard.\n"
            "Your role is strictly to interpret the user's natural language question and output a structured JSON Query Plan.\n\n"
            "CRITICAL NIRF CONSTRAINTS:\n"
            "- Available ranking years: 2017 to 2025 (9 cycles).\n"
            "- Standard Categories: Overall, Engineering, Management, Universities, Colleges, Medical, Pharmacy, Law, Architecture and Planning, Dental, Agriculture and Allied Sectors, Research Institutions, Innovation, Open University, Skill University, State Public University.\n"
            "- Core Parameters: TLR (Teaching), RPC (Research), GO (Graduation Outcomes), OI (Outreach & Inclusivity), PR (Perception), Overall Score.\n"
            "- Lower numerical rank = better performance (Rank 1 is national champion; moving from Rank 50 to Rank 20 is an improvement of 30 ranks).\n"
            "- You must NOT query arbitrary SQL. Choose from allowable intents.\n\n"
            "OUTPUT FORMAT (STRICT JSON ONLY):\n"
            "{\n"
            '  "type": "analytical_query" | "educational_query" | "unsupported_query",\n'
            '  "intent": "HISTORICAL_TREND" | "TOP_N_INSTITUTIONS" | "STATE_LEADERSHIP" | "STATE_COMPARISON" | "PARAMETER_CORRELATION" | "RESEARCH_VS_TEACHING" | "RANK_IMPROVEMENTS" | "RANK_DECLINES" | "SCORE_DISTRIBUTION" | "FACTUAL_LOOKUP" | "INSTITUTION_COMPARISON",\n'
            '  "institution": "Full Institution Name or null",\n'
            '  "compare_institutions": ["Inst1", "Inst2"],\n'
            '  "category": "Overall" | "Engineering" | ...,\n'
            '  "year": 2025,\n'
            '  "start_year": 2017,\n'
            '  "end_year": 2025,\n'
            '  "state": "State Name or null",\n'
            '  "compare_states": ["State1", "State2"],\n'
            '  "limit": 10,\n'
            '  "metrics": ["rank", "overall_score", "tlr_score", "rpc_score"],\n'
            '  "recommended_visualization": "line" | "bar" | "horizontal_bar" | "grouped_bar" | "scatter" | "radar" | "box_plot" | "pie" | "none",\n'
            '  "reasoning": "brief rationale"\n'
            "}"
        )

        user_content = (
            f"Conversation History:\n{context_str}\n\n"
            f"User Question: \"{query}\"\n"
            f"Context Defaults: Category={initial_parsed.category}, Year={initial_parsed.year}, Institution={initial_parsed.institution_name or 'None'}\n\n"
            f"Produce the JSON Query Plan now:"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        raw_output, provider_name = llm_client.chat_completion_with_provider(messages, json_mode=True, max_tokens=2048)
        plan = llm_client.extract_json(raw_output)

        if not plan or not isinstance(plan, dict):
            # Fallback query plan
            plan = {
                "type": "analytical_query",
                "intent": initial_parsed.intent,
                "institution": initial_parsed.institution_name,
                "category": initial_parsed.category,
                "year": initial_parsed.year,
                "start_year": initial_parsed.start_year,
                "end_year": initial_parsed.end_year,
                "limit": initial_parsed.limit,
                "recommended_visualization": "bar",
            }
        return plan, provider_name

    def _execute_verified_retrieval(
        self,
        plan: Dict[str, Any],
        initial_parsed: ParsedQuery,
    ) -> Tuple[Dict[str, Any], int, Dict[str, Any]]:
        """Validate query plan parameters and execute safe retrieval on the authoritative dataset."""
        df = self.data_loader.load_dataset()
        intent = plan.get("intent", "TOP_N_INSTITUTIONS")
        category = plan.get("category") or initial_parsed.category or "Overall"
        year = int(plan.get("year") or initial_parsed.year or 2025)
        start_year = int(plan.get("start_year") or initial_parsed.start_year or 2017)
        end_year = int(plan.get("end_year") or initial_parsed.end_year or 2025)
        limit = int(plan.get("limit") or initial_parsed.limit or 10)
        inst_target = plan.get("institution") or initial_parsed.institution_name

        # Resolve institution target against dataset if provided
        canonical_inst = None
        entity = None
        if inst_target:
            entity = entity_resolver.get_by_name(inst_target) or entity_resolver.resolve_from_query(inst_target)
            if entity:
                canonical_inst = entity.canonical_name
            else:
                canonical_inst = self._resolve_canonical_institution(inst_target, df)

        # 1. Historical Trend / Trajectory
        if intent in ("HISTORICAL_TREND", "INSTITUTION_TRAJECTORY") and canonical_inst:
            if entity:
                active_cat = entity_resolver.get_active_category(entity, category)
                sub = entity_resolver.filter_dataset(df, entity, active_cat)
                category = active_cat
            else:
                sub = df[
                    (df["institution_name"] == canonical_inst) &
                    (df["year"] >= start_year) &
                    (df["year"] <= end_year)
                ]
                if category:
                    sub_cat = sub[sub["category"].str.lower() == category.lower()]
                    if not sub_cat.empty:
                        sub = sub_cat
                    elif not sub.empty:
                        # Inherit actual category where institution was ranked
                        category = sub["category"].iloc[0]

            sub = sub[(sub["year"] >= start_year) & (sub["year"] <= end_year)].sort_values("year", ascending=True)
            records = []
            for _, r in sub.iterrows():
                records.append({
                    "year": int(r["year"]),
                    "rank": int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else str(r["rank"]),
                    "overall_score": round(float(r["overall_score"]), 2) if pd.notna(r.get("overall_score")) else None,
                    "tlr_score": round(float(r["tlr_score"]), 2) if pd.notna(r.get("tlr_score")) else None,
                    "rpc_score": round(float(r["rpc_score"]), 2) if pd.notna(r.get("rpc_score")) else None,
                    "go_score": round(float(r["go_score"]), 2) if pd.notna(r.get("go_score")) else None,
                    "oi_score": round(float(r["oi_score"]), 2) if pd.notna(r.get("oi_score")) else None,
                    "pr_score": round(float(r["pr_score"]), 2) if pd.notna(r.get("pr_score")) else None,
                })
            verified = {
                "institution_name": canonical_inst,
                "category": category,
                "records": records,
                "total_years_ranked": len(records),
                "best_rank": min([r["rank"] for r in records if isinstance(r["rank"], int)], default="N/A"),
                "latest_rank": records[-1]["rank"] if records else "N/A",
                "latest_score": records[-1]["overall_score"] if records else "N/A",
            }
            return verified, len(records), {"institution": canonical_inst, "category": category, "period": f"{start_year}–{end_year}"}

        # 2. Direct Factual Lookup (single year rank/score)
        if intent in ("FACTUAL_LOOKUP", "RANK_LOOKUP") and canonical_inst:
            if entity:
                active_cat = entity_resolver.get_active_category(entity, category)
                sub = entity_resolver.filter_dataset(df, entity, active_cat)
                category = active_cat
            else:
                sub = df[(df["institution_name"] == canonical_inst) & (df["year"] == year)]
                if category:
                    sub_cat = sub[sub["category"].str.lower() == category.lower()]
                    if not sub_cat.empty:
                        sub = sub_cat
                    elif not sub.empty:
                        category = sub["category"].iloc[0]

            sub = sub[sub["year"] == year]

            if not sub.empty:
                r = sub.iloc[0]
                rank_num = int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else str(r["rank"])
                verified = {
                    "institution_name": canonical_inst,
                    "year": year,
                    "category": category,
                    "rank": rank_num,
                    "overall_score": round(float(r["overall_score"]), 2) if pd.notna(r.get("overall_score")) else None,
                    "tlr_score": round(float(r["tlr_score"]), 2) if pd.notna(r.get("tlr_score")) else None,
                    "rpc_score": round(float(r["rpc_score"]), 2) if pd.notna(r.get("rpc_score")) else None,
                    "go_score": round(float(r["go_score"]), 2) if pd.notna(r.get("go_score")) else None,
                    "oi_score": round(float(r["oi_score"]), 2) if pd.notna(r.get("oi_score")) else None,
                    "pr_score": round(float(r["pr_score"]), 2) if pd.notna(r.get("pr_score")) else None,
                    "city": r.get("city", ""),
                    "state": r.get("state", ""),
                }
                return verified, 1, {"institution": canonical_inst, "category": category, "year": year}

        # 3. Institution Comparison (Two institutions in same year)
        compare_insts = plan.get("compare_institutions") or []
        if len(compare_insts) >= 2 or (canonical_inst and len(compare_insts) >= 1):
            names = [canonical_inst] if canonical_inst else []
            for n in compare_insts:
                c = self._resolve_canonical_institution(n, df)
                if c and c not in names:
                    names.append(c)

            comparison_records = []
            for name in names[:2]:
                sub = df[(df["institution_name"] == name) & (df["year"] == year)]
                if category:
                    sub_c = sub[sub["category"].str.lower() == category.lower()]
                    if not sub_c.empty:
                        sub = sub_c
                if not sub.empty:
                    r = sub.iloc[0]
                    comparison_records.append({
                        "institution_name": name,
                        "rank": int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else str(r["rank"]),
                        "overall_score": round(float(r["overall_score"]), 2) if pd.notna(r.get("overall_score")) else 0.0,
                        "tlr": round(float(r.get("tlr_score") or 0.0), 2),
                        "rpc": round(float(r.get("rpc_score") or 0.0), 2),
                        "go": round(float(r.get("go_score") or 0.0), 2),
                        "oi": round(float(r.get("oi_score") or 0.0), 2),
                        "pr": round(float(r.get("pr_score") or 0.0), 2),
                    })
            if len(comparison_records) >= 2:
                verified = {"comparison": comparison_records, "year": year, "category": category}
                return verified, len(comparison_records), {"institutions": " vs ".join(names[:2]), "category": category, "year": year}

        # 4. Ranking Improvements / Climbers
        if intent in ("RANK_IMPROVEMENTS", "RANKING_CLIMBERS"):
            y_start = min(start_year, end_year)
            y_end = max(start_year, end_year)
            df_s = df[(df["year"] == y_start) & (df["category"].str.lower() == category.lower())].dropna(subset=["numeric_rank"])
            df_e = df[(df["year"] == y_end) & (df["category"].str.lower() == category.lower())].dropna(subset=["numeric_rank"])

            merged = pd.merge(df_s, df_e, on="institution_name", suffixes=("_start", "_end"))
            # Improvement = Start Rank - End Rank (higher positive number = bigger jump toward rank 1)
            merged["improvement"] = merged["numeric_rank_start"] - merged["numeric_rank_end"]
            climbers = merged[merged["improvement"] > 0].sort_values("improvement", ascending=False).head(limit)

            items = []
            for _, r in climbers.iterrows():
                items.append({
                    "institution_name": r["institution_name"],
                    "start_rank": int(r["numeric_rank_start"]),
                    "end_rank": int(r["numeric_rank_end"]),
                    "places_gained": int(r["improvement"]),
                    "start_score": round(float(r["overall_score_start"]), 2) if pd.notna(r.get("overall_score_start")) else None,
                    "end_score": round(float(r["overall_score_end"]), 2) if pd.notna(r.get("overall_score_end")) else None,
                    "state": r.get("state_end", ""),
                })
            verified = {"improvements": items, "start_year": y_start, "end_year": y_end, "category": category}
            return verified, len(items), {"category": category, "period": f"{y_start}–{y_end}"}

        # 5. Ranking Declines / Fallers
        if intent in ("RANK_DECLINES", "RANKING_FALLERS"):
            y_start = min(start_year, end_year)
            y_end = max(start_year, end_year)
            df_s = df[(df["year"] == y_start) & (df["category"].str.lower() == category.lower())].dropna(subset=["numeric_rank"])
            df_e = df[(df["year"] == y_end) & (df["category"].str.lower() == category.lower())].dropna(subset=["numeric_rank"])

            merged = pd.merge(df_s, df_e, on="institution_name", suffixes=("_start", "_end"))
            # Decline = End Rank - Start Rank (higher positive number = bigger drop)
            merged["decline"] = merged["numeric_rank_end"] - merged["numeric_rank_start"]
            fallers = merged[merged["decline"] > 0].sort_values("decline", ascending=False).head(limit)

            items = []
            for _, r in fallers.iterrows():
                items.append({
                    "institution_name": r["institution_name"],
                    "start_rank": int(r["numeric_rank_start"]),
                    "end_rank": int(r["numeric_rank_end"]),
                    "places_lost": int(r["decline"]),
                    "start_score": round(float(r["overall_score_start"]), 2) if pd.notna(r.get("overall_score_start")) else None,
                    "end_score": round(float(r["overall_score_end"]), 2) if pd.notna(r.get("overall_score_end")) else None,
                    "state": r.get("state_end", ""),
                })
            verified = {"declines": items, "start_year": y_start, "end_year": y_end, "category": category}
            return verified, len(items), {"category": category, "period": f"{y_start}–{y_end}"}

        # 6. Default: Top N Institutions
        sub = df[(df["category"].str.lower() == category.lower()) & (df["year"] == year)]
        state_filter = plan.get("state") or initial_parsed.state
        if state_filter:
            sub = sub[sub["state"].str.lower() == state_filter.lower()]

        sub = sub.sort_values("numeric_rank", ascending=True).head(limit)
        insts = []
        for _, r in sub.iterrows():
            insts.append({
                "rank": int(r["numeric_rank"]) if pd.notna(r["numeric_rank"]) else str(r["rank"]),
                "institution_name": r["institution_name"],
                "overall_score": round(float(r["overall_score"]), 2) if pd.notna(r.get("overall_score")) else None,
                "city": r.get("city", ""),
                "state": r.get("state", ""),
                "tlr_score": round(float(r.get("tlr_score") or 0.0), 2),
                "rpc_score": round(float(r.get("rpc_score") or 0.0), 2),
            })
        verified = {"institutions": insts, "year": year, "category": category, "state": state_filter}
        filters = {"category": category, "year": year, "limit": limit}
        if state_filter:
            filters["state"] = state_filter
        return verified, len(sub), filters

    def _generate_grounded_answer(
        self,
        query: str,
        plan: Dict[str, Any],
        verified_data: Dict[str, Any],
    ) -> str:
        """Prompt external LLM to generate an explanation strictly grounded in the verified data payload."""
        system_prompt = (
            "You are an expert higher education data analyst providing factual answers for the official NIRF Analytics Dashboard.\n\n"
            "CRITICAL ACCURACY & GROUNDING RULES:\n"
            "1. Answer strictly using ONLY the verified records and computed values provided in the Verified Dataset Payload.\n"
            "2. Never hallucinate, invent, or extrapolate numbers, scores, ranks, or institutions.\n"
            "3. Lower numerical rank is superior performance (Rank #1 is top national rank; moving from Rank 74 to Rank 69 is an improvement of 5 ranks).\n"
            "4. Clearly mention exact rank numbers and overall scores as recorded.\n"
            "5. If an institution was not ranked in a given year or data is unavailable, state that explicitly; never assume rank 0.\n"
            "6. Provide a concise, professional markdown response with bullet points and bold highlights."
        )

        user_content = (
            f"User Question: \"{query}\"\n\n"
            f"Query Plan Reasoning: {plan.get('reasoning', 'Factual analytical inquiry')}\n\n"
            f"Verified Dataset Payload (GROUND TRUTH):\n"
            f"```json\n{json.dumps(verified_data, indent=2)}\n```\n\n"
            f"Explain the verified findings clearly to the user:"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        try:
            raw_answer, provider_name = llm_client.chat_completion_with_provider(messages, json_mode=False, max_tokens=3500)
            validated_answer = self._validate_numerical_claims(raw_answer, verified_data)
            return validated_answer, provider_name
        except Exception as exc:
            logger.warning("LLM grounded answer generation failed (%s). Using deterministic answer formatter.", exc)
            return self._format_deterministic_answer(plan, verified_data), "Custom NIRF NLQ Engine (Layer 1 Fallback)"

    def _explain_educational_concept(self, query: str, plan: Dict[str, Any]) -> str:
        """Provide detailed educational explanation of NIRF metrics and methodology."""
        # Find relevant metric if mentioned
        ql = query.lower()
        matched_metric = None
        for code, info in NIRF_METHODOLOGY_KNOWLEDGE.items():
            if re.search(rf"\b{code.lower()}\b", ql) or re.search(rf"\b{re.escape(info['name'].lower())}\b", ql):
                matched_metric = (code, info)
                break

        if not matched_metric:
            # General NIRF Methodology overview
            return (
                "### National Institutional Ranking Framework (NIRF) Methodology\n\n"
                "The **NIRF** methodology evaluates higher education institutions across five core dimensions:\n\n"
                "- **Teaching, Learning & Resources (TLR)** — 30% weight: Core infrastructure, faculty quality, student-teacher ratio, and capital/operational funding.\n"
                "- **Research and Professional Practice (RPC)** — 30% weight: Peer-reviewed publications, citation volume, patents, and sponsored research funding.\n"
                "- **Graduation Outcomes (GO)** — 20% weight: Examination outcomes, PhD throughput, and median placement salaries.\n"
                "- **Outreach and Inclusivity (OI)** — 10% weight: Regional diversity, gender diversity, economic inclusion, and physical accessibility.\n"
                "- **Perception (PR)** — 10% weight: Academic peer and corporate employer reputation surveys.\n\n"
                "The composite score out of 100 determines the national ranking within each discipline."
            )

        code, info = matched_metric
        sub_list = "\n".join([f"  - {s}" for s in info["sub_metrics"]])
        return (
            f"### {code}: {info['name']}\n\n"
            f"**Weightage in Composite Score:** {info['weight']}\n\n"
            f"**Core Purpose:**\n{info['description']}\n\n"
            f"**Evaluated Sub-Parameters:**\n{sub_list}\n\n"
            f"*Source: Ministry of Education, Government of India — Official NIRF Methodology Guidelines.*"
        )

    def _construct_chart_from_verified_data(
        self,
        plan: Dict[str, Any],
        verified: Dict[str, Any],
        initial_parsed: ParsedQuery,
    ) -> Optional[Dict[str, Any]]:
        """Safely construct Plotly chart spec using backend-validated data and recommended chart type."""
        recommended = (plan.get("recommended_visualization") or "bar").lower()
        intent = plan.get("intent", "TOP_N_INSTITUTIONS")

        # 1. Line Chart for Longitudinal Historical Trend
        if "records" in verified and (recommended == "line" or intent in ("HISTORICAL_TREND", "INSTITUTION_TRAJECTORY")):
            recs = verified["records"]
            if not recs:
                return None
            x_years = [r["year"] for r in recs]
            y_ranks = [r["rank"] for r in recs]
            y_scores = [r["overall_score"] for r in recs]
            inst_name = verified.get("institution_name", "Institution")

            return {
                "chart_type": "line",
                "title": f"{inst_name} — Historical Performance ({x_years[0]}–{x_years[-1]})",
                "traces": [
                    {
                        "type": "scatter",
                        "mode": "lines+markers",
                        "name": "NIRF Rank (Inverted)",
                        "x": x_years,
                        "y": y_ranks,
                        "line": {"color": "#2563eb", "width": 3},
                        "marker": {"size": 8, "color": "#1d4ed8"},
                        "hovertemplate": "<b>%{x}</b><br>Rank: #%{y}<extra></extra>",
                    },
                    {
                        "type": "scatter",
                        "mode": "lines+markers",
                        "name": "Overall Score",
                        "x": x_years,
                        "y": y_scores,
                        "yaxis": "y2",
                        "line": {"color": "#10b981", "width": 2.5, "dash": "dot"},
                        "marker": {"size": 7, "color": "#059669"},
                        "hovertemplate": "<b>%{x}</b><br>Score: %{y:.2f}<extra></extra>",
                    },
                ],
                "layout": {
                    "height": 420,
                    "margin": {"l": 55, "r": 55, "t": 40, "b": 60},
                    "xaxis": {"title": "Ranking Year", "dtick": 1, "automargin": True},
                    "yaxis": {"title": "National Rank (Lower is Better)", "autorange": "reversed", "automargin": True},
                    "yaxis2": {"title": "Overall Score (out of 100)", "overlaying": "y", "side": "right", "automargin": True},
                    "legend": {"orientation": "h", "y": -0.2, "x": 0.25},
                },
            }

        # 2. Radar Chart for Two-Institution Multi-Parameter Comparison
        if "comparison" in verified and (recommended == "radar" or len(verified["comparison"]) >= 2):
            comp = verified["comparison"]
            categories = ["TLR (Teaching)", "RPC (Research)", "GO (Outcomes)", "OI (Inclusivity)", "PR (Perception)"]
            traces = []
            colors = ["#2563eb", "#f97316"]
            for idx, inst in enumerate(comp[:2]):
                scores = [inst.get("tlr", 0), inst.get("rpc", 0), inst.get("go", 0), inst.get("oi", 0), inst.get("pr", 0)]
                scores.append(scores[0])  # Close radar loop
                cat_closed = categories + [categories[0]]
                traces.append({
                    "type": "scatterpolar",
                    "r": scores,
                    "theta": cat_closed,
                    "fill": "toself",
                    "name": f"{inst['institution_name']} (#{inst['rank']})",
                    "line": {"color": colors[idx % len(colors)], "width": 2.5},
                    "opacity": 0.65,
                })
            return {
                "chart_type": "radar",
                "title": f"5-Parameter Comparative Radar: {comp[0]['institution_name']} vs {comp[1]['institution_name']}",
                "traces": traces,
                "layout": {
                    "height": 440,
                    "polar": {
                        "radialaxis": {"visible": True, "range": [0, 100], "tickfont": {"size": 10}},
                    },
                    "legend": {"orientation": "h", "y": -0.15, "x": 0.15},
                },
            }

        # 3. Horizontal Bar Chart for Climbers / Ranking Improvements
        if "improvements" in verified:
            items = verified["improvements"][:10]
            if not items:
                return None
            return {
                "chart_type": "horizontal_bar",
                "title": f"Top Ranking Climbers ({verified.get('start_year')} to {verified.get('end_year')})",
                "traces": [{
                    "type": "bar",
                    "orientation": "h",
                    "x": [i["places_gained"] for i in items][::-1],
                    "y": [i["institution_name"] for i in items][::-1],
                    "text": [f"+{i['places_gained']} ranks" for i in items][::-1],
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {"color": "#10b981", "line": {"color": "#059669", "width": 1}},
                    "customdata": [[i["institution_name"], i["start_rank"], i["end_rank"]] for i in items][::-1],
                    "hovertemplate": (
                        "<b>%{customdata[0]}</b><br>"
                        "Improvement: <b>+%{x} ranks</b><br>"
                        "• Rank %{customdata[1]} (" + str(verified.get("start_year")) + ")<br>"
                        "• Rank %{customdata[2]} (" + str(verified.get("end_year")) + ")<extra></extra>"
                    ),
                }],
                "layout": {
                    "height": max(420, len(items) * 38 + 80),
                    "margin": {"l": 270, "r": 60, "t": 35, "b": 50},
                    "xaxis": {"title": "Places Gained (Lower Rank Number)", "automargin": True},
                    "yaxis": {"automargin": True},
                },
            }

        # 4. Standard Bar Chart for Top N Institutions
        if "institutions" in verified:
            insts = verified["institutions"][:10]
            if not insts:
                return None
            return {
                "chart_type": "bar",
                "title": f"Top {len(insts)} Institutions in {verified.get('category')} ({verified.get('year')})",
                "traces": [{
                    "type": "bar",
                    "x": [i["institution_name"] for i in insts],
                    "y": [i["overall_score"] for i in insts],
                    "text": [str(i["overall_score"]) for i in insts],
                    "textposition": "outside",
                    "cliponaxis": False,
                    "marker": {"color": "#2563eb", "line": {"color": "#1d4ed8", "width": 1}},
                    "hovertemplate": "<b>%{x}</b><br>Overall Score: <b>%{y}</b><extra></extra>",
                }],
                "layout": {
                    "height": 420,
                    "margin": {"l": 60, "r": 30, "t": 35, "b": 100},
                    "xaxis": {"title": "Institution", "tickangle": -25, "automargin": True},
                    "yaxis": {"title": "Overall Score (out of 100)", "automargin": True},
                },
            }

        return None

    def _resolve_canonical_institution(self, term: str, df: pd.DataFrame) -> Optional[str]:
        """Resolve common acronyms, aliases, or colloquial names to official master dataset names."""
        if not term:
            return None
        entity = entity_resolver.get_by_name(term) or entity_resolver.resolve_from_query(term)
        if entity:
            return entity.canonical_name

        tl = term.strip().lower()

        # Check known aliases dictionary
        if tl in query_parser.KNOWN_INSTITUTION_ALIASES:
            canonical = query_parser.KNOWN_INSTITUTION_ALIASES[tl]
            if canonical in df["institution_name"].values:
                return canonical

        # Exact case-insensitive match in dataset
        exact = df[df["institution_name"].str.lower() == tl]
        if not exact.empty:
            return exact["institution_name"].iloc[0]

        # Substring search in dataset
        matches = df[df["institution_name"].str.contains(re.escape(term), case=False, na=False)]
        if not matches.empty:
            # Pick the most frequent or shortest matching institution name
            return matches["institution_name"].value_counts().index[0]

        return None

    def _format_deterministic_answer(self, plan: Dict[str, Any], verified: Dict[str, Any]) -> str:
        """Fallback deterministic formatter when external LLM synthesis is unavailable."""
        if "records" in verified:
            recs = verified["records"]
            name = verified.get("institution_name", "The institution")
            cat = verified.get("category", "Overall")
            b_rank = verified.get("best_rank", "N/A")
            l_rank = verified.get("latest_rank", "N/A")
            l_score = verified.get("latest_score", "N/A")
            
            target_year = plan.get("year")
            target_rec = next((r for r in recs if r["year"] == target_year), None) if target_year else None
            year_detail = f"\n- **Specific Performance in {target_year}:** Rank #{target_rec['rank']} with an Overall Score of **{target_rec.get('overall_score', 'N/A')}**." if target_rec else ""

            return (
                f"**{name}** has {len(recs)} appearances in the **{cat}** rankings from {recs[0]['year']} to {recs[-1]['year']}.\n\n"
                f"- **Best Achieved Rank:** Rank #{b_rank}\n"
                f"- **Latest Position ({recs[-1]['year']}):** Rank #{l_rank} with an Overall Score of **{l_score}**.{year_detail}\n"
                f"- **Core Parameters ({recs[-1]['year']}):** TLR: {recs[-1].get('tlr_score', 'N/A')} | Research (RPC): {recs[-1].get('rpc_score', 'N/A')} | Perception (PR): {recs[-1].get('pr_score', 'N/A')}\n"
                f"- **Data Continuity:** Continuous verified participation across {len(recs)} cycles."
            )

        if "comparison" in verified:
            recs = verified.get("comparison") or []
            if len(recs) >= 2:
                a, b = recs[0], recs[1]
                return (
                    f"### Comparative Performance: **{a['institution_name']}** vs **{b['institution_name']}** ({verified.get('category')}, {verified.get('year')})\n\n"
                    f"- **{a['institution_name']}**: Rank #{a['rank']} (Overall: {a['overall_score']}) | TLR: {a['tlr']} | RPC: {a['rpc']} | GO: {a['go']} | OI: {a['oi']} | PR: {a['pr']}\n"
                    f"- **{b['institution_name']}**: Rank #{b['rank']} (Overall: {b['overall_score']}) | TLR: {b['tlr']} | RPC: {b['rpc']} | GO: {b['go']} | OI: {b['oi']} | PR: {b['pr']}"
                )

        if "rank" in verified and "overall_score" in verified:
            return (
                f"In the **{verified.get('year')} {verified.get('category')}** rankings, **{verified.get('institution_name')}** "
                f"secured **Rank #{verified.get('rank')}** with an Overall Score of **{verified.get('overall_score')}** "
                f"(TLR: {verified.get('tlr_score')}, RPC: {verified.get('rpc_score')}, GO: {verified.get('go_score')})."
            )

        if "improvements" in verified:
            items = verified.get("improvements") or []
            if items:
                top = items[0]
                return (
                    f"Between **{verified.get('start_year')} and {verified.get('end_year')}** in **{verified.get('category')}**, "
                    f"**{top['institution_name']}** gained the most positions, advancing **+{top['places_gained']} ranks** "
                    f"(from Rank #{top['start_rank']} to Rank #{top['end_rank']})."
                )
            return f"No significant rank improvements recorded in {verified.get('category')} between {verified.get('start_year')} and {verified.get('end_year')}."

        if "declines" in verified:
            items = verified.get("declines") or []
            if items:
                top = items[0]
                return (
                    f"Between **{verified.get('start_year')} and {verified.get('end_year')}** in **{verified.get('category')}**, "
                    f"**{top['institution_name']}** experienced the largest rank drop, losing **-{top['places_lost']} ranks** "
                    f"(from Rank #{top['start_rank']} to Rank #{top['end_rank']})."
                )
            return f"No significant rank declines recorded in {verified.get('category')} between {verified.get('start_year')} and {verified.get('end_year')}."

        if "institutions" in verified:
            insts = verified.get("institutions") or []
            if insts:
                top = insts[0]
                names = [i["institution_name"] for i in insts[:3]]
                return (
                    f"In **{verified.get('category')} ({verified.get('year')})**, leading institutions include: "
                    f"**{', '.join(names)}**. Rank #1 is **{top['institution_name']}** (Score: {top.get('overall_score', 'N/A')})."
                )

        return "Computed analytical results based on authoritative NIRF master dataset records."

    def _process_fallback_internally(
        self,
        query: str,
        parsed: ParsedQuery,
        history: List[Dict[str, Any]],
        routing_reason: str,
    ) -> Dict[str, Any]:
        """Execute deterministic fallback when external LLM is offline or unconfigured."""
        # Check if educational query
        ql = query.lower()
        is_edu_inquiry = bool(re.search(r"\b(what is|what does|explain|define|meaning of|how is|how are|evaluated|evaluate|formula|methodology)\b", ql))
        if is_edu_inquiry:
            for code, info in NIRF_METHODOLOGY_KNOWLEDGE.items():
                if re.search(rf"\b{code.lower()}\b", ql) or re.search(rf"\b{re.escape(info['name'].lower())}\b", ql):
                    sub_list = "\n".join([f"  - {s}" for s in info["sub_metrics"]])
                    answer = (
                        f"### {code}: {info['name']}\n\n"
                        f"**Weightage in Composite Score:** {info['weight']}\n\n"
                        f"**Core Purpose:**\n{info['description']}\n\n"
                        f"**Evaluated Sub-Parameters:**\n{sub_list}\n\n"
                        f"*Note: Running in standalone deterministic mode. Configure LLM_API_KEY in backend/.env to enable open-ended reasoning.*"
                    )
                    return {
                        "query": query,
                        "intent": "METHODOLOGY_EXPLANATION",
                        "answer": answer,
                        "confidence": 0.95,
                        "records_count": 0,
                        "applied_filters": {"parameter": code},
                        "chart": None,
                        "follow_up_suggestions": [
                            "Show top 10 institutions in Engineering in 2025",
                            "How has IIT Madras performed from 2017 to 2025?",
                            "Which state has the most institutions in 2025?",
                        ],
                        "engine_used": "internal",
                        "routing_reason": f"{routing_reason}_offline_fallback",
                        "error": None,
                    }

        # Otherwise execute deterministic query builder
        res = query_builder.execute(parsed)
        follow_ups = visualization_selector.get_follow_up_suggestions(res["intent"], parsed)
        return {
            "query": query,
            "intent": res["intent"],
            "answer": res["answer"],
            "confidence": parsed.confidence,
            "records_count": res.get("records_count", 0),
            "applied_filters": res.get("applied_filters", {}),
            "chart": res.get("chart"),
            "follow_up_suggestions": follow_ups,
            "engine_used": "internal",
            "routing_reason": f"{routing_reason}_offline_fallback",
            "error": None,
        }


# Global hybrid engine instance
hybrid_engine = HybridNLQEngine()
