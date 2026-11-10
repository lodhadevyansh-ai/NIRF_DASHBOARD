"""NIRF Analytics Dashboard — NLQ Query Parser.

Extracts structured analytical intent and entities from natural-language queries:
- Intent categorization (Top N, Trajectory, State Distribution, Comparisons, Outliers, etc.)
- Entity recognition: Categories, Years, Year Ranges, States, Institutions, Parameters
- Fallback fuzzy matching for institutional variations and common aliases.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

from app.nlq.entity_resolver import entity_resolver


class ParsedQuery:
    """Structured representation of an analytical natural language query."""

    def __init__(
        self,
        raw_query: str,
        intent: str,
        category: Optional[str] = None,
        year: Optional[int] = None,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        state: Optional[str] = None,
        compare_states: Optional[List[str]] = None,
        institution_name: Optional[str] = None,
        compare_institutions: Optional[List[str]] = None,
        limit: int = 10,
        parameter: Optional[str] = None,
        compare_parameters: Optional[List[str]] = None,
        confidence: float = 0.9,
    ) -> None:
        self.raw_query = raw_query
        self.intent = intent
        self.category = category or "Overall"
        self.year = year or 2025
        self.start_year = start_year or 2017
        self.end_year = end_year or 2025
        self.state = state
        self.compare_states = compare_states or []
        self.institution_name = institution_name
        self.compare_institutions = compare_institutions or []
        self.limit = limit
        self.parameter = parameter
        self.compare_parameters = compare_parameters or []
        self.confidence = confidence

    def to_dict(self) -> Dict[str, Any]:
        """Convert parsed query to dictionary format."""
        return {
            "raw_query": self.raw_query,
            "intent": self.intent,
            "category": self.category,
            "year": self.year,
            "start_year": self.start_year,
            "end_year": self.end_year,
            "state": self.state,
            "compare_states": self.compare_states,
            "institution_name": self.institution_name,
            "compare_institutions": self.compare_institutions,
            "limit": self.limit,
            "parameter": self.parameter,
            "compare_parameters": self.compare_parameters,
            "confidence": self.confidence,
        }


class QueryParser:
    """Deterministic, robust NLP parser for NIRF analytical inquiries."""

    KNOWN_CATEGORIES = {
        "overall": "Overall",
        "engineering": "Engineering",
        "university": "University",
        "universities": "University",
        "management": "Management",
        "mba": "Management",
        "pharmacy": "Pharmacy",
        "college": "Colleges",
        "colleges": "Colleges",
        "medical": "Medical",
        "law": "Law",
        "architecture": "Architecture",
        "dental": "Dental",
        "research": "Research Institutions",
        "research institutions": "Research Institutions",
        "agriculture": "Agriculture",
        "innovation": "Innovation",
        "open university": "Open University",
        "skill university": "Skill University",
        "state public university": "State Public University",
    }

    KNOWN_STATES = [
        "Tamil Nadu", "Karnataka", "Maharashtra", "Delhi", "Kerala", "Uttar Pradesh",
        "West Bengal", "Telangana", "Gujarat", "Punjab", "Rajasthan", "Haryana",
        "Andhra Pradesh", "Odisha", "Assam", "Bihar", "Chandigarh", "Madhya Pradesh",
        "Jammu and Kashmir", "Uttarakhand", "Jharkhand", "Puducherry", "Himachal Pradesh",
        "Goa", "Tripura", "Meghalaya", "Manipur", "Mizoram", "Arunachal Pradesh",
        "Nagaland", "Sikkim"
    ]

    KNOWN_INSTITUTION_ALIASES = {
        "iit madras": "Indian Institute of Technology Madras",
        "iitm": "Indian Institute of Technology Madras",
        "iit delhi": "Indian Institute of Technology Delhi",
        "iit bombay": "Indian Institute of Technology Bombay",
        "iitb": "Indian Institute of Technology Bombay",
        "iit kanpur": "Indian Institute of Technology Kanpur",
        "iit kharagpur": "Indian Institute of Technology Kharagpur",
        "iit kgp": "Indian Institute of Technology Kharagpur",
        "iit roorkee": "Indian Institute of Technology Roorkee",
        "iit guwahati": "Indian Institute of Technology Guwahati",
        "iit hyderabad": "Indian Institute of Technology Hyderabad",
        "iit bhu": "Indian Institute of Technology (Banaras Hindu University) Varanasi",
        "iit varanasi": "Indian Institute of Technology (Banaras Hindu University) Varanasi",
        "iit indore": "Indian Institute of Technology Indore",
        "iit gandhinagar": "Indian Institute of Technology Gandhinagar",
        "iit ropar": "Indian Institute of Technology Ropar",
        "iit patna": "Indian Institute of Technology Patna",
        "iit mandi": "Indian Institute of Technology Mandi",
        "iit jodhpur": "Indian Institute of Technology Jodhpur",
        "iit tirupati": "Indian Institute of Technology Tirupati",
        "iit palakkad": "Indian Institute of Technology Palakkad",
        "iit dharwad": "Indian Institute of Technology Dharwad",
        "iit bhilai": "Indian Institute of Technology Bhilai",
        "iit goa": "Indian Institute of Technology Goa",
        "iit jammu": "Indian Institute of Technology Jammu",
        "iiit bangalore": "International Institute of Information Technology Bangalore",
        "iiitb": "International Institute of Information Technology Bangalore",
        "iiit hyderabad": "International Institute of Information Technology Hyderabad",
        "iiith": "International Institute of Information Technology Hyderabad",
        "iiit delhi": "Indraprastha Institute of Information Technology Delhi",
        "iiit allahabad": "Indian Institute of Information Technology Allahabad",
        "iim ahmedabad": "Indian Institute of Management Ahmedabad",
        "iima": "Indian Institute of Management Ahmedabad",
        "iim bangalore": "Indian Institute of Management Bangalore",
        "iimb": "Indian Institute of Management Bangalore",
        "iim calcutta": "Indian Institute of Management Calcutta",
        "iimc": "Indian Institute of Management Calcutta",
        "iim kozhikode": "Indian Institute of Management Kozhikode",
        "iim lucknow": "Indian Institute of Management Lucknow",
        "iim indore": "Indian Institute of Management Indore",
        "iisc": "Indian Institute of Science",
        "iisc bangalore": "Indian Institute of Science",
        "jnu": "Jawaharlal Nehru University",
        "bhu": "Banaras Hindu University",
        "aiims": "All India Institute of Medical Sciences, New Delhi",
        "saveetha": "Saveetha Institute of Medical and Technical Sciences",
        "pune university": "Savitribai Phule Pune University",
        "savitribai": "Savitribai Phule Pune University",
        "anna university": "Anna University",
        "amity": "Amity University",
        "nit silchar": "National Institute of Technology Silchar",
        "nit trichy": "National Institute of Technology Tiruchirappalli",
        "delhi university": "University of Delhi",
        "du": "University of Delhi",
        "jadavpur university": "Jadavpur University",
        "vellore institute of technology": "Vellore Institute of Technology",
        "vit": "Vellore Institute of Technology",
        "srm": "SRM Institute of Science and Technology",
        "bits pilani": "Birla Institute of Technology & Science - Pilani",
        "thapar": "Thapar Institute of Engineering and Technology",
        "manipal": "Manipal Academy of Higher Education",
    }

    KNOWN_PARAMETERS = {
        "tlr": "tlr_score",
        "teaching": "tlr_score",
        "rpc": "rpc_score",
        "research": "rpc_score",
        "go": "go_score",
        "graduation": "go_score",
        "oi": "oi_score",
        "outreach": "oi_score",
        "inclusivity": "oi_score",
        "pr": "pr_score",
        "perception": "pr_score",
        "overall": "overall_score",
        "score": "overall_score",
    }

    def parse(
        self,
        query_str: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> ParsedQuery:
        """Parse natural language query into intent and structured entity arguments with conversation memory."""
        q = (query_str or "").strip().lower()

        # 0. Context extraction from conversation history
        prev_inst = None
        prev_cat = None
        prev_year = None
        if conversation_history:
            for msg in reversed(conversation_history):
                text = (msg.get("content") or "").lower()
                if not prev_inst:
                    for alias, full_name in self.KNOWN_INSTITUTION_ALIASES.items():
                        if re.search(rf"\b{re.escape(alias)}\b", text):
                            prev_inst = full_name
                            break
                if not prev_cat:
                    for alias, cat_name in self.KNOWN_CATEGORIES.items():
                        if re.search(rf"\b{re.escape(alias)}\b", text):
                            prev_cat = cat_name
                            break
                if not prev_year:
                    years_found = re.findall(r"\b(201[7-9]|202[0-5])\b", text)
                    if years_found:
                        prev_year = int(years_found[0])
                if prev_inst and prev_cat and prev_year:
                    break

        # 1. Extract Year & Year Range
        year = None
        start_year = None
        end_year = None

        # Look for relative years: e.g. "previous 5 years", "last 8 years", "past 3 years"
        rel_match = re.search(r"\b(?:previous|last|past)\s+(\d+)\s+years?\b", q)
        if rel_match:
            span = int(rel_match.group(1))
            end_year = prev_year or 2025
            start_year = max(2017, end_year - span + 1)
        else:
            # Look for range: e.g. "from 2017 to 2025" or "between 2024 and 2025" or "2017-2025"
            range_match = re.search(r"(?:from|between)?\s*(201[7-9]|202[0-5])\s*(?:to|-|and)\s*(201[7-9]|202[0-5])", q)
            if range_match:
                y1, y2 = int(range_match.group(1)), int(range_match.group(2))
                start_year = min(y1, y2)
                end_year = max(y1, y2)
            else:
                # Single year
                years = re.findall(r"\b(201[7-9]|202[0-5])\b", q)
                if years:
                    year = int(years[0])
                elif prev_year and ("what about" in q or "performance" in q):
                    year = prev_year

        range_detected = bool(rel_match or (start_year and end_year))

        # 2. Extract Category (prioritize explicit multi-word matches, ignore parameter words like 'research score')
        category = None
        explicit_category = False
        is_param_research = bool(re.search(r"\b(research score|research and|research vs|high research|low research|research parameter|strongest correlation)\b", q))

        category_order = [
            ("state public university", "State Public University"),
            ("open university", "Open University"),
            ("skill university", "Skill University"),
            ("research institutions", "Research Institutions"),
            ("engineering", "Engineering"),
            ("management", "Management"),
            ("mba", "Management"),
            ("pharmacy", "Pharmacy"),
            ("colleges", "Colleges"),
            ("college", "Colleges"),
            ("medical", "Medical"),
            ("law", "Law"),
            ("architecture", "Architecture"),
            ("dental", "Dental"),
            ("agriculture", "Agriculture"),
            ("innovation", "Innovation"),
            ("university", "University"),
            ("universities", "University"),
            ("overall", "Overall"),
        ]

        for alias, cat_name in category_order:
            if cat_name == "Research Institutions" and is_param_research:
                continue
            if re.search(rf"\b{alias}\b", q):
                category = cat_name
                explicit_category = True
                break

        # 3. Extract States & State Comparison
        found_states: List[str] = []
        for state in self.KNOWN_STATES:
            if re.search(rf"\b{re.escape(state.lower())}\b", q):
                found_states.append(state)

        primary_state = found_states[0] if len(found_states) == 1 else None
        compare_states = found_states if len(found_states) >= 2 else []

        # 4. Extract Institution Name using Entity Resolver
        resolved_entities = entity_resolver.resolve_all_from_query(q)

        # Check for conversational pronouns referencing previous institution
        has_pronoun = bool(re.search(r"\b(it|its|they|their|that institution|the institute|that college|this university)\b", q))
        if prev_inst and (has_pronoun or "compare" in q or "vs" in q or "with" in q):
            prev_entity = entity_resolver.get_by_name(prev_inst)
            if prev_entity and prev_entity not in resolved_entities:
                resolved_entities.append(prev_entity)

        institution_name = resolved_entities[0].canonical_name if resolved_entities else None
        compare_institutions = [e.canonical_name for e in resolved_entities] if len(resolved_entities) >= 2 else []

        # Auto-discover active category from resolved institution if not explicitly in query
        if resolved_entities:
            primary_entity = resolved_entities[0]
            if not explicit_category:
                category = entity_resolver.get_active_category(primary_entity, prev_cat)
            else:
                category = entity_resolver.get_active_category(primary_entity, category)
        elif not category:
            category = prev_cat or "Overall"

        # 5. Extract Limit (e.g. "top 10", "top 5")
        limit = 10
        limit_match = re.search(r"\btop\s+(\d+)\b", q)
        if limit_match:
            limit = int(limit_match.group(1))

        # 6. Extract Parameters
        parameter = None
        for alias, param_col in self.KNOWN_PARAMETERS.items():
            if re.search(rf"\b{alias}\b", q):
                parameter = param_col
                break

        # 7. Classify Analytical Intent
        has_single_year = bool(year and not range_detected)
        intent = self._classify_intent(
            q=q,
            has_inst=institution_name,
            compare_states=compare_states,
            found_states=found_states,
            has_range=range_detected,
            compare_institutions=compare_institutions,
            has_single_year=has_single_year,
        )

        # Confidence assessment
        confidence = 0.92
        if intent == "GENERAL_ANALYTICAL" and not institution_name and not primary_state:
            confidence = 0.65
        elif has_pronoun and not prev_inst:
            confidence = 0.50

        return ParsedQuery(
            raw_query=query_str,
            intent=intent,
            category=category,
            year=year or 2025,
            start_year=start_year or 2017,
            end_year=end_year or 2025,
            state=primary_state,
            compare_states=compare_states,
            institution_name=institution_name,
            compare_institutions=compare_institutions,
            limit=limit,
            parameter=parameter,
            confidence=confidence,
        )

    def _classify_intent(
        self,
        q: str,
        has_inst: Optional[str],
        compare_states: List[str],
        found_states: List[str],
        has_range: bool,
        compare_institutions: Optional[List[str]] = None,
        has_single_year: bool = False,
    ) -> str:
        """Classify analytical intent using regex and domain semantics."""
        # Out-of-scope non-NIRF queries
        if re.search(r"\b(weather|temperature|forecast|flight|hotel|booking|cricket|football|movie|actor|stocks?|bitcoin|crypto)\b", q):
            return "UNSUPPORTED_QUERY"

        # Methodology / Conceptual Questions (e.g. difference between rank and score)
        if ("difference between" in q and ("rank" in q or "score" in q)) or re.search(r"\b(what is|explain|how is|formula for)\s+(tlr|rpc|go|oi|pr|nirf|score|ranking)\b", q):
            return "METHODOLOGY_EXPLANATION"

        # Data Continuity & Missing Records
        if "missing" in q or "discontinuous" in q or "gaps in" in q or "missing historical" in q:
            return "DATA_CONTINUITY_ANALYSIS"

        # Explicit Chart Type Requests
        if "heatmap" in q or "correlation matrix" in q:
            return "CORRELATION_HEATMAP"

        if "pie" in q or "donut" in q:
            return "STATE_SHARE_PIE"

        if "box plot" in q or "boxplot" in q:
            return "SCORE_BOXPLOT"

        # Institution Comparison
        if (compare_institutions and len(compare_institutions) >= 2) or ("compare" in q and has_inst and ("and" in q or "vs" in q or "with" in q)):
            return "INSTITUTION_COMPARISON"

        # Single-Year Factual Lookup (Rank, Overall Score, or Parameter in a specific single year)
        # e.g. "What is the rank of IIIT Hyderabad in 2025?", "What was IIT Madras's overall score in 2023?"
        if has_inst and has_single_year and not has_range:
            if any(term in q for term in ["rank", "score", "tlr", "rpc", "go", "oi", "pr", "what is", "what was", "how much"]):
                return "FACTUAL_LOOKUP"

        # Q3: Trajectory of institution (Multi-year or general performance)
        if has_inst and ("perform" in q or "rank" in q or "score" in q or "trajectory" in q or "trend" in q or "progression" in q or "changed" in q or "over time" in q or has_range):
            return "INSTITUTION_TRAJECTORY"

        # Q4: State Comparison
        if len(compare_states) >= 2 or ("compare" in q and len(found_states) >= 2):
            return "STATE_COMPARISON"

        # Q1: State distribution / Highest number of institutions in state
        if ("which state" in q or "highest number of" in q or "state representation" in q or "top state" in q) and "parameter" not in q:
            return "STATE_LEADERSHIP"

        # Q5: Correlation / Strongest parameter
        if "strongest correlation" in q or "correlation with overall" in q or "correlat" in q:
            return "PARAMETER_CORRELATION"

        # Q6: High Research, Low Teaching
        if ("high research" in q and "low teaching" in q) or ("high rpc" in q and "low tlr" in q) or "research vs teaching" in q:
            return "RESEARCH_VS_TEACHING"

        # Q7: Ranking Improvements / Climbers & Declines / Fallers
        if "faller" in q or "decline" in q or "dropped" in q or "drop" in q or "loss" in q:
            return "RANK_DECLINES"

        if "improved" in q or "improvement" in q or "climber" in q or "gained" in q or "rise" in q:
            return "RANK_IMPROVEMENTS"

        # Q8: Score Distribution / Histogram
        if "distribution" in q or "histogram" in q or "spread of score" in q:
            return "SCORE_DISTRIBUTION"

        # Q9: Entries and exits in Top 10
        if "entered" in q or "exited" in q or "turnover" in q or "entry" in q:
            return "TOP_10_ENTRIES_EXITS"

        # Q10: Top 5 Radar comparison / 5 parameters
        if "five parameter" in q or "5 parameter" in q or ("radar" in q and "top" in q):
            return "TOP_FIVE_COMPARISON"

        # Outliers / Volatility
        if "volatile" in q or "volatility" in q:
            return "RANKING_VOLATILITY"
        if "outlier" in q:
            return "OUTLIER_DETECTION"

        # Q2: Top N Institutions
        if "top " in q or "best " in q or "leading " in q or "rankings" in q or "highest " in q:
            return "TOP_N_INSTITUTIONS"

        # Default: General Analytical Explorer
        return "GENERAL_ANALYTICAL"


# Global singleton
query_parser = QueryParser()
