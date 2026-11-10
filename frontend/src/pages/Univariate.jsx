/**
 * NIRF Analytics Dashboard — Univariate Statistical Analysis Module.
 *
 * Implements:
 * - Q3.1 Score Distribution: Histogram, adjustable bins, frequency and percentage.
 * - Q3.2 Rank Distribution: Bracket frequencies, exact vs rank-band handling.
 * - Q3.3 Descriptive Statistics: Mean, median, dispersion, variance, IQR across parameters.
 * - Q3.4 Score Quartiles: Q1–Q4 threshold cutoffs, frequencies, and shares.
 * - Q3.5 Category Spread: Cross-category comparative box plots and distribution metrics.
 */

import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  BarChart2,
  BoxSelect,
  CheckCircle,
  ChevronDown,
  Filter,
  Hash,
  HelpCircle,
  PieChart,
  RefreshCw,
  Sigma,
  Sliders,
  TrendingUp,
} from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import { api } from '../services/api'
import { UnivariateTabs } from '../components/analytics/UnivariateTabs'
import { Histogram } from '../components/charts/Histogram'
import { BoxPlot } from '../components/charts/BoxPlot'
import { QuartileChart } from '../components/charts/QuartileChart'
import { Loading } from '../components/common/Loading'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import '../styles/analytics.css'

export function Univariate() {
  const { category, selectedYear, availableYears } = useFilters()

  // Sub-navigation tab state
  const [activeTab, setActiveTab] = useState('score-dist')

  // Global year bounds
  const minAvailableYear = availableYears && availableYears.length ? Math.min(...availableYears) : 2017
  const maxAvailableYear = availableYears && availableYears.length ? Math.max(...availableYears) : 2025

  // Tab 1: Score Distribution state
  const [scoreYear, setScoreYear] = useState(selectedYear || maxAvailableYear)
  const [scoreBins, setScoreBins] = useState(15)
  const [scoreData, setScoreData] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState(null)

  // Tab 2: Rank Distribution state
  const [rankYear, setRankYear] = useState(selectedYear || maxAvailableYear)
  const [minRankFilter, setMinRankFilter] = useState('')
  const [maxRankFilter, setMaxRankFilter] = useState('')
  const [rankData, setRankData] = useState(null)
  const [rankLoading, setRankLoading] = useState(false)
  const [rankError, setRankError] = useState(null)

  // Tab 3: Descriptive Statistics state
  const [statsYear, setStatsYear] = useState(selectedYear || maxAvailableYear)
  const [statsData, setStatsData] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(null)

  // Tab 4: Score Quartiles state
  const [quartileYear, setQuartileYear] = useState(selectedYear || maxAvailableYear)
  const [quartileView, setQuartileView] = useState('donut') // 'donut' or 'bar'
  const [quartileData, setQuartileData] = useState(null)
  const [quartileLoading, setQuartileLoading] = useState(false)
  const [quartileError, setQuartileError] = useState(null)

  // Tab 5: Category Spread state
  const [spreadYear, setSpreadYear] = useState(selectedYear || maxAvailableYear)
  const [spreadData, setSpreadData] = useState(null)
  const [spreadLoading, setSpreadLoading] = useState(false)
  const [spreadError, setSpreadError] = useState(null)

  // Sync year defaults when global filter changes
  useEffect(() => {
    if (selectedYear) {
      setScoreYear(selectedYear)
      setRankYear(selectedYear)
      setStatsYear(selectedYear)
      setQuartileYear(selectedYear)
      setSpreadYear(selectedYear)
    }
  }, [category, selectedYear])

  // ---------------------------------------------------------------------------
  // Tab 1: Fetch Score Distribution
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'score-dist') return

    let isMounted = true
    async function loadScoreDist() {
      setScoreLoading(true)
      setScoreError(null)
      try {
        const data = await api.getScoreDistributionAnalytics(category, scoreYear, scoreBins)
        if (isMounted) setScoreData(data)
      } catch (err) {
        if (isMounted) setScoreError(err.message || 'Failed to load score distribution.')
      } finally {
        if (isMounted) setScoreLoading(false)
      }
    }

    loadScoreDist()
    return () => {
      isMounted = false
    }
  }, [category, scoreYear, scoreBins, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 2: Fetch Rank Distribution
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'rank-dist') return

    let isMounted = true
    async function loadRankDist() {
      setRankLoading(true)
      setRankError(null)
      try {
        const minR = minRankFilter ? Number(minRankFilter) : null
        const maxR = maxRankFilter ? Number(maxRankFilter) : null
        const data = await api.getRankDistribution(category, rankYear, minR, maxR)
        if (isMounted) setRankData(data)
      } catch (err) {
        if (isMounted) setRankError(err.message || 'Failed to load rank distribution.')
      } finally {
        if (isMounted) setRankLoading(false)
      }
    }

    loadRankDist()
    return () => {
      isMounted = false
    }
  }, [category, rankYear, minRankFilter, maxRankFilter, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 3: Fetch Descriptive Statistics
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'descriptive-stats') return

    let isMounted = true
    async function loadStats() {
      setStatsLoading(true)
      setStatsError(null)
      try {
        const data = await api.getDescriptiveStatistics(category, statsYear)
        if (isMounted) setStatsData(data)
      } catch (err) {
        if (isMounted) setStatsError(err.message || 'Failed to load descriptive statistics.')
      } finally {
        if (isMounted) setStatsLoading(false)
      }
    }

    loadStats()
    return () => {
      isMounted = false
    }
  }, [category, statsYear, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 4: Fetch Score Quartiles
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'score-quartiles') return

    let isMounted = true
    async function loadQuartiles() {
      setQuartileLoading(true)
      setQuartileError(null)
      try {
        const data = await api.getScoreQuartiles(category, quartileYear)
        if (isMounted) setQuartileData(data)
      } catch (err) {
        if (isMounted) setQuartileError(err.message || 'Failed to load score quartiles.')
      } finally {
        if (isMounted) setQuartileLoading(false)
      }
    }

    loadQuartiles()
    return () => {
      isMounted = false
    }
  }, [category, quartileYear, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 5: Fetch Category Spread
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'category-spread') return

    let isMounted = true
    async function loadCategorySpread() {
      setSpreadLoading(true)
      setSpreadError(null)
      try {
        const data = await api.getCategorySpread(spreadYear)
        if (isMounted) setSpreadData(data)
      } catch (err) {
        if (isMounted) setSpreadError(err.message || 'Failed to load category spread.')
      } finally {
        if (isMounted) setSpreadLoading(false)
      }
    }

    loadCategorySpread()
    return () => {
      isMounted = false
    }
  }, [spreadYear, activeTab])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Heading matching specification */}
      <div className="dashboard-header-container" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="dashboard-title">Univariate Analysis</h1>
          <p className="dashboard-subtitle">
            Analyze individual numerical variables, frequency distributions, and descriptive statistics across the NIRF dataset.
          </p>
        </div>
      </div>

      {/* Horizontal Sub-Navigation Tabs */}
      <UnivariateTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* =========================================================================
          Q3.1 SCORE DISTRIBUTION SUBSECTION
          ========================================================================= */}
      {activeTab === 'score-dist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <BarChart2 size={18} style={{ color: '#2563eb' }} />
                <span>Q3.1 Score Distribution: Histogram & Frequency Profile</span>
              </div>
              <p className="analytics-question-subtitle">
                What is the distribution of NIRF composite scores for {category} in {scoreYear}?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="score-year-select" className="analytics-control-label">Edition:</label>
              <select
                id="score-year-select"
                value={scoreYear}
                onChange={(e) => setScoreYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <label htmlFor="score-bins-select" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Histogram Bins:
              </label>
              <select
                id="score-bins-select"
                value={scoreBins}
                onChange={(e) => setScoreBins(Number(e.target.value))}
                className="analytics-select"
                style={{ minWidth: 90 }}
              >
                <option value={10}>10 Bins</option>
                <option value={15}>15 Bins (Default)</option>
                <option value={20}>20 Bins</option>
                <option value={25}>25 Bins</option>
              </select>
            </div>

            {scoreData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Observations Evaluated: <strong style={{ color: '#0f172a' }}>{scoreData.valid_observations}</strong> of {scoreData.total_records}
                {scoreData.missing_observations > 0 && ` (${scoreData.missing_observations} unscored)`}
              </div>
            )}
          </div>

          {scoreLoading && <Loading text="Computing score distribution..." />}
          {scoreError && <ErrorState message={scoreError} />}

          {!scoreLoading && !scoreError && scoreData && (
            <>
              {/* Statistical Summary Ribbon */}
              <div className="analytics-metrics-ribbon">
                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Mean Score</span>
                  <span className="analytics-metric-val" style={{ color: '#2563eb' }}>
                    {scoreData.mean ?? 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Average of cohort</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Median Score</span>
                  <span className="analytics-metric-val" style={{ color: '#0ea5e9' }}>
                    {scoreData.median ?? 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">50th percentile</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Score Spread</span>
                  <span className="analytics-metric-val">
                    {scoreData.min_score !== null && scoreData.max_score !== null
                      ? `${scoreData.min_score} – ${scoreData.max_score}`
                      : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Min to Max range</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Std Deviation</span>
                  <span className="analytics-metric-val">{scoreData.std_dev ?? 'N/A'}</span>
                  <span className="analytics-metric-sub">Score dispersion</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Bin Width</span>
                  <span className="analytics-metric-val">{scoreData.bin_width} pts</span>
                  <span className="analytics-metric-sub">Resolution</span>
                </div>
              </div>

              {/* Histogram Chart */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a' }}>
                    Composite Score Frequency Distribution: {category} ({scoreYear})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Bar heights indicate number of institutions falling within each interval. Hover over bars for exact count and percentage share.
                  </p>
                </div>
                <Histogram
                  bins={scoreData.bins}
                  mean={scoreData.mean}
                  median={scoreData.median}
                  height={380}
                  xAxisTitle="NIRF Overall Score (0–100)"
                  yAxisTitle="Number of Institutions"
                />
              </div>

              {/* Frequency Bins Breakdown Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Interval Frequency Table
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Interval #</th>
                        <th>Score Range</th>
                        <th>Institution Count</th>
                        <th>Share of Cohort</th>
                        <th>Visual Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreData.bins.map((b, idx) => (
                        <tr key={b.label}>
                          <td style={{ color: '#64748b' }}>Bin {idx + 1}</td>
                          <td><strong>{b.bin_start} – {b.bin_end}</strong></td>
                          <td><strong style={{ color: '#2563eb' }}>{b.count}</strong></td>
                          <td>{b.percentage}%</td>
                          <td>
                            <div style={{ width: 140 }}>
                              <div
                                style={{
                                  height: 6,
                                  backgroundColor: '#e2e8f0',
                                  borderRadius: 9999,
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${b.percentage * 2}%`,
                                    backgroundColor: '#2563eb',
                                    borderRadius: 9999,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          Q3.2 RANK DISTRIBUTION SUBSECTION
          ========================================================================= */}
      {activeTab === 'rank-dist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <Hash size={18} style={{ color: '#2563eb' }} />
                <span>Q3.2 Rank Distribution: Brackets & Exact vs Band Handling</span>
              </div>
              <p className="analytics-question-subtitle">
                What is the distribution of overall ranks across institutions in {category}?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="rank-year-select" className="analytics-control-label">Edition:</label>
              <select
                id="rank-year-select"
                value={rankYear}
                onChange={(e) => setRankYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <label htmlFor="min-rank-input" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Min Rank:
              </label>
              <input
                id="min-rank-input"
                type="number"
                placeholder="1"
                value={minRankFilter}
                onChange={(e) => setMinRankFilter(e.target.value)}
                style={{
                  width: 70,
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                }}
              />

              <label htmlFor="max-rank-input" className="analytics-control-label" style={{ marginLeft: 8 }}>
                Max Rank:
              </label>
              <input
                id="max-rank-input"
                type="number"
                placeholder="100"
                value={maxRankFilter}
                onChange={(e) => setMaxRankFilter(e.target.value)}
                style={{
                  width: 70,
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                }}
              />
            </div>

            {rankData && (
              <div style={{ display: 'flex', gap: 8, fontSize: '0.8rem' }}>
                <span className="rank-badge rank-badge-top10">
                  Exact Ranks: <strong>{rankData.exact_ranks_count}</strong>
                </span>
                <span className="rank-badge rank-badge-neutral">
                  Rank Bands: <strong>{rankData.rank_bands_count}</strong>
                </span>
              </div>
            )}
          </div>

          {rankLoading && <Loading text="Analyzing rank frequencies..." />}
          {rankError && <ErrorState message={rankError} />}

          {!rankLoading && !rankError && rankData && (
            <>
              {/* Rank Histogram Chart */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  Institutional Rank Distribution ({category})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                  Institutions binned by ranking intervals. Exact integer ranks are analyzed numerically.
                </p>
                <Histogram
                  bins={rankData.histogram_bins}
                  height={340}
                  xAxisTitle="Institutional Rank Interval"
                  yAxisTitle="Number of Institutions"
                  barColor="#3b82f6"
                />
              </div>

              {/* Standardized Rank Tier Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Standardized Ranking Brackets
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Tier Bracket</th>
                        <th>Rank Boundaries</th>
                        <th>Institutions</th>
                        <th>Share (%)</th>
                        <th>Representative Institutions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankData.tiers.map((t) => (
                        <tr key={t.tier_name}>
                          <td><strong>{t.tier_name}</strong></td>
                          <td>#{t.min_rank} – #{t.max_rank}</td>
                          <td><strong style={{ color: '#2563eb' }}>{t.count}</strong></td>
                          <td>{t.share_pct}%</td>
                          <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                            {t.sample_institutions.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          Q3.3 DESCRIPTIVE STATISTICS SUBSECTION
          ========================================================================= */}
      {activeTab === 'descriptive-stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <Sigma size={18} style={{ color: '#2563eb' }} />
                <span>Q3.3 Descriptive Statistics: Parametric Summary</span>
              </div>
              <p className="analytics-question-subtitle">
                Central tendencies, dispersion, interquartile ranges, and skewness for {category} in {statsYear}.
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="stats-year-select" className="analytics-control-label">Edition:</label>
              <select
                id="stats-year-select"
                value={statsYear}
                onChange={(e) => setStatsYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {statsData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Evaluated Parameters: <strong style={{ color: '#0f172a' }}>{statsData.parameters.length}</strong> across <strong style={{ color: '#0f172a' }}>{statsData.total_records}</strong> institutions
              </div>
            )}
          </div>

          {statsLoading && <Loading text="Computing descriptive statistics..." />}
          {statsError && <ErrorState message={statsError} />}

          {!statsLoading && !statsError && statsData && (
            <div className="nirf-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                Comprehensive Parametric Breakdown: {category} ({statsYear})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="nirf-table">
                  <thead>
                    <tr>
                      <th>Evaluated Parameter</th>
                      <th>Obs / Miss</th>
                      <th>Mean</th>
                      <th>Median</th>
                      <th>Std Dev</th>
                      <th>Variance</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Q1 (25%)</th>
                      <th>Q3 (75%)</th>
                      <th>IQR</th>
                      <th>Skewness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.parameters.map((p) => (
                      <tr key={p.parameter}>
                        <td>
                          <strong>{p.parameter_label}</strong>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}><code>{p.parameter}</code></div>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: '#059669', fontWeight: 600 }}>{p.observations}</span> /{' '}
                          <span style={{ color: p.missing > 0 ? '#e11d48' : '#94a3b8' }}>{p.missing}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#2563eb' }}>{p.mean ?? 'N/A'}</td>
                        <td style={{ fontWeight: 600, color: '#0ea5e9' }}>{p.median ?? 'N/A'}</td>
                        <td>{p.std_dev ?? 'N/A'}</td>
                        <td>{p.variance ?? 'N/A'}</td>
                        <td>{p.min ?? 'N/A'}</td>
                        <td>{p.max ?? 'N/A'}</td>
                        <td>{p.q1 ?? 'N/A'}</td>
                        <td>{p.q3 ?? 'N/A'}</td>
                        <td style={{ fontWeight: 600 }}>{p.iqr ?? 'N/A'}</td>
                        <td style={{ color: p.skewness && Math.abs(p.skewness) > 1 ? '#e11d48' : '#64748b' }}>
                          {p.skewness ?? 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          Q3.4 SCORE QUARTILES SUBSECTION
          ========================================================================= */}
      {activeTab === 'score-quartiles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <PieChart size={18} style={{ color: '#2563eb' }} />
                <span>Q3.4 Score Quartiles: Population Segmentation</span>
              </div>
              <p className="analytics-question-subtitle">
                What percentage and count of institutions fall into each score quartile in {category} ({quartileYear})?
              </p>
            </div>
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${quartileView === 'donut' ? 'active' : ''}`}
                onClick={() => setQuartileView('donut')}
              >
                Donut Chart
              </button>
              <button
                type="button"
                className={`view-mode-btn ${quartileView === 'bar' ? 'active' : ''}`}
                onClick={() => setQuartileView('bar')}
              >
                Segmented Bar
              </button>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="quartile-year-select" className="analytics-control-label">Edition:</label>
              <select
                id="quartile-year-select"
                value={quartileYear}
                onChange={(e) => setQuartileYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {quartileData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Median Threshold: <strong style={{ color: '#2563eb' }}>{quartileData.median_threshold}</strong> • IQR Cutoffs: [{quartileData.q1_threshold} – {quartileData.q3_threshold}]
              </div>
            )}
          </div>

          {quartileLoading && <Loading text="Computing score quartiles..." />}
          {quartileError && <ErrorState message={quartileError} />}

          {!quartileLoading && !quartileError && quartileData && (
            <>
              {/* 4 Quartile Stat Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                {quartileData.quartiles.map((q, idx) => {
                  const borderColors = ['#94a3b8', '#38bdf8', '#2563eb', '#10b981']
                  return (
                    <div
                      key={q.quartile}
                      className="nirf-card"
                      style={{ padding: 16, borderTop: `4px solid ${borderColors[idx]}` }}
                    >
                      <span className="analytics-metric-label">{q.quartile}</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                        {q.count} insts
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Cutoff: <strong>{q.lower_bound} – {q.upper_bound} pts</strong>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 4 }}>
                        Share: {q.percentage}% of scored cohort
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Quartile Visualization */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Score Quartiles Distribution ({quartileYear})
                </h3>
                <QuartileChart
                  quartiles={quartileData.quartiles}
                  type={quartileView}
                  height={320}
                />
              </div>

              {/* Quartile Detail Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Quartile Segment Boundaries & Representative Entities
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Quartile</th>
                        <th>Score Threshold Boundary</th>
                        <th>Institutions</th>
                        <th>Share (%)</th>
                        <th>Representative Entities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quartileData.quartiles.map((q) => (
                        <tr key={q.quartile}>
                          <td><strong>{q.quartile}</strong></td>
                          <td><strong>{q.lower_bound} – {q.upper_bound} pts</strong></td>
                          <td><strong style={{ color: '#2563eb' }}>{q.count}</strong></td>
                          <td>{q.percentage}%</td>
                          <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                            {q.sample_institutions.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          Q3.5 CATEGORY SPREAD SUBSECTION
          ========================================================================= */}
      {activeTab === 'category-spread' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <BoxSelect size={18} style={{ color: '#2563eb' }} />
                <span>Q3.5 Category Spread: Cross-Discipline Comparative Distributions</span>
              </div>
              <p className="analytics-question-subtitle">
                How does the spread, median benchmark, and dispersion of scores differ across NIRF categories in {spreadYear}?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="spread-year-select" className="analytics-control-label">Edition:</label>
              <select
                id="spread-year-select"
                value={spreadYear}
                onChange={(e) => setSpreadYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {spreadData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Disciplines Evaluated: <strong style={{ color: '#0f172a' }}>{spreadData.total_categories}</strong>
              </div>
            )}
          </div>

          {spreadLoading && <Loading text="Computing cross-category distributions..." />}
          {spreadError && <ErrorState message={spreadError} />}

          {!spreadLoading && !spreadError && spreadData && (
            <>
              {/* Category Box Plot */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a' }}>
                    Comparative Score Spread Box Plot ({spreadYear})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Shows Min, Q1, Median line, Q3, Max whiskers, and outlier points across all scored disciplines. Dashed line inside each box denotes category mean.
                  </p>
                </div>
                <BoxPlot
                  categories={spreadData.categories}
                  height={440}
                  xAxisTitle="Discipline Category"
                  yAxisTitle="NIRF Overall Score (0–100)"
                />
              </div>

              {/* Cross-Category Summary Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Cross-Category Statistical Summary ({spreadYear})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Academic Category</th>
                        <th>Institutions</th>
                        <th>Median Score</th>
                        <th>Mean Score</th>
                        <th>Min Score</th>
                        <th>Max Score</th>
                        <th>IQR Spread</th>
                        <th>Std Deviation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spreadData.categories.map((c, idx) => (
                        <tr key={c.category}>
                          <td style={{ color: '#64748b' }}>{idx + 1}</td>
                          <td><strong>{c.category}</strong></td>
                          <td>{c.observations}</td>
                          <td style={{ fontWeight: 600, color: '#0ea5e9' }}>{c.median ?? 'N/A'}</td>
                          <td style={{ fontWeight: 600, color: '#2563eb' }}>{c.mean ?? 'N/A'}</td>
                          <td>{c.min ?? 'N/A'}</td>
                          <td>{c.max ?? 'N/A'}</td>
                          <td style={{ fontWeight: 600 }}>{c.iqr ?? 'N/A'}</td>
                          <td>{c.std_dev ?? 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Univariate
