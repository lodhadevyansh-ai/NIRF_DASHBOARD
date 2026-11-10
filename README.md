# NIRF Analytics Dashboard (2017–2025)

An institutional intelligence and analytics dashboard engineered to analyze, explore, and visualize 9 annual cycles (2017–2025) of official **National Institutional Ranking Framework (NIRF)** rankings published by the Ministry of Education, Government of India.

---

## 1. System Architecture & Tech Stack

- **Backend Core**: Python 3.11+, FastAPI (asynchronous ASGI framework), Pandas, NumPy, SciPy, Scikit-learn.
- **Frontend SPA**: React 19, Vite 8, Lucide React icons, Plotly.js (`plotly.js-dist-min`), CSS custom properties matching DHV corporate analytics aesthetic.
- **Data Layer**: Cleaned, verified master dataset at `data/Processed/NIRF_Master_Dataset.csv` (6,572 records across 17 categories, 32 states/UTs, 2017–2025).
- **Conversational Intelligence**: Natural Language Query (NLQ) engine with deterministic parsing fallback, intent recognition, entity extraction, and automated Plotly visualization rendering.

---

## 2. Platform Modules & Capabilities

### Dashboard & Core Navigation
- **Executive Overview**: High-level macro statistics (Total Records: 6,572, Unique Institutions: 1,223, States: 32, Years Covered: 2017–2025, Categories: 17), Top 10 institutions table, Score distribution histogram, and Category summary matrix.

### Longitudinal & Statistical Analytics (Annexure A — 40 Questions)
1. **Time-Series & Trend Analysis (Q1.1 – Q1.5)**: Institution trajectory line charts, ranking improvements (+68 places for Saveetha), declines, longitudinal score movements, and top-tier consistency tracking.
2. **Geospatial & State Intelligence (Q2.1 – Q2.5)**: Top state representation (Tamil Nadu leader with 17% concentration), longitudinal geographic shifts, state-level growth metrics, pairwise state comparison, and newly entering institutions.
3. **Univariate Analysis (Q3.1 – Q3.5)**: Score distribution histograms with dynamic bins, rank distribution, parameter descriptive statistics, box plots, quartiles, and category spreads.
4. **Bivariate Analysis & Correlation (Q4.1 – Q4.5)**: RPC vs. Overall Score ($r = 0.8881$), PR vs. Overall Score ($r = 0.8530$), parameter correlation hierarchy, TLR vs. RPC divergence, and multi-year correlation stability.
5. **Multivariate Analysis (Q5.1 – Q5.5)**: Top 5 radar comparisons across all 5 parameters (TLR, RPC, GO, OI, PR), research-forward institutions, teaching-perception gaps, score gains despite parameter declines, and multi-dimensional parallel coordinates.
6. **Distribution & Statistical Comparison (Q6.1 – Q6.5)**: Top 10 vs. remaining institutions ($+20.99$ pt difference), score dispersion trends, coefficient of variation (PR highest variability at $87.8\%$), median/IQR shifts, and state-wise score distributions.
7. **Ranking Transitions & Institutional Mobility (Q7.1 – Q7.5)**: Rank band transitions (51–100 into Top 50), Top 10 turnover ($90\%$ retention rate), band retention Sankey/Matrix visualizations, and annual mobility rates.
8. **Outlier Detection & Performance Gaps (Q8.1 – Q8.5)**: OLS linear regression residuals for research outliers, research vs. teaching divergence, year-to-year score change outliers (Savitribai Phule Pune Univ drop, IIT Patna jump), high parameter/lagging rank screening, and multi-year ranking volatility ($\sigma_{\text{rank}}$).

### Self-Service Exploration & Intelligence
9. **Dynamic Data Explorer**:
   - Faceted slicing: Category, Year, State, Institution Search, Rank range, Score range.
   - Variable Mapping: X-axis, Y-axis, Group, Color, and Bubble Size.
   - 14 Chart Formats: Bar, Grouped Bar, Stacked Bar, Line, Scatter, Histogram, Box, Violin, Heatmap, Correlation Heatmap, Radar, Pie, Area, Parallel Coordinates.
   - Intelligent Automated Chart Recommender.
   - CSV Export and High-Resolution PNG download.
   - Full descriptive statistics and live searchable data table.
10. **Ask NIRF Data (NLQ Engine)**:
    - Conversational queries in natural language with entity and intent extraction.
    - Deterministic parsing fallback with zero hallucination.
    - Embedded Plotly charts inside chat messages.
    - Contextual follow-up suggestions.

---

## 3. Visual Analytics & Dashboard Gallery

Visual captures of the government-themed interface and deep analytical modules are organized in the [`Screenshots/`](Screenshots/) folder:

- **Geospatial & Regional Intelligence (Q2.3 & Q2.4)**:
  - State growth trajectories & pairwise state performance comparisons: [`Screenshots/2.3(1).png`](Screenshots/2.3(1).png), [`Screenshots/2.3(2).png`](Screenshots/2.3(2).png)
  - Longitudinal state representation & newly entering institutions: [`Screenshots/2.4(1).png`](Screenshots/2.4(1).png), [`Screenshots/2.4(2).png`](Screenshots/2.4(2).png)
- **Multivariate Radar Profiling (Q5.3)**:
  - Multi-parameter trade-offs & teaching-perception divergence: [`Screenshots/5.3(1).png`](Screenshots/5.3(1).png), [`Screenshots/5.3(2).png`](Screenshots/5.3(2).png)
- **Ranking Transitions & Institutional Mobility (Q7.1)**:
  - Rank band shifts & multi-year institutional mobility matrices: [`Screenshots/7.1(1).png`](Screenshots/7.1(1).png), [`Screenshots/7.1(2).png`](Screenshots/7.1(2).png)

---

## 4. Installation & Setup

### Prerequisites
- Python 3.11 or higher
- Node.js 18+ and npm
- Windows / macOS / Linux

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

---

## 5. Execution Commands

### Running with Two Terminals

#### Terminal 1 — Backend API Server
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

#### Terminal 2 — Frontend Application
```bash
cd frontend
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 6. Verification & Test Suites

Run the complete 12 backend test suites:
```bash
# From workspace root
Get-ChildItem tests/backend/test_*.py | ForEach-Object {
    Write-Host "=== Running $($_.Name) ==="
    & backend\venv\Scripts\python.exe $_.FullName
}
```

Verify frontend production build:
```bash
npm --prefix frontend run build
```

---

## 7. License & Data Attribution
Data sourced from the National Institutional Ranking Framework (NIRF), Ministry of Education, Government of India (2017–2025).
Developed for academic, research, and institutional performance intelligence.

