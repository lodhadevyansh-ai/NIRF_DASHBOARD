/**
 * NIRF Analytics Dashboard — Statistical Analysis & Distribution Module.
 *
 * Implements:
 * - Q6.1 Top 10 vs Remaining: Comparative box plots, violin densities, and full statistical scorecard.
 * - Q6.2 Score Dispersion: Longitudinal tracking of Variance, Std Dev, IQR, and CV across editions.
 * - Q6.3 Parameter Variability: Ranking evaluation parameters by relative variability (CV %) and box plots.
 * - Q6.4 Median & IQR Trend: Longitudinal median trajectory with interquartile dispersion ribbon bands.
 * - Q6.5 State Score Distribution: Geographic box and violin distributions across Indian states.
 */

import React, { useEffect, useState, useMemo } from 'react'
import {
  Activity,
  Award,
  ChevronDown,
  Filter,
  Info,
  Layers,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import { api } from '../services/api'
import { StatisticsTabs } from '../components/analytics/StatisticsTabs'
import { StatisticalBoxPlot } from '../components/charts/StatisticalBoxPlot'
import { ViolinPlot } from '../components/charts/ViolinPlot'
import { ChartContainer } from '../components/charts/ChartContainer'
import { Loading } from '../components/common/Loading'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import '../styles/analytics.css'

export function Statistics() {
  const { category, selectedYear, availableYears } = useFilters()

  // Sub-navigation tab state
  const [activeTab, setActiveTab] = useState('top10-comparison')

  // Global year bounds
  const minAvailableYear = availableYears && availableYears.length ? Math.min(...availableYears) : 2017
  const maxAvailableYear = availableYears && availableYears.length ? Math.max(...availableYears) : 2025

  // ---------------------------------------------------------------------------
  // Tab 1: Top 10 vs Remaining State (Q6.1)
  // ---------------------------------------------------------------------------
  const [top10Year, setTop10Year] = useState(selectedYear || maxAvailableYear)
  const [top10View, setTop10View] = useState('dual') // 'dual', 'box', 'violin'
  const [top10Data, setTop10Data] = useState(null)
  const [top10Loading, setTop10Loading] = useState(false)
  const [top10Error, setTop10Error] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 2: Score Dispersion State (Q6.2)
  // ---------------------------------------------------------------------------
  const [dispersionData, setDispersionData] = useState(null)
  const [dispersionLoading, setDispersionLoading] = useState(false)
  const [dispersionError, setDispersionError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 3: Parameter Variability State (Q6.3)
  // ---------------------------------------------------------------------------
  const [variabilityYear, setVariabilityYear] = useState(selectedYear || maxAvailableYear)
  const [variabilityData, setVariabilityData] = useState(null)
  const [variabilityLoading, setVariabilityLoading] = useState(false)
  const [variabilityError, setVariabilityError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 4: Median & IQR Trend State (Q6.4)
  // ---------------------------------------------------------------------------
  const [trendData, setTrendData] = useState(null)
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 5: State Distribution State (Q6.5)
  // ---------------------------------------------------------------------------
  const [stateYear, setStateYear] = useState(selectedYear || maxAvailableYear)
  const [minInstitutions, setMinInstitutions] = useState(2)
  const [stateView, setStateView] = useState('box') // 'box', 'violin'
  const [stateData, setStateData] = useState(null)
  const [stateLoading, setStateLoading] = useState(false)
  const [stateError, setStateError] = useState(null)

  // Sync year defaults when global filter changes
  useEffect(() => {
    if (selectedYear) {
      setTop10Year(selectedYear)
      setVariabilityYear(selectedYear)
      setStateYear(selectedYear)
    }
  }, [category, selectedYear])

  // ---------------------------------------------------------------------------
  // Fetchers
  // ---------------------------------------------------------------------------
  const fetchTop10 = async () => {
    setTop10Loading(true)
    setTop10Error(null)
    try {
      const res = await api.getTop10Comparison(category, top10Year)
      setTop10Data(res)
    } catch (err) {
      setTop10Error(err.message || 'Failed to fetch Top 10 comparison.')
    } finally {
      setTop10Loading(false)
    }
  }

  const fetchDispersion = async () => {
    setDispersionLoading(true)
    setDispersionError(null)
    try {
      const res = await api.getScoreDispersion(category)
      setDispersionData(res)
    } catch (err) {
      setDispersionError(err.message || 'Failed to fetch score dispersion.')
    } finally {
      setDispersionLoading(false)
    }
  }

  const fetchVariability = async () => {
    setVariabilityLoading(true)
    setVariabilityError(null)
    try {
      const res = await api.getParameterVariability(category, variabilityYear)
      setVariabilityData(res)
    } catch (err) {
      setVariabilityError(err.message || 'Failed to fetch parameter variability.')
    } finally {
      setVariabilityLoading(false)
    }
  }

  const fetchTrend = async () => {
    setTrendLoading(true)
    setTrendError(null)
    try {
      const res = await api.getMedianIqrTrend(category)
      setTrendData(res)
    } catch (err) {
      setTrendError(err.message || 'Failed to fetch median & IQR trend.')
    } finally {
      setTrendLoading(false)
    }
  }

  const fetchStateDistribution = async () => {
    setStateLoading(true)
    setStateError(null)
    try {
      const res = await api.getStateDistribution(category, stateYear, minInstitutions)
      setStateData(res)
    } catch (err) {
      setStateError(err.message || 'Failed to fetch state score distribution.')
    } finally {
      setStateLoading(false)
    }
  }

  // Effect hooks triggers
  useEffect(() => {
    if (activeTab === 'top10-comparison') fetchTop10()
  }, [category, top10Year, activeTab])

  useEffect(() => {
    if (activeTab === 'score-dispersion') fetchDispersion()
  }, [category, activeTab])

  useEffect(() => {
    if (activeTab === 'parameter-variability') fetchVariability()
  }, [category, variabilityYear, activeTab])

  useEffect(() => {
    if (activeTab === 'median-iqr-trend') fetchTrend()
  }, [category, activeTab])

  useEffect(() => {
    if (activeTab === 'state-distribution') fetchStateDistribution()
  }, [category, stateYear, minInstitutions, activeTab])

  // ---------------------------------------------------------------------------
  // Render Tab 1: Top 10 vs Remaining (Q6.1)
  // ---------------------------------------------------------------------------
  const renderTop10 = () => {
    if (top10Loading) return <Loading message="Computing Top 10 vs Remaining distribution..." />
    if (top10Error) return <ErrorState message={top10Error} onRetry={fetchTop10} />
    if (!top10Data) return null

    const { top10_stats, remaining_stats, mean_difference, median_difference, year } = top10Data

    const groups = [
      {
        name: 'Top 10 Institutions',
        scores: top10_stats.scores,
        color: '#2563eb',
      },
      {
        name: 'Remaining Cohort (Rank 11+)',
        scores: remaining_stats.scores,
        color: '#64748b',
      },
    ]

    const metricsTable = [
      { label: 'Observations (n)', t10: top10_stats.observations, rem: remaining_stats.observations, diff: '-' },
      { label: 'Mean Score (x̄)', t10: top10_stats.mean.toFixed(2), rem: remaining_stats.mean.toFixed(2), diff: `+${mean_difference.toFixed(2)}` },
      { label: 'Median Score (Q2)', t10: top10_stats.median.toFixed(2), rem: remaining_stats.median.toFixed(2), diff: `+${median_difference.toFixed(2)}` },
      { label: 'Mode (Peak)', t10: top10_stats.mode !== null ? top10_stats.mode.toFixed(1) : 'N/A', rem: remaining_stats.mode !== null ? remaining_stats.mode.toFixed(1) : 'N/A', diff: '-' },
      { label: 'Standard Deviation (s)', t10: top10_stats.std_dev.toFixed(2), rem: remaining_stats.std_dev.toFixed(2), diff: (top10_stats.std_dev - remaining_stats.std_dev).toFixed(2) },
      { label: 'Variance (s²)', t10: top10_stats.variance.toFixed(2), rem: remaining_stats.variance.toFixed(2), diff: (top10_stats.variance - remaining_stats.variance).toFixed(2) },
      { label: 'Minimum Score', t10: top10_stats.min.toFixed(2), rem: remaining_stats.min.toFixed(2), diff: `+${(top10_stats.min - remaining_stats.min).toFixed(2)}` },
      { label: 'Maximum Score', t10: top10_stats.max.toFixed(2), rem: remaining_stats.max.toFixed(2), diff: `+${(top10_stats.max - remaining_stats.max).toFixed(2)}` },
      { label: 'First Quartile (Q1)', t10: top10_stats.q1.toFixed(2), rem: remaining_stats.q1.toFixed(2), diff: `+${(top10_stats.q1 - remaining_stats.q1).toFixed(2)}` },
      { label: 'Third Quartile (Q3)', t10: top10_stats.q3.toFixed(2), rem: remaining_stats.q3.toFixed(2), diff: `+${(top10_stats.q3 - remaining_stats.q3).toFixed(2)}` },
      { label: 'Interquartile Range (IQR)', t10: top10_stats.iqr.toFixed(2), rem: remaining_stats.iqr.toFixed(2), diff: (top10_stats.iqr - remaining_stats.iqr).toFixed(2) },
      { label: 'Coefficient of Variation (CV %)', t10: top10_stats.cv ? `${top10_stats.cv.toFixed(1)}%` : 'N/A', rem: remaining_stats.cv ? `${remaining_stats.cv.toFixed(1)}%` : 'N/A', diff: '-' },
      { label: 'Skewness (Fisher-Pearson)', t10: top10_stats.skewness !== null ? top10_stats.skewness.toFixed(2) : 'N/A', rem: remaining_stats.skewness !== null ? remaining_stats.skewness.toFixed(2) : 'N/A', diff: '-' },
      { label: 'Kurtosis (Excess)', t10: top10_stats.kurtosis !== null ? top10_stats.kurtosis.toFixed(2) : 'N/A', rem: remaining_stats.kurtosis !== null ? remaining_stats.kurtosis.toFixed(2) : 'N/A', diff: '-' },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Award size={18} color="#2563eb" />
              <span>Q6.1 Top 10 vs Remaining Score Distribution Comparison</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: How does the score distribution differ between the top 10 and remaining institutions?
            </div>
          </div>
          <span className="rank-badge-neutral">Category: {category}</span>
        </div>

        {/* Controls */}
        <div className="analytics-controls-bar">
          <div className="analytics-control-group">
            <span className="analytics-control-label">Edition Year:</span>
            <select
              className="analytics-select"
              value={top10Year}
              onChange={(e) => setTop10Year(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="analytics-control-group">
            <span className="analytics-control-label">Plot View:</span>
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${top10View === 'dual' ? 'active' : ''}`}
                onClick={() => setTop10View('dual')}
              >
                Dual View
              </button>
              <button
                type="button"
                className={`view-mode-btn ${top10View === 'box' ? 'active' : ''}`}
                onClick={() => setTop10View('box')}
              >
                Box Plot
              </button>
              <button
                type="button"
                className={`view-mode-btn ${top10View === 'violin' ? 'active' : ''}`}
                onClick={() => setTop10View('violin')}
              >
                Violin Density
              </button>
            </div>
            <button
              type="button"
              className="analytics-refresh-btn"
              onClick={fetchTop10}
              title="Refresh comparison"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Top 10 Mean Score</div>
            <div className="analytics-metric-val" style={{ color: '#2563eb' }}>
              {top10_stats.mean.toFixed(2)} pts
            </div>
            <div className="analytics-metric-sub">Median: {top10_stats.median.toFixed(2)} pts</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Remaining Mean Score</div>
            <div className="analytics-metric-val" style={{ color: '#64748b' }}>
              {remaining_stats.mean.toFixed(2)} pts
            </div>
            <div className="analytics-metric-sub">Median: {remaining_stats.median.toFixed(2)} pts</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Mean Score Gap</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              +{mean_difference.toFixed(2)} pts
            </div>
            <div className="analytics-metric-sub">Top 10 performance premium</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Dispersion Contrast</div>
            <div className="analytics-metric-val">
              {top10_stats.iqr.toFixed(1)} vs {remaining_stats.iqr.toFixed(1)}
            </div>
            <div className="analytics-metric-sub">IQR Top 10 vs Remaining</div>
          </div>
        </div>

        {/* Charts Section */}
        {top10View === 'dual' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="nirf-card" style={{ padding: 18 }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                Box Plot with Quartiles &amp; Outliers ({year})
              </h4>
              <StatisticalBoxPlot
                groups={groups}
                title=""
                xAxisTitle="Institutional Cohort"
                yAxisTitle="NIRF Overall Score (0–100)"
                height={380}
              />
            </div>
            <div className="nirf-card" style={{ padding: 18 }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                Violin Kernel Density Estimation ({year})
              </h4>
              <ViolinPlot
                groups={groups}
                title=""
                xAxisTitle="Institutional Cohort"
                yAxisTitle="NIRF Overall Score (0–100)"
                height={380}
              />
            </div>
          </div>
        )}

        {top10View === 'box' && (
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              Score Distribution Box Plot: Top 10 vs Remaining ({year})
            </h4>
            <StatisticalBoxPlot
              groups={groups}
              title=""
              xAxisTitle="Institutional Cohort"
              yAxisTitle="NIRF Overall Score (0–100)"
              height={440}
            />
          </div>
        )}

        {top10View === 'violin' && (
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              Violin Density Plot: Top 10 vs Remaining ({year})
            </h4>
            <ViolinPlot
              groups={groups}
              title=""
              xAxisTitle="Institutional Cohort"
              yAxisTitle="NIRF Overall Score (0–100)"
              height={440}
            />
          </div>
        )}

        {/* Comprehensive Statistics Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Parametric &amp; Non-Parametric Comparative Statistics ({year})
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th>Statistical Metric</th>
                  <th style={{ textAlign: 'right', color: '#2563eb' }}>Top 10 Institutions</th>
                  <th style={{ textAlign: 'right', color: '#64748b' }}>Remaining Cohort (Rank 11+)</th>
                  <th style={{ textAlign: 'right' }}>Disparity (&Delta;)</th>
                </tr>
              </thead>
              <tbody>
                {metricsTable.map((row) => (
                  <tr key={row.label}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{row.label}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{row.t10}</td>
                    <td style={{ textAlign: 'right', color: '#334155' }}>{row.rem}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{row.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytical Note */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <Info size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.82rem', color: '#1e3a8a', lineHeight: 1.55 }}>
            <strong>Distribution Gap Interpretation:</strong> The score curve exhibits extreme steepness at the top tier.
            The Top 10 institutions hold an average score of {top10_stats.mean.toFixed(1)}, operating in a separate
            performance regime from rank 11 onwards. Notice the sharp gap of +{mean_difference.toFixed(1)} points in
            mean score and +{median_difference.toFixed(1)} points in median.
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 2: Score Dispersion (Q6.2)
  // ---------------------------------------------------------------------------
  const renderScoreDispersion = () => {
    if (dispersionLoading) return <Loading message="Calculating longitudinal score dispersion..." />
    if (dispersionError) return <ErrorState message={dispersionError} onRetry={fetchDispersion} />
    if (!dispersionData) return null

    const {
      yearly_dispersions,
      max_dispersion_year,
      min_dispersion_year,
      max_std_dev,
      min_std_dev,
    } = dispersionData

    // Chart traces: Std Dev line, Variance bar or IQR line
    const years = yearly_dispersions.map((d) => d.year)
    const stdDevs = yearly_dispersions.map((d) => d.std_dev)
    const iqrs = yearly_dispersions.map((d) => d.iqr)
    const cvs = yearly_dispersions.map((d) => d.cv || 0)

    const dispersionTraces = [
      {
        x: years,
        y: stdDevs,
        name: 'Standard Deviation (s)',
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#2563eb', width: 2.5 },
        marker: { size: 7, color: '#2563eb' },
        hovertemplate: '<b>%{x}</b><br>Std Dev: <b>%{y:.2f}</b> pts<extra></extra>',
      },
      {
        x: years,
        y: iqrs,
        name: 'Interquartile Range (IQR)',
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#10b981', width: 2.2, dash: 'dot' },
        marker: { size: 6, color: '#10b981' },
        hovertemplate: '<b>%{x}</b><br>IQR: <b>%{y:.2f}</b> pts<extra></extra>',
      },
      {
        x: years,
        y: cvs,
        name: 'Coefficient of Variation (%)',
        type: 'scatter',
        mode: 'lines+markers',
        yaxis: 'y2',
        line: { color: '#f59e0b', width: 2 },
        marker: { size: 6, color: '#f59e0b' },
        hovertemplate: '<b>%{x}</b><br>CV: <b>%{y:.1f}%</b><extra></extra>',
      },
    ]

    const dispersionLayout = {
      height: 400,
      margin: { l: 50, r: 50, t: 30, b: 50 },
      xaxis: {
        title: { text: 'NIRF Ranking Edition Year', font: { size: 12, color: '#475569' } },
        tickmode: 'linear',
        dtick: 1,
        gridcolor: '#f1f5f9',
      },
      yaxis: {
        title: { text: 'Dispersion in Points (Std Dev & IQR)', font: { size: 12, color: '#2563eb' } },
        gridcolor: '#f1f5f9',
      },
      yaxis2: {
        title: { text: 'Coefficient of Variation (%)', font: { size: 12, color: '#f59e0b' } },
        overlaying: 'y',
        side: 'right',
        showgrid: false,
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        y: -0.2,
        xanchor: 'center',
        yanchor: 'top',
        font: { size: 11, color: '#334155' },
      },
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Activity size={18} color="#2563eb" />
              <span>Q6.2 Score Dispersion Across Ranking Editions</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Are NIRF scores more dispersed in one year than another?
            </div>
          </div>
          <span className="rank-badge-neutral">Category: {category}</span>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Peak Dispersion Edition</div>
            <div className="analytics-metric-val" style={{ color: '#ea580c' }}>
              {max_dispersion_year}
            </div>
            <div className="analytics-metric-sub">Max Std Dev: {max_std_dev.toFixed(2)} pts</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Most Clustered Edition</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              {min_dispersion_year}
            </div>
            <div className="analytics-metric-sub">Min Std Dev: {min_std_dev.toFixed(2)} pts</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Dispersion Range</div>
            <div className="analytics-metric-val">
              {(max_std_dev - min_std_dev).toFixed(2)} pts
            </div>
            <div className="analytics-metric-sub">Std Dev variance spread</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Editions Tracked</div>
            <div className="analytics-metric-val">{yearly_dispersions.length} Years</div>
            <div className="analytics-metric-sub">2017 to 2025 longitudinal span</div>
          </div>
        </div>

        {/* Dispersion Chart */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            Longitudinal Score Dispersion: Std Dev, IQR &amp; Relative Spread (CV %)
          </h4>
          <ChartContainer data={dispersionTraces} layout={dispersionLayout} style={{ height: 400 }} />
        </div>

        {/* Detailed Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Year-by-Year Dispersion Metrics ({category})
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Obs (n)</th>
                  <th style={{ textAlign: 'right' }}>Mean</th>
                  <th style={{ textAlign: 'right' }}>Median</th>
                  <th style={{ textAlign: 'right' }}>Std Dev</th>
                  <th style={{ textAlign: 'right' }}>Variance</th>
                  <th style={{ textAlign: 'right' }}>IQR</th>
                  <th style={{ textAlign: 'right' }}>CV (%)</th>
                  <th style={{ textAlign: 'right' }}>Min</th>
                  <th style={{ textAlign: 'right' }}>Max</th>
                  <th style={{ textAlign: 'right' }}>Range</th>
                  <th style={{ textAlign: 'right' }}>Skewness</th>
                </tr>
              </thead>
              <tbody>
                {yearly_dispersions.map((row) => (
                  <tr key={row.year}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.year}</td>
                    <td>{row.observations}</td>
                    <td style={{ textAlign: 'right' }}>{row.mean.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{row.median.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                      {row.std_dev.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{row.variance.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                      {row.iqr.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#f59e0b' }}>
                      {row.cv ? `${row.cv.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{row.min.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>{row.max.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>{row.range.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {row.skewness !== null ? row.skewness.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 3: Parameter Variability (Q6.3)
  // ---------------------------------------------------------------------------
  const renderParameterVariability = () => {
    if (variabilityLoading) return <Loading message="Evaluating parameter variability..." />
    if (variabilityError) return <ErrorState message={variabilityError} onRetry={fetchVariability} />
    if (!variabilityData) return null

    const { parameters, highest_cv_parameter, lowest_cv_parameter, year } = variabilityData

    // Bar chart for CV
    const labels = parameters.map((p) => p.parameter_label)
    const cvs = parameters.map((p) => p.cv || 0)
    const stdDevs = parameters.map((p) => p.std_dev)

    const cvBarTrace = {
      x: cvs,
      y: labels,
      type: 'bar',
      orientation: 'h',
      marker: {
        color: cvs.map((v, i) => (i === 0 ? '#dc2626' : '#2563eb')),
        opacity: 0.85,
      },
      hovertemplate: '<b>%{y}</b><br>CV: <b>%{x:.1f}%</b><extra></extra>',
    }

    const cvBarLayout = {
      height: 380,
      margin: { l: 200, r: 30, t: 25, b: 45 },
      xaxis: {
        title: { text: 'Coefficient of Variation (CV %)', font: { size: 12, color: '#475569' } },
        gridcolor: '#f1f5f9',
      },
      yaxis: {
        autorange: 'reversed',
        tickfont: { size: 11, color: '#1e293b', weight: 600 },
      },
    }

    // Box plot groups for parameters
    const boxGroups = parameters.map((p) => ({
      name: p.parameter_label.split('(')[0].trim(),
      scores: p.scores,
    }))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Layers size={18} color="#2563eb" />
              <span>Q6.3 Parameter Variability &amp; Relative Dispersion Ranking</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which NIRF parameter exhibits the greatest variability across institutions?
            </div>
          </div>
          <span className="rank-badge-neutral">Category: {category}</span>
        </div>

        {/* Controls */}
        <div className="analytics-controls-bar">
          <div className="analytics-control-group">
            <span className="analytics-control-label">Edition Year:</span>
            <select
              className="analytics-select"
              value={variabilityYear}
              onChange={(e) => setVariabilityYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchVariability}
            title="Refresh variability"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Highest Relative Variability</div>
            <div className="analytics-metric-val" style={{ color: '#dc2626' }}>
              {highest_cv_parameter.split('(')[0].trim()}
            </div>
            <div className="analytics-metric-sub">
              Peak CV: {parameters[0] ? `${parameters[0].cv}%` : 'N/A'}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Most Uniform Parameter</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              {lowest_cv_parameter.split('(')[0].trim()}
            </div>
            <div className="analytics-metric-sub">
              Lowest CV: {parameters[parameters.length - 1] ? `${parameters[parameters.length - 1].cv}%` : 'N/A'}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Average Parameter CV</div>
            <div className="analytics-metric-val">
              {(parameters.reduce((acc, p) => acc + (p.cv || 0), 0) / (parameters.length || 1)).toFixed(1)}%
            </div>
            <div className="analytics-metric-sub">Cross-pillar average dispersion</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Parameters Evaluated</div>
            <div className="analytics-metric-val">{parameters.length} Metrics</div>
            <div className="analytics-metric-sub">Including core pillars &amp; overall</div>
          </div>
        </div>

        {/* Visualizations: CV Ranking Bar Chart & Comparative Parameter Box Plot */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="nirf-card" style={{ padding: 18 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              Parameter Variability Ranking (CV % = Std Dev / Mean)
            </h4>
            <ChartContainer data={[cvBarTrace]} layout={cvBarLayout} style={{ height: 380 }} />
          </div>

          <div className="nirf-card" style={{ padding: 18 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              Cross-Parameter Distribution Box Plots ({year})
            </h4>
            <StatisticalBoxPlot
              groups={boxGroups}
              title=""
              xAxisTitle="NIRF Evaluation Parameters"
              yAxisTitle="Parameter Score (0–100)"
              height={380}
            />
          </div>
        </div>

        {/* Parameter Variability Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Parametric Dispersion &amp; Variability Ranking Table ({year})
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Parameter</th>
                  <th>Obs (n)</th>
                  <th style={{ textAlign: 'right' }}>Mean</th>
                  <th style={{ textAlign: 'right' }}>Median</th>
                  <th style={{ textAlign: 'right' }}>Std Dev</th>
                  <th style={{ textAlign: 'right' }}>Variance</th>
                  <th style={{ textAlign: 'right' }}>IQR</th>
                  <th style={{ textAlign: 'right', color: '#dc2626' }}>CV (%)</th>
                  <th style={{ textAlign: 'right' }}>Min</th>
                  <th style={{ textAlign: 'right' }}>Max</th>
                  <th style={{ textAlign: 'right' }}>Skewness</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((p, idx) => (
                  <tr key={p.parameter}>
                    <td style={{ fontWeight: 700, color: '#64748b' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{p.parameter_label}</td>
                    <td>{p.observations}</td>
                    <td style={{ textAlign: 'right' }}>{p.mean.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{p.median.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.std_dev.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{p.variance.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{p.iqr.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: idx === 0 ? '#dc2626' : '#2563eb' }}>
                      {p.cv ? `${p.cv.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{p.min.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>{p.max.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {p.skewness !== null ? p.skewness.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 4: Median & IQR Trend (Q6.4)
  // ---------------------------------------------------------------------------
  const renderMedianTrend = () => {
    if (trendLoading) return <Loading message="Computing median and IQR trends..." />
    if (trendError) return <ErrorState message={trendError} onRetry={fetchTrend} />
    if (!trendData) return null

    const { trends, iqr_trend_direction } = trendData

    const years = trends.map((t) => t.year)
    const medians = trends.map((t) => t.median)
    const means = trends.map((t) => t.mean)
    const q1s = trends.map((t) => t.q1)
    const q3s = trends.map((t) => t.q3)

    // Ribbon band: trace for Q1 (invisible line), trace for Q3 with fill='tonexty'
    const trendTraces = [
      {
        x: years,
        y: q1s,
        name: 'Q1 (25th Percentile)',
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgba(37, 99, 235, 0.25)', width: 1 },
        showlegend: false,
        hoverinfo: 'skip',
      },
      {
        x: years,
        y: q3s,
        name: 'Interquartile Band (Q1–Q3)',
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        fillcolor: 'rgba(37, 99, 235, 0.12)',
        line: { color: 'rgba(37, 99, 235, 0.25)', width: 1 },
        hovertemplate: '<b>%{x}</b><br>Q3 Boundary: <b>%{y:.2f}</b><extra></extra>',
      },
      {
        x: years,
        y: medians,
        name: 'Median Score (Q2)',
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#2563eb', width: 3 },
        marker: { size: 7, color: '#2563eb' },
        hovertemplate: '<b>%{x}</b><br>Median: <b>%{y:.2f}</b> pts<extra></extra>',
      },
      {
        x: years,
        y: means,
        name: 'Mean Score (x̄)',
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#f59e0b', width: 2, dash: 'dash' },
        marker: { size: 5, color: '#f59e0b' },
        hovertemplate: '<b>%{x}</b><br>Mean: <b>%{y:.2f}</b> pts<extra></extra>',
      },
    ]

    const trendLayout = {
      height: 420,
      margin: { l: 50, r: 30, t: 30, b: 50 },
      xaxis: {
        title: { text: 'NIRF Ranking Edition Year', font: { size: 12, color: '#475569' } },
        tickmode: 'linear',
        dtick: 1,
        gridcolor: '#f1f5f9',
      },
      yaxis: {
        title: { text: 'Score in Points (0–100)', font: { size: 12, color: '#475569' } },
        gridcolor: '#f1f5f9',
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        y: -0.18,
        xanchor: 'center',
        yanchor: 'top',
        font: { size: 11, color: '#334155' },
      },
    }

    const latest = trends[trends.length - 1]
    const earliest = trends[0]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <TrendingUp size={18} color="#2563eb" />
              <span>Q6.4 Median &amp; Interquartile Range (IQR) Trend Bands</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: How do median and interquartile ranges change over time?
            </div>
          </div>
          <span className="rank-badge-neutral">Band: 50% Central Mass</span>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Latest Median Score ({latest ? latest.year : 'N/A'})</div>
            <div className="analytics-metric-val" style={{ color: '#2563eb' }}>
              {latest ? latest.median.toFixed(2) : 'N/A'} pts
            </div>
            <div className="analytics-metric-sub">Mean: {latest ? latest.mean.toFixed(2) : 'N/A'} pts</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Latest IQR Spread</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              {latest ? latest.iqr.toFixed(2) : 'N/A'} pts
            </div>
            <div className="analytics-metric-sub">
              Q1: {latest ? latest.q1.toFixed(1) : ''} &minus; Q3: {latest ? latest.q3.toFixed(1) : ''}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Longitudinal Status</div>
            <div className="analytics-metric-val" style={{ fontSize: '1.05rem', color: '#0f172a' }}>
              {iqr_trend_direction}
            </div>
            <div className="analytics-metric-sub">Over {trends.length} ranking cycles</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Net Median Shift</div>
            <div className="analytics-metric-val" style={{ color: latest && earliest && latest.median >= earliest.median ? '#10b981' : '#dc2626' }}>
              {latest && earliest ? `${(latest.median - earliest.median >= 0 ? '+' : '')}${(latest.median - earliest.median).toFixed(2)} pts` : 'N/A'}
            </div>
            <div className="analytics-metric-sub">From {earliest ? earliest.year : ''} to {latest ? latest.year : ''}</div>
          </div>
        </div>

        {/* Trend Band Chart */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            Central Tendency &amp; Interquartile Ribbon Trajectory (2017–2025)
          </h4>
          <ChartContainer data={trendTraces} layout={trendLayout} style={{ height: 420 }} />
        </div>

        {/* Detailed Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Longitudinal Median &amp; Quartile Boundaries Table ({category})
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Obs (n)</th>
                  <th style={{ textAlign: 'right' }}>Mean</th>
                  <th style={{ textAlign: 'right', color: '#2563eb' }}>Median (Q2)</th>
                  <th style={{ textAlign: 'right' }}>Q1 (25th %)</th>
                  <th style={{ textAlign: 'right' }}>Q3 (75th %)</th>
                  <th style={{ textAlign: 'right', color: '#10b981' }}>IQR (Spread)</th>
                  <th style={{ textAlign: 'right' }}>Min</th>
                  <th style={{ textAlign: 'right' }}>Max</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((t) => (
                  <tr key={t.year}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{t.year}</td>
                    <td>{t.observations}</td>
                    <td style={{ textAlign: 'right' }}>{t.mean.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                      {t.median.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{t.q1.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{t.q3.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                      {t.iqr.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{t.min.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>{t.max.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 5: State Distribution (Q6.5)
  // ---------------------------------------------------------------------------
  const renderStateDistribution = () => {
    if (stateLoading) return <Loading message="Computing state-level score distributions..." />
    if (stateError) return <ErrorState message={stateError} onRetry={fetchStateDistribution} />
    if (!stateData) return null

    const { states, all_states, year } = stateData

    // Box groups for top states (limit to top 15 for clean visualization)
    const displayStates = states.slice(0, 14)
    const groups = displayStates.map((st) => ({
      name: st.state,
      scores: st.scores,
    }))

    const topState = states[0]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <MapPin size={18} color="#2563eb" />
              <span>Q6.5 State Score Distribution &amp; Geographic Disparities</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: How does score distribution differ across states?
            </div>
          </div>
          <span className="rank-badge-neutral">Category: {category}</span>
        </div>

        {/* Controls */}
        <div className="analytics-controls-bar">
          <div className="analytics-control-group">
            <span className="analytics-control-label">Edition Year:</span>
            <select
              className="analytics-select"
              value={stateYear}
              onChange={(e) => setStateYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Min Institutions:</span>
            <select
              className="analytics-select"
              value={minInstitutions}
              onChange={(e) => setMinInstitutions(Number(e.target.value))}
            >
              <option value={1}>1+ Institution</option>
              <option value={2}>2+ Institutions</option>
              <option value={3}>3+ Institutions</option>
              <option value={5}>5+ Institutions</option>
            </select>
          </div>

          <div className="analytics-control-group">
            <span className="analytics-control-label">Plot View:</span>
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${stateView === 'box' ? 'active' : ''}`}
                onClick={() => setStateView('box')}
              >
                Box Plot
              </button>
              <button
                type="button"
                className={`view-mode-btn ${stateView === 'violin' ? 'active' : ''}`}
                onClick={() => setStateView('violin')}
              >
                Violin Plot
              </button>
            </div>
            <button
              type="button"
              className="analytics-refresh-btn"
              onClick={fetchStateDistribution}
              title="Refresh states"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Leading State by Median</div>
            <div className="analytics-metric-val" style={{ color: '#2563eb' }}>
              {topState ? topState.state : 'N/A'}
            </div>
            <div className="analytics-metric-sub">
              Median: {topState ? `${topState.median} pts (${topState.observations} insts)` : 'N/A'}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Qualifying States</div>
            <div className="analytics-metric-val">{states.length} States / UTs</div>
            <div className="analytics-metric-sub">Meeting &ge; {minInstitutions} institutions filter</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Total States Represented</div>
            <div className="analytics-metric-val">{all_states.length} States / UTs</div>
            <div className="analytics-metric-sub">Nationwide footprint ({year})</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Widest State Spread</div>
            <div className="analytics-metric-val" style={{ color: '#ea580c' }}>
              {states.length > 0 ? `${Math.max(...states.map((s) => s.iqr)).toFixed(1)} pts` : 'N/A'}
            </div>
            <div className="analytics-metric-sub">Maximum institutional IQR within state</div>
          </div>
        </div>

        {/* Chart View */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            State-Level Score Distributions Ranked by Median Performance ({year})
          </h4>
          {stateView === 'box' ? (
            <StatisticalBoxPlot
              groups={groups}
              title=""
              xAxisTitle="State / Union Territory"
              yAxisTitle="NIRF Overall Score (0–100)"
              height={440}
            />
          ) : (
            <ViolinPlot
              groups={groups}
              title=""
              xAxisTitle="State / Union Territory"
              yAxisTitle="NIRF Overall Score (0–100)"
              height={440}
            />
          )}
        </div>

        {/* State Statistics Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            State Descriptive Statistics Scorecard ({year})
          </h4>
          {states.length > 0 ? (
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>State</th>
                    <th>Institutions</th>
                    <th style={{ textAlign: 'right' }}>Median</th>
                    <th style={{ textAlign: 'right' }}>Mean</th>
                    <th style={{ textAlign: 'right' }}>Std Dev</th>
                    <th style={{ textAlign: 'right' }}>IQR</th>
                    <th style={{ textAlign: 'right' }}>Min</th>
                    <th style={{ textAlign: 'right' }}>Max</th>
                    <th>Top Performing Institutions</th>
                  </tr>
                </thead>
                <tbody>
                  {states.map((st, idx) => (
                    <tr key={st.state}>
                      <td style={{ fontWeight: 700, color: '#64748b' }}>#{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{st.state}</td>
                      <td>
                        <span className="rank-badge-neutral">{st.observations} insts</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                        {st.median.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{st.mean.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{st.std_dev.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>{st.iqr.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{st.min.toFixed(1)}</td>
                      <td style={{ textAlign: 'right' }}>{st.max.toFixed(1)}</td>
                      <td>
                        <div style={{ fontSize: '0.74rem', color: '#475569', maxWidth: 280 }}>
                          {st.top_institutions.join(', ')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No States Qualified"
              description={`No states met the threshold of ${minInstitutions} institutions in ${year}.`}
            />
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main Page Layout
  // ---------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div>
        <h2 style={{ fontSize: '1.28rem', fontWeight: 700, color: '#0f172a' }}>
          Statistical Analysis &amp; Distribution
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
          Rigorous distribution profiling, Top 10 segment comparisons, longitudinal dispersion tracking, parameter variability, and state-wise box/violin plots.
        </p>
      </div>

      {/* Sub-Navigation Tabs */}
      <StatisticsTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      {activeTab === 'top10-comparison' && renderTop10()}
      {activeTab === 'score-dispersion' && renderScoreDispersion()}
      {activeTab === 'parameter-variability' && renderParameterVariability()}
      {activeTab === 'median-iqr-trend' && renderMedianTrend()}
      {activeTab === 'state-distribution' && renderStateDistribution()}
    </div>
  )
}

export default Statistics
