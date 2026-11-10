/**
 * NIRF Analytics Dashboard — Multivariate Analysis Module.
 *
 * Implements:
 * - Q5.1 Top Five Comparison: 5-parameter Radar & Grouped Bar profiles with full breakdown.
 * - Q5.2 High Research, Low Teaching: Percentile-based discrepancy detection (RPC >= 60th %ile, TLR <= 50th %ile).
 * - Q5.3 High Teaching, Low Perception: Brand lag discrepancy analysis (TLR >= 60th %ile, PR <= 40th %ile).
 * - Q5.4 Score Improvement Despite Parameter Decline: Longitudinal paradoxical gain tracking & parallel coordinates.
 * - Q5.5 Parameter Gap: Institutional dispersion analysis (max(P) - min(P)) and extreme imbalance identification.
 */

import React, { useEffect, useState } from 'react'
import {
  Award,
  BookOpen,
  Eye,
  Filter,
  Info,
  Maximize2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import { api } from '../services/api'
import { MultivariateTabs } from '../components/analytics/MultivariateTabs'
import { RadarChart } from '../components/charts/RadarChart'
import { GroupedBarChart } from '../components/charts/GroupedBarChart'
import { ParallelCoordinates } from '../components/charts/ParallelCoordinates'
import { ScatterPlot } from '../components/charts/ScatterPlot'
import { Loading } from '../components/common/Loading'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import '../styles/analytics.css'

export function Multivariate() {
  const { category, selectedYear, availableYears } = useFilters()

  // Sub-navigation tab state
  const [activeTab, setActiveTab] = useState('top-five')

  // Global year bounds
  const minAvailableYear = availableYears && availableYears.length ? Math.min(...availableYears) : 2017
  const maxAvailableYear = availableYears && availableYears.length ? Math.max(...availableYears) : 2025

  // ---------------------------------------------------------------------------
  // Tab 1: Top Five Comparison (Q5.1)
  // ---------------------------------------------------------------------------
  const [topFiveYear, setTopFiveYear] = useState(selectedYear || maxAvailableYear)
  const [topFiveView, setTopFiveView] = useState('dual') // 'dual', 'radar', 'bar'
  const [topFiveData, setTopFiveData] = useState(null)
  const [topFiveLoading, setTopFiveLoading] = useState(false)
  const [topFiveError, setTopFiveError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 2: High Research, Low Teaching (Q5.2)
  // ---------------------------------------------------------------------------
  const [resTeachYear, setResTeachYear] = useState(selectedYear || maxAvailableYear)
  const [resTeachData, setResTeachData] = useState(null)
  const [resTeachLoading, setResTeachLoading] = useState(false)
  const [resTeachError, setResTeachError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 3: High Teaching, Low Perception (Q5.3)
  // ---------------------------------------------------------------------------
  const [teachPercYear, setTeachPercYear] = useState(selectedYear || maxAvailableYear)
  const [teachPercData, setTeachPercData] = useState(null)
  const [teachPercLoading, setTeachPercLoading] = useState(false)
  const [teachPercError, setTeachPercError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 4: Score Improvement Despite Parameter Decline (Q5.4)
  // ---------------------------------------------------------------------------
  const [improveStartYear, setImproveStartYear] = useState(
    availableYears && availableYears.length >= 3 ? availableYears[availableYears.length - 3] : 2023
  )
  const [improveEndYear, setImproveEndYear] = useState(maxAvailableYear)
  const [improveData, setImproveData] = useState(null)
  const [improveLoading, setImproveLoading] = useState(false)
  const [improveError, setImproveError] = useState(null)

  // ---------------------------------------------------------------------------
  // Tab 5: Parameter Gap (Q5.5)
  // ---------------------------------------------------------------------------
  const [gapYear, setGapYear] = useState(selectedYear || maxAvailableYear)
  const [gapData, setGapData] = useState(null)
  const [gapLoading, setGapLoading] = useState(false)
  const [gapError, setGapError] = useState(null)

  // Sync year defaults when global filter changes
  useEffect(() => {
    if (selectedYear) {
      setTopFiveYear(selectedYear)
      setResTeachYear(selectedYear)
      setTeachPercYear(selectedYear)
      setGapYear(selectedYear)
    }
  }, [category, selectedYear])

  // ---------------------------------------------------------------------------
  // Fetchers
  // ---------------------------------------------------------------------------
  const fetchTopFive = async () => {
    setTopFiveLoading(true)
    setTopFiveError(null)
    try {
      const res = await api.getTopFive(category, topFiveYear)
      setTopFiveData(res)
    } catch (err) {
      setTopFiveError(err.message || 'Failed to fetch Top 5 comparison profiles.')
    } finally {
      setTopFiveLoading(false)
    }
  }

  const fetchResTeach = async () => {
    setResTeachLoading(true)
    setResTeachError(null)
    try {
      const res = await api.getResearchTeachingGap(category, resTeachYear)
      setResTeachData(res)
    } catch (err) {
      setResTeachError(err.message || 'Failed to fetch High Research, Low Teaching discrepancy.')
    } finally {
      setResTeachLoading(false)
    }
  }

  const fetchTeachPerc = async () => {
    setTeachPercLoading(true)
    setTeachPercError(null)
    try {
      const res = await api.getTeachingPerceptionGap(category, teachPercYear)
      setTeachPercData(res)
    } catch (err) {
      setTeachPercError(err.message || 'Failed to fetch High Teaching, Low Perception discrepancy.')
    } finally {
      setTeachPercLoading(false)
    }
  }

  const fetchImprovement = async () => {
    if (improveStartYear >= improveEndYear) {
      setImproveError('Start year must be strictly earlier than end year.')
      return
    }
    setImproveLoading(true)
    setImproveError(null)
    try {
      const res = await api.getScoreImprovement(category, improveStartYear, improveEndYear)
      setImproveData(res)
    } catch (err) {
      setImproveError(err.message || 'Failed to fetch score improvement discrepancy data.')
    } finally {
      setImproveLoading(false)
    }
  }

  const fetchParameterGap = async () => {
    setGapLoading(true)
    setGapError(null)
    try {
      const res = await api.getParameterGap(category, gapYear)
      setGapData(res)
    } catch (err) {
      setGapError(err.message || 'Failed to fetch parameter gap data.')
    } finally {
      setGapLoading(false)
    }
  }

  // Trigger loads based on activeTab
  useEffect(() => {
    if (activeTab === 'top-five') fetchTopFive()
  }, [category, topFiveYear, activeTab])

  useEffect(() => {
    if (activeTab === 'research-teaching') fetchResTeach()
  }, [category, resTeachYear, activeTab])

  useEffect(() => {
    if (activeTab === 'teaching-perception') fetchTeachPerc()
  }, [category, teachPercYear, activeTab])

  useEffect(() => {
    if (activeTab === 'score-improvement') fetchImprovement()
  }, [category, improveStartYear, improveEndYear, activeTab])

  useEffect(() => {
    if (activeTab === 'parameter-gap') fetchParameterGap()
  }, [category, gapYear, activeTab])

  // ---------------------------------------------------------------------------
  // Render Tab 1: Top Five Comparison (Q5.1)
  // ---------------------------------------------------------------------------
  const renderTopFive = () => {
    if (topFiveLoading) return <Loading message="Loading Top 5 institutional profiles..." />
    if (topFiveError) return <ErrorState message={topFiveError} onRetry={fetchTopFive} />
    if (!topFiveData || !topFiveData.institutions || topFiveData.institutions.length === 0) {
      return (
        <EmptyState
          title="No Top Five Data"
          description={`No ranking records found for category ${category} in ${topFiveYear}.`}
        />
      )
    }

    const { institutions, parameters, parameter_labels } = topFiveData
    const topInst = institutions[0]
    const avgOverall = (
      institutions.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / institutions.length
    ).toFixed(2)

    // Find highest individual parameter score among top 5
    let maxParamScore = 0
    let maxParamInst = ''
    let maxParamName = ''
    institutions.forEach((inst) => {
      parameters.forEach((p) => {
        const val = inst.scores[p]
        if (typeof val === 'number' && val > maxParamScore) {
          maxParamScore = val
          maxParamInst = inst.institution_name
          maxParamName = parameter_labels[p] || p
        }
      })
    })

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Question Header Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Award size={18} color="#2563eb" />
              <span>Q5.1 Top Five Comparison Across NIRF Parameters</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: How do the premier five institutions compare across all five core NIRF evaluation parameters?
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
              value={topFiveYear}
              onChange={(e) => setTopFiveYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="analytics-control-group">
            <span className="analytics-control-label">Profile View:</span>
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${topFiveView === 'dual' ? 'active' : ''}`}
                onClick={() => setTopFiveView('dual')}
              >
                Dual View
              </button>
              <button
                type="button"
                className={`view-mode-btn ${topFiveView === 'radar' ? 'active' : ''}`}
                onClick={() => setTopFiveView('radar')}
              >
                Radar Only
              </button>
              <button
                type="button"
                className={`view-mode-btn ${topFiveView === 'bar' ? 'active' : ''}`}
                onClick={() => setTopFiveView('bar')}
              >
                Grouped Bar
              </button>
            </div>
            <button
              type="button"
              className="analytics-refresh-btn"
              onClick={fetchTopFive}
              title="Refresh Top 5 data"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* KPI Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">#1 Ranked Institution</div>
            <div className="analytics-metric-val" style={{ fontSize: '1.05rem', color: '#2563eb' }}>
              {topInst ? topInst.institution_name : 'N/A'}
            </div>
            <div className="analytics-metric-sub">
              Overall Score: {topInst ? topInst.overall_score.toFixed(2) : 'N/A'} pts
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Top 5 Mean Score</div>
            <div className="analytics-metric-val">{avgOverall}</div>
            <div className="analytics-metric-sub">Overall composite benchmark</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Peak Parameter Score</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              {maxParamScore.toFixed(2)}
            </div>
            <div className="analytics-metric-sub">
              {maxParamName} ({maxParamInst.slice(0, 18)}...)
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Parametric Coverage</div>
            <div className="analytics-metric-val">{parameters.length} Pillars</div>
            <div className="analytics-metric-sub">
              {parameters.map((p) => parameter_labels[p] || p).join(', ')}
            </div>
          </div>
        </div>

        {/* Chart View (Dual or Single) */}
        {topFiveView === 'dual' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="nirf-card" style={{ padding: 18 }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                Polar Spider Radar Comparison (0–100 Scale)
              </h4>
              <RadarChart
                institutions={institutions}
                parameters={parameters}
                parameterLabels={parameter_labels}
                height={420}
              />
            </div>
            <div className="nirf-card" style={{ padding: 18 }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                Side-by-Side Parameter Breakdown
              </h4>
              <GroupedBarChart
                institutions={institutions}
                parameters={parameters}
                parameterLabels={parameter_labels}
                height={420}
              />
            </div>
          </div>
        )}

        {topFiveView === 'radar' && (
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              Polar Spider Radar Comparison across 5 Evaluation Parameters ({topFiveYear})
            </h4>
            <RadarChart
              institutions={institutions}
              parameters={parameters}
              parameterLabels={parameter_labels}
              height={480}
            />
          </div>
        )}

        {topFiveView === 'bar' && (
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              Parametric Performance Grouped Bar Chart ({topFiveYear})
            </h4>
            <GroupedBarChart
              institutions={institutions}
              parameters={parameters}
              parameterLabels={parameter_labels}
              height={460}
            />
          </div>
        )}

        {/* Detailed Parameter Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
              Top Five Parametric Scorecard ({topFiveYear})
            </h4>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Official NIRF ranking order
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="nirf-table" style={{ width: '100%', fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Rank</th>
                  <th>Institution Name</th>
                  <th>State</th>
                  <th style={{ textAlign: 'right' }}>Overall Score</th>
                  {parameters.map((p) => (
                    <th key={p} style={{ textAlign: 'right' }}>
                      {parameter_labels[p] || p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst, idx) => (
                  <tr key={inst.institution_name + idx}>
                    <td>
                      <span className="rank-badge-neutral" style={{ fontWeight: 700 }}>
                        #{inst.rank}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      {inst.institution_name}
                      <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', fontWeight: 400 }}>
                        {inst.city}
                      </span>
                    </td>
                    <td>{inst.state}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                      {inst.overall_score ? inst.overall_score.toFixed(2) : 'N/A'}
                    </td>
                    {parameters.map((p) => {
                      const val = inst.scores[p]
                      return (
                        <td key={p} style={{ textAlign: 'right' }}>
                          {typeof val === 'number' ? val.toFixed(2) : 'N/A'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytical Commentary */}
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
            <strong>Multivariate Analytical Insights:</strong> Premier institutions demonstrate distinct
            specializations. Leading institutes like IIT Madras consistently maximize Teaching (TLR) and Graduation
            Outcomes (GO), whereas specialized science leaders like IISc exhibit extraordinary Research (RPC) scores
            surpassing 90+. Notice how Perception (PR) exhibits the steepest variance among the top tier.
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 2: High Research, Low Teaching (Q5.2)
  // ---------------------------------------------------------------------------
  const renderResTeach = () => {
    if (resTeachLoading) return <Loading message="Analyzing research vs teaching discrepancy..." />
    if (resTeachError) return <ErrorState message={resTeachError} onRetry={fetchResTeach} />
    if (!resTeachData) return null

    const { institutions, methodology, threshold_a, threshold_b, qualifying_count } = resTeachData
    const maxGap =
      institutions && institutions.length > 0
        ? Math.max(...institutions.map((i) => i.gap)).toFixed(2)
        : '0.00'

    // Format points for scatter visualization
    const scatterPoints = (institutions || []).map((inst) => ({
      x: inst.score_b, // TLR
      y: inst.score_a, // RPC
      institution_name: inst.institution_name,
      rank: inst.rank,
      state: inst.state,
      city: inst.city,
    }))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <BookOpen size={18} color="#2563eb" />
              <span>Q5.2 High Research, Low Teaching Discrepancy</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions have relatively high research output (RPC) but lower teaching resources (TLR)?
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
              value={resTeachYear}
              onChange={(e) => setResTeachYear(Number(e.target.value))}
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
            onClick={fetchResTeach}
            title="Refresh discrepancy screening"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Methodology Notice */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: '0.82rem',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Filter size={16} color="#64748b" />
          <span>
            <strong>Screening Filter:</strong> {methodology} (RPC Score &ge; {threshold_a} pts, TLR Score &le; {threshold_b} pts)
          </span>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Qualifying Institutions</div>
            <div className="analytics-metric-val" style={{ color: '#2563eb' }}>
              {qualifying_count}
            </div>
            <div className="analytics-metric-sub">Institutions meeting criteria</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">RPC 60th %ile Threshold</div>
            <div className="analytics-metric-val">{threshold_a} pts</div>
            <div className="analytics-metric-sub">Minimum research score</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">TLR 50th %ile Ceiling</div>
            <div className="analytics-metric-val">{threshold_b} pts</div>
            <div className="analytics-metric-sub">Maximum teaching score</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Max Research-Teaching Gap</div>
            <div className="analytics-metric-val" style={{ color: '#ea580c' }}>
              +{maxGap} pts
            </div>
            <div className="analytics-metric-sub">Highest positive divergence</div>
          </div>
        </div>

        {/* Table & Scatter View */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20 }}>
          {/* Table */}
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
              Research &gt; Teaching Discrepancy Roster ({resTeachYear})
            </h4>
            {institutions && institutions.length > 0 ? (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>Rank</th>
                      <th>Institution</th>
                      <th style={{ textAlign: 'right' }}>RPC</th>
                      <th style={{ textAlign: 'right' }}>TLR</th>
                      <th style={{ textAlign: 'right' }}>Gap (RPC - TLR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institutions.map((item, idx) => (
                      <tr key={item.institution_name + idx}>
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
                          {item.score_a.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                          {item.score_b.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className="rank-badge-improvement"
                            style={{ backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#ffedd5' }}
                          >
                            +{item.gap.toFixed(2)} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No Discrepant Institutions"
                description={`No institutions met the RPC >= 60th %ile and TLR <= 50th %ile criteria for ${category} in ${resTeachYear}.`}
              />
            )}
          </div>

          {/* Scatter Chart */}
          <div className="nirf-card" style={{ padding: 18 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
              RPC vs TLR Distribution (Cohort)
            </h4>
            <ScatterPlot
              points={scatterPoints}
              xAxisTitle="Teaching, Learning & Resources (TLR)"
              yAxisTitle="Research & Professional Practice (RPC)"
              height={420}
            />
          </div>
        </div>

        {/* Analytical Interpretation */}
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <Info size={18} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.55 }}>
            <strong>Strategic Policy Interpretation:</strong> Institutions with high RPC but lower TLR are typically
            specialized research laboratories, postgraduate hubs, or medical research centers where faculty publish
            extensively and secure sponsored projects, but student intake or faculty-to-student ratio (FSR) metrics
            keep the teaching score modest.
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 3: High Teaching, Low Perception (Q5.3)
  // ---------------------------------------------------------------------------
  const renderTeachPerc = () => {
    if (teachPercLoading) return <Loading message="Analyzing teaching vs perception discrepancy..." />
    if (teachPercError) return <ErrorState message={teachPercError} onRetry={fetchTeachPerc} />
    if (!teachPercData) return null

    const { institutions, methodology, threshold_a, threshold_b, qualifying_count } = teachPercData
    const maxGap =
      institutions && institutions.length > 0
        ? Math.max(...institutions.map((i) => i.gap)).toFixed(2)
        : '0.00'

    const scatterPoints = (institutions || []).map((inst) => ({
      x: inst.score_b, // PR
      y: inst.score_a, // TLR
      institution_name: inst.institution_name,
      rank: inst.rank,
      state: inst.state,
      city: inst.city,
    }))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Eye size={18} color="#2563eb" />
              <span>Q5.3 High Teaching, Low Perception Discrepancy</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions excel in Teaching, Learning & Resources (TLR) but suffer from low public/peer Perception (PR)?
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
              value={teachPercYear}
              onChange={(e) => setTeachPercYear(Number(e.target.value))}
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
            onClick={fetchTeachPerc}
            title="Refresh teaching-perception screening"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Methodology Notice */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: '0.82rem',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Filter size={16} color="#64748b" />
          <span>
            <strong>Screening Filter:</strong> {methodology} (TLR Score &ge; {threshold_a} pts, PR Score &le; {threshold_b} pts)
          </span>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Qualifying Institutions</div>
            <div className="analytics-metric-val" style={{ color: '#2563eb' }}>
              {qualifying_count}
            </div>
            <div className="analytics-metric-sub">Strong teaching with perception lag</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">TLR 60th %ile Threshold</div>
            <div className="analytics-metric-val">{threshold_a} pts</div>
            <div className="analytics-metric-sub">Minimum teaching score</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">PR 40th %ile Ceiling</div>
            <div className="analytics-metric-val">{threshold_b} pts</div>
            <div className="analytics-metric-sub">Maximum perception score</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Max Teaching-Perception Gap</div>
            <div className="analytics-metric-val" style={{ color: '#dc2626' }}>
              +{maxGap} pts
            </div>
            <div className="analytics-metric-sub">Severe brand equity deficit</div>
          </div>
        </div>

        {/* Table & Chart Split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20 }}>
          {/* Table */}
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
              High Teaching, Low Perception Roster ({teachPercYear})
            </h4>
            {institutions && institutions.length > 0 ? (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>Rank</th>
                      <th>Institution</th>
                      <th style={{ textAlign: 'right' }}>TLR</th>
                      <th style={{ textAlign: 'right' }}>PR</th>
                      <th style={{ textAlign: 'right' }}>Gap (TLR - PR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institutions.map((item, idx) => (
                      <tr key={item.institution_name + idx}>
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
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                          {item.score_a.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                          {item.score_b.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className="rank-badge-improvement"
                            style={{ backgroundColor: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
                          >
                            +{item.gap.toFixed(2)} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No Discrepant Institutions"
                description={`No institutions met the TLR >= 60th %ile and PR <= 40th %ile criteria for ${category} in ${teachPercYear}.`}
              />
            )}
          </div>

          {/* Scatter Chart */}
          <div className="nirf-card" style={{ padding: 18 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
              TLR vs Perception (PR) Distribution
            </h4>
            <ScatterPlot
              points={scatterPoints}
              xAxisTitle="Perception (PR)"
              yAxisTitle="Teaching, Learning & Resources (TLR)"
              height={420}
            />
          </div>
        </div>

        {/* Analytical Interpretation */}
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
            <strong>Brand Perception Lag:</strong> In NIRF evaluations, Perception is heavily influenced by employer
            surveys, historical prestige, and brand recognition. Newer private and state universities often build world-class
            laboratories and faculty rosters (achieving TLR &gt; 70), yet receive Perception marks below 10. This reveals
            an acute 'reputation gap' where external branding lags behind operational excellence.
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 4: Score Improvement Despite Parameter Decline (Q5.4)
  // ---------------------------------------------------------------------------
  const renderScoreImprovement = () => {
    if (improveLoading) return <Loading message="Computing longitudinal paradoxical improvements..." />
    if (improveError) return <ErrorState message={improveError} onRetry={fetchImprovement} />
    if (!improveData) return null

    const {
      institutions,
      start_year,
      end_year,
      total_improved_entities,
      total_paradoxical_entities,
    } = improveData

    const share = total_improved_entities > 0
      ? ((total_paradoxical_entities / total_improved_entities) * 100).toFixed(1)
      : '0.0'

    const maxGain =
      institutions && institutions.length > 0
        ? Math.max(...institutions.map((i) => i.score_gain)).toFixed(2)
        : '0.00'

    // Prepare dimensions for parallel coordinates:
    const parallelDimensions = institutions && institutions.length > 0
      ? [
          {
            label: `Score ${start_year}`,
            values: institutions.map((i) => i.start_score),
          },
          {
            label: `Score ${end_year}`,
            values: institutions.map((i) => i.end_score),
          },
          {
            label: 'Score Gain (pts)',
            values: institutions.map((i) => i.score_gain),
          },
          {
            label: 'Declining Params',
            values: institutions.map((i) => i.declining_parameters.length),
          },
        ]
      : []

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <TrendingUp size={18} color="#2563eb" />
              <span>Q5.4 Score Improvement Despite Parameter Decline</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: Which institutions improved their overall composite score despite regressions in one or more component parameters?
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
              value={improveStartYear}
              onChange={(e) => setImproveStartYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr >= improveEndYear}>
                  {yr}
                </option>
              ))}
            </select>

            <span className="analytics-control-label">End Year:</span>
            <select
              className="analytics-select"
              value={improveEndYear}
              onChange={(e) => setImproveEndYear(Number(e.target.value))}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr <= improveStartYear}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchImprovement}
            title="Refresh longitudinal tracking"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Overall Improved Entities</div>
            <div className="analytics-metric-val">{total_improved_entities}</div>
            <div className="analytics-metric-sub">Institutions with &Delta;Score &gt; 0</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Paradoxical Entities</div>
            <div className="analytics-metric-val" style={{ color: '#2563eb' }}>
              {total_paradoxical_entities}
            </div>
            <div className="analytics-metric-sub">Improved while parameter(s) fell</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Paradoxical Share</div>
            <div className="analytics-metric-val" style={{ color: '#f59e0b' }}>
              {share}%
            </div>
            <div className="analytics-metric-sub">Of all improving institutions</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Maximum Net Gain</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              +{maxGain} pts
            </div>
            <div className="analytics-metric-sub">From {start_year} to {end_year}</div>
          </div>
        </div>

        {/* Parallel Coordinates Chart */}
        {institutions && institutions.length > 0 && (
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.94rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              Multi-Dimensional Trajectory: Score Shift &amp; Parameter Regressions ({start_year} &rarr; {end_year})
            </h4>
            <ParallelCoordinates
              dimensions={parallelDimensions}
              colorValues={institutions.map((i) => i.score_gain)}
              colorTitle="Score Gain"
              colorscale="Viridis"
              height={380}
            />
          </div>
        )}

        {/* Institutional Breakdown Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Institutions with Composite Gain Despite Parameter Regressions ({start_year} &rarr; {end_year})
          </h4>
          {institutions && institutions.length > 0 ? (
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Institution Name</th>
                    <th>Rank ({start_year} &rarr; {end_year})</th>
                    <th>Score ({start_year} &rarr; {end_year})</th>
                    <th style={{ textAlign: 'right' }}>Overall Gain</th>
                    <th>Declining Parameter(s)</th>
                    <th>Improving Parameter(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((item, idx) => (
                    <tr key={item.institution_name + idx}>
                      <td style={{ fontWeight: 600, color: '#0f172a', maxWidth: 220 }}>
                        {item.institution_name}
                      </td>
                      <td>
                        <span className="rank-badge-neutral">
                          #{item.start_rank} &rarr; #{item.end_rank}
                        </span>
                      </td>
                      <td>
                        {item.start_score.toFixed(2)} &rarr; {item.end_score.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="rank-badge-improvement">
                          +{item.score_gain.toFixed(2)} pts
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.declining_parameters.map((dp) => (
                            <span
                              key={dp.parameter}
                              className="rank-badge-decline"
                              title={`${dp.start_value.toFixed(1)} -> ${dp.end_value.toFixed(1)}`}
                            >
                              {dp.parameter_label}: {dp.delta.toFixed(1)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.improving_parameters.map((ip) => (
                            <span
                              key={ip.parameter}
                              className="rank-badge-improvement"
                              title={`${ip.start_value.toFixed(1)} -> ${ip.end_value.toFixed(1)}`}
                            >
                              {ip.parameter_label}: +{ip.delta.toFixed(1)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Paradoxical Improvements"
              description={`No institutions exhibited composite score gains with parameter declines between ${start_year} and ${end_year}.`}
            />
          )}
        </div>

        {/* Weighting Mechanism Explanatory Note */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <Info size={18} color="#475569" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.55 }}>
            <strong>Mathematical Foundation (NIRF Parameter Weighting):</strong> Overall composite scores are a
            weighted linear combination: TLR (0.30) + RPC (0.30) + GO (0.20) + OI (0.10) + PR (0.10). An institution
            can lose points in low-weighted dimensions (e.g. Outreach -3.0 pts, reducing score by 0.30 pts) yet achieve
            a net overall score increase if a heavily weighted dimension improves (e.g. TLR +5.0 pts, adding +1.50 pts).
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render Tab 5: Parameter Gap & Dispersion (Q5.5)
  // ---------------------------------------------------------------------------
  const renderParameterGap = () => {
    if (gapLoading) return <Loading message="Calculating parameter spread and gaps..." />
    if (gapError) return <ErrorState message={gapError} onRetry={fetchParameterGap} />
    if (!gapData) return null

    const { institutions, average_gap } = gapData

    const maxGapInst = institutions && institutions.length > 0 ? institutions[0] : null
    const minGapInst =
      institutions && institutions.length > 0 ? institutions[institutions.length - 1] : null

    // Top 3 institutions for radar dispersion comparison
    const topGapInsts = institutions ? institutions.slice(0, 3) : []
    const radarParams = topGapInsts.length > 0 ? Object.keys(topGapInsts[0].scores) : []
    const radarLabels = radarParams.reduce((acc, p) => {
      acc[p] = p.replace('_score', '').toUpperCase()
      return acc
    }, {})

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Banner */}
        <div className="analytics-question-banner">
          <div>
            <div className="analytics-question-title">
              <Maximize2 size={18} color="#2563eb" />
              <span>Q5.5 Institutional Parameter Spread &amp; Gap Analysis</span>
            </div>
            <div className="analytics-question-subtitle">
              Question: What is the institutional disparity spread between highest and lowest parameter scores?
            </div>
          </div>
          <span className="rank-badge-neutral">Gap Formula: max(P) &minus; min(P)</span>
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
          </div>
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchParameterGap}
            title="Refresh parameter gap analysis"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Metrics Ribbon */}
        <div className="analytics-metrics-ribbon">
          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Average Parameter Gap</div>
            <div className="analytics-metric-val">{average_gap.toFixed(2)} pts</div>
            <div className="analytics-metric-sub">Mean max-to-min dispersion</div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Maximum Disparity Gap</div>
            <div className="analytics-metric-val" style={{ color: '#dc2626' }}>
              {maxGapInst ? maxGapInst.param_gap.toFixed(2) : 'N/A'} pts
            </div>
            <div className="analytics-metric-sub">
              {maxGapInst ? maxGapInst.institution_name.slice(0, 20) + '...' : 'N/A'}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Most Uniform Profile</div>
            <div className="analytics-metric-val" style={{ color: '#10b981' }}>
              {minGapInst ? minGapInst.param_gap.toFixed(2) : 'N/A'} pts
            </div>
            <div className="analytics-metric-sub">
              {minGapInst ? minGapInst.institution_name.slice(0, 20) + '...' : 'N/A'}
            </div>
          </div>

          <div className="analytics-metric-card">
            <div className="analytics-metric-label">Total Institutions Evaluated</div>
            <div className="analytics-metric-val">{institutions ? institutions.length : 0}</div>
            <div className="analytics-metric-sub">In {category} ({gapYear})</div>
          </div>
        </div>

        {/* Visualizations: Top 3 Extreme Gap Radar Profile */}
        {topGapInsts.length > 0 && radarParams.length > 0 && (
          <div className="nirf-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.94rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
              Extreme Parameter Imbalance: Radar Profiles of Top 3 Widest-Gap Institutions ({gapYear})
            </h4>
            <RadarChart
              institutions={topGapInsts}
              parameters={radarParams}
              parameterLabels={radarLabels}
              height={440}
            />
          </div>
        )}

        {/* Ranked Gap Table */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            Institutions Ranked by Parameter Disparity Spread ({gapYear})
          </h4>
          {institutions && institutions.length > 0 ? (
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              <table className="nirf-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>Rank</th>
                    <th>Institution Name</th>
                    <th>Highest Parameter</th>
                    <th>Lowest Parameter</th>
                    <th style={{ textAlign: 'right' }}>Parameter Gap</th>
                    <th>Full Parametric Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((item, idx) => (
                    <tr key={item.institution_name + idx}>
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
                      <td>
                        <span className="rank-badge-improvement">
                          {item.highest_param.replace('_score', '').toUpperCase()}: {item.highest_score.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span className="rank-badge-decline">
                          {item.lowest_param.replace('_score', '').toUpperCase()}: {item.lowest_score.toFixed(1)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                        {item.param_gap.toFixed(2)} pts
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {Object.entries(item.scores).map(([k, v]) => (
                            <span
                              key={k}
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: 4,
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                              }}
                            >
                              {k.replace('_score', '').toUpperCase()}: {typeof v === 'number' ? v.toFixed(1) : 'N/A'}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Parameter Gap Data"
              description={`No institutions with parametric evaluations found for ${category} in ${gapYear}.`}
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
          Multivariate Analysis
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
          Simultaneous multi-parameter institutional evaluation, radar profiling, discrepancy detection, and longitudinal divergence.
        </p>
      </div>

      {/* Sub-Navigation Tabs */}
      <MultivariateTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      {activeTab === 'top-five' && renderTopFive()}
      {activeTab === 'research-teaching' && renderResTeach()}
      {activeTab === 'teaching-perception' && renderTeachPerc()}
      {activeTab === 'score-improvement' && renderScoreImprovement()}
      {activeTab === 'parameter-gap' && renderParameterGap()}
    </div>
  )
}

export default Multivariate
