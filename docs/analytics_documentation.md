# NIRF Analytics Dashboard — Analytical Methodology & Documentation

**Platform:** DHV Analytical Platform  
**Dataset:** `data/Processed/NIRF_Master_Dataset.csv` (2017–2025)  
**Reference Document:** Mathematical formulations, analytical logic, tab definitions, and chart specifications.

---

## 1. Overview & Core Mathematical Definitions

### 1.1 Notation
- $C$: Category chosen from $\{ c_1, c_2, \dots, c_{17} \}$
- $Y$: Academic ranking cycle year $Y \in \{ 2017, 2018, \dots, 2025 \}$
- $I$: Unique institution identified by `institute_id`
- $R(I, C, Y)$: Rank assigned to institution $I$ in category $C$ for year $Y$ ($1 \le R \le 100$)
- $S(I, C, Y)$: Overall composite score ($0 \le S \le 100$)
- $P_k(I, C, Y)$: Parameter score for $k \in \{ \text{TLR}, \text{RPC}, \text{GO}, \text{OI}, \text{PR} \}$

---

## 2. Executive Overview Module

### 2.1 Macro KPI Calculations
When a user selects a category $C$ (or all categories) and year $Y$:
1. **Total Records**:  
   $$N_{\text{records}} = |\{ (I, C, Y) \in \mathcal{D} \}|$$
2. **Institutions**:  
   $$N_{\text{inst}} = |\{ \text{distinct } I \in \mathcal{D} \}|$$
3. **States & UTs**:  
   $$N_{\text{states}} = |\{ \text{distinct } \text{state}(I) \in \mathcal{D} \}|$$
4. **Years Covered**:  
   $$\text{Span} = [\min(Y), \max(Y)] \quad \text{and} \quad N_{\text{cycles}} = |\{ \text{distinct } Y \}|$$
5. **Categories**:  
   $$N_{\text{cat}} = |\{ \text{distinct } C \in \mathcal{D} \}|$$

### 2.2 Top 10 Institutions Table
- Filter: Records matching selected $(C, Y)$.
- Sort: Ascending by `numeric_rank` (Rank 1 to 10).
- Columns Displayed:
  - `Rank`: Styled numeric pill badge (Rank 1–10).
  - `NAME`: Clean institutional name.
  - `Score`: Overall composite score rounded to 2 decimal places.
  - `STATE`: Geographic state/UT.
  - `TLR (Teaching)`: Teaching, Learning and Resources score.
  - `RPC (Research)`: Research and Professional Practice score.

### 2.3 Score Distribution Histogram
- Engine: Plotly.js (`histogram` trace).
- Binning: Automatic Freedman-Diaconis or uniform bin size = 2.0 or 2.5 points across $0 \le S \le 100$.
- X-Axis: "NIRF Overall Score (0–100)"
- Y-Axis: "Number of Institutions"
- Color Palette: Vibrant blue (`#2563EB`).

---

## 3. Time-Series & Trend Analysis (Longitudinal 2017–2025)

### 3.1 Tab Q1.1: Trajectory
- **Purpose**: Trace the longitudinal performance of a single institution across all available years.
- **Selector**: Dropdown list of institutions present in the active category.
- **Plotly Chart**:
  - X-Axis: Academic Years ($2017 \dots 2025$).
  - Y-Axis (Rank): **Inverted scale** (Rank 1 displayed at top, higher ranks downward).
  - Mode: Markers + Lines with royal blue styling (`#2563EB`), hovertemplate with year, rank, and score.
- **Tabular View**:
  - Full historical record table with search filter (`YEAR`, `Rank`, `Score`, `TLR`, `RPC`, `GO`, `OI`, `PR`).

### 3.2 Tab Q1.2: Improvements (Top Rank Gainers)
- **Mathematical Formula**:
  For an institution present in both $Y_{\text{start}}$ and $Y_{\text{end}}$:
  $$\Delta \text{Rank} = R(I, C, Y_{\text{start}}) - R(I, C, Y_{\text{end}})$$
  *(Positive value indicates rank improvement, e.g., Rank 85 in 2017 $\to$ Rank 35 in 2025 yields $\Delta \text{Rank} = +50$)*.
- **Metrics Displayed**:
  - Rank at start year, Rank at end year, $\Delta \text{Rank}$, $\Delta \text{Score}$.
- **Visualization**: Horizontal diverging bar chart highlighting top positive movers.

### 3.3 Tab Q1.3: Declines (Rank Regressions)
- **Mathematical Formula**:
  $$\Delta \text{Rank}_{\text{regress}} = R(I, C, Y_{\text{end}}) - R(I, C, Y_{\text{start}})$$
  *(Institutions dropping the most ranks over the specified interval)*.
- **Visualization**: Negative bar chart with muted red/coral styling (`#EF4444`).

### 3.4 Tab Q1.4: Average Score Trend
- **Mathematical Formula**:
  For each year $Y \in [2017, 2025]$ in category $C$:
  $$\mu(Y) = \frac{1}{N_Y} \sum_{i=1}^{N_Y} S_i(Y), \quad \text{IQR}(Y) = Q_3(Y) - Q_1(Y)$$
- **Visualization**: Line chart with shaded confidence/interquartile ribbon showing macro performance evolution of the discipline.

### 3.5 Tab Q1.5: Consistent Top Performers
- **Criterion**:
  Institutions maintaining $R(I, C, Y) \le K$ (where $K \in \{10, 25, 50\}$) across 100% of available editions.
- **Output**: Benchmark table with volatility metrics:
  $$\sigma_{\text{Rank}} = \sqrt{\frac{1}{N} \sum_{t=1}^N (R_t - \bar{R})^2}$$

---

## 4. Geospatial & Regional Intelligence

### 4.1 Tab Q2.1: Top States by Institution Count
- **Formula**:
  Count of Top-100 institutions located in state $s$:
  $$N_s(C, Y) = \sum_{i \in \mathcal{D}(C, Y)} \mathbb{I}(\text{state}(i) = s)$$
- **KPI Badges**:
  1. *Leading State*: $\arg\max_s N_s$ and count.
  2. *Total States Represented*: $|\{ s : N_s > 0 \}|$.
  3. *Top 3 Concentration*:
     $$\text{Concentration}_{\text{Top3}} = \frac{\sum_{k=1}^3 N_{(k)}}{\sum_{\text{all } s} N_s} \times 100\%$$
- **Chart**: Vertical bar chart sorted descending, with exact counts rendered above bars and rotated state labels.

### 4.2 Tab Q2.2: Distribution Trend
- **Formula**:
  Year-over-year stacked distribution showing geographic dispersion over time.
- **Visualization**: Stacked bar or multi-line area chart showing regional diversification.

### 4.3 Tab Q2.3: State Growth
- **Formula**:
  $$\Delta N_s = N_s(Y_{\text{end}}) - N_s(Y_{\text{start}}), \quad \text{Growth } \% = \frac{\Delta N_s}{N_s(Y_{\text{start}})} \times 100\%$$

### 4.4 Tab Q2.4: Compare States
- **Functionality**: Side-by-side comparative analysis of two selected states across average score, total institutions, and average parameter strengths (`TLR`, `RPC`, `GO`, `OI`, `PR`).

### 4.5 Tab Q2.5: Newly Appearing States
- **Definition**:
  States whose institutions debuted in the Top-100 rankings in year $Y_{\text{debut}} > 2017$.

---

## 5. Univariate & Distribution Analysis

- **Metrics Computed**: Mean, Median, Standard Deviation, Skewness, Kurtosis, Interquartile Range ($Q_3 - Q_1$).
- **Visualizations**:
  - Boxplots displaying median line, Tukey whiskers ($1.5 \times \text{IQR}$), and individual outlier dots.
  - Kernel Density Estimation (KDE) curve overlaid on distribution histograms.

---

## 6. Bivariate & Correlation Analysis

### 6.1 Pearson & Spearman Matrices
- Pearson Linear Correlation:
  $$r_{xy} = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2 \sum (y_i - \bar{y})^2}}$$
- Spearman Rank-Order Correlation:
  $$\rho = 1 - \frac{6 \sum d_i^2}{n(n^2 - 1)}$$
- Parameters Analyzed: `[overall_score, tlr_score, rpc_score, go_score, oi_score, pr_score]`.
- Visualization: Interactive Plotly heatmap with diverging color scale.

### 6.2 Key Analytical Scatter Plots
1. **Teaching vs Research (`tlr_score` vs `rpc_score`)**: Highlights institutions with heavy research emphasis vs teaching focus.
2. **Perception vs Performance (`pr_score` vs `overall_score`)**: Detects perception bias vs objective metrics.
3. **Score vs Rank**: Inverse non-linear decay curve displaying the competitive density at the top.

---

## 7. Multivariate Analysis

- **Polar Radar Charts**: Spider diagram with 5 spokes representing normalized parameter scores (`TLR`, `RPC`, `GO`, `OI`, `PR`).
- Allows overlaying a specific institution's profile against the category benchmark mean.
- **Parallel Coordinates Plot**: Multidimensional path connecting an institution's score across all 5 parameters.

---

## 8. Ranking Transitions & Volatility

- **Rank Volatility Index (RVI)**:
  $$\text{RVI}(I) = \frac{1}{T-1} \sum_{t=2}^T |R(I, t) - R(I, t-1)|$$
- **Transition Quartile Matrix**: 
  $4 \times 4$ Markovian transition table tracking movements between:
  - Tier 1: Ranks 1 – 25
  - Tier 2: Ranks 26 – 50
  - Tier 3: Ranks 51 – 75
  - Tier 4: Ranks 76 – 100

---

## 9. Outlier Detection & Performance Gaps (Q8.1 – Q8.5)

### 9.1 Q8.1 Research Outliers (Regression Residuals)
- Fits Ordinary Least Squares (OLS) regression line $\text{RPC} = m \cdot \text{Score} + c$.
- Calculates residuals $\epsilon_i = y_i - \hat{y}_i$.
- Evaluates $Z$-scores $z_i = (\epsilon_i - \bar{\epsilon}) / \sigma_\epsilon$ and IQR boundaries ($Q_1 - 1.5\text{IQR}, Q_3 + 1.5\text{IQR}$) to identify statistically unexpected research surprises.

### 9.2 Q8.2 Research vs. Teaching Divergence Gap
- Computes parameter gap: $\text{Gap}_i = \text{RPC}_i - \text{TLR}_i$.
- Measures divergence against cohort mean and identifies institutions whose research output significantly decouples from teaching resources.

### 9.3 Q8.3 Year-to-Year Score Change Outliers
- Tracks longitudinal score shifts using canonical entity IDs across consecutive years: $\Delta S_t = S_t - S_{t-1}$.
- Flags extreme jumps ($z \ge +2.0$) and severe drops ($z \le -2.0$).

### 9.4 Q8.4 Strong Parameter, Poor Overall Rank
- Screens institutions in ranks $\ge 50$ despite having one or more core pillars (RPC, TLR, GO, OI, PR) exceeding the 60th cohort percentile.

### 9.5 Q8.5 Multi-Year Ranking Volatility
- Computes standard deviation $\sigma_{\text{rank}}$ and mean absolute shift for institutions present $\ge 4$ years, isolating structurally erratic entities.

---

## 10. Dynamic Data Explorer

- **Dataset Slicers**: Faceted filtering by Category, Year, State, Institution substring, Rank boundary, and Score boundary.
- **Variable Mapping**: Independent mapping of X-axis, Y-axis, Group, Discrete/Continuous Color, and Bubble Size dimensions.
- **14 Supported Chart Formats**:
  1. Bar Chart
  2. Grouped Bar Chart
  3. Stacked Bar Chart
  4. Line Chart
  5. Scatter Plot (with OLS trendline)
  6. Histogram (adjustable bins)
  7. Box Plot
  8. Violin Plot
  9. Heatmap Matrix (cross-tabulation)
  10. Correlation Heatmap (Pearson correlation matrix)
  11. Radar Chart (5-pillar institutional diagnostics)
  12. Pie / Donut Chart
  13. Area Chart
  14. Parallel Coordinates (multi-dimensional axes)
- **Automated Recommendation**: Rule-based engine analyzing variable data types (numerical vs categorical), cardinality, and analytical goal (trend, distribution, correlation, composition, comparison, multivariate).
- **Data Export**: High-resolution PNG chart image download and CSV dataset export.

---

## 11. Conversational Intelligence ("Ask NIRF Data")

- **Deterministic Fallback Engine**: Tokenizes and identifies categories, ranking years, year spans, states, institutions, and evaluation parameters without hallucination.
- **Core Intent Handlers**:
  1. `STATE_LEADERSHIP`: State-wise institution count and geographic concentration.
  2. `TOP_N_INSTITUTIONS`: Ranked entities and scores.
  3. `INSTITUTION_TRAJECTORY`: Multi-year rank and score lines.
  4. `STATE_COMPARISON`: Pairwise state comparison across representation and pillar scores.
  5. `PARAMETER_CORRELATION`: Ranking parameters by correlation with overall score.
  6. `RESEARCH_VS_TEACHING`: Institutions with research-forward divergence.
  7. `RANK_IMPROVEMENTS`: Largest historical climbers across editions.
  8. `SCORE_DISTRIBUTION`: Binned score frequencies, mean, and dispersion.
  9. `TOP_10_ENTRIES_EXITS`: Annual turnover, entrants, and exits in top 10.
  10. `TOP_FIVE_COMPARISON`: 5-parameter spider/radar comparison.
- **Embedded Visualization**: Directly generates Plotly chart specifications rendered inline within the conversation thread.
- **Interactive Suggestions**: Dynamic follow-up suggestion chips to guide user exploration.

