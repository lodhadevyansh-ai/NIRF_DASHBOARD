"""NIRF Analytics Dashboard — Ranking Transitions & Institutional Mobility Service.

Provides computational engines for:
- Q7.1 Rank Band Movement & Sankey Flow (51–100 to Top 50, Between Bands, Exits/Entrants)
- Q7.2 Top 10 Entries and Exits Between Editions
- Q7.3 Rank Band Retention Rates & Markov Transition Matrix
- Q7.4 Largest Climbers and Fallers (Rank Delta & Score Movements)
- Q7.5 Institutional Mobility Over Time (Up, Down, Retained Annual Shares)

Uses official NIRF `institute_id` as the canonical entity key to guarantee exact matching
across editions despite textual variations in published institution names.
"""

import logging
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd

from app.core.database import dataset_manager
from app.schemas.analytics import (
    AnnualMobilityItem,
    BandMovementResponse,
    BandRetentionStat,
    BandTransitionItem,
    InstitutionRankMovementItem,
    InstitutionalMobilityResponse,
    LargestMovementsResponse,
    SankeyData,
    SankeyLink,
    SankeyNode,
    Top10EntryExitResponse,
    Top10MemberItem,
    TransitionMatrixCell,
    TransitionRetentionResponse,
)

logger = logging.getLogger("nirf_backend.analytics.ranking_transitions")

CORE_BANDS = ["1–10", "11–25", "26–50", "51–100"]

BAND_ORDER = {
    "1–10": 1,
    "11–25": 2,
    "26–50": 3,
    "51–100": 4,
}


def classify_band(numeric_rank: float) -> str:
    """Assign an institutional numerical rank into standard NIRF bands."""
    if numeric_rank <= 10:
        return "1–10"
    elif numeric_rank <= 25:
        return "11–25"
    elif numeric_rank <= 50:
        return "26–50"
    elif numeric_rank <= 100:
        return "51–100"
    return "101+"


class RankingTransitionsService:
    """Service computing rank band movements, volatility, and institutional transitions."""

    def __init__(self) -> None:
        pass

    def _get_df(self) -> pd.DataFrame:
        """Fetch preloaded master dataset."""
        return dataset_manager.load_dataset()

    def get_band_movement(
        self,
        category: str = "Overall",
        start_year: int = 2023,
        end_year: int = 2025,
    ) -> BandMovementResponse:
        """Q7.1: Analyze institutional movements across rank bands and generate Sankey flows."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]

        start_df = cat_df[cat_df["year"] == start_year].copy()
        end_df = cat_df[cat_df["year"] == end_year].copy()

        if start_df.empty or end_df.empty:
            return BandMovementResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                total_evaluated=0,
                common_count=0,
                new_entrants_count=0,
                exited_count=0,
                band51_100_to_top50_count=0,
                band51_100_to_top50_institutions=[],
                transitions=[],
                sankey_data=SankeyData(nodes=[], links=[]),
                exited_institutions=[],
                new_entrants=[],
            )

        # Build lookup maps keyed by institute_id
        start_map: Dict[str, Dict[str, Any]] = {}
        for _, row in start_df.iterrows():
            iid = str(row["institute_id"]).strip()
            name = str(row["institution_name"]).strip()
            r = float(row["numeric_rank"])
            start_map[iid] = {
                "name": name,
                "rank": int(r),
                "band": classify_band(r),
                "score": float(row.get("overall_score", 0.0)),
                "state": str(row.get("state", "")),
            }

        end_map: Dict[str, Dict[str, Any]] = {}
        for _, row in end_df.iterrows():
            iid = str(row["institute_id"]).strip()
            name = str(row["institution_name"]).strip()
            r = float(row["numeric_rank"])
            end_map[iid] = {
                "name": name,
                "rank": int(r),
                "band": classify_band(r),
                "score": float(row.get("overall_score", 0.0)),
                "state": str(row.get("state", "")),
            }

        start_ids = set(start_map.keys())
        end_ids = set(end_map.keys())

        common_ids = start_ids.intersection(end_ids)
        exited_ids = sorted(list(start_ids - end_ids))
        new_ids = sorted(list(end_ids - start_ids))

        exited_names = [start_map[i]["name"] for i in exited_ids]
        new_names = [end_map[i]["name"] for i in new_ids]

        # Check Q7.1 focus: 51–100 into top 50 (1–10, 11–25, 26–50)
        top50_bands = {"1–10", "11–25", "26–50"}
        band51_to_top50_insts: List[str] = []

        # Count pair transitions: (source_band, target_band) -> list of names
        transition_buckets: Dict[Tuple[str, str], List[str]] = {}

        for iid in common_ids:
            s_item = start_map[iid]
            e_item = end_map[iid]
            s_band = s_item["band"]
            e_band = e_item["band"]
            name = e_item["name"]
            pair = (s_band, e_band)
            transition_buckets.setdefault(pair, []).append(name)

            if s_band == "51–100" and e_band in top50_bands:
                band51_to_top50_insts.append(
                    f"{name} (#{s_item['rank']} -> #{e_item['rank']})"
                )

        # Exits from start_year
        for iid in exited_ids:
            s_item = start_map[iid]
            s_band = s_item["band"]
            pair = (s_band, "Exited")
            transition_buckets.setdefault(pair, []).append(s_item["name"])

        # New entrants into end_year
        for iid in new_ids:
            e_item = end_map[iid]
            e_band = e_item["band"]
            pair = ("New Entrant", e_band)
            transition_buckets.setdefault(pair, []).append(e_item["name"])

        transitions_list: List[BandTransitionItem] = []
        total_eval = len(start_ids.union(end_ids))

        for (s_b, t_b), insts in sorted(
            transition_buckets.items(), key=lambda x: (x[0][0], x[0][1])
        ):
            transitions_list.append(
                BandTransitionItem(
                    source_band=s_b,
                    target_band=t_b,
                    count=len(insts),
                    percentage=round((len(insts) / (total_eval or 1)) * 100, 1),
                    sample_institutions=insts[:4],
                )
            )

        # Build Sankey Nodes & Links
        src_labels = [f"{b} ({start_year})" for b in CORE_BANDS] + ["New Entrants"]
        tgt_labels = [f"{b} ({end_year})" for b in CORE_BANDS] + ["Exited Ranking"]

        sankey_nodes = (
            [SankeyNode(name=lbl, category="source") for lbl in src_labels]
            + [SankeyNode(name=lbl, category="target") for lbl in tgt_labels]
        )

        node_index_map: Dict[str, int] = {}
        for idx, lbl in enumerate(src_labels):
            node_index_map[lbl] = idx
        offset = len(src_labels)
        for idx, lbl in enumerate(tgt_labels):
            node_index_map[lbl] = offset + idx

        sankey_links: List[SankeyLink] = []

        for (s_b, t_b), insts in transition_buckets.items():
            if s_b == "New Entrant":
                src_key = "New Entrants"
            else:
                src_key = f"{s_b} ({start_year})"

            if t_b == "Exited":
                tgt_key = "Exited Ranking"
            else:
                tgt_key = f"{t_b} ({end_year})"

            if src_key in node_index_map and tgt_key in node_index_map:
                s_idx = node_index_map[src_key]
                t_idx = node_index_map[tgt_key]
                val = len(insts)
                if val > 0:
                    sankey_links.append(
                        SankeyLink(
                            source=s_idx,
                            target=t_idx,
                            value=val,
                            label=f"{s_b} → {t_b}: {val} institutions",
                        )
                    )

        return BandMovementResponse(
            category=category,
            start_year=start_year,
            end_year=end_year,
            total_evaluated=total_eval,
            common_count=len(common_ids),
            new_entrants_count=len(new_ids),
            exited_count=len(exited_ids),
            band51_100_to_top50_count=len(band51_to_top50_insts),
            band51_100_to_top50_institutions=band51_to_top50_insts,
            transitions=transitions_list,
            sankey_data=SankeyData(nodes=sankey_nodes, links=sankey_links),
            exited_institutions=exited_names,
            new_entrants=new_names,
        )

    def get_top10_entry_exit(
        self,
        category: str = "Overall",
        start_year: int = 2024,
        end_year: int = 2025,
    ) -> Top10EntryExitResponse:
        """Q7.2: Identify institutions entering, exiting, or retaining membership in the elite Top 10."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]

        start_df = cat_df[cat_df["year"] == start_year].copy()
        end_df = cat_df[cat_df["year"] == end_year].copy()

        if start_df.empty or end_df.empty:
            return Top10EntryExitResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                entrants=[],
                exits=[],
                retained=[],
                stability_rate=0.0,
                turnover_count=0,
            )

        # Full rank lookups by institute_id
        start_lookup = {
            str(r["institute_id"]).strip(): {
                "name": str(r["institution_name"]).strip(),
                "rank": int(r["numeric_rank"]),
                "score": float(r.get("overall_score", 0.0)),
                "state": str(r.get("state", "")),
            }
            for _, r in start_df.iterrows()
        }

        end_lookup = {
            str(r["institute_id"]).strip(): {
                "name": str(r["institution_name"]).strip(),
                "rank": int(r["numeric_rank"]),
                "score": float(r.get("overall_score", 0.0)),
                "state": str(r.get("state", "")),
            }
            for _, r in end_df.iterrows()
        }

        # Top 10 subsets
        t10_start_df = start_df[start_df["numeric_rank"] <= 10].sort_values(by="numeric_rank")
        t10_end_df = end_df[end_df["numeric_rank"] <= 10].sort_values(by="numeric_rank")

        t10_start_ids = set(str(i).strip() for i in t10_start_df["institute_id"])
        t10_end_ids = set(str(i).strip() for i in t10_end_df["institute_id"])

        retained_ids = t10_start_ids.intersection(t10_end_ids)
        exited_ids = t10_start_ids - t10_end_ids
        entrant_ids = t10_end_ids - t10_start_ids

        retained_items: List[Top10MemberItem] = []
        for iid in sorted(retained_ids, key=lambda i: end_lookup[i]["rank"]):
            e_item = end_lookup[iid]
            s_item = start_lookup[iid]
            retained_items.append(
                Top10MemberItem(
                    institution_name=e_item["name"],
                    rank=e_item["rank"],
                    score=e_item["score"],
                    state=e_item["state"],
                    previous_rank=s_item["rank"],
                    status="retained",
                    rank_delta=s_item["rank"] - e_item["rank"],
                )
            )

        entrant_items: List[Top10MemberItem] = []
        for iid in sorted(entrant_ids, key=lambda i: end_lookup[i]["rank"]):
            e_item = end_lookup[iid]
            prev_rank = start_lookup[iid]["rank"] if iid in start_lookup else None
            delta = (prev_rank - e_item["rank"]) if prev_rank else None
            entrant_items.append(
                Top10MemberItem(
                    institution_name=e_item["name"],
                    rank=e_item["rank"],
                    score=e_item["score"],
                    state=e_item["state"],
                    previous_rank=prev_rank,
                    status="new_entrant",
                    rank_delta=delta,
                )
            )

        exit_items: List[Top10MemberItem] = []
        for iid in sorted(exited_ids, key=lambda i: start_lookup[i]["rank"]):
            s_item = start_lookup[iid]
            new_rank = end_lookup[iid]["rank"] if iid in end_lookup else None
            delta = (s_item["rank"] - new_rank) if new_rank else None
            exit_items.append(
                Top10MemberItem(
                    institution_name=s_item["name"],
                    rank=s_item["rank"],
                    score=s_item["score"],
                    state=s_item["state"],
                    previous_rank=new_rank,
                    status="exited",
                    rank_delta=delta,
                )
            )

        stability = round((len(retained_ids) / 10.0) * 100, 1)

        return Top10EntryExitResponse(
            category=category,
            start_year=start_year,
            end_year=end_year,
            entrants=entrant_items,
            exits=exit_items,
            retained=retained_items,
            stability_rate=stability,
            turnover_count=len(entrant_items),
        )

    def get_band_retention(
        self,
        category: str = "Overall",
        start_year: int = 2023,
        end_year: int = 2025,
    ) -> TransitionRetentionResponse:
        """Q7.3: Calculate rank band retention percentages and construct Markov transition matrix."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]

        start_df = cat_df[cat_df["year"] == start_year].copy()
        end_df = cat_df[cat_df["year"] == end_year].copy()

        if start_df.empty or end_df.empty:
            return TransitionRetentionResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                total_institutions=0,
                overall_retention_pct=0.0,
                overall_upward_pct=0.0,
                overall_downward_pct=0.0,
                overall_exit_pct=0.0,
                band_stats=[],
                matrix_bands=CORE_BANDS + ["Exited"],
                matrix_cells=[],
            )

        start_map = {
            str(r["institute_id"]).strip(): classify_band(float(r["numeric_rank"]))
            for _, r in start_df.iterrows()
        }
        end_map = {
            str(r["institute_id"]).strip(): classify_band(float(r["numeric_rank"]))
            for _, r in end_df.iterrows()
        }

        matrix_bands = CORE_BANDS + ["Exited"]
        grid_counts: Dict[Tuple[str, str], int] = {
            (sb, tb): 0 for sb in CORE_BANDS for tb in matrix_bands
        }

        band_stats_map: Dict[str, Dict[str, int]] = {
            b: {"start": 0, "retained": 0, "up": 0, "down": 0, "exited": 0}
            for b in CORE_BANDS
        }

        total_insts = len(start_map)
        overall_retained = 0
        overall_up = 0
        overall_down = 0
        overall_exited = 0

        for iid, s_band in start_map.items():
            if s_band not in band_stats_map:
                continue

            band_stats_map[s_band]["start"] += 1

            if iid in end_map and end_map[iid] in CORE_BANDS:
                e_band = end_map[iid]
                grid_counts[(s_band, e_band)] += 1

                s_order = BAND_ORDER.get(s_band, 99)
                e_order = BAND_ORDER.get(e_band, 99)

                if s_band == e_band:
                    band_stats_map[s_band]["retained"] += 1
                    overall_retained += 1
                elif e_order < s_order:
                    band_stats_map[s_band]["up"] += 1
                    overall_up += 1
                else:
                    band_stats_map[s_band]["down"] += 1
                    overall_down += 1
            else:
                grid_counts[(s_band, "Exited")] += 1
                band_stats_map[s_band]["exited"] += 1
                overall_exited += 1

        band_stats_list: List[BandRetentionStat] = []
        for b in CORE_BANDS:
            st = band_stats_map[b]
            cnt = st["start"] or 1
            band_stats_list.append(
                BandRetentionStat(
                    band=b,
                    start_count=st["start"],
                    retained_count=st["retained"],
                    retention_pct=round((st["retained"] / cnt) * 100, 1),
                    upward_count=st["up"],
                    upward_pct=round((st["up"] / cnt) * 100, 1),
                    downward_count=st["down"],
                    downward_pct=round((st["down"] / cnt) * 100, 1),
                    exited_count=st["exited"],
                    exited_pct=round((st["exited"] / cnt) * 100, 1),
                )
            )

        matrix_cells: List[TransitionMatrixCell] = []
        for sb in CORE_BANDS:
            row_total = band_stats_map[sb]["start"] or 1
            for tb in matrix_bands:
                c = grid_counts.get((sb, tb), 0)
                matrix_cells.append(
                    TransitionMatrixCell(
                        source_band=sb,
                        target_band=tb,
                        count=c,
                        percentage=round((c / row_total) * 100, 1),
                    )
                )

        denom = total_insts or 1
        return TransitionRetentionResponse(
            category=category,
            start_year=start_year,
            end_year=end_year,
            total_institutions=total_insts,
            overall_retention_pct=round((overall_retained / denom) * 100, 1),
            overall_upward_pct=round((overall_up / denom) * 100, 1),
            overall_downward_pct=round((overall_down / denom) * 100, 1),
            overall_exit_pct=round((overall_exited / denom) * 100, 1),
            band_stats=band_stats_list,
            matrix_bands=matrix_bands,
            matrix_cells=matrix_cells,
        )

    def get_largest_movements(
        self,
        category: str = "Overall",
        start_year: int = 2023,
        end_year: int = 2025,
        limit: int = 10,
    ) -> LargestMovementsResponse:
        """Q7.4: Identify institutions with the largest upward (climbers) and downward (fallers) movements."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]

        start_df = cat_df[cat_df["year"] == start_year].copy()
        end_df = cat_df[cat_df["year"] == end_year].copy()

        if start_df.empty or end_df.empty:
            return LargestMovementsResponse(
                category=category,
                start_year=start_year,
                end_year=end_year,
                largest_climbers=[],
                largest_fallers=[],
                total_evaluated=0,
            )

        start_map = {
            str(r["institute_id"]).strip(): r for _, r in start_df.iterrows()
        }
        end_map = {
            str(r["institute_id"]).strip(): r for _, r in end_df.iterrows()
        }

        common_ids = set(start_map.keys()).intersection(set(end_map.keys()))
        movements: List[InstitutionRankMovementItem] = []

        for iid in common_ids:
            s_row = start_map[iid]
            e_row = end_map[iid]

            name = str(e_row["institution_name"]).strip()
            s_rank = int(s_row["numeric_rank"])
            e_rank = int(e_row["numeric_rank"])
            delta_rank = s_rank - e_rank

            s_score = float(s_row.get("overall_score", 0.0))
            e_score = float(e_row.get("overall_score", 0.0))
            delta_score = round(e_score - s_score, 2)

            movements.append(
                InstitutionRankMovementItem(
                    institution_name=name,
                    state=str(e_row.get("state", s_row.get("state", ""))),
                    city=str(e_row.get("city", s_row.get("city", ""))),
                    start_rank=s_rank,
                    end_rank=e_rank,
                    rank_delta=delta_rank,
                    start_score=s_score,
                    end_score=e_score,
                    score_delta=delta_score,
                )
            )

        climbers = sorted(
            [m for m in movements if m.rank_delta > 0],
            key=lambda x: x.rank_delta,
            reverse=True,
        )[:limit]

        fallers = sorted(
            [m for m in movements if m.rank_delta < 0],
            key=lambda x: x.rank_delta,
        )[:limit]

        return LargestMovementsResponse(
            category=category,
            start_year=start_year,
            end_year=end_year,
            largest_climbers=climbers,
            largest_fallers=fallers,
            total_evaluated=len(common_ids),
        )

    def get_institutional_mobility(
        self,
        category: str = "Overall",
    ) -> InstitutionalMobilityResponse:
        """Q7.5: Historical mobility tracking (Up, Down, Retained percentages for each consecutive year pair)."""
        df = self._get_df()
        cat_df = df[df["category"].astype(str).str.strip().str.lower() == category.strip().lower()]

        years = sorted(cat_df["year"].unique())
        cycles: List[AnnualMobilityItem] = []

        for i in range(len(years) - 1):
            s_yr = int(years[i])
            e_yr = int(years[i + 1])

            s_df = cat_df[cat_df["year"] == s_yr]
            e_df = cat_df[cat_df["year"] == e_yr]

            s_map = {
                str(r["institute_id"]).strip(): int(r["numeric_rank"])
                for _, r in s_df.iterrows()
            }
            e_map = {
                str(r["institute_id"]).strip(): int(r["numeric_rank"])
                for _, r in e_df.iterrows()
            }

            s_ids = set(s_map.keys())
            e_ids = set(e_map.keys())

            common = s_ids.intersection(e_ids)
            new_entrants = len(e_ids - s_ids)
            exited = len(s_ids - e_ids)

            up_count = 0
            down_count = 0
            retained_count = 0
            shifts: List[int] = []

            for iid in common:
                s_r = s_map[iid]
                e_r = e_map[iid]
                delta = s_r - e_r
                shifts.append(abs(delta))

                if delta > 0:
                    up_count += 1
                elif delta < 0:
                    down_count += 1
                else:
                    retained_count += 1

            total_c = len(common) or 1
            avg_shift = round(float(np.mean(shifts)), 2) if shifts else 0.0

            cycles.append(
                AnnualMobilityItem(
                    year_pair=f"{s_yr}–{e_yr}",
                    start_year=s_yr,
                    end_year=e_yr,
                    total_common=len(common),
                    moved_up_count=up_count,
                    moved_up_pct=round((up_count / total_c) * 100, 1),
                    moved_down_count=down_count,
                    moved_down_pct=round((down_count / total_c) * 100, 1),
                    retained_count=retained_count,
                    retained_pct=round((retained_count / total_c) * 100, 1),
                    average_absolute_shift=avg_shift,
                    new_entrants_count=new_entrants,
                    exited_count=exited,
                )
            )

        if cycles:
            avg_up = round(float(np.mean([c.moved_up_pct for c in cycles])), 1)
            avg_down = round(float(np.mean([c.moved_down_pct for c in cycles])), 1)
            avg_ret = round(float(np.mean([c.retained_pct for c in cycles])), 1)
        else:
            avg_up = 0.0
            avg_down = 0.0
            avg_ret = 0.0

        return InstitutionalMobilityResponse(
            category=category,
            cycles=cycles,
            average_upward_pct=avg_up,
            average_downward_pct=avg_down,
            average_retained_pct=avg_ret,
        )


# Global singleton instance
ranking_transitions_service = RankingTransitionsService()
