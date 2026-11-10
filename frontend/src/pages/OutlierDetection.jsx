/**
 * NIRF Analytics Dashboard — Outlier Detection & Performance Gaps Module.
 *
 * Implements:
 * - Q8.1 Research Outliers: OLS regression residual analysis with interactive method toggles (Z-Score vs IQR).
 * - Q8.2 Research vs Teaching Gap: Statistical divergence between RPC and TLR with mean benchmark line.
 * - Q8.3 Year-to-Year Score Outliers: Detection of anomalous score jumps and severe drops between editions.
 * - Q8.4 Strong Parameter, Poor Overall Rank: Discrepancy screening across customizable parameters and percentiles.
 * - Q8.5 Ranking Volatility: Multi-year rank dispersion (Std Dev and Mean Absolute Shift) tracking fluctuating entities.
 */

import React, { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Filter,
  Info,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import { api } from '../services/api'
import { OutlierTabs } from '../components/analytics/OutlierTabs'
import { OutlierScatterPlot } from '../components/charts/OutlierScatterPlot'
import { PerformanceGapChart } from '../components/charts/PerformanceGapChart'
import { ChartContainer } from '../components/charts/ChartContainer'
import { Loading } from '../components/common/Loading'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import '../styles/analytics.css'

const PARAMETER_OPTIONS = [
  { value: 'rpc_score', label: 'Research & Professional Practice (RPC)' },
  { value: 'tlr_score', label: 'Teaching, Learning & Resources (TLR)' },
  { value: 'go_score', label: 'Graduation Outcomes (GO)' },
  { value: 'oi_score', label: 'Outreach & Inclusivity (OI)' },
  { value: 'pr_score', label: 'Perception (PR)' },
]

export function OutlierDetection() {
  const { category, selectedYear, availableYears } = useFilters()

  // Sub-navigation tab state
  const [activeTab, setActiveTab] = useState('research-outliers')

  // Global year bounds
  const minAvailableYear = availableYears && availableYears.length ? Math.min(...availableYears) : 2017
  const maxAvailableYear = availableYears && availableYears.length ? Math.max(...availableYears) : 2025

  // ---------------------------------------------------------------------------
  // Tab 1: Research Outliers State (Q8.1)
  // ---------------------------------------------------------------------------
  const [resYear, setResYear] = useState(selectedYear || maxAvailableYear)
  const [resMethod, setResMethod] = useState('zscore') // 'zscore' or 'iqr'
  const [resThreshold, setResThreshold] = useState(1.5)
  const [resData, setResData] = useState(null)
  const [resLoading, setResLoading] = useState(false)
  const [resError, setResError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 2: Research vs Teaching Gap State (Q8.2)
  // ---------------------------------------------------------------------------
  const [gapYear, setGapYear] = useState(selectedYear || maxAvailableYear)
  const [gapMethod, setGapMethod] = useState('zscore')
  const [gapThreshold, setGapThreshold] = useState(1.5)
  const [gapData, setGapData] = useState(null)
  const [gapLoading, setGapLoading] = useState(false)
  const [gapError, setGapError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 3: Year-to-Year Score Outliers State (Q8.3)
  // ---------------------------------------------------------------------------
  const [scoreStartYear, setScoreStartYear] = useState(
    availableYears && availableYears.length >= 2 ? availableYears[availableYears.length - 2] : 2024
  )
  const [scoreEndYear, setScoreEndYear] = useState(maxAvailableYear)
  const [scoreMethod, setScoreMethod] = useState('zscore')
  const [scoreThreshold, setScoreThreshold] = useState(2.0)
  const [scoreData, setScoreData] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 4: Strong Parameter, Poor Rank State (Q8.4)
  // ---------------------------------------------------------------------------
  const [paramYear, setParamYear] = useState(selectedYear || maxAvailableYear)
  const [selectedParam, setSelectedParam] = useState('rpc_score')
  const [paramPercentileMin, setParamPercentileMin] = useState(60.0)
  const [rankMin, setRankMin] = useState(50)
  const [paramData, setParamData] = useState(null)
  const [paramLoading, setParamLoading] = useState(false)
  const [paramError, setParamError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 5: Ranking Volatility State (Q8.5)
  // ---------------------------------------------------------------------------
  const [volMethod, setVolMethod] = useState('zscore')
  const [volThreshold, setVolThreshold] = useState(1.5)
  const [volMinYears, setVolMinYears] = useState(4)
  const [volData, setVolData] = useState(null)
  const [volLoading, setVolLoading] = useState(false)
  const [volError, setVolError] = useState(null)

  // Sync year defaults when global filter changes
  useEffect(() => {
    if (selectedYear) {
      setResYear(selectedYear)
      setGapYear(selectedYear)
      setParamYear(selectedYear)
    }
  }, [category, selectedYear])

  // ---------------------------------------------------------------------------
  // Fetchers
  // ---------------------------------------------------------------------------
  const fetchResearchOutliers = async () => {
    setResLoading(true)
    setResError(null)
    try {
      const res = await api.getResearchOutliers(category, resYear, resMethod, resThreshold)
      setResData(res)
    } catch (err) {
      setResError(err.message || 'Failed to detect research outliers.')
    } finally {
      setResLoading(false)
    }
  }

  const fetchGapOutliers = async () => {
    setGapLoading(true)
    setGapError(null)
    try {
      const res = await api.getResearchTeachingGapOutliers(category, gapYear, gapMethod, gapThreshold)
      setGapData(res)
    } catch (err) {
      setGapError(err.message || 'Failed to evaluate research vs teaching gaps.')
    } finally {
      setGapLoading(false)
    }
  }

  const fetchScoreChangeOutliers = async () => {
    if (scoreStartYear >= scoreEndYear) {
      setScoreError('Start year must be strictly earlier than end year.')
      return
    }
    setScoreLoading(true)
    setScoreError(null)
    try {
      const res = await api.getScoreChangeOutliers(category, scoreStartYear, scoreEndYear, scoreMethod, scoreThreshold)
      setScoreData(res)
    } catch (err) {
      setScoreError(err.message || 'Failed to compute score change outliers.')
    } finally {
      setScoreLoading(false)
    }
  }

  const fetchStrongParamPoorRank = async () => {
    setParamLoading(true)
    setParamError(null)
    try {
      const res = await api.getStrongParamPoorRank(category, paramYear, selectedParam, paramPercentileMin, rankMin)
      setParamData(res)
    } catch (err) {
      setParamError(err.message || 'Failed to evaluate parameter performance discrepancies.')
    } finally {
      setParamLoading(false)
    }
  }

  const fetchRankingVolatility = async () => {
    setVolLoading(true)
    setVolError(null)
    try {
      const res = await api.getRankingVolatility(category, volMinYears, volMethod, volThreshold)
      setVolData(res)
    } catch (err) {
      setVolError(err.message || 'Failed to compute ranking volatility.')
    } finally {
      setVolLoading(false)
    }
  }

  // Trigger loads based on activeTab
  useEffect(() => {
    if (activeTab === 'research-outliers') fetchResearchOutliers()
  }, [category, resYear, resMethod, resThreshold, activeTab])

  useEffect(() => {
    if (activeTab === 'research-teaching-gap') fetchGapOutliers()
  }, [category, gapYear, gapMethod, gapThreshold, activeTab])

  useEffect(() => {
    if (activeTab === 'score-change-outliers') fetchScoreChangeOutliers()
  }, [category, scoreStartYear, scoreEndYear, scoreMethod, scoreThreshold, activeTab])

  useEffect(() => {
    if (activeTab === 'strong-param-poor-rank') fetchStrongParamPoorRank()
  }, [category, paramYear, selectedParam, paramPercentileMin, rankMin, activeTab])

  useEffect(() => {
    if (activeTab === 'ranking-volatility') fetchRankingVolatility()
  }, [category, volMinYears, volMethod, volThreshold, activeTab])

  // ---------------------------------------------------------------------------
  // Render Tab 1: Research Outliers (Q8.1)
  // ---------------------------------------------------------------------------
  const renderResearchOutliers = () => {
    if (resLoading) return <Loading message="Computing regression residuals & research outliers..." />
    if (resError) return <ErrorState message={resError} onRetry={fetchResearchOutliers} />
    if (!resData) return null

    const {
      year,
      method = 'zscore',
      threshold = 2.0,
      total_evaluated = 0,
      outliers_count = 0,
      regression_slope = 0,
      regression_intercept = 0,
      regression_r2 = 0,
      points = [],
      outliers = [],
    } = resData || {}

    const regressionSlope = regression_slope ?? 0
    const regressionIntercept = regression_intercept ?? 0
    const regressionR2 = regression_r2 ?? 0
    const topOutlier = Array.isArray(outliers) && outliers.length > 0 ? outliers[0] : null

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Sparkles size={18} color="#2563eb" />
              <span>Q8.1 Research Outliers Relative to Overall Score</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions have unusually high research scores relative to their overall scores?
            </div>
          </div>
          <span className="rank-badge-neutral">Category: {category}</span>
        </div>

        {/* Controls Bar */}
        <div className="analytics-controls-bar">
          <div className="analytics-control-group">
            <span className="analytics-control-label">Edition Year:</span>
            <select
              className="analytics-select"
              value={resYear}
              onChange={(e) => setResYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Detection Method:</span>
            <select
              className="analytics-select"
              value={resMethod}
              onChange={(e) => setResMethod(e.target.value)}
            >
              <option value="zscore">Z-Score (Standardized Residual)</option>
              <option value="iqr">IQR (Tukey's Fences)</option>
            </select>

            <span className="analytics-control-label">Cutoff Threshold:</span>
            <select
              className="analytics-select"
              value={resThreshold}
              onChange={(e) => setResThreshold(Number(e.target.value))}
            >
              {resMethod === 'zscore' ? (
                <>
                  <option value={1.5}>|Z| &ge; 1.5 (&sigma;)</option>
                  <option value={2.0}>|Z| &ge; 2.0 (Strict 95%)</option>
                  <option value={2.5}>|Z| &ge; 2.5 (Extreme 99%)</option>
                </>
              ) : (
                <>
                  <option value={1.2}>1.2 &times; IQR</option>
                  <option value={1.5}>1.5 &times; IQR (Standard)</option>
                  <option value={2.0}>2.0 &times; IQR (Extreme)</option>
                </>
              )}
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchResearchOutliers}
            title="Refresh outliers"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Research Outliers Detected</div>
            <div className="analytics-metric-val" style={{ color: '#dc2626' }}>
              {outliers_count}
            </div>
            <div className="analytics-metric-sub">
              {((outliers_count / (total_evaluated || 1)) * 100).toFixed(1)}% of cohort
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Top Research Anomaly</div>
            <div className="analytics-metric-val" style={{ fontSize: '1.05rem', color: '#2563eb' }}>
              {topOutlier ? (topOutlier.institution_name?.slice(0, 22) + '...') : 'None'}
            </div>
            <div className="analytics-metric-sub">
              {topOutlier && topOutlier.residual != null ? `Residual: +${Number(topOutlier.residual).toFixed(1)} pts (Z: +${topOutlier.z_score ?? 0})` : 'No anomalies detected'}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">OLS Linear Regression Fit</div>
            <div className="analytics-metric-val">R² = {regressionR2.toFixed(3)}</div>
            <div className="analytics-metric-sub">RPC = {regressionSlope.toFixed(2)} &times; Score {regressionIntercept >= 0 ? '+' : ''}{regressionIntercept.toFixed(1)}</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Evaluated Cohort</div>
            <div className="analytics-metric-val">{total_evaluated} Institutions</div>
            <div className="analytics-metric-sub">With valid RPC &amp; Overall scores</div>
          </div>
        </div>

        {/* Outlier Scatter Plot */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            Research (RPC) vs Overall Score with Residual Outlier Highlights ({year})
          </h4>
          <OutlierScatterPlot
            points={points}
            regressionSlope={regressionSlope}
            regressionIntercept={regressionIntercept}
            regressionR2={regressionR2}
            height={440}
          />
        </div>

        {/* Outliers Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Detected Research Outliers ({year})
          </h4>
          {outliers.length > 0 ? (
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>Rank</th>
                    <th>Institution Name</th>
                    <th>Overall Score</th>
                    <th style={{ textAlign: 'right' }}>Actual RPC</th>
                    <th style={{ textAlign: 'right' }}>Expected RPC</th>
                    <th style={{ textAlign: 'right' }}>Residual (&Delta;)</th>
                    <th style={{ textAlign: 'right' }}>Z-Score</th>
                    <th>Anomaly Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outliers.map((inst) => (
                    <tr key={inst.institution_name}>
                      <td>
                        <span className="rank-badge-neutral" style={{ fontWeight: 700 }}>
                          #{inst.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{inst.institution_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {inst.city}, {inst.state}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{inst.overall_score != null ? inst.overall_score.toFixed(2) : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                        {inst.rpc_score != null ? inst.rpc_score.toFixed(2) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>
                        {inst.expected_rpc != null ? inst.expected_rpc.toFixed(2) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: (inst.residual ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
                        {inst.residual != null ? `${inst.residual >= 0 ? '+' : ''}${inst.residual.toFixed(2)}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {inst.z_score != null ? `${inst.z_score >= 0 ? '+' : ''}${inst.z_score.toFixed(2)}` : '-'}
                      </td>
                      <td>
                        <span className="rank-badge-decline" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                          High Research Outlier
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Outliers Detected"
              description={`No institutions exceeded the ${method.toUpperCase()} threshold of ${threshold} for ${category} in ${year}.`}
            />
          )}
        </div>

        {/* Statistical Methodology Callout */}
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
            <strong>Statistical Outlier Distinction:</strong> An institution is not classified as an outlier simply
            because it has a high RPC score. Instead, we compute the OLS expected RPC based on overall composite score.
            Institutions whose actual research productivity exceeds the expected regression benchmark by $|Z| \ge {threshold}$
            represent genuine research over-performers relative to their composite rank.
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 2: Research vs Teaching Gap (Q8.2)
  // ---------------------------------------------------------------------------
  const renderResearchTeachingGap = () => {
    if (gapLoading) return <Loading message="Evaluating Research vs Teaching gaps..." />
    if (gapError) return <ErrorState message={gapError} onRetry={fetchGapOutliers} />
    if (!gapData) return null

    const {
      year,
      method = 'zscore',
      threshold = 2.0,
      mean_gap = 0,
      std_gap = 0,
      outliers_count = 0,
      institutions = [],
    } = gapData || {}
    const topOutlier = Array.isArray(institutions) && institutions.length > 0 ? institutions[0] : null

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <BookOpen size={18} color="#2563eb" />
              <span>Q8.2 Research vs Teaching Divergence Gap</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions perform substantially better in research than in teaching?
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
              value={gapYear}
              onChange={(e) => setGapYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Method:</span>
            <select
              className="analytics-select"
              value={gapMethod}
              onChange={(e) => setGapMethod(e.target.value)}
            >
              <option value="zscore">Z-Score (Standardized Gap)</option>
              <option value="iqr">IQR (Upper Fence)</option>
            </select>

            <span className="analytics-control-label">Cutoff Threshold:</span>
            <select
              className="analytics-select"
              value={gapThreshold}
              onChange={(e) => setGapThreshold(Number(e.target.value))}
            >
              <option value={1.5}>Threshold &ge; 1.5</option>
              <option value={2.0}>Threshold &ge; 2.0 (Standard)</option>
              <option value={2.5}>Threshold &ge; 2.5 (Strict)</option>
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchGapOutliers}
            title="Refresh gap outliers"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Divergence Outliers</div>
            <div className="analytics-metric-val" style={{ color: '#dc2626' }}>
              {outliers_count}
            </div>
            <div className="analytics-metric-sub">RPC substantially &gt; TLR</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Cohort Average Gap</div>
            <div className="analytics-metric-val">{(mean_gap ?? 0).toFixed(2)} pts</div>
            <div className="analytics-metric-sub">Std Dev: {(std_gap ?? 0).toFixed(2)} pts</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Maximum Research Gap</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              {topOutlier && topOutlier.gap != null ? `${topOutlier.gap >= 0 ? '+' : ''}${topOutlier.gap.toFixed(2)} pts` : 'N/A'}
            </div>
            <div className="analytics-metric-sub">
              {topOutlier ? (topOutlier.institution_name?.slice(0, 22) + '...') : ''}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Total Evaluated</div>
            <div className="analytics-metric-val">{institutions?.length || 0} Institutions</div>
            <div className="analytics-metric-sub">Ranked in {year}</div>
          </div>
        </div>

        {/* Performance Gap Bar Chart */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            Ranked Performance Gap: RPC − TLR with Benchmark Mean ({year})
          </h4>
          <PerformanceGapChart
            institutions={institutions}
            meanGap={mean_gap}
            height={420}
          />
        </div>

        {/* Gap Roster Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Institutions Ranked by Research-to-Teaching Gap ({year})
          </h4>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Rank</th>
                  <th>Institution Name</th>
                  <th style={{ textAlign: 'right' }}>Research (RPC)</th>
                  <th style={{ textAlign: 'right' }}>Teaching (TLR)</th>
                  <th style={{ textAlign: 'right' }}>Gap (RPC &minus; TLR)</th>
                  <th style={{ textAlign: 'right' }}>Z-Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((item) => (
                  <tr key={item.institution_name}>
                    <td>
                      <span className="rank-badge-neutral" style={{ fontWeight: 700 }}>
                        #{item.rank}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.institution_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {item.city}, {item.state}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                      {item.rpc_score != null ? item.rpc_score.toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: '#475569' }}>
                      {item.tlr_score != null ? item.tlr_score.toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: (item.gap ?? 0) >= 0 ? '#10b981' : '#b91c1c' }}>
                      {item.gap != null ? `${item.gap >= 0 ? '+' : ''}${item.gap.toFixed(2)}` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {item.gap_zscore != null ? `${item.gap_zscore >= 0 ? '+' : ''}${item.gap_zscore.toFixed(2)}` : '-'}
                    </td>
                    <td>
                      {item.is_outlier ? (
                        <span className="rank-badge-decline" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                          Outlier Gap
                        </span>
                      ) : (
                        <span className="rank-badge-neutral">Normal</span>
                      )}
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
  // Render Tab 3: Year-to-Year Score Outliers (Q8.3)
  // ---------------------------------------------------------------------------
  const renderScoreChangeOutliers = () => {
    if (scoreLoading) return <Loading message="Evaluating annual score shift outliers..." />
    if (scoreError) return <ErrorState message={scoreError} onRetry={fetchScoreChangeOutliers} />
    if (!scoreData) return null

    const {
      start_year,
      end_year,
      method = 'zscore',
      threshold = 2.0,
      mean_delta = 0,
      std_delta = 0,
      total_evaluated = 0,
      outliers_count = 0,
      positive_outliers_count = 0,
      negative_outliers_count = 0,
      outliers = [],
    } = scoreData || {}

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <AlertTriangle size={18} color="#2563eb" />
              <span>Q8.3 Year-to-Year Score Change Outliers</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions experienced unusually large year-to-year score changes?
            </div>
          </div>
          <span className="rank-badge-neutral">Category: {category}</span>
        </div>

        {/* Controls */}
        <div className="analytics-controls-bar">
          <div className="analytics-control-group">
            <span className="analytics-control-label">Baseline Year:</span>
            <select
              className="analytics-select"
              value={scoreStartYear}
              onChange={(e) => setScoreStartYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr >= scoreEndYear}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Target Year:</span>
            <select
              className="analytics-select"
              value={scoreEndYear}
              onChange={(e) => setScoreEndYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr <= scoreStartYear}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Method:</span>
            <select
              className="analytics-select"
              value={scoreMethod}
              onChange={(e) => setScoreMethod(e.target.value)}
            >
              <option value="zscore">Z-Score Method</option>
              <option value="iqr">IQR Method</option>
            </select>

            <span className="analytics-control-label">Cutoff:</span>
            <select
              className="analytics-select"
              value={scoreThreshold}
              onChange={(e) => setScoreThreshold(Number(e.target.value))}
            >
              <option value={1.5}>|Z| &ge; 1.5</option>
              <option value={2.0}>|Z| &ge; 2.0 (Standard)</option>
              <option value={2.5}>|Z| &ge; 2.5 (Extreme)</option>
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchScoreChangeOutliers}
            title="Refresh score changes"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Anomalous Score Changes</div>
            <div className="analytics-metric-val" style={{ color: '#dc2626' }}>
              {outliers_count}
            </div>
            <div className="analytics-metric-sub">Statistically unusual shifts</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Positive Score Jumps</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              +{positive_outliers_count}
            </div>
            <div className="analytics-metric-sub">Exceeding upper threshold</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Severe Score Drops</div>
            <div className="analytics-metric-val" style={{ color: '#ef4444' }}>
              &minus;{negative_outliers_count}
            </div>
            <div className="analytics-metric-sub">Exceeding lower threshold</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Cohort Average Shift</div>
            <div className="analytics-metric-val">
              {(mean_delta ?? 0) >= 0 ? `+${(mean_delta ?? 0).toFixed(2)}` : (mean_delta ?? 0).toFixed(2)} pts
            </div>
            <div className="analytics-metric-sub">Std Dev: {(std_delta ?? 0).toFixed(2)} pts</div>
          </div>
        </div>

        {/* Outlier Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Anomalous Score Shifts ({start_year} &rarr; {end_year})
          </h4>
          {outliers.length > 0 ? (
            <div style={{ maxHeight: 440, overflowY: 'auto' }}>
              <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Institution Name</th>
                    <th>Rank ({start_year} &rarr; {end_year})</th>
                    <th>Score ({start_year} &rarr; {end_year})</th>
                    <th style={{ textAlign: 'right' }}>Score Shift (&Delta;)</th>
                    <th style={{ textAlign: 'right' }}>Z-Score</th>
                    <th>Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {outliers.map((item) => (
                    <tr key={item.institution_name}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.institution_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {item.city}, {item.state}
                        </div>
                      </td>
                      <td>
                        <span className="rank-badge-neutral">
                          #{item.start_rank} &rarr; #{item.end_rank}
                        </span>
                      </td>
                      <td>
                        {item.start_score != null ? item.start_score.toFixed(2) : '-'} &rarr; {item.end_score != null ? item.end_score.toFixed(2) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: (item.score_delta ?? 0) >= 0 ? '#10b981' : '#b91c1c' }}>
                        {item.score_delta != null ? `${item.score_delta >= 0 ? '+' : ''}${item.score_delta.toFixed(2)} pts` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {item.z_score != null ? `${item.z_score >= 0 ? '+' : ''}${item.z_score.toFixed(2)}` : '-'}
                      </td>
                      <td>
                        {item.direction === 'positive_jump' ? (
                          <span className="rank-badge-improvement">
                            <TrendingUp size={12} style={{ marginRight: 2 }} /> Positive Jump
                          </span>
                        ) : (
                          <span className="rank-badge-decline">
                            <TrendingDown size={12} style={{ marginRight: 2 }} /> Severe Drop
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Score Change Outliers"
              description={`No institutions experienced anomalous score changes exceeding ${threshold} standard deviations between ${start_year} and ${end_year}.`}
            />
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 4: Strong Parameter, Poor Overall Rank (Q8.4)
  // ---------------------------------------------------------------------------
  const renderStrongParamPoorRank = () => {
    if (paramLoading) return <Loading message="Evaluating parameter achievement vs overall rank..." />
    if (paramError) return <ErrorState message={paramError} onRetry={fetchStrongParamPoorRank} />
    if (!paramData) return null

    const {
      year,
      parameter_label = '',
      param_threshold = 0,
      rank_threshold = 0,
      qualifying_count = 0,
      institutions = [],
    } = paramData || {}

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Target size={18} color="#2563eb" />
              <span>Q8.4 Strong Parameter Score but Poor Overall Rank</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions have a strong parameter score but relatively poor overall rank?
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
              value={paramYear}
              onChange={(e) => setParamYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Evaluation Pillar:</span>
            <select
              className="analytics-select"
              value={selectedParam}
              onChange={(e) => setSelectedParam(e.target.value)}
            >
              {PARAMETER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Pillar Percentile Min:</span>
            <select
              className="analytics-select"
              value={paramPercentileMin}
              onChange={(e) => setParamPercentileMin(Number(e.target.value))}
            >
              <option value={50.0}>&ge; 50th Percentile</option>
              <option value={60.0}>&ge; 60th Percentile (Standard)</option>
              <option value={70.0}>&ge; 70th Percentile (Elite Pillar)</option>
            </select>

            <span className="analytics-control-label">Rank Floor:</span>
            <select
              className="analytics-select"
              value={rankMin}
              onChange={(e) => setRankMin(Number(e.target.value))}
            >
              <option value={40}>Rank &ge; 40</option>
              <option value={50}>Rank &ge; 50 (Lower Half)</option>
              <option value={70}>Rank &ge; 70 (Bottom 30%)</option>
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchStrongParamPoorRank}
            title="Refresh screening"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Discrepancy Entities</div>
            <div className="analytics-metric-val" style={{ color: '#2563eb' }}>
              {qualifying_count}
            </div>
            <div className="analytics-metric-sub">Institutions meeting criteria</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Pillar Cutoff Score</div>
            <div className="analytics-metric-val">{param_threshold} pts</div>
            <div className="analytics-metric-sub">&ge; {paramPercentileMin}th percentile in {parameter_label.split('(')[0]}</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Rank Floor Criterion</div>
            <div className="analytics-metric-val">Rank &ge; #{rank_threshold}</div>
            <div className="analytics-metric-sub">Lower ranking bracket</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Maximum Discrepancy</div>
            <div className="analytics-metric-val" style={{ color: '#ea580c' }}>
              {institutions && institutions.length > 0 && institutions[0].discrepancy_score != null
                ? `+${institutions[0].discrepancy_score.toFixed(1)} pts`
                : '0.0 pts'}
            </div>
            <div className="analytics-metric-sub">Pillar Percentile &minus; Rank Percentile</div>
          </div>
        </div>

        {/* Discrepancy Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Institutions Excelling in {parameter_label.split('(')[0]} but Constrained in Composite Rank ({year})
          </h4>
          {institutions.length > 0 ? (
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>Rank</th>
                    <th>Institution Name</th>
                    <th style={{ textAlign: 'right' }}>Pillar Score</th>
                    <th style={{ textAlign: 'right' }}>Pillar Percentile</th>
                    <th style={{ textAlign: 'right' }}>Rank Percentile</th>
                    <th style={{ textAlign: 'right' }}>Discrepancy Gap</th>
                    <th style={{ textAlign: 'right' }}>Overall Score</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((item) => (
                    <tr key={item.institution_name}>
                      <td>
                        <span className="rank-badge-neutral" style={{ fontWeight: 700 }}>
                          #{item.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.institution_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {item.city}, {item.state}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                        {item.parameter_score != null ? item.parameter_score.toFixed(2) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                        {item.param_percentile != null ? `${item.param_percentile.toFixed(1)}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>
                        {item.rank_percentile != null ? `${item.rank_percentile.toFixed(1)}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#ea580c' }}>
                        {item.discrepancy_score != null ? `+${item.discrepancy_score.toFixed(1)} pts` : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.overall_score != null ? item.overall_score.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Discrepant Institutions"
              description={`No institutions met both criteria: ${parameter_label.split('(')[0]} >= ${paramPercentileMin}th percentile and Overall Rank >= #${rank_threshold} in ${year}.`}
            />
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 5: Ranking Volatility (Q8.5)
  // ---------------------------------------------------------------------------
  const renderRankingVolatility = () => {
    if (volLoading) return <Loading message="Computing multi-year rank volatility..." />
    if (volError) return <ErrorState message={volError} onRetry={fetchRankingVolatility} />
    if (!volData) return null

    const {
      method = 'zscore',
      threshold = 1.5,
      total_evaluated = 0,
      volatile_outliers_count = 0,
      mean_std_rank = 0,
      institutions = [],
    } = volData || {}

    const topVol = Array.isArray(institutions) && institutions.length > 0 ? institutions[0] : null

    // Visual chart: Bar chart of top 15 volatile institutions
    const topVolSlice = institutions.slice(0, 15).reverse()
    const volTrace = {
      x: topVolSlice.map((i) => i.std_rank),
      y: topVolSlice.map((i) =>
        i.institution_name.length > 28
          ? i.institution_name.slice(0, 26) + '...'
          : i.institution_name
      ),
      type: 'bar',
      orientation: 'h',
      marker: {
        color: topVolSlice.map((i) => (i.is_volatile_outlier ? '#dc2626' : '#3b82f6')),
        opacity: 0.88,
      },
      customdata: topVolSlice.map((i) => [
        i.institution_name,
        i.years_present,
        i.min_rank,
        i.max_rank,
        i.mean_absolute_shift,
        i.z_volatility,
        i.state,
      ]),
      hovertemplate:
        '<b>%{customdata[0]}</b> (%{customdata[6]})<br>' +
        'Rank Std Dev: <b>%{x:.2f} pls</b> (Z: %{customdata[5]:+.2f})<br>' +
        'Historical Span: #%{customdata[2]} to #%{customdata[3]} (%{customdata[1]} editions)<br>' +
        'Mean Annual Shift: %{customdata[4]:.2f} places<extra></extra>',
    }

    const volLayout = {
      height: 420,
      margin: { l: 200, r: 40, t: 30, b: 50 },
      xaxis: {
        title: { text: 'Ranking Standard Deviation (Places)', font: { size: 12, color: '#475569' } },
        gridcolor: '#f1f5f9',
      },
      yaxis: {
        tickfont: { size: 11, color: '#1e293b' },
      },
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Activity size={18} color="#2563eb" />
              <span>Q8.5 Multi-Year Ranking Volatility Outliers</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions have unusually high ranking volatility compared with similar institutions?
            </div>
          </div>
          <span className="rank-badge-neutral">Category: {category}</span>
        </div>

        {/* Controls */}
        <div className="analytics-controls-bar">
          <div className="analytics-control-group">
            <span className="analytics-control-label">Min Editions Present:</span>
            <select
              className="analytics-select"
              value={volMinYears}
              onChange={(e) => setVolMinYears(Number(e.target.value))}
            >
              <option value={3}>&ge; 3 Editions</option>
              <option value={4}>&ge; 4 Editions (Standard)</option>
              <option value={6}>&ge; 6 Editions (Long-term)</option>
            </select>

            <span className="analytics-control-label">Method:</span>
            <select
              className="analytics-select"
              value={volMethod}
              onChange={(e) => setVolMethod(e.target.value)}
            >
              <option value="zscore">Z-Score Method</option>
              <option value="iqr">IQR Method</option>
            </select>

            <span className="analytics-control-label">Cutoff:</span>
            <select
              className="analytics-select"
              value={volThreshold}
              onChange={(e) => setVolThreshold(Number(e.target.value))}
            >
              <option value={1.2}>Threshold &ge; 1.2</option>
              <option value={1.5}>Threshold &ge; 1.5 (Standard)</option>
              <option value={2.0}>Threshold &ge; 2.0 (Extreme)</option>
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchRankingVolatility}
            title="Refresh volatility"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Volatile Outliers Detected</div>
            <div className="analytics-metric-val" style={{ color: '#dc2626' }}>
              {volatile_outliers_count}
            </div>
            <div className="analytics-metric-sub">Severe longitudinal fluctuation</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Cohort Mean Rank Std Dev</div>
            <div className="analytics-metric-val">{(mean_std_rank ?? 0).toFixed(2)} pls</div>
            <div className="analytics-metric-sub">Average historical volatility</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Peak Volatility Institution</div>
            <div className="analytics-metric-val" style={{ fontSize: '1.05rem', color: '#ea580c' }}>
              {topVol ? (topVol.institution_name?.slice(0, 22) + '...') : 'N/A'}
            </div>
            <div className="analytics-metric-sub">
              {topVol && topVol.std_rank != null ? `Std Dev: ${topVol.std_rank} pls (Span: #${topVol.min_rank}–#${topVol.max_rank})` : ''}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Institutions Evaluated</div>
            <div className="analytics-metric-val">{total_evaluated} Institutions</div>
            <div className="analytics-metric-sub">With &ge; {volMinYears} editions of records</div>
          </div>
        </div>

        {/* Volatility Bar Chart */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            Most Volatile Institutions Ranked by Rank Standard Deviation (Red = Outlier)
          </h4>
          <ChartContainer data={[volTrace]} layout={volLayout} style={{ height: 420 }} />
        </div>

        {/* Volatility Roster Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Multi-Year Institutional Ranking Volatility Scorecard
          </h4>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Institution Name</th>
                  <th>State</th>
                  <th>Editions (Span)</th>
                  <th>Rank Range (Min–Max)</th>
                  <th style={{ textAlign: 'right' }}>Rank Std Dev (&sigma;)</th>
                  <th style={{ textAlign: 'right' }}>Mean Shift</th>
                  <th style={{ textAlign: 'right' }}>Z-Score</th>
                  <th>Volatility Status</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((item) => (
                  <tr key={item.institution_name}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.institution_name}</td>
                    <td>{item.state}</td>
                    <td>{item.years_present} yrs ({item.years_span})</td>
                    <td>
                      <span className="rank-badge-neutral">
                        #{item.min_rank} &rarr; #{item.max_rank} ({item.rank_range} pls)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: item.is_volatile_outlier ? '#dc2626' : '#2563eb' }}>
                      {item.std_rank != null ? item.std_rank.toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.mean_absolute_shift != null ? item.mean_absolute_shift.toFixed(2) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {item.z_volatility != null ? `${item.z_volatility >= 0 ? '+' : ''}${item.z_volatility.toFixed(2)}` : '-'}
                    </td>
                    <td>
                      {item.is_volatile_outlier ? (
                        <span className="rank-badge-decline" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                          Volatile Outlier
                        </span>
                      ) : (
                        <span className="rank-badge-neutral">Normal</span>
                      )}
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
  // Main Page Layout
  // ---------------------------------------------------------------------------
  return (
    <ErrorBoundary title="Outlier Detection & Performance Gaps View">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Top Header */}
        <div>
          <h2 style={{ fontSize: '1.28rem', fontWeight: 700, color: '#0f172a' }}>
            Outlier Detection &amp; Performance Gaps
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
            Rigorous statistical outlier detection (Z-score and IQR methods), regression residuals, performance gap discrepancies, and longitudinal ranking volatility.
          </p>
        </div>

        {/* Sub-Navigation Tabs */}
        <OutlierTabs activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab Panels */}
        {activeTab === 'research-outliers' && renderResearchOutliers()}
        {activeTab === 'research-teaching-gap' && renderResearchTeachingGap()}
        {activeTab === 'score-change-outliers' && renderScoreChangeOutliers()}
        {activeTab === 'strong-param-poor-rank' && renderStrongParamPoorRank()}
        {activeTab === 'ranking-volatility' && renderRankingVolatility()}
      </div>
    </ErrorBoundary>
  )
}

export default OutlierDetection
