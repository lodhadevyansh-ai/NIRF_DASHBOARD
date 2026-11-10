/**
 * NIRF Analytics Dashboard — Ranking Transitions & Institutional Mobility Module.
 *
 * Implements:
 * - Q7.1 Rank Band Movement: Sankey flow diagram, band-to-band transitions, and 51–100 into Top 50 tracking.
 * - Q7.2 Top 10 Entries and Exits: Elite tier turnover, new entrants, exits, and stability rates.
 * - Q7.3 Rank Band Retention: Markov transition matrix heatmap, upward/downward mobility shares.
 * - Q7.4 Largest Movements: Top climbers and fallers bar chart and movement roster.
 * - Q7.5 Institutional Mobility Over Time: Annual stacked mobility shares (Up, Down, Retained).
 */

import React, { useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  ArrowUpRight,
  Award,
  ChevronDown,
  Filter,
  Grid,
  History,
  Info,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import { api } from '../services/api'
import { TransitionTabs } from '../components/analytics/TransitionTabs'
import { SankeyChart } from '../components/charts/SankeyChart'
import { TransitionMatrix } from '../components/charts/TransitionMatrix'
import { MovementChart } from '../components/charts/MovementChart'
import { ChartContainer } from '../components/charts/ChartContainer'
import { Loading } from '../components/common/Loading'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import '../styles/analytics.css'

export function RankingTransitions() {
  const { category, selectedYear, availableYears } = useFilters()

  // Sub-navigation tab state
  const [activeTab, setActiveTab] = useState('band-movement')

  // Global year bounds
  const minAvailableYear = availableYears && availableYears.length ? Math.min(...availableYears) : 2017
  const maxAvailableYear = availableYears && availableYears.length ? Math.max(...availableYears) : 2025

  // ---------------------------------------------------------------------------
  // Tab 1: Band Movement State (Q7.1)
  // ---------------------------------------------------------------------------
  const [bandStartYear, setBandStartYear] = useState(
    availableYears && availableYears.length >= 3 ? availableYears[availableYears.length - 3] : 2023
  )
  const [bandEndYear, setBandEndYear] = useState(maxAvailableYear)
  const [bandData, setBandData] = useState(null)
  const [bandLoading, setBandLoading] = useState(false)
  const [bandError, setBandError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 2: Top 10 Entry/Exit State (Q7.2)
  // ---------------------------------------------------------------------------
  const [top10StartYear, setTop10StartYear] = useState(
    availableYears && availableYears.length >= 2 ? availableYears[availableYears.length - 2] : 2024
  )
  const [top10EndYear, setTop10EndYear] = useState(maxAvailableYear)
  const [top10Data, setTop10Data] = useState(null)
  const [top10Loading, setTop10Loading] = useState(false)
  const [top10Error, setTop10Error] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 3: Band Retention State (Q7.3)
  // ---------------------------------------------------------------------------
  const [retStartYear, setRetStartYear] = useState(
    availableYears && availableYears.length >= 3 ? availableYears[availableYears.length - 3] : 2023
  )
  const [retEndYear, setRetEndYear] = useState(maxAvailableYear)
  const [retData, setRetData] = useState(null)
  const [retLoading, setRetLoading] = useState(false)
  const [retError, setRetError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 4: Largest Movements State (Q7.4)
  // ---------------------------------------------------------------------------
  const [movStartYear, setMovStartYear] = useState(
    availableYears && availableYears.length >= 3 ? availableYears[availableYears.length - 3] : 2023
  )
  const [movEndYear, setMovEndYear] = useState(maxAvailableYear)
  const [movLimit, setMovLimit] = useState(10)
  const [movData, setMovData] = useState(null)
  const [movLoading, setMovLoading] = useState(false)
  const [movError, setMovError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 5: Institutional Mobility History State (Q7.5)
  // ---------------------------------------------------------------------------
  const [mobilityData, setMobilityData] = useState(null)
  const [mobilityLoading, setMobilityLoading] = useState(false)
  const [mobilityError, setMobilityError] = useState(null)

  // ---------------------------------------------------------------------------
  // Fetchers
  // ---------------------------------------------------------------------------
  const fetchBandMovement = async () => {
    if (bandStartYear >= bandEndYear) {
      setBandError('Start year must be strictly earlier than end year.')
      return
    }
    setBandLoading(true)
    setBandError(null)
    try {
      const res = await api.getBandMovement(category, bandStartYear, bandEndYear)
      setBandData(res)
    } catch (err) {
      setBandError(err.message || 'Failed to fetch rank band movements.')
    } finally {
      setBandLoading(false)
    }
  }

  const fetchTop10EntryExit = async () => {
    if (top10StartYear >= top10EndYear) {
      setTop10Error('Start year must be strictly earlier than end year.')
      return
    }
    setTop10Loading(true)
    setTop10Error(null)
    try {
      const res = await api.getTop10EntryExit(category, top10StartYear, top10EndYear)
      setTop10Data(res)
    } catch (err) {
      setTop10Error(err.message || 'Failed to fetch Top 10 entry/exit turnover.')
    } finally {
      setTop10Loading(false)
    }
  }

  const fetchRetention = async () => {
    if (retStartYear >= retEndYear) {
      setRetError('Start year must be strictly earlier than end year.')
      return
    }
    setRetLoading(true)
    setRetError(null)
    try {
      const res = await api.getBandRetention(category, retStartYear, retEndYear)
      setRetData(res)
    } catch (err) {
      setRetError(err.message || 'Failed to fetch band retention matrix.')
    } finally {
      setRetLoading(false)
    }
  }

  const fetchLargestMovements = async () => {
    if (movStartYear >= movEndYear) {
      setMovError('Start year must be strictly earlier than end year.')
      return
    }
    setMovLoading(true)
    setMovError(null)
    try {
      const res = await api.getLargestMovements(category, movStartYear, movEndYear, movLimit)
      setMovData(res)
    } catch (err) {
      setMovError(err.message || 'Failed to fetch largest rank movements.')
    } finally {
      setMovLoading(false)
    }
  }

  const fetchMobility = async () => {
    setMobilityLoading(true)
    setMobilityError(null)
    try {
      const res = await api.getInstitutionalMobility(category)
      setMobilityData(res)
    } catch (err) {
      setMobilityError(err.message || 'Failed to fetch institutional mobility history.')
    } finally {
      setMobilityLoading(false)
    }
  }

  // Trigger loads based on activeTab
  useEffect(() => {
    if (activeTab === 'band-movement') fetchBandMovement()
  }, [category, bandStartYear, bandEndYear, activeTab])

  useEffect(() => {
    if (activeTab === 'top10-entry-exit') fetchTop10EntryExit()
  }, [category, top10StartYear, top10EndYear, activeTab])

  useEffect(() => {
    if (activeTab === 'band-retention') fetchRetention()
  }, [category, retStartYear, retEndYear, activeTab])

  useEffect(() => {
    if (activeTab === 'largest-movements') fetchLargestMovements()
  }, [category, movStartYear, movEndYear, movLimit, activeTab])

  useEffect(() => {
    if (activeTab === 'mobility-history') fetchMobility()
  }, [category, activeTab])

  // ---------------------------------------------------------------------------
  // Render Tab 1: Rank Band Movement (Q7.1)
  // ---------------------------------------------------------------------------
  const renderBandMovement = () => {
    if (bandLoading) return <Loading message="Computing rank band movements & Sankey flow..." />
    if (bandError) return <ErrorState message={bandError} onRetry={fetchBandMovement} />
    if (!bandData) return null

    const {
      start_year,
      end_year,
      total_evaluated,
      common_count,
      new_entrants_count,
      exited_count,
      band51_100_to_top50_count,
      band51_100_to_top50_institutions,
      transitions,
      sankey_data,
    } = bandData

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <ArrowLeftRight size={18} color="#2563eb" />
              <span>Q7.1 Rank Band Movement &amp; Sankey Transition Flow</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: How many institutions moved from the 51–100 band into the top 50 between two selected years?
            </div>
          </div>
          <span className="rank-badge-neutral">Category: {category}</span>
        </div>

        {/* Controls */}
        <div className="analytics-controls-bar">
          <div className="analytics-control-group">
            <span className="analytics-control-label">Start Year:</span>
            <select
              className="analytics-select"
              value={bandStartYear}
              onChange={(e) => setBandStartYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr >= bandEndYear}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">End Year:</span>
            <select
              className="analytics-select"
              value={bandEndYear}
              onChange={(e) => setBandEndYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr <= bandStartYear}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchBandMovement}
            title="Refresh transitions"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">51–100 &rarr; Top 50 Climbers</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              {band51_100_to_top50_count} Institutions
            </div>
            <div className="analytics-metric-sub">Promoted into elite half</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Retained Cohort</div>
            <div className="analytics-metric-val">{common_count}</div>
            <div className="analytics-metric-sub">Present in both {start_year} &amp; {end_year}</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">New Entrants</div>
            <div className="analytics-metric-val" style={{ color: '#8b5cf6' }}>
              +{new_entrants_count}
            </div>
            <div className="analytics-metric-sub">Entered Top 100 in {end_year}</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Exited Ranking</div>
            <div className="analytics-metric-val" style={{ color: '#e11d48' }}>
              {exited_count}
            </div>
            <div className="analytics-metric-sub">Dropped out after {start_year}</div>
          </div>
        </div>

        {/* Highlight Focus: 51–100 into Top 50 Institutions Roster */}
        {band51_100_to_top50_institutions.length > 0 && (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 8,
              padding: '14px 18px',
            }}
          >
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#065f46', marginBottom: 6 }}>
              Promoted Cohort: Institutions Rising from 51–100 into Top 50 ({start_year} &rarr; {end_year})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {band51_100_to_top50_institutions.map((item) => (
                <span
                  key={item}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #6ee7b7',
                    borderRadius: 9999,
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#047857',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sankey Chart */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            Sankey Flow Diagram: Institutional Trajectories Across Rank Bands ({start_year} &rarr; {end_year})
          </h4>
          <SankeyChart
            nodes={sankey_data.nodes}
            links={sankey_data.links}
            height={460}
          />
        </div>

        {/* Transitions Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Detailed Band-to-Band Transition Breakdown ({start_year} &rarr; {end_year})
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Origin Band ({start_year})</th>
                  <th>Destination Band ({end_year})</th>
                  <th style={{ textAlign: 'right' }}>Institutions</th>
                  <th style={{ textAlign: 'right' }}>Share (%)</th>
                  <th>Sample Institutions</th>
                </tr>
              </thead>
              <tbody>
                {transitions.map((t, idx) => (
                  <tr key={t.source_band + t.target_band + idx}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{t.source_band}</td>
                    <td>
                      <span
                        className={
                          t.target_band === 'Exited'
                            ? 'rank-badge-decline'
                            : t.source_band === 'New Entrant'
                            ? 'rank-badge-improvement'
                            : 'rank-badge-neutral'
                        }
                      >
                        {t.target_band}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{t.count}</td>
                    <td style={{ textAlign: 'right' }}>{t.percentage}%</td>
                    <td>
                      <div style={{ fontSize: '0.74rem', color: '#475569', maxWidth: 340 }}>
                        {t.sample_institutions.join(', ')}
                      </div>
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
  // Render Tab 2: Top 10 Entries and Exits (Q7.2)
  // ---------------------------------------------------------------------------
  const renderTop10Turnover = () => {
    if (top10Loading) return <Loading message="Analyzing Top 10 entries and exits..." />
    if (top10Error) return <ErrorState message={top10Error} onRetry={fetchTop10EntryExit} />
    if (!top10Data) return null

    const {
      start_year,
      end_year,
      entrants,
      exits,
      retained,
      stability_rate,
      turnover_count,
    } = top10Data

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Award size={18} color="#2563eb" />
              <span>Q7.2 Top 10 Entries and Exits Between Consecutive Editions</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions entered or exited the top 10 between consecutive years?
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
              value={top10StartYear}
              onChange={(e) => setTop10StartYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr >= top10EndYear}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Target Year:</span>
            <select
              className="analytics-select"
              value={top10EndYear}
              onChange={(e) => setTop10EndYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr <= top10StartYear}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchTop10EntryExit}
            title="Refresh turnover"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Top 10 Stability Rate</div>
            <div className="analytics-metric-val" style={{ color: '#2563eb' }}>
              {stability_rate}%
            </div>
            <div className="analytics-metric-sub">{retained.length} of 10 institutions retained</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">New Entrants into Top 10</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              {entrants.length}
            </div>
            <div className="analytics-metric-sub">Broken into premier tier</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Departed / Exited Top 10</div>
            <div className="analytics-metric-val" style={{ color: '#e11d48' }}>
              {exits.length}
            </div>
            <div className="analytics-metric-sub">Slipped below rank 10</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Turnover Volume</div>
            <div className="analytics-metric-val">{turnover_count} Seats</div>
            <div className="analytics-metric-sub">Seats exchanged ({start_year} &rarr; {end_year})</div>
          </div>
        </div>

        {/* Entrants & Exits Cards Split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Entrants */}
          <div className="nirf-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <UserPlus size={18} color="#10b981" />
              <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
                New Top 10 Entrants in {end_year}
              </h4>
            </div>
            {entrants.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entrants.map((inst) => (
                  <div
                    key={inst.institution_name}
                    style={{
                      border: '1px solid #d1fae5',
                      backgroundColor: '#f0fdf4',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#065f46', fontSize: '0.86rem' }}>
                        {inst.institution_name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#047857' }}>
                        {inst.state} &bull; Score: {inst.score.toFixed(2)} pts
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="rank-badge-improvement">
                        Rank #{inst.rank}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                        Was: {inst.previous_rank ? `#${inst.previous_rank}` : 'Unranked'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic', padding: '16px 0' }}>
                Zero new entrants. The Top 10 roster remained 100% stable.
              </div>
            )}
          </div>

          {/* Exits */}
          <div className="nirf-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <UserMinus size={18} color="#e11d48" />
              <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
                Departed / Exited Top 10 in {end_year}
              </h4>
            </div>
            {exits.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {exits.map((inst) => (
                  <div
                    key={inst.institution_name}
                    style={{
                      border: '1px solid #fecdd3',
                      backgroundColor: '#fff1f2',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#9f1239', fontSize: '0.86rem' }}>
                        {inst.institution_name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#be123c' }}>
                        {inst.state} &bull; Score: {inst.score.toFixed(2)} pts
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="rank-badge-decline">
                        Was #{inst.rank}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                        New: {inst.previous_rank ? `#${inst.previous_rank}` : 'Out of Top 100'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic', padding: '16px 0' }}>
                Zero departures from the Top 10 roster.
              </div>
            )}
          </div>
        </div>

        {/* Stable Retained Roster Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Retained Top 10 Core Members ({start_year} &rarr; {end_year})
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Rank ({end_year})</th>
                  <th>Institution Name</th>
                  <th>State</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                  <th style={{ textAlign: 'right' }}>Previous Rank ({start_year})</th>
                  <th style={{ textAlign: 'right' }}>Rank Movement</th>
                </tr>
              </thead>
              <tbody>
                {retained.map((inst) => (
                  <tr key={inst.institution_name}>
                    <td>
                      <span className="rank-badge-neutral" style={{ fontWeight: 700 }}>
                        #{inst.rank}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{inst.institution_name}</td>
                    <td>{inst.state}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                      {inst.score.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>#{inst.previous_rank}</td>
                    <td style={{ textAlign: 'right' }}>
                      {inst.rank_delta > 0 ? (
                        <span className="rank-badge-improvement">+{inst.rank_delta}</span>
                      ) : inst.rank_delta < 0 ? (
                        <span className="rank-badge-decline">{inst.rank_delta}</span>
                      ) : (
                        <span className="rank-badge-neutral">0 (Stable)</span>
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
  // Render Tab 3: Rank Band Retention & Markov Matrix (Q7.3)
  // ---------------------------------------------------------------------------
  const renderRetention = () => {
    if (retLoading) return <Loading message="Constructing Markov transition matrix & retention rates..." />
    if (retError) return <ErrorState message={retError} onRetry={fetchRetention} />
    if (!retData) return null

    const {
      start_year,
      end_year,
      total_institutions = 0,
      overall_retention_pct = 0,
      overall_upward_pct = 0,
      overall_downward_pct = 0,
      overall_exit_pct = 0,
      band_stats = [],
      matrix_bands = ['1–10', '11–25', '26–50', '51–100', 'Exited'],
      matrix_cells = [],
    } = retData

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Grid size={18} color="#2563eb" />
              <span>Q7.3 Rank Band Retention Rates &amp; Markov Transition Matrix</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: What percentage of institutions remained in the same rank band?
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
              value={retStartYear}
              onChange={(e) => setRetStartYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr >= retEndYear}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Comparison Year:</span>
            <select
              className="analytics-select"
              value={retEndYear}
              onChange={(e) => setRetEndYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr <= retStartYear}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchRetention}
            title="Refresh retention"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Empty state if no institutions were ranked in either year */}
        {total_institutions === 0 || band_stats.length === 0 ? (
          <EmptyState
            title="Insufficient Historical Transition Data"
            message={`No sufficient historical ranking records exist for ${category} between ${start_year} and ${end_year} to construct a band retention matrix.`}
          />
        ) : (
          <>
            {/* Metrics Ribbon */}
            <div className="analytics-metrics-ribbon">
              <div className="analytics-metric-card">
                <div className="analytics-metric-label">Overall Band Retention</div>
                <div className="analytics-metric-val" style={{ color: '#2563eb' }}>
                  {overall_retention_pct}%
                </div>
                <div className="analytics-metric-sub">Remained in same tier</div>
              </div>

              <div className="analytics-metric-card">
                <div className="analytics-metric-label">Upward Mobility</div>
                <div className="analytics-metric-val" style={{ color: '#10b981' }}>
                  {overall_upward_pct}%
                </div>
                <div className="analytics-metric-sub">Promoted to higher band</div>
              </div>

              <div className="analytics-metric-card">
                <div className="analytics-metric-label">Downward Mobility</div>
                <div className="analytics-metric-val" style={{ color: '#ea580c' }}>
                  {overall_downward_pct}%
                </div>
                <div className="analytics-metric-sub">Fell to lower band</div>
              </div>

              <div className="analytics-metric-card">
                <div className="analytics-metric-label">Attrition / Exit Share</div>
                <div className="analytics-metric-val" style={{ color: '#e11d48' }}>
                  {overall_exit_pct}%
                </div>
                <div className="analytics-metric-sub">Departed ranking entirely</div>
              </div>
            </div>

            {/* Markov Transition Heatmap */}
            <div className="nirf-card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                Markov Rank Band Transition Probability Matrix ({start_year} &rarr; {end_year})
              </h4>
              <TransitionMatrix
                matrixBands={matrix_bands}
                cells={matrix_cells}
                height={360}
              />
            </div>

            {/* Band Retention Breakdown Table */}
            <div className="nirf-card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
                Band-Level Retention and Mobility Statistics ({start_year} &rarr; {end_year})
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Rank Band</th>
                      <th>Start Count ({start_year})</th>
                      <th style={{ textAlign: 'right', color: '#2563eb' }}>Retained in Band</th>
                      <th style={{ textAlign: 'right', color: '#2563eb' }}>Retention Rate</th>
                      <th style={{ textAlign: 'right', color: '#10b981' }}>Moved Upward</th>
                      <th style={{ textAlign: 'right', color: '#ea580c' }}>Moved Downward</th>
                      <th style={{ textAlign: 'right', color: '#e11d48' }}>Exited Ranking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {band_stats.map((st) => (
                      <tr key={st.band}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{st.band}</td>
                        <td>{st.start_count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{st.retained_count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                          {st.retention_pct}%
                        </td>
                        <td style={{ textAlign: 'right', color: '#10b981' }}>
                          {st.upward_count} ({st.upward_pct}%)
                        </td>
                        <td style={{ textAlign: 'right', color: '#ea580c' }}>
                          {st.downward_count} ({st.downward_pct}%)
                        </td>
                        <td style={{ textAlign: 'right', color: '#e11d48' }}>
                          {st.exited_count} ({st.exited_pct}%)
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
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 4: Largest Movements (Q7.4)
  // ---------------------------------------------------------------------------
  const renderLargestMovements = () => {
    if (movLoading) return <Loading message="Evaluating largest institutional rank climbers and fallers..." />
    if (movError) return <ErrorState message={movError} onRetry={fetchLargestMovements} />
    if (!movData) return null

    const { start_year, end_year, largest_climbers, largest_fallers, total_evaluated } = movData

    const topClimber = largest_climbers[0]
    const topFaller = largest_fallers[0]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <ArrowUpRight size={18} color="#2563eb" />
              <span>Q7.4 Largest Rank Movements: Climbers &amp; Fallers</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions experienced the largest upward and downward movements between editions?
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
              value={movStartYear}
              onChange={(e) => setMovStartYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr >= movEndYear}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Comparison Year:</span>
            <select
              className="analytics-select"
              value={movEndYear}
              onChange={(e) => setMovEndYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr <= movStartYear}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">Top N:</span>
            <select
              className="analytics-select"
              value={movLimit}
              onChange={(e) => setMovLimit(Number(e.target.value))}
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchLargestMovements}
            title="Refresh movements"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Top Climber (+ places)</div>
            <div className="analytics-metric-val" style={{ color: '#10b981', fontSize: '1.05rem' }}>
              {topClimber ? `+${topClimber.rank_delta} Places` : 'N/A'}
            </div>
            <div className="analytics-metric-sub">
              {topClimber ? `${topClimber.institution_name.slice(0, 22)}...` : ''}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Top Faller (- places)</div>
            <div className="analytics-metric-val" style={{ color: '#ef4444', fontSize: '1.05rem' }}>
              {topFaller ? `${topFaller.rank_delta} Places` : 'N/A'}
            </div>
            <div className="analytics-metric-sub">
              {topFaller ? `${topFaller.institution_name.slice(0, 22)}...` : ''}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Common Cohort Evaluated</div>
            <div className="analytics-metric-val">{total_evaluated} Institutions</div>
            <div className="analytics-metric-sub">In both {start_year} &amp; {end_year}</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Volatile Movement Share</div>
            <div className="analytics-metric-val">
              {largest_climbers.length + largest_fallers.length} Entities
            </div>
            <div className="analytics-metric-sub">Meeting Top {movLimit} extremes</div>
          </div>
        </div>

        {/* Movement Chart */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            Largest Upward (+) and Downward (&minus;) Rank Shifts ({start_year} &rarr; {end_year})
          </h4>
          <MovementChart
            climbers={largest_climbers}
            fallers={largest_fallers}
            height={440}
          />
        </div>

        {/* Side-by-Side Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Climbers Table */}
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#065f46', marginBottom: 14 }}>
              Top {movLimit} Climbers (+ Rank Gain)
            </h4>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table className="nirf-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Ranks</th>
                    <th style={{ textAlign: 'right' }}>Gain</th>
                    <th style={{ textAlign: 'right' }}>&Delta;Score</th>
                  </tr>
                </thead>
                <tbody>
                  {largest_climbers.map((c) => (
                    <tr key={c.institution_name}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {c.institution_name}
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{c.state}</div>
                      </td>
                      <td>#{c.start_rank} &rarr; #{c.end_rank}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="rank-badge-improvement">+{c.rank_delta}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.score_delta > 0 ? `+${c.score_delta}` : c.score_delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fallers Table */}
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#991b1b', marginBottom: 14 }}>
              Top {movLimit} Fallers (&minus; Rank Loss)
            </h4>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table className="nirf-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Ranks</th>
                    <th style={{ textAlign: 'right' }}>Loss</th>
                    <th style={{ textAlign: 'right' }}>&Delta;Score</th>
                  </tr>
                </thead>
                <tbody>
                  {largest_fallers.map((f) => (
                    <tr key={f.institution_name}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {f.institution_name}
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{f.state}</div>
                      </td>
                      <td>#{f.start_rank} &rarr; #{f.end_rank}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="rank-badge-decline">{f.rank_delta}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{f.score_delta > 0 ? `+${f.score_delta}` : f.score_delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 5: Institutional Mobility Over Time (Q7.5)
  // ---------------------------------------------------------------------------
  const renderMobility = () => {
    if (mobilityLoading) return <Loading message="Computing longitudinal institutional mobility history..." />
    if (mobilityError) return <ErrorState message={mobilityError} onRetry={fetchMobility} />
    if (!mobilityData) return null

    const {
      cycles,
      average_upward_pct,
      average_downward_pct,
      average_retained_pct,
    } = mobilityData

    const yearPairs = cycles.map((c) => c.year_pair)
    const upShares = cycles.map((c) => c.moved_up_pct)
    const downShares = cycles.map((c) => c.moved_down_pct)
    const retainedShares = cycles.map((c) => c.retained_pct)

    const stackedTraces = [
      {
        x: yearPairs,
        y: upShares,
        name: 'Moved Upward (%)',
        type: 'bar',
        marker: { color: '#10b981' },
        hovertemplate: '<b>%{x}</b><br>Moved Up: <b>%{y:.1f}%</b><extra></extra>',
      },
      {
        x: yearPairs,
        y: retainedShares,
        name: 'Retained Rank (%)',
        type: 'bar',
        marker: { color: '#94a3b8' },
        hovertemplate: '<b>%{x}</b><br>Retained: <b>%{y:.1f}%</b><extra></extra>',
      },
      {
        x: yearPairs,
        y: downShares,
        name: 'Moved Downward (%)',
        type: 'bar',
        marker: { color: '#ef4444' },
        hovertemplate: '<b>%{x}</b><br>Moved Down: <b>%{y:.1f}%</b><extra></extra>',
      },
    ]

    const stackedLayout = {
      barmode: 'stack',
      height: 400,
      margin: { l: 50, r: 30, t: 30, b: 50 },
      xaxis: {
        tickfont: { size: 11, color: '#1e293b', weight: 600 },
        gridcolor: '#f1f5f9',
      },
      yaxis: {
        title: { text: 'Mobility Share (% of Common Cohort)', font: { size: 12, color: '#475569' } },
        range: [0, 105],
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

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <History size={18} color="#2563eb" />
              <span>Q7.5 Institutional Mobility Annual History (2017–2025)</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: How many institutions moved up, moved down or retained their positions each year?
            </div>
          </div>
          <span className="rank-badge-neutral">Category: {category}</span>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Average Upward Share</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              {average_upward_pct}%
            </div>
            <div className="analytics-metric-sub">Annual promotions</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Average Downward Share</div>
            <div className="analytics-metric-val" style={{ color: '#ef4444' }}>
              {average_downward_pct}%
            </div>
            <div className="analytics-metric-sub">Annual rank demotions</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Average Exact Retention</div>
            <div className="analytics-metric-val" style={{ color: '#64748b' }}>
              {average_retained_pct}%
            </div>
            <div className="analytics-metric-sub">Strictly unshifted rank</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Total Cycles Evaluated</div>
            <div className="analytics-metric-val">{cycles.length} Cycles</div>
            <div className="analytics-metric-sub">From 2017 to 2025</div>
          </div>
        </div>

        {/* Stacked Mobility Share Chart */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
            Annual Institutional Mobility Shares (Up, Retained, Down) Over Time
          </h4>
          <ChartContainer data={stackedTraces} layout={stackedLayout} style={{ height: 400 }} />
        </div>

        {/* History Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Longitudinal Mobility Transition History Table ({category})
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Common Cohort</th>
                  <th style={{ textAlign: 'right', color: '#10b981' }}>Moved Up</th>
                  <th style={{ textAlign: 'right', color: '#10b981' }}>Up Share</th>
                  <th style={{ textAlign: 'right', color: '#ef4444' }}>Moved Down</th>
                  <th style={{ textAlign: 'right', color: '#ef4444' }}>Down Share</th>
                  <th style={{ textAlign: 'right', color: '#64748b' }}>Retained</th>
                  <th style={{ textAlign: 'right' }}>Mean Shift</th>
                  <th style={{ textAlign: 'right' }}>New Entrants</th>
                  <th style={{ textAlign: 'right' }}>Exited</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <tr key={c.year_pair}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.year_pair}</td>
                    <td>{c.total_common}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                      {c.moved_up_count}
                    </td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{c.moved_up_pct}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                      {c.moved_down_count}
                    </td>
                    <td style={{ textAlign: 'right', color: '#ef4444' }}>{c.moved_down_pct}%</td>
                    <td style={{ textAlign: 'right', color: '#64748b' }}>
                      {c.retained_count} ({c.retained_pct}%)
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.average_absolute_shift} pls</td>
                    <td style={{ textAlign: 'right' }}>+{c.new_entrants_count}</td>
                    <td style={{ textAlign: 'right' }}>{c.exited_count}</td>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div>
        <h2 style={{ fontSize: '1.28rem', fontWeight: 700, color: '#0f172a' }}>
          Ranking Transitions &amp; Institutional Mobility
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
          Longitudinal rank band dynamics, Sankey flow diagrams, Top 10 turnover, Markov transition matrices, and largest climbers/fallers.
        </p>
      </div>

      {/* Sub-Navigation Tabs */}
      <TransitionTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      {activeTab === 'band-movement' && renderBandMovement()}
      {activeTab === 'top10-entry-exit' && renderTop10Turnover()}
      {activeTab === 'band-retention' && renderRetention()}
      {activeTab === 'largest-movements' && renderLargestMovements()}
      {activeTab === 'mobility-history' && renderMobility()}
    </div>
  )
}

export default RankingTransitions
