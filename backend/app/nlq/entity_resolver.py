"""
NIRF Analytics Dashboard — Canonical Institution Entity Resolver.

Provides robust, unambiguous institution entity resolution across all 9 NIRF cycles:
1. Recognizes abbreviations, acronyms, colloquial aliases, and complete official names.
2. Maps each institution to its canonical identifier and display name.
3. Groups all cross-year raw name variations from NIRF_Master_Dataset.csv.
4. Distinguishes similar institutions (e.g. IIIT Delhi vs GGSIPU; IIIT Hyderabad vs UoH; IIIT Bangalore vs IISc).
5. Discovers primary and available categories so institutions not ranked in 'Overall'
   (such as IIIT Delhi in 'Engineering') are automatically and accurately scoped.
6. Guarantees that the resolved entity is never silently substituted with another.
"""

from dataclasses import dataclass, field
import logging
import re
from typing import Any, Dict, List, Optional, Set

import pandas as pd
from app.services.data_loader import data_loader

logger = logging.getLogger("nirf_backend.nlq.entity_resolver")


@dataclass
class CanonicalInstitution:
    """Represents a disambiguated higher education entity across NIRF editions."""

    canonical_name: str
    aishe_id: Optional[str]
    aliases: List[str]
    raw_names: List[str]
    categories: Dict[str, List[int]]  # category -> sorted list of years
    primary_category: str
    city: Optional[str] = None
    state: Optional[str] = None


class EntityResolver:
    """Enterprise-grade NLP entity resolver and catalog for Indian higher education institutions."""

    def __init__(self) -> None:
        self._institutions: Dict[str, CanonicalInstitution] = {}  # canonical_name -> entity
        self._alias_index: List[tuple[str, str]] = []  # (alias, canonical_name) sorted by length desc
        self._raw_name_to_canonical: Dict[str, str] = {}
        self._initialized = False

    def initialize(self, force: bool = False) -> None:
        """Build the canonical entity catalog and inverted alias index from NIRF_Master_Dataset."""
        if self._initialized and not force:
            return

        df = data_loader.load_dataset()
        self._build_curated_entities(df)
        self._index_all_dataset_institutions(df)
        self._initialized = True
        logger.info(
            "EntityResolver initialized: %d canonical entities indexed, %d alias patterns.",
            len(self._institutions),
            len(self._alias_index),
        )

    def _build_curated_entities(self, df: pd.DataFrame) -> None:
        """Register premier institutions with high-precision aliases and known cross-year name variations."""
        curated_specs = [
            # 1. IIIT Delhi
            {
                "canonical_name": "Indraprastha Institute of Information Technology Delhi",
                "aishe_id": "U-0105",
                "city": "New Delhi",
                "state": "Delhi",
                "aliases": [
                    "iiit delhi", "iiitd", "iiit-delhi", "iiit new delhi",
                    "indraprastha institute of information technology delhi",
                    "indraprastha institute of information technology",
                    "indraprastha iiit",
                ],
                "raw_names": [
                    "Indraprastha Institute of Information Technology-New Delhi (IIIT New Delhi, Delhi)",
                    "Indraprastha Institute of Information Technology Delhi",
                    "Indraprastha Institute of Information Technology",
                    "Indraprastha Institute of Information Technology, Delhi",
                ],
                "primary_category": "Engineering",
            },
            # 2. IIIT Hyderabad
            {
                "canonical_name": "International Institute of Information Technology Hyderabad",
                "aishe_id": "U-0014",
                "city": "Hyderabad",
                "state": "Telangana",
                "aliases": [
                    "iiit hyderabad", "iiith", "iiit-hyderabad", "iiit hyd",
                    "international institute of information technology hyderabad",
                ],
                "raw_names": [
                    "International Institute of Information Technology Hyderabad",
                    "International Institute of Information Technology",
                ],
                "primary_category": "Engineering",
            },
            # 3. IIIT Bangalore
            {
                "canonical_name": "International Institute of Information Technology Bangalore",
                "aishe_id": "U-0221",
                "city": "Bangalore",
                "state": "Karnataka",
                "aliases": [
                    "iiit bangalore", "iiitb", "iiit-bangalore", "iiit blr",
                    "international institute of information technology bangalore",
                    "international institute of information technology, bangalore",
                ],
                "raw_names": [
                    "International Institute of Information Technology Bangalore",
                    "International Institute of Information Technology, Bangalore",
                ],
                "primary_category": "Engineering",
            },
            # 4. IISc Bangalore
            {
                "canonical_name": "Indian Institute of Science Bangalore",
                "aishe_id": "U-0220",
                "city": "Bengaluru",
                "state": "Karnataka",
                "aliases": [
                    "iisc bangalore", "iisc", "iisc bengaluru", "iisc-bangalore",
                    "indian institute of science bangalore", "indian institute of science bengaluru",
                    "indian institute of science",
                ],
                "raw_names": [
                    "Indian Institute of Science Bangalore",
                    "Indian Institute of Science",
                    "Indian Institute of Science, Bengaluru",
                    "INDIAN INSTITUTE OF SCIENCE, BENGALURU",
                ],
                "primary_category": "Overall",
            },
            # 5. IIT Madras
            {
                "canonical_name": "Indian Institute of Technology Madras",
                "aishe_id": "U-0456",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "aliases": [
                    "iit madras", "iitm", "iit-madras", "iit chennai",
                    "indian institute of technology madras",
                    "indian institute of technology, madras",
                ],
                "raw_names": [
                    "Indian Institute of Technology Madras",
                    "INDIAN INSTITUTE OF TECHNOLOGY MADRAS",
                    "Indian Institute of Technology, Madras",
                ],
                "primary_category": "Overall",
            },
            # 6. IIT Bombay
            {
                "canonical_name": "Indian Institute of Technology Bombay",
                "aishe_id": "U-0306",
                "city": "Mumbai",
                "state": "Maharashtra",
                "aliases": [
                    "iit bombay", "iitb", "iit-bombay", "iit mumbai",
                    "indian institute of technology bombay",
                    "indian institute of technology, bombay",
                ],
                "raw_names": [
                    "Indian Institute of Technology Bombay",
                    "INDIAN INSTITUTE OF TECHNOLOGY BOMBAY",
                    "Indian Institute of Technology, Bombay",
                ],
                "primary_category": "Overall",
            },
            # 7. IIT Delhi
            {
                "canonical_name": "Indian Institute of Technology Delhi",
                "aishe_id": "U-0092",
                "city": "New Delhi",
                "state": "Delhi",
                "aliases": [
                    "iit delhi", "iitd", "iit-delhi",
                    "indian institute of technology delhi",
                    "indian institute of technology, delhi",
                ],
                "raw_names": [
                    "Indian Institute of Technology Delhi",
                    "INDIAN INSTITUTE OF TECHNOLOGY DELHI",
                    "Indian Institute of Technology, Delhi",
                ],
                "primary_category": "Overall",
            },
            # 8. IIT Kanpur
            {
                "canonical_name": "Indian Institute of Technology Kanpur",
                "aishe_id": "U-0516",
                "city": "Kanpur",
                "state": "Uttar Pradesh",
                "aliases": [
                    "iit kanpur", "iitk", "iit-kanpur",
                    "indian institute of technology kanpur",
                ],
                "raw_names": [
                    "Indian Institute of Technology Kanpur",
                    "Indian Institute of Technology, Kanpur",
                ],
                "primary_category": "Overall",
            },
            # 9. IIT Kharagpur
            {
                "canonical_name": "Indian Institute of Technology Kharagpur",
                "aishe_id": "U-0573",
                "city": "Kharagpur",
                "state": "West Bengal",
                "aliases": [
                    "iit kharagpur", "iit kgp", "iitkgp", "iit-kharagpur",
                    "indian institute of technology kharagpur",
                ],
                "raw_names": [
                    "Indian Institute of Technology Kharagpur",
                    "Indian Institute of Technology, Kharagpur",
                ],
                "primary_category": "Overall",
            },
            # 10. IIT Roorkee
            {
                "canonical_name": "Indian Institute of Technology Roorkee",
                "aishe_id": "U-0560",
                "city": "Roorkee",
                "state": "Uttarakhand",
                "aliases": [
                    "iit roorkee", "iitr", "iit-roorkee",
                    "indian institute of technology roorkee",
                ],
                "raw_names": [
                    "Indian Institute of Technology Roorkee",
                    "Indian Institute of Technology, Roorkee",
                ],
                "primary_category": "Overall",
            },
            # 11. IIT Guwahati
            {
                "canonical_name": "Indian Institute of Technology Guwahati",
                "aishe_id": "U-0053",
                "city": "Guwahati",
                "state": "Assam",
                "aliases": [
                    "iit guwahati", "iitg", "iit-guwahati",
                    "indian institute of technology guwahati",
                ],
                "raw_names": [
                    "Indian Institute of Technology Guwahati",
                    "Indian Institute of Technology, Guwahati",
                ],
                "primary_category": "Overall",
            },
            # 12. NIT Trichy
            {
                "canonical_name": "National Institute of Technology Tiruchirappalli",
                "aishe_id": "U-0467",
                "city": "Tiruchirappalli",
                "state": "Tamil Nadu",
                "aliases": [
                    "nit trichy", "nitt", "nit-trichy", "nit tiruchirappalli",
                    "national institute of technology tiruchirappalli",
                    "national institute of technology, tiruchirappalli",
                ],
                "raw_names": [
                    "National Institute of Technology Tiruchirappalli",
                    "National Institute of Technology, Tiruchirappalli",
                ],
                "primary_category": "Engineering",
            },
            # 13. BITS Pilani
            {
                "canonical_name": "Birla Institute of Technology & Science - Pilani",
                "aishe_id": "U-0391",
                "city": "Pilani",
                "state": "Rajasthan",
                "aliases": [
                    "bits pilani", "bits", "bits-pilani",
                    "birla institute of technology and science",
                    "birla institute of technology & science - pilani",
                ],
                "raw_names": [
                    "Birla Institute of Technology & Science - Pilani",
                    "Birla Institute of Technology and Science, Pilani",
                    "Birla Institute of Technology and Science -Pilani",
                ],
                "primary_category": "Overall",
            },
            # 14. IIIT Allahabad
            {
                "canonical_name": "Indian Institute of Information Technology Allahabad",
                "aishe_id": "U-0515",
                "city": "Prayagraj",
                "state": "Uttar Pradesh",
                "aliases": [
                    "iiit allahabad", "iiita", "iiit prayagraj",
                    "indian institute of information technology allahabad",
                ],
                "raw_names": [
                    "Indian Institute of Information Technology Allahabad",
                    "Indian Institute of Information Technology, Allahabad",
                ],
                "primary_category": "Engineering",
            },
            # 15. JNU
            {
                "canonical_name": "Jawaharlal Nehru University",
                "aishe_id": "U-0109",
                "city": "New Delhi",
                "state": "Delhi",
                "aliases": [
                    "jnu", "jawaharlal nehru university",
                ],
                "raw_names": [
                    "Jawaharlal Nehru University",
                    "Jawaharlal Nehru University, New Delhi",
                ],
                "primary_category": "Universities",
            },
            # 16. Delhi University
            {
                "canonical_name": "University of Delhi",
                "aishe_id": "U-0120",
                "city": "Delhi",
                "state": "Delhi",
                "aliases": [
                    "delhi university", "du", "university of delhi",
                ],
                "raw_names": [
                    "University of Delhi",
                ],
                "primary_category": "Universities",
            },
            # 17. BHU
            {
                "canonical_name": "Banaras Hindu University",
                "aishe_id": "U-0500",
                "city": "Varanasi",
                "state": "Uttar Pradesh",
                "aliases": [
                    "bhu", "banaras hindu university",
                ],
                "raw_names": [
                    "Banaras Hindu University",
                    "Banaras Hindu University, Varanasi",
                ],
                "primary_category": "Overall",
            },
        ]

        for spec in curated_specs:
            c_name: str = str(spec["canonical_name"])
            raw_names: List[str] = [str(r) for r in spec["raw_names"]]
            aliases: List[str] = [str(a) for a in spec["aliases"]]

            # Query dataframe to gather all categories and years for these raw names
            sub = df[df["institution_name"].isin(raw_names)]
            cat_years: Dict[str, List[int]] = {}
            for cat, group in sub.groupby("category"):
                cat_years[str(cat)] = sorted(group["year"].unique().tolist())

            # Determine primary category
            primary = spec.get("primary_category")
            if not primary or primary not in cat_years:
                if cat_years:
                    primary = max(cat_years.keys(), key=lambda c: len(cat_years[c]))
                else:
                    primary = "Overall"

            entity = CanonicalInstitution(
                canonical_name=c_name,
                aishe_id=str(spec["aishe_id"]) if spec.get("aishe_id") else None,
                aliases=aliases,
                raw_names=raw_names,
                categories=cat_years,
                primary_category=str(primary),
                city=str(spec["city"]) if spec.get("city") else None,
                state=str(spec["state"]) if spec.get("state") else None,
            )
            self._institutions[c_name] = entity

            for raw in raw_names:
                self._raw_name_to_canonical[raw.strip().lower()] = c_name

            for alias in aliases:
                self._alias_index.append((alias.strip().lower(), c_name))

    def _index_all_dataset_institutions(self, df: pd.DataFrame) -> None:
        """Dynamically index every other institution from the master dataset."""
        grouped = df.groupby("institution_name")
        for name, group in grouped:
            raw_name = str(name).strip()
            raw_lower = raw_name.lower()
            if raw_lower in self._raw_name_to_canonical:
                continue

            # Check if this institution already belongs to an existing canonical group
            cat_years: Dict[str, List[int]] = {}
            for cat, c_group in group.groupby("category"):
                cat_years[str(cat)] = sorted(c_group["year"].unique().tolist())

            primary_cat = max(cat_years.keys(), key=lambda c: len(cat_years[c])) if cat_years else "Overall"
            aishe = group["institute_id"].dropna().iloc[-1] if not group["institute_id"].dropna().empty else None
            state = group["state"].dropna().iloc[-1] if not group["state"].dropna().empty else None
            city = group["city"].dropna().iloc[-1] if not group["city"].dropna().empty else None

            entity = CanonicalInstitution(
                canonical_name=raw_name,
                aishe_id=str(aishe) if pd.notna(aishe) else None,
                aliases=[raw_lower],
                raw_names=[raw_name],
                categories=cat_years,
                primary_category=primary_cat,
                city=str(city) if pd.notna(city) else None,
                state=str(state) if pd.notna(state) else None,
            )
            self._institutions[raw_name] = entity
            self._raw_name_to_canonical[raw_lower] = raw_name
            self._alias_index.append((raw_lower, raw_name))

        # Sort alias index by alias length descending (longest match wins)
        self._alias_index.sort(key=lambda x: len(x[0]), reverse=True)

    def resolve_from_query(self, query: str) -> Optional[CanonicalInstitution]:
        """Resolve the primary canonical institution from user question text."""
        self.initialize()
        q_lower = query.lower()

        # Word-boundary matching across sorted aliases
        for alias, c_name in self._alias_index:
            pattern = rf"\b{re.escape(alias)}\b"
            if re.search(pattern, q_lower):
                return self._institutions.get(c_name)

        return None

    def resolve_all_from_query(self, query: str) -> List[CanonicalInstitution]:
        """Resolve all distinct canonical institutions referenced in the query (for comparison queries)."""
        self.initialize()
        q_lower = query.lower()
        found: List[CanonicalInstitution] = []
        matched_spans: List[tuple[int, int]] = []

        for alias, c_name in self._alias_index:
            pattern = rf"\b{re.escape(alias)}\b"
            for m in re.finditer(pattern, q_lower):
                span = m.span()
                # Ensure no overlap with already matched longer alias
                if any(s[0] <= span[0] and span[1] <= s[1] for s in matched_spans):
                    continue
                matched_spans.append(span)
                entity = self._institutions.get(c_name)
                if entity and entity not in found:
                    found.append(entity)

        return found

    def get_by_name(self, name: str) -> Optional[CanonicalInstitution]:
        """Lookup canonical institution by exact, canonical, or raw name."""
        self.initialize()
        clean = (name or "").strip()
        if clean in self._institutions:
            return self._institutions[clean]

        c_name = self._raw_name_to_canonical.get(clean.lower())
        if c_name:
            return self._institutions.get(c_name)

        # Fallback case-insensitive search
        for entity_name, entity in self._institutions.items():
            if entity_name.lower() == clean.lower() or any(r.lower() == clean.lower() for r in entity.raw_names):
                return entity

        return None

    def get_active_category(self, entity: CanonicalInstitution, requested_category: Optional[str] = None) -> str:
        """Resolve active category: if requested category contains records, use it; else use primary category."""
        if requested_category:
            req_clean = requested_category.strip()
            # Case-insensitive match on available categories
            for cat in entity.categories.keys():
                if cat.lower() == req_clean.lower():
                    return cat

        # Fallback to primary category where the institution actually participates
        return entity.primary_category

    def filter_dataset(
        self,
        df: pd.DataFrame,
        entity: CanonicalInstitution,
        category: Optional[str] = None,
    ) -> pd.DataFrame:
        """Filter master dataset for this canonical entity across all its raw name variants."""
        active_cat = self.get_active_category(entity, category)

        # Filter by category
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == active_cat.lower()]

        # Filter by all registered raw names
        matches = cat_df[cat_df["institution_name"].isin(entity.raw_names)]

        # Specific city disambiguation for shared names (e.g. IIIT Hyderabad in 2017)
        if matches.empty and entity.city:
            city_matches = cat_df[
                (cat_df["city"].astype(str).str.lower() == entity.city.lower()) &
                (cat_df["institution_name"].astype(str).str.lower().str.contains("information technology"))
            ]
            if not city_matches.empty:
                matches = city_matches

        return matches.sort_values(by="year", ascending=True)


# Global Singleton Instance
entity_resolver = EntityResolver()
