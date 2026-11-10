# NIRF Master Dataset — Data Dictionary & Specification

**Master Dataset Path:** `data/Processed/NIRF_Master_Dataset.csv`  
**Dataset Version:** 1.0.0  
**Longitudinal Range:** 2017 – 2025 (9 consecutive annual ranking editions)  
**Total Validated Records:** 6,572  
**Total Schema Columns:** 23  
**Unique Record Key:** `(year, category, institute_id)`

---

## 1. Column Inventory & Data Schema

The dataset contains exactly 23 columns capturing temporal, categorical, institutional, geographic, performance, and source lineage attributes.

| # | Column Name | Physical Type | Logical Type | Missing Count | Missing % | Unique Count | Range / Domain | Description & Usage |
|---|---|---|---|---|---|---|---|---|
| 1 | `year` | `int64` | Temporal | 0 | 0.00% | 9 | 2017 – 2025 | Academic cycle edition year of publication. |
| 2 | `category` | `string` | Categorical | 0 | 0.00% | 17 | 17 disciplines | Standardized NIRF ranking category. |
| 3 | `institute_id` | `string` | Identifier | 0 | 0.00% | 2,055 | `IR-[A-Z]-[A-Z]-[0-9]+` | Official unique alphanumeric institutional code issued by NIRF. |
| 4 | `institution_name` | `string` | Text | 0 | 0.00% | 1,223 | Entity names | Cleaned official name of the ranked institution. |
| 5 | `city` | `string` | Geographic | 0 | 0.00% | 352 | City names | Municipal or metropolitan location of campus. |
| 6 | `state` | `string` | Geographic | 0 | 0.00% | 32 | 32 States & UTs | Standardized Indian State or Union Territory name. |
| 7 | `rank` | `int64` | Ordinal | 0 | 0.00% | 100 | 1 – 100 | Published rank in edition. Supports tied ranks. |
| 8 | `numeric_rank` | `int64` | Numeric | 0 | 0.00% | 100 | 1 – 100 | Numeric equivalent for mathematical operations and sorting. |
| 9 | `overall_score` | `float64` | Quantitative | 53 | 0.81% | 3,019 | 32.99 – 94.46 | Composite weighted score calculated out of 100. |
| 10 | `tlr_score` | `float64` | Quantitative | 303 | 4.61% | 3,016 | 22.61 – 98.47 | Teaching, Learning & Resources score (out of 100). |
| 11 | `rpc_score` | `float64` | Quantitative | 303 | 4.61% | 3,859 | 0.00 – 100.00 | Research and Professional Practice score (out of 100). |
| 12 | `go_score` | `float64` | Quantitative | 303 | 4.61% | 3,325 | 5.46 – 100.00 | Graduation Outcomes score (out of 100). |
| 13 | `oi_score` | `float64` | Quantitative | 53 | 0.81% | 2,935 | 7.98 – 96.45 | Outreach and Inclusivity score (out of 100). |
| 14 | `pr_score` | `float64` | Quantitative | 53 | 0.81% | 3,209 | 0.00 – 100.00 | Perception score based on peer surveys (out of 100). |
| 15 | `qnr_score` | `float64` | Quantitative | 6,322 | 96.20% | 247 | 26.15 – 98.88 | Quantitative Research Output score (Research Institutions only). |
| 16 | `qlr_score` | `float64` | Quantitative | 6,322 | 96.20% | 242 | 23.91 – 96.00 | Quality of Publications and Citations score (Research Institutions only). |
| 17 | `sfc_score` | `float64` | Quantitative | 6,322 | 96.20% | 245 | 35.67 – 89.76 | Students and Faculty Capacity score (Research Institutions only). |
| 18 | `original_parameter_names` | `string` | Metadata | 53 | 0.81% | 2 | Parameter strings | Exact parameter headers published in source ranking tables. |
| 19 | `source_url` | `string` | Provenance | 0 | 0.00% | 102 | URL strings | Official MHRD / NIRF portal URL where rankings were published. |
| 20 | `source_category` | `string` | Provenance | 0 | 0.00% | 17 | Category strings | Origin directory category identifier. |
| 21 | `source_year` | `int64` | Provenance | 0 | 0.00% | 9 | 2017 – 2025 | Origin directory edition year. Matches `year`. |
| 22 | `source_file` | `string` | Provenance | 0 | 0.00% | 102 | File path | Relative file path in `data/Raw/` from which row was parsed. |
| 23 | `data_collection_date` | `string` | Provenance | 0 | 0.00% | 102 | ISO 8601 UTC | Exact ingestion timestamp of raw CSV creation. |

---

## 2. Parameter Structures & Discipline Nuances

NIRF employs two distinct parametric evaluation frameworks across disciplines:

### 2.1 Standard 5-Parameter Framework (16 Disciplines)
Applies to **Overall**, **Universities**, **Colleges**, **Engineering**, **Management**, **Pharmacy**, **Medical**, **Dental**, **Law**, **Architecture and Planning**, **Agriculture and Allied Sectors**, and **State Public University**:
- **TLR (`tlr_score`)**: Teaching, Learning & Resources (faculty-student ratio, faculty credentials, financial resources).
- **RPC (`rpc_score`)**: Research and Professional Practice (publications, quality of publications, IPR, projects).
- **GO (`go_score`)**: Graduation Outcomes (university examinations, median salary, Ph.D. students graduated).
- **OI (`oi_score`)**: Outreach and Inclusivity (regional diversity, female diversity, economically/socially challenged students, facilities for physically challenged students).
- **PR (`pr_score`)**: Perception (academic peer and employer perception).

### 2.2 Research Framework (Research Institutions Category Only)
Introduced in 2021, the **Research Institutions** category (250 records across 2021–2025) replaces TLR, RPC, and GO with specialized research metrics:
- **QNR (`qnr_score`)**: Quantitative Research (volume of publications indexed in Scopus / Web of Science).
- **QLR (`qlr_score`)**: Quality of Publications (citation impact, top percentile publications, H-index).
- **SFC (`sfc_score`)**: Students and Faculty Capacity (doctoral scholars enrolled, research funding).
- Together with **OI (`oi_score`)** and **PR (`pr_score`)**.

### 2.3 Unscored / Rank-Only Categories (53 Records with Null Scores)
Certain specialized categories published by NIRF omit granular parameter score tables:
- **Innovation** (30 records, 2023–2025): Rank published; overall score and parameters null.
- **Sustainable Development Goals** (10 records, 2025): Published as ranks without numeric parameter breakdowns.
- **Open University** (6 records, 2024–2025): Evaluated by rank without composite score breakdown.
- **Skill University** (6 records, 2024–2025): Evaluated by rank without composite score breakdown.
- **Dental** (1 isolated record in 2020 where NIRF published rank without parameters).

---

## 3. Category Availability Across Time (2017–2025)

The matrix below documents the exact record counts per category per year. Analytics modules **must never assume** all categories exist across all cycles:

| Category | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | Total Records |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Colleges** | 100 | 99 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | **899** |
| **Engineering** | 100 | 98 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | **898** |
| **Management** | 50 | 50 | 75 | 75 | 75 | 101 | 100 | 100 | 100 | **726** |
| **Overall** | 100 | 100 | 100 | 101 | 100 | 100 | 100 | 100 | 100 | **901** |
| **Pharmacy** | 50 | 49 | 75 | 75 | 75 | 101 | 100 | 100 | 101 | **726** |
| **Universities** | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | **900** |
| **Architecture and Planning** | 0 | 10 | 15 | 20 | 25 | 30 | 30 | 40 | 40 | **210** |
| **Law** | 0 | 10 | 15 | 20 | 30 | 30 | 30 | 40 | 40 | **215** |
| **Medical** | 0 | 25 | 30 | 40 | 50 | 50 | 50 | 50 | 50 | **345** |
| **Dental** | 0 | 0 | 0 | 30 | 40 | 40 | 40 | 40 | 40 | **230** |
| **Research Institutions** | 0 | 0 | 0 | 0 | 50 | 50 | 50 | 50 | 50 | **250** |
| **Agriculture and Allied Sectors** | 0 | 0 | 0 | 0 | 0 | 0 | 40 | 40 | 40 | **120** |
| **Innovation** | 0 | 0 | 0 | 0 | 0 | 0 | 10 | 10 | 10 | **30** |
| **Open University** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | **6** |
| **Skill University** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | **6** |
| **State Public University** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | 50 | **100** |
| **Sustainable Development Goals** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 10 | **10** |
| **Annual Totals** | **500** | **541** | **610** | **661** | **745** | **802** | **850** | **926** | **937** | **6,572** |

---

## 4. Geographic Distribution (32 States & UTs)

The dataset encompasses educational institutions located across 32 States and Union Territories:
1. Andhra Pradesh
2. Arunachal Pradesh
3. Assam
4. Bihar
5. Chandigarh
6. Chhattisgarh
7. Delhi
8. Goa
9. Gujarat
10. Haryana
11. Himachal Pradesh
12. Jammu and Kashmir
13. Jharkhand
14. Karnataka
15. Kerala
16. Madhya Pradesh
17. Maharashtra
18. Manipur
19. Meghalaya
20. Mizoram
21. Nagaland
22. Odisha
23. Puducherry
24. Punjab
25. Rajasthan
26. Sikkim
27. Tamil Nadu
28. Telangana
29. Tripura
30. Uttar Pradesh
31. Uttarakhand
32. West Bengal

---

## 5. Ranking Representation & Tied Ranks

- **Top 100 Scope**: In compliance with official NIRF guidelines for core analytical tables, all records possess an exact integer rank between 1 and 100.
- **Tied Ranks**: When multiple institutions record the exact same composite score, NIRF assigns them tied ranks (e.g., two institutions sharing Rank 28). Both institutions are retained as separate rows distinguished by their unique `institute_id`.
- **Rank Inversion for Charting**: In all time-series and ranking visualizations, the Y-axis must be inverted such that Rank 1 appears at the top of the chart and Rank 100 at the bottom.

---

## 6. Ground Truth Reconciliation vs Third-Party Discrepancies

- **Confirmed Ground Truth**: The Master Dataset contains exactly **6,572 records** corresponding 1:1 with the 102 source ranking CSV files in `data/Raw/`.
- **Root Cause of Third-Party Row Counts (e.g., 6,967 rows)**: Official NIRF web portals occasionally append rank bands (e.g. 101–150, 151–200) for select categories. Third-party scrapes that scraped partial rank band pages accumulated ~395 additional rows. The DHV platform mandate explicitly limits analytics to the verified Top 100 cohort where granular parameters are systematically available.

