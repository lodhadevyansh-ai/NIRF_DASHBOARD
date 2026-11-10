/**
 * NIRF Analytics Dashboard — Time-Series & Trend Analysis Module.
 *
 * Implements:
 * - Q1.1 Trajectory: Longitudinal rank and score trajectory with inverted Y-axis.
 * - Q1.2 Improvements: Top ranking gainers (Starting Rank - Ending Rank).
 * - Q1.3 Declines: Largest ranking declines (Ending Rank - Starting Rank).
 * - Q1.4 Average Score Trend: Category score dynamics (Mean, Median, IQR ribbon).
 * - Q1.5 Consistent Top: Persistent top-tier performers with yearly rank heat matrix.
 */

import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CheckCircle,
  ChevronDown,
  Filter,
  HelpCircle,
  LineChart as LineChartIcon,
  RefreshCw,
  Search,
  Sliders,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import { api } from '../services/api'
import { TimeSeriesTabs } from '../components/analytics/TimeSeriesTabs'
import { LineChart } from '../components/charts/LineChart'
import { RankShiftBarChart, ScoreTrendChart } from '../components/charts/TrendChart'
import { Loading } from '../components/common/Loading'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import '../styles/analytics.css'

export function TimeSeries() {
  const { category, availableYears } = useFilters()

  // Sub-navigation state
  const [activeTab, setActiveTab] = useState('trajectory')

  // Global years bounds for category
  const minAvailableYear = availableYears && availableYears.length ? Math.min(...availableYears) : 2017
  const maxAvailableYear = availableYears && availableYears.length ? Math.max(...availableYears) : 2025

  // Tab 1: Trajectory state
  const [institutionsList, setInstitutionsList] = useState([])
  const [selectedInstitution, setSelectedInstitution] = useState('')
  const [instSearch, setInstSearch] = useState('')
  const [trajectoryData, setTrajectoryData] = useState(null)
  const [trajectoryLoading, setTrajectoryLoading] = useState(false)
  const [trajectoryError, setTrajectoryError] = useState(null)
  const [trajectoryMode, setTrajectoryMode] = useState('rank') // 'rank' or 'scores'

  // Tab 2: Improvements state
  const [impStartYear, setImpStartYear] = useState(minAvailableYear)
  const [impEndYear, setImpEndYear] = useState(maxAvailableYear)
  const [impLimit, setImpLimit] = useState(10)
  const [improvementsData, setImprovementsData] = useState(null)
  const [improvementsLoading, setImprovementsLoading] = useState(false)
  const [improvementsError, setImprovementsError] = useState(null)

  // Tab 3: Declines state
  const [decStartYear, setDecStartYear] = useState(minAvailableYear)
  const [decEndYear, setDecEndYear] = useState(maxAvailableYear)
  const [decLimit, setDecLimit] = useState(10)
  const [declinesData, setDeclinesData] = useState(null)
  const [declinesLoading, setDeclinesLoading] = useState(false)
  const [declinesError, setDeclinesError] = useState(null)

  // Tab 4: Average Score Trend state
  const [avgStartYear, setAvgStartYear] = useState(minAvailableYear)
  const [avgEndYear, setAvgEndYear] = useState(maxAvailableYear)
  const [avgScoreData, setAvgScoreData] = useState(null)
  const [avgScoreLoading, setAvgScoreLoading] = useState(false)
  const [avgScoreError, setAvgScoreError] = useState(null)

  // Tab 5: Consistent Top state
  const [topNTier, setTopNTier] = useState(10)
  const [conStartYear, setConStartYear] = useState(minAvailableYear)
  const [conEndYear, setConEndYear] = useState(maxAvailableYear)
  const [consistentData, setConsistentData] = useState(null)
  const [consistentLoading, setConsistentLoading] = useState(false)
  const [consistentError, setConsistentError] = useState(null)

  // Sync year defaults when category or availableYears change
  useEffect(() => {
    if (availableYears && availableYears.length >= 2) {
      const minY = Math.min(...availableYears)
      const maxY = Math.max(...availableYears)
      setImpStartYear(minY)
      setImpEndYear(maxY)
      setDecStartYear(minY)
      setDecEndYear(maxY)
      setAvgStartYear(minY)
      setAvgEndYear(maxY)
      setConStartYear(minY)
      setConEndYear(maxY)
    }
  }, [category, availableYears])

  // ---------------------------------------------------------------------------
  // Load Institution List for Category (for Tab 1 dropdown)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true
    async function fetchInstitutions() {
      try {
        const list = await api.getTimeSeriesInstitutions(category)
        if (isMounted) {
          setInstitutionsList(list)
          if (list.length > 0) {
            // Keep current selection if still valid, else pick #1
            const exists = list.some((i) => i.institution_name === selectedInstitution)
            if (!exists) {
              setSelectedInstitution(list[0].institution_name)
            }
          } else {
            setSelectedInstitution('')
          }
        }
      } catch (err) {
        console.error('Failed to load category institutions:', err)
      }
    }
    fetchInstitutions()
    return () => {
      isMounted = false
    }
  }, [category])

  // ---------------------------------------------------------------------------
  // Tab 1: Fetch Trajectory Data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'trajectory') return

    let isMounted = true
    async function loadTrajectory() {
      setTrajectoryLoading(true)
      setTrajectoryError(null)
      try {
        const data = await api.getTrajectory(category, selectedInstitution || null)
        if (isMounted) {
          setTrajectoryData(data)
          if (!selectedInstitution && data.institution_name) {
            setSelectedInstitution(data.institution_name)
          }
        }
      } catch (err) {
        if (isMounted) {
          setTrajectoryError(err.message || 'Failed to load trajectory.')
        }
      } finally {
        if (isMounted) setTrajectoryLoading(false)
      }
    }

    loadTrajectory()
    return () => {
      isMounted = false
    }
  }, [category, selectedInstitution, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 2: Fetch Improvements
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'improvements') return
    if (impStartYear >= impEndYear) return

    let isMounted = true
    async function loadImprovements() {
      setImprovementsLoading(true)
      setImprovementsError(null)
      try {
        const data = await api.getImprovements(category, impStartYear, impEndYear, impLimit)
        if (isMounted) setImprovementsData(data)
      } catch (err) {
        if (isMounted) setImprovementsError(err.message || 'Failed to load improvements.')
      } finally {
        if (isMounted) setImprovementsLoading(false)
      }
    }

    loadImprovements()
    return () => {
      isMounted = false
    }
  }, [category, impStartYear, impEndYear, impLimit, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 3: Fetch Declines
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'declines') return
    if (decStartYear >= decEndYear) return

    let isMounted = true
    async function loadDeclines() {
      setDeclinesLoading(true)
      setDeclinesError(null)
      try {
        const data = await api.getDeclines(category, decStartYear, decEndYear, decLimit)
        if (isMounted) setDeclinesData(data)
      } catch (err) {
        if (isMounted) setDeclinesError(err.message || 'Failed to load declines.')
      } finally {
        if (isMounted) setDeclinesLoading(false)
      }
    }

    loadDeclines()
    return () => {
      isMounted = false
    }
  }, [category, decStartYear, decEndYear, decLimit, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 4: Fetch Average Score Trend
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'average-trend') return
    if (avgStartYear >= avgEndYear) return

    let isMounted = true
    async function loadAvgScore() {
      setAvgScoreLoading(true)
      setAvgScoreError(null)
      try {
        const data = await api.getAverageScoreTrend(category, avgStartYear, avgEndYear)
        if (isMounted) setAvgScoreData(data)
      } catch (err) {
        if (isMounted) setAvgScoreError(err.message || 'Failed to load average score trend.')
      } finally {
        if (isMounted) setAvgScoreLoading(false)
      }
    }

    loadAvgScore()
    return () => {
      isMounted = false
    }
  }, [category, avgStartYear, avgEndYear, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 5: Fetch Consistent Top
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'consistent-top') return
    if (conStartYear >= conEndYear) return

    let isMounted = true
    async function loadConsistentTop() {
      setConsistentLoading(true)
      setConsistentError(null)
      try {
        const data = await api.getConsistentTop(category, conStartYear, conEndYear, topNTier, 25)
        if (isMounted) setConsistentData(data)
      } catch (err) {
        if (isMounted) setConsistentError(err.message || 'Failed to load consistent top tier data.')
      } finally {
        if (isMounted) setConsistentLoading(false)
      }
    }

    loadConsistentTop()
    return () => {
      isMounted = false
    }
  }, [category, conStartYear, conEndYear, topNTier, activeTab])

  // Filtered institutions list for search in Trajectory tab
  const filteredInstitutions = institutionsList.filter((inst) =>
    inst.institution_name.toLowerCase().includes(instSearch.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Heading matching specification */}
      <div className="dashboard-header-container" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="dashboard-title">Time-Series & Trend Analysis</h1>
          <p className="dashboard-subtitle">
            Track ranking movements, score trajectories and historical performance across NIRF ranking cycles.
          </p>
        </div>
      </div>

      {/* Horizontal Sub-Navigation Tabs */}
      <TimeSeriesTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* =========================================================================
          Q1.1 TRAJECTORY SUBSECTION
          ========================================================================= */}
      {activeTab === 'trajectory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <TrendingUp size={18} style={{ color: '#2563eb' }} />
                <span>Q1.1 Trajectory: Longitudinal Rank & Score Dynamics</span>
              </div>
              <p className="analytics-question-subtitle">
                How has the overall NIRF ranking of a selected institution changed from 2017 to 2025 in the {category} category?
              </p>
            </div>
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${trajectoryMode === 'rank' ? 'active' : ''}`}
                onClick={() => setTrajectoryMode('rank')}
              >
                Rank Trajectory
              </button>
              <button
                type="button"
                className={`view-mode-btn ${trajectoryMode === 'scores' ? 'active' : ''}`}
                onClick={() => setTrajectoryMode('scores')}
              >
                Score Breakdown
              </button>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group" style={{ flex: 1 }}>
              <label htmlFor="inst-select" className="analytics-control-label">
                Select Institution:
              </label>
              <select
                id="inst-select"
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="analytics-select analytics-inst-select"
              >
                {institutionsList.map((inst) => (
                  <option key={inst.institution_name} value={inst.institution_name}>
                    {inst.institution_name} {inst.latest_rank ? `(#${inst.latest_rank})` : ''} — {inst.appearances} yrs
                  </option>
                ))}
              </select>

              {/* Institution Quick Filter Text */}
              <div style={{ position: 'relative', minWidth: 200 }}>
                <Search
                  size={14}
                  style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }}
                />
                <input
                  type="text"
                  placeholder="Filter dropdown list..."
                  value={instSearch}
                  onChange={(e) => setInstSearch(e.target.value)}
                  style={{
                    padding: '8px 10px 8px 30px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    width: '100%',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>
            </div>

            {trajectoryData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                State: <strong style={{ color: '#0f172a' }}>{trajectoryData.state || 'N/A'}</strong>
                {trajectoryData.city ? ` • ${trajectoryData.city}` : ''}
              </div>
            )}
          </div>

          {trajectoryLoading && <Loading text="Loading historical trajectory..." />}
          {trajectoryError && <ErrorState message={trajectoryError} />}

          {!trajectoryLoading && !trajectoryError && trajectoryData && (
            <>
              {/* Institution Trajectory KPI Cards */}
              <div className="analytics-metrics-ribbon">
                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Best Rank</span>
                  <span className="analytics-metric-val" style={{ color: '#2563eb' }}>
                    {trajectoryData.best_rank ? `#${trajectoryData.best_rank}` : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Peak standing</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Latest Rank</span>
                  <span className="analytics-metric-val">
                    {trajectoryData.latest_rank ? `#${trajectoryData.latest_rank}` : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">
                    Score: {trajectoryData.latest_score ?? 'N/A'}
                  </span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Editions Ranked</span>
                  <span className="analytics-metric-val">{trajectoryData.years_ranked}</span>
                  <span className="analytics-metric-sub">Across 2017–2025</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Net Rank Shift</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {trajectoryData.rank_change_overall !== null ? (
                      trajectoryData.rank_change_overall > 0 ? (
                        <span className="rank-badge-improvement">
                          <ArrowUpRight size={14} />+{trajectoryData.rank_change_overall}
                        </span>
                      ) : trajectoryData.rank_change_overall < 0 ? (
                        <span className="rank-badge-decline">
                          <ArrowDownRight size={14} />{trajectoryData.rank_change_overall}
                        </span>
                      ) : (
                        <span className="rank-badge-neutral">Unchanged</span>
                      )
                    ) : (
                      <span className="analytics-metric-val">N/A</span>
                    )}
                  </div>
                  <span className="analytics-metric-sub">Earliest vs Latest edition</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Score Delta</span>
                  <span
                    className="analytics-metric-val"
                    style={{
                      color:
                        trajectoryData.score_change_overall && trajectoryData.score_change_overall > 0
                          ? '#059669'
                          : trajectoryData.score_change_overall && trajectoryData.score_change_overall < 0
                          ? '#e11d48'
                          : '#0f172a',
                    }}
                  >
                    {trajectoryData.score_change_overall !== null
                      ? `${trajectoryData.score_change_overall > 0 ? '+' : ''}${trajectoryData.score_change_overall}`
                      : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Net points movement</span>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                      {trajectoryMode === 'rank'
                        ? `Longitudinal Ranking Trajectory: ${trajectoryData.institution_name}`
                        : `Parameter Score Trends: ${trajectoryData.institution_name}`}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      {trajectoryMode === 'rank'
                        ? 'Inverted Y-axis: Rank #1 is at the top of the chart.'
                        : 'Normalized scores across TLR, RPC, GO, OI, and PR components (0–100 scale).'}
                    </p>
                  </div>
                </div>

                {trajectoryMode === 'rank' ? (
                  <LineChart
                    series={[
                      {
                        name: trajectoryData.institution_name,
                        x: trajectoryData.trajectory.map((p) => p.year),
                        y: trajectoryData.trajectory.map((p) => p.numeric_rank),
                        color: '#2563eb',
                        lineWidth: 3,
                        markerSize: 8,
                        hovertemplate:
                          `<b>${trajectoryData.institution_name}</b><br>` +
                          'Edition: %{x}<br>' +
                          'Rank: #%{y}<extra></extra>',
                      },
                    ]}
                    xAxisTitle="NIRF Edition"
                    yAxisTitle="Rank (1 is Top)"
                    invertedY={true}
                    height={380}
                  />
                ) : (
                  <LineChart
                    series={[
                      {
                        name: 'Overall Score',
                        x: trajectoryData.trajectory.map((p) => p.year),
                        y: trajectoryData.trajectory.map((p) => p.overall_score),
                        color: '#2563eb',
                        lineWidth: 3.5,
                        markerSize: 8,
                      },
                      {
                        name: 'TLR (Teaching & Learning)',
                        x: trajectoryData.trajectory.map((p) => p.year),
                        y: trajectoryData.trajectory.map((p) => p.tlr_score),
                        color: '#10b981',
                        lineWidth: 2,
                        dash: 'dot',
                      },
                      {
                        name: 'RPC (Research & Practice)',
                        x: trajectoryData.trajectory.map((p) => p.year),
                        y: trajectoryData.trajectory.map((p) => p.rpc_score),
                        color: '#8b5cf6',
                        lineWidth: 2,
                        dash: 'dot',
                      },
                      {
                        name: 'GO (Graduation Outcomes)',
                        x: trajectoryData.trajectory.map((p) => p.year),
                        y: trajectoryData.trajectory.map((p) => p.go_score),
                        color: '#f59e0b',
                        lineWidth: 2,
                        dash: 'dot',
                      },
                      {
                        name: 'OI (Outreach & Inclusivity)',
                        x: trajectoryData.trajectory.map((p) => p.year),
                        y: trajectoryData.trajectory.map((p) => p.oi_score),
                        color: '#06b6d4',
                        lineWidth: 2,
                        dash: 'dot',
                      },
                      {
                        name: 'PR (Perception)',
                        x: trajectoryData.trajectory.map((p) => p.year),
                        y: trajectoryData.trajectory.map((p) => p.pr_score),
                        color: '#ec4899',
                        lineWidth: 2,
                        dash: 'dot',
                      },
                    ].filter((s) => s.y.some((val) => val !== null && val !== undefined))}
                    xAxisTitle="NIRF Edition"
                    yAxisTitle="Score (0–100)"
                    invertedY={false}
                    height={380}
                  />
                )}
              </div>

              {/* Year-wise Ranking & Score Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Historical Edition Records: {trajectoryData.institution_name}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Edition</th>
                        <th>Rank</th>
                        <th>Overall Score</th>
                        <th>TLR</th>
                        <th>RPC</th>
                        <th>GO</th>
                        <th>OI</th>
                        <th>PR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trajectoryData.trajectory.map((row) => (
                        <tr key={row.year}>
                          <td><strong>{row.year}</strong></td>
                          <td>
                            <span className="rank-badge rank-badge-top10">
                              #{row.rank}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: '#2563eb' }}>
                            {row.overall_score !== null ? row.overall_score.toFixed(2) : 'N/A'}
                          </td>
                          <td>{row.tlr_score !== null ? row.tlr_score.toFixed(2) : 'N/A'}</td>
                          <td>{row.rpc_score !== null ? row.rpc_score.toFixed(2) : 'N/A'}</td>
                          <td>{row.go_score !== null ? row.go_score.toFixed(2) : 'N/A'}</td>
                          <td>{row.oi_score !== null ? row.oi_score.toFixed(2) : 'N/A'}</td>
                          <td>{row.pr_score !== null ? row.pr_score.toFixed(2) : 'N/A'}</td>
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
          Q1.2 IMPROVEMENTS SUBSECTION
          ========================================================================= */}
      {activeTab === 'improvements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <ArrowUpRight size={18} style={{ color: '#059669' }} />
                <span>Q1.2 Improvements: Top Ranking Gainers</span>
              </div>
              <p className="analytics-question-subtitle">
                Identify institutions showing the greatest positive improvement in rank (Starting Rank - Ending Rank) in {category}.
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="imp-start-year" className="analytics-control-label">Starting Year:</label>
              <select
                id="imp-start-year"
                value={impStartYear}
                onChange={(e) => setImpStartYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y >= impEndYear}>
                    {y}
                  </option>
                ))}
              </select>

              <label htmlFor="imp-end-year" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Ending Year:
              </label>
              <select
                id="imp-end-year"
                value={impEndYear}
                onChange={(e) => setImpEndYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y <= impStartYear}>
                    {y}
                  </option>
                ))}
              </select>

              <label htmlFor="imp-limit" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Display:
              </label>
              <select
                id="imp-limit"
                value={impLimit}
                onChange={(e) => setImpLimit(Number(e.target.value))}
                className="analytics-select"
                style={{ minWidth: 90 }}
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </select>
            </div>

            {improvementsData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Institutions compared across both years: <strong>{improvementsData.total_compared}</strong>
              </div>
            )}
          </div>

          {improvementsLoading && <Loading text="Computing rank improvements..." />}
          {improvementsError && <ErrorState message={improvementsError} />}

          {!improvementsLoading && !improvementsError && improvementsData && (
            <>
              {improvementsData.items.length === 0 ? (
                <EmptyState
                  title="No Matching Improvements"
                  message={`No institutions recorded positive ranking advances between ${impStartYear} and ${impEndYear} in ${category}.`}
                />
              ) : (
                <>
                  {/* Improvements Bar Chart */}
                  <div className="nirf-card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                      Top {improvementsData.items.length} Rank Improvements ({impStartYear} → {impEndYear})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 14 }}>
                      Calculated as: <em>Starting Rank ({impStartYear}) − Ending Rank ({impEndYear})</em>. Higher positive values indicate greater rise.
                    </p>
                    <RankShiftBarChart
                      items={improvementsData.items}
                      metricType="improvement"
                      height={Math.max(440, improvementsData.items.length * 44 + 80)}
                    />
                  </div>

                  {/* Improvements Data Table */}
                  <div className="nirf-card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                      Institution Improvement Comparison
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="nirf-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Institution Name</th>
                            <th>State</th>
                            <th>{impStartYear} Rank</th>
                            <th>{impEndYear} Rank</th>
                            <th>Rank Improvement</th>
                            <th>{impStartYear} Score</th>
                            <th>{impEndYear} Score</th>
                            <th>Score Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {improvementsData.items.map((item, idx) => (
                            <tr key={item.institution_name}>
                              <td style={{ color: '#64748b' }}>{idx + 1}</td>
                              <td><strong>{item.institution_name}</strong></td>
                              <td>{item.state || 'N/A'}</td>
                              <td>#{item.start_rank}</td>
                              <td style={{ fontWeight: 600, color: '#059669' }}>#{item.end_rank}</td>
                              <td>
                                <span className="rank-badge-improvement">
                                  <ArrowUpRight size={13} />+{item.rank_change} places
                                </span>
                              </td>
                              <td>{item.start_score ?? 'N/A'}</td>
                              <td style={{ fontWeight: 600 }}>{item.end_score ?? 'N/A'}</td>
                              <td style={{ color: item.score_change && item.score_change > 0 ? '#059669' : '#64748b' }}>
                                {item.score_change !== null ? `${item.score_change > 0 ? '+' : ''}${item.score_change}` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          Q1.3 DECLINES SUBSECTION
          ========================================================================= */}
      {activeTab === 'declines' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner" style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #eff6ff 100%)', borderColor: '#fecdd3' }}>
            <div>
              <div className="analytics-question-title">
                <ArrowDownRight size={18} style={{ color: '#e11d48' }} />
                <span>Q1.3 Declines: Largest Ranking Drops</span>
              </div>
              <p className="analytics-question-subtitle">
                Identify institutions experiencing the largest ranking regression (Ending Rank - Starting Rank) in {category}.
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="dec-start-year" className="analytics-control-label">Starting Year:</label>
              <select
                id="dec-start-year"
                value={decStartYear}
                onChange={(e) => setDecStartYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y >= decEndYear}>
                    {y}
                  </option>
                ))}
              </select>

              <label htmlFor="dec-end-year" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Ending Year:
              </label>
              <select
                id="dec-end-year"
                value={decEndYear}
                onChange={(e) => setDecEndYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y <= decStartYear}>
                    {y}
                  </option>
                ))}
              </select>

              <label htmlFor="dec-limit" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Display:
              </label>
              <select
                id="dec-limit"
                value={decLimit}
                onChange={(e) => setDecLimit(Number(e.target.value))}
                className="analytics-select"
                style={{ minWidth: 90 }}
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </select>
            </div>

            {declinesData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Institutions compared across both years: <strong>{declinesData.total_compared}</strong>
              </div>
            )}
          </div>

          {declinesLoading && <Loading text="Computing rank declines..." />}
          {declinesError && <ErrorState message={declinesError} />}

          {!declinesLoading && !declinesError && declinesData && (
            <>
              {declinesData.items.length === 0 ? (
                <EmptyState
                  title="No Significant Declines"
                  message={`No institutions suffered rank declines between ${decStartYear} and ${decEndYear} in ${category}.`}
                />
              ) : (
                <>
                  {/* Declines Bar Chart */}
                  <div className="nirf-card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                      Top {declinesData.items.length} Rank Regressions ({decStartYear} → {decEndYear})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 14 }}>
                      Calculated as: <em>Ending Rank ({decEndYear}) − Starting Rank ({decStartYear})</em>. Higher values indicate greater drop in standing.
                    </p>
                    <RankShiftBarChart
                      items={declinesData.items}
                      metricType="decline"
                      height={Math.max(440, declinesData.items.length * 44 + 80)}
                    />
                  </div>

                  {/* Declines Data Table */}
                  <div className="nirf-card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                      Institution Regression Breakdown
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="nirf-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Institution Name</th>
                            <th>State</th>
                            <th>{decStartYear} Rank</th>
                            <th>{decEndYear} Rank</th>
                            <th>Rank Regression</th>
                            <th>{decStartYear} Score</th>
                            <th>{decEndYear} Score</th>
                            <th>Score Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {declinesData.items.map((item, idx) => (
                            <tr key={item.institution_name}>
                              <td style={{ color: '#64748b' }}>{idx + 1}</td>
                              <td><strong>{item.institution_name}</strong></td>
                              <td>{item.state || 'N/A'}</td>
                              <td>#{item.start_rank}</td>
                              <td style={{ fontWeight: 600, color: '#e11d48' }}>#{item.end_rank}</td>
                              <td>
                                <span className="rank-badge-decline">
                                  <ArrowDownRight size={13} />−{item.rank_change} places
                                </span>
                              </td>
                              <td>{item.start_score ?? 'N/A'}</td>
                              <td style={{ fontWeight: 600 }}>{item.end_score ?? 'N/A'}</td>
                              <td style={{ color: item.score_change && item.score_change < 0 ? '#e11d48' : '#64748b' }}>
                                {item.score_change !== null ? `${item.score_change > 0 ? '+' : ''}${item.score_change}` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          Q1.4 AVERAGE SCORE TREND SUBSECTION
          ========================================================================= */}
      {activeTab === 'average-trend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <LineChartIcon size={18} style={{ color: '#2563eb' }} />
                <span>Q1.4 Average Score Trend & Macro Benchmark Dynamics</span>
              </div>
              <p className="analytics-question-subtitle">
                Track annual average composite scores, median milestones, and score dispersion across NIRF cycles for {category}.
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="avg-start-year" className="analytics-control-label">Span Start:</label>
              <select
                id="avg-start-year"
                value={avgStartYear}
                onChange={(e) => setAvgStartYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y >= avgEndYear}>
                    {y}
                  </option>
                ))}
              </select>

              <label htmlFor="avg-end-year" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Span End:
              </label>
              <select
                id="avg-end-year"
                value={avgEndYear}
                onChange={(e) => setAvgEndYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y <= avgStartYear}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {avgScoreData && avgScoreData.overall_mean_change !== null && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Net Mean Score Shift:
                <strong style={{ color: avgScoreData.overall_mean_change >= 0 ? '#059669' : '#e11d48', marginLeft: 6 }}>
                  {avgScoreData.overall_mean_change >= 0 ? '+' : ''}{avgScoreData.overall_mean_change} points
                </strong>
              </div>
            )}
          </div>

          {avgScoreLoading && <Loading text="Aggregating annual score trends..." />}
          {avgScoreError && <ErrorState message={avgScoreError} />}

          {!avgScoreLoading && !avgScoreError && avgScoreData && (
            <>
              {/* Score Trend Chart with Mean, Median, and IQR Ribbon */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                    Longitudinal Score Trajectory: {category} ({avgScoreData.start_year}–{avgScoreData.end_year})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Shows Mean Score (royal blue), Median Score (sky blue dashed), and Interquartile Range (shaded ribbon covering 25th to 75th percentiles).
                  </p>
                </div>
                <ScoreTrendChart
                  yearlyStats={avgScoreData.yearly_stats}
                  height={380}
                  category={category}
                />
              </div>

              {/* Annual Score Statistics Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Annual Descriptive Score Parameters
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Edition</th>
                        <th>Scored Institutions</th>
                        <th>Mean Score</th>
                        <th>Median Score</th>
                        <th>Min Score</th>
                        <th>Max Score</th>
                        <th>25th %ile (Q1)</th>
                        <th>75th %ile (Q3)</th>
                        <th>Std Deviation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {avgScoreData.yearly_stats.map((row) => (
                        <tr key={row.year}>
                          <td><strong>{row.year}</strong></td>
                          <td>{row.institution_count}</td>
                          <td style={{ fontWeight: 600, color: '#2563eb' }}>
                            {row.mean_score !== null ? row.mean_score.toFixed(2) : 'N/A'}
                          </td>
                          <td style={{ fontWeight: 600, color: '#0ea5e9' }}>
                            {row.median_score !== null ? row.median_score.toFixed(2) : 'N/A'}
                          </td>
                          <td>{row.min_score !== null ? row.min_score.toFixed(2) : 'N/A'}</td>
                          <td>{row.max_score !== null ? row.max_score.toFixed(2) : 'N/A'}</td>
                          <td>{row.q25_score !== null ? row.q25_score.toFixed(2) : 'N/A'}</td>
                          <td>{row.q75_score !== null ? row.q75_score.toFixed(2) : 'N/A'}</td>
                          <td style={{ color: '#64748b' }}>
                            {row.std_score !== null ? row.std_score.toFixed(2) : 'N/A'}
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
          Q1.5 CONSISTENT TOP SUBSECTION
          ========================================================================= */}
      {activeTab === 'consistent-top' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <Award size={18} style={{ color: '#f59e0b' }} />
                <span>Q1.5 Consistent Top: Elite Tier Persistence</span>
              </div>
              <p className="analytics-question-subtitle">
                Identify institutions consistently maintaining positions in Top {topNTier} in {category} across {conStartYear}–{conEndYear}.
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="tier-select" className="analytics-control-label">Tier Threshold:</label>
              <select
                id="tier-select"
                value={topNTier}
                onChange={(e) => setTopNTier(Number(e.target.value))}
                className="analytics-select"
                style={{ minWidth: 110 }}
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>

              <label htmlFor="con-start-year" className="analytics-control-label" style={{ marginLeft: 12 }}>
                From:
              </label>
              <select
                id="con-start-year"
                value={conStartYear}
                onChange={(e) => setConStartYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y >= conEndYear}>
                    {y}
                  </option>
                ))}
              </select>

              <label htmlFor="con-end-year" className="analytics-control-label" style={{ marginLeft: 12 }}>
                To:
              </label>
              <select
                id="con-end-year"
                value={conEndYear}
                onChange={(e) => setConEndYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y <= conStartYear}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {consistentData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Editions evaluated: <strong>{consistentData.total_years_analyzed}</strong> • Elite entities: <strong>{consistentData.institutions.length}</strong>
              </div>
            )}
          </div>

          {consistentLoading && <Loading text="Analyzing longitudinal persistence..." />}
          {consistentError && <ErrorState message={consistentError} />}

          {!consistentLoading && !consistentError && consistentData && (
            <>
              {consistentData.institutions.length === 0 ? (
                <EmptyState
                  title="No Elite Tier Matches"
                  message={`No institutions met the Top ${topNTier} threshold across ${conStartYear}–${conEndYear} in ${category}.`}
                />
              ) : (
                <div className="nirf-card" style={{ padding: 20 }}>
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a' }}>
                      Top {topNTier} Persistence & Longitudinal Heat Grid
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      Numbered badges show institutional rank in each edition. Colored green for Top 5, blue for Top 10, sky blue for Top 20, and dashed grey if unranked.
                    </p>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="nirf-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Institution Name</th>
                          <th>State</th>
                          <th>Appearances</th>
                          <th>Consistency %</th>
                          <th>Avg Rank</th>
                          <th>Peak Rank</th>
                          <th>Annual Rank Matrix ({conStartYear}–{conEndYear})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consistentData.institutions.map((inst, idx) => {
                          const yearsList = []
                          for (let yr = conStartYear; yr <= conEndYear; yr++) {
                            yearsList.push(yr)
                          }

                          return (
                            <tr key={inst.institution_name}>
                              <td style={{ color: '#64748b' }}>{idx + 1}</td>
                              <td><strong>{inst.institution_name}</strong></td>
                              <td>{inst.state || 'N/A'}</td>
                              <td>
                                <strong style={{ color: '#2563eb' }}>
                                  {inst.appearances} / {inst.total_years}
                                </strong>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <span className="consistency-progress-track">
                                    <div
                                      className="consistency-progress-bar"
                                      style={{ width: `${inst.consistency_pct}%` }}
                                    />
                                  </span>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                                    {inst.consistency_pct}%
                                  </span>
                                </div>
                              </td>
                              <td>#{inst.average_rank}</td>
                              <td style={{ color: '#059669', fontWeight: 600 }}>#{inst.best_rank}</td>
                              <td>
                                <div className="consistency-heat-grid">
                                  {yearsList.map((yr) => {
                                    const rankVal = inst.yearly_ranks[String(yr)]
                                    let cellClass = 'heat-cell heat-cell-missing'
                                    if (rankVal !== null && rankVal !== undefined) {
                                      if (rankVal <= 5) cellClass = 'heat-cell heat-cell-top5'
                                      else if (rankVal <= 10) cellClass = 'heat-cell heat-cell-top10'
                                      else if (rankVal <= 20) cellClass = 'heat-cell heat-cell-top20'
                                      else cellClass = 'heat-cell heat-cell-lower'
                                    }

                                    return (
                                      <div
                                        key={yr}
                                        className={cellClass}
                                        title={`${yr}: ${rankVal !== null && rankVal !== undefined ? `Rank #${rankVal}` : 'Not Ranked'}`}
                                      >
                                        {rankVal !== null && rankVal !== undefined ? rankVal : '—'}
                                      </div>
                                    )
                                  })}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TimeSeries
