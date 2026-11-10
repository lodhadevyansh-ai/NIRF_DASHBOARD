/**
 * NIRF Analytics Dashboard — Geospatial & Regional Intelligence Module.
 *
 * Implements Screenshot 1 layout and specifications:
 * - 3 Macro KPI Cards: Leading State, Total States Represented, Top-3 Concentration.
 * - Q2.1 Top States: Interactive India map, horizontal bar chart, state breakdown table.
 * - Q2.2 Distribution Trend: Multi-state longitudinal evolution (2017–2025).
 * - Q2.3 State Growth: States improving or declining in representation over time.
 * - Q2.4 Compare States: Side-by-side comparative profiling (e.g. Karnataka vs Tamil Nadu).
 * - Q2.5 Newly Appearing: Aggregating newly debuting institutions by originating state.
 */

import React, { useEffect, useState, useMemo } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle,
  ChevronDown,
  Filter,
  GitCompare,
  Globe,
  HelpCircle,
  Layers,
  MapPin,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import { api } from '../services/api'
import { GeospatialTabs } from '../components/analytics/GeospatialTabs'
import { IndiaMap } from '../components/charts/IndiaMap'
import { StateBarChart } from '../components/charts/StateBarChart'
import { StateGrowthDivergingChart, StateTrendLinesChart } from '../components/charts/StateTrendChart'
import { ChartContainer } from '../components/charts/ChartContainer'
import { Loading } from '../components/common/Loading'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import '../styles/analytics.css'

export function Geospatial() {
  const { category, selectedYear, availableYears, availableStates } = useFilters()

  // Sub-navigation state
  const [activeTab, setActiveTab] = useState('top-states')

  // Global year bounds
  const minAvailableYear = availableYears && availableYears.length ? Math.min(...availableYears) : 2017
  const maxAvailableYear = availableYears && availableYears.length ? Math.max(...availableYears) : 2025

  // Tab 1: Top States state
  const [topStatesYear, setTopStatesYear] = useState(selectedYear || maxAvailableYear)
  const [topStatesN, setTopStatesN] = useState(100)
  const [topStatesView, setTopStatesView] = useState('both') // 'map', 'bar', 'both'
  const [topStatesData, setTopStatesData] = useState(null)
  const [topStatesLoading, setTopStatesLoading] = useState(false)
  const [topStatesError, setTopStatesError] = useState(null)
  const [selectedState, setSelectedState] = useState('Tamil Nadu')

  const selectedStateData = useMemo(() => {
    if (!selectedState || !topStatesData || !topStatesData.states) return null
    return topStatesData.states.find((s) => s.state === selectedState) || null
  }, [selectedState, topStatesData])

  // Tab 2: Distribution Trend state
  const [distTrendYear, setDistTrendYear] = useState(selectedYear || maxAvailableYear)
  const [distTrendData, setDistTrendData] = useState(null)
  const [distTrendLoading, setDistTrendLoading] = useState(false)
  const [distTrendError, setDistTrendError] = useState(null)

  // Tab 3: State Growth state
  const [growthStartYear, setGrowthStartYear] = useState(minAvailableYear)
  const [growthEndYear, setGrowthEndYear] = useState(maxAvailableYear)
  const [growthTopN, setGrowthTopN] = useState(100)
  const [growthData, setGrowthData] = useState(null)
  const [growthLoading, setGrowthLoading] = useState(false)
  const [growthError, setGrowthError] = useState(null)

  // Tab 4: Compare States state
  const [compareYear, setCompareYear] = useState(selectedYear || maxAvailableYear)
  const [stateA, setStateA] = useState('Karnataka')
  const [stateB, setStateB] = useState('Tamil Nadu')
  const [compareData, setCompareData] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState(null)

  // Tab 5: Newly Appearing state
  const [newStartYear, setNewStartYear] = useState(minAvailableYear)
  const [newEndYear, setNewEndYear] = useState(maxAvailableYear)
  const [newData, setNewData] = useState(null)
  const [newLoading, setNewLoading] = useState(false)
  const [newError, setNewError] = useState(null)

  // Sync year defaults when category or selectedYear change
  useEffect(() => {
    if (selectedYear) {
      setTopStatesYear(selectedYear)
      setDistTrendYear(selectedYear)
      setCompareYear(selectedYear)
    }
    if (availableYears && availableYears.length >= 2) {
      const minY = Math.min(...availableYears)
      const maxY = Math.max(...availableYears)
      setGrowthStartYear(minY)
      setGrowthEndYear(maxY)
      setNewStartYear(minY)
      setNewEndYear(maxY)
    }
  }, [category, selectedYear, availableYears])

  // ---------------------------------------------------------------------------
  // Tab 1: Fetch Top States
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'top-states') return

    let isMounted = true
    async function loadTopStates() {
      setTopStatesLoading(true)
      setTopStatesError(null)
      try {
        const data = await api.getTopStates(category, topStatesYear, topStatesN)
        if (isMounted) setTopStatesData(data)
      } catch (err) {
        if (isMounted) setTopStatesError(err.message || 'Failed to load top states.')
      } finally {
        if (isMounted) setTopStatesLoading(false)
      }
    }

    loadTopStates()
    return () => {
      isMounted = false
    }
  }, [category, topStatesYear, topStatesN, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 2: Fetch Distribution Trend
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'distribution') return

    let isMounted = true
    async function loadDistTrend() {
      setDistTrendLoading(true)
      setDistTrendError(null)
      try {
        const data = await api.getDistributionTrend(category, distTrendYear)
        if (isMounted) setDistTrendData(data)
      } catch (err) {
        if (isMounted) setDistTrendError(err.message || 'Failed to load distribution trend.')
      } finally {
        if (isMounted) setDistTrendLoading(false)
      }
    }

    loadDistTrend()
    return () => {
      isMounted = false
    }
  }, [category, distTrendYear, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 3: Fetch State Growth
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'state-growth') return
    if (growthStartYear >= growthEndYear) return

    let isMounted = true
    async function loadStateGrowth() {
      setGrowthLoading(true)
      setGrowthError(null)
      try {
        const data = await api.getStateGrowth(category, growthStartYear, growthEndYear, growthTopN)
        if (isMounted) setGrowthData(data)
      } catch (err) {
        if (isMounted) setGrowthError(err.message || 'Failed to load state growth.')
      } finally {
        if (isMounted) setGrowthLoading(false)
      }
    }

    loadStateGrowth()
    return () => {
      isMounted = false
    }
  }, [category, growthStartYear, growthEndYear, growthTopN, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 4: Fetch Compare States
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'compare-states') return

    let isMounted = true
    async function loadCompare() {
      setCompareLoading(true)
      setCompareError(null)
      try {
        const data = await api.compareStates(category, compareYear, stateA, stateB)
        if (isMounted) setCompareData(data)
      } catch (err) {
        if (isMounted) setCompareError(err.message || 'Failed to compare states.')
      } finally {
        if (isMounted) setCompareLoading(false)
      }
    }

    loadCompare()
    return () => {
      isMounted = false
    }
  }, [category, compareYear, stateA, stateB, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 5: Fetch Newly Appearing
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'newly-appearing') return
    if (newStartYear >= newEndYear) return

    let isMounted = true
    async function loadNewlyAppearing() {
      setNewLoading(true)
      setNewError(null)
      try {
        const data = await api.getNewlyAppearing(category, newStartYear, newEndYear)
        if (isMounted) setNewData(data)
      } catch (err) {
        if (isMounted) setNewError(err.message || 'Failed to load newly appearing institutions.')
      } finally {
        if (isMounted) setNewLoading(false)
      }
    }

    loadNewlyAppearing()
    return () => {
      isMounted = false
    }
  }, [category, newStartYear, newEndYear, activeTab])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Heading matching specification */}
      <div className="dashboard-header-container" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="dashboard-title">Geospatial & State Analysis</h1>
          <p className="dashboard-subtitle">
            State-wise representation, concentration hubs and geographic growth trends.
          </p>
        </div>
      </div>

      {/* 3 Prominent Macro KPI Cards matching Screenshot 1 */}
      {topStatesData && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Leading State</span>
              <div className="kpi-icon-badge">
                <Building2 size={16} />
              </div>
            </div>
            <div className="kpi-value-container">
              <span className="kpi-value" style={{ fontSize: '1.45rem' }}>
                {topStatesData.leading_state}
              </span>
            </div>
            <div className="kpi-footer">
              <strong>{topStatesData.leading_state_count}</strong> institutions (
              {((topStatesData.leading_state_count / (topStatesData.total_institutions_scoped || 1)) * 100).toFixed(1)}% of cohort)
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Total States Represented</span>
              <div className="kpi-icon-badge">
                <Globe size={16} />
              </div>
            </div>
            <div className="kpi-value-container">
              <span className="kpi-value" style={{ fontSize: '1.45rem' }}>
                {topStatesData.total_states_represented} States & UTs
              </span>
            </div>
            <div className="kpi-footer">
              Across {topStatesData.total_institutions_scoped} analyzed institutions in {category}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Top 3 Concentration</span>
              <div className="kpi-icon-badge">
                <Layers size={16} />
              </div>
            </div>
            <div className="kpi-value-container">
              <span className="kpi-value" style={{ fontSize: '1.45rem', color: '#2563eb' }}>
                {topStatesData.top3_concentration_pct}%
              </span>
            </div>
            <div className="kpi-footer">
              Concentrated in {topStatesData.top3_states.join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Sub-Navigation Tabs */}
      <GeospatialTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* =========================================================================
          Q2.1 TOP STATES SUBSECTION (Matches Screenshot 1)
          ========================================================================= */}
      {activeTab === 'top-states' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <Building2 size={18} style={{ color: '#2563eb' }} />
                <span>Q2.1 Top States: Regional Institutional Concentration Hubs</span>
              </div>
              <p className="analytics-question-subtitle">
                Which states have the highest number of institutions in the top 100 in {category} ({topStatesYear})?
              </p>
            </div>
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${topStatesView === 'bar' ? 'active' : ''}`}
                onClick={() => setTopStatesView('bar')}
              >
                Bar Chart
              </button>
              <button
                type="button"
                className={`view-mode-btn ${topStatesView === 'map' ? 'active' : ''}`}
                onClick={() => setTopStatesView('map')}
              >
                Geographic Map
              </button>
              <button
                type="button"
                className={`view-mode-btn ${topStatesView === 'both' ? 'active' : ''}`}
                onClick={() => setTopStatesView('both')}
              >
                Combined View
              </button>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="top-states-year" className="analytics-control-label">Ranking Year:</label>
              <select
                id="top-states-year"
                value={topStatesYear}
                onChange={(e) => setTopStatesYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <label htmlFor="top-states-n" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Ranking Scope:
              </label>
              <select
                id="top-states-n"
                value={topStatesN}
                onChange={(e) => setTopStatesN(Number(e.target.value))}
                className="analytics-select"
                style={{ minWidth: 120 }}
              >
                <option value={50}>Top 50 Only</option>
                <option value={100}>Top 100 (Standard)</option>
                <option value={0}>All Ranked Institutions</option>
              </select>
            </div>

            {topStatesData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Cohort: <strong style={{ color: '#0f172a' }}>{topStatesData.total_institutions_scoped}</strong> institutions across <strong style={{ color: '#0f172a' }}>{topStatesData.total_states_represented}</strong> States & UTs
              </div>
            )}
          </div>

          {topStatesLoading && <Loading text="Analyzing geographic representation..." />}
          {topStatesError && <ErrorState message={topStatesError} />}

          {!topStatesLoading && !topStatesError && topStatesData && (
            <>
              {/* Question 1 Choropleth Distribution Card (Matches Reference Image 1) */}
              {(topStatesView === 'map' || topStatesView === 'both') && (
                <div className="nirf-card" style={{ padding: 22 }}>
                  {/* Card Header matching Reference Image 1 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 4,
                            letterSpacing: '0.02em',
                          }}
                        >
                          Question 1
                        </span>
                        <h3 style={{ fontSize: '1.02rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                          Choropleth Distribution of Top {topStatesN || 100} Institutions ({topStatesYear})
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                        Click on any Indian state to view localized institutional density and performance breakdown.
                      </p>
                    </div>

                    {/* Selected State Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: selectedState ? '#eff6ff' : '#f8fafc',
                          border: `1px solid ${selectedState ? '#bfdbfe' : '#e2e8f0'}`,
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: selectedState ? '#1d4ed8' : '#64748b',
                        }}
                      >
                        <span>Selected: {selectedState || 'All States'}</span>
                        {selectedState && (
                          <button
                            type="button"
                            onClick={() => setSelectedState(null)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              padding: '0 2px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                            title="Reset selection"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Map & Localized Performance Layout */}
                  <div className="choropleth-split-grid">
                    {/* Left: Choropleth Map with Centroid Badges and Floating Legend */}
                    <div style={{ position: 'relative', width: '100%', minHeight: 540 }}>
                      <IndiaMap
                        states={topStatesData.states}
                        selectedState={selectedState}
                        onSelectState={(st) => setSelectedState(st === selectedState ? null : st)}
                        height={540}
                        category={category}
                        year={topStatesYear}
                        scopeN={topStatesN}
                      />
                    </div>

                    {/* Right: States with Highest Top 100 Representation & Localized Scorecard */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: 16,
                        height: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            marginBottom: 2,
                          }}
                        >
                          States with Highest Top {topStatesN || 100} Representation
                        </h4>
                        <p style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: 12 }}>
                          Total number of premier institutions ranked in top {topStatesN || 100}.
                        </p>

                        {/* Top states list */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                            maxHeight: 220,
                            overflowY: 'auto',
                            paddingRight: 4,
                            marginBottom: 14,
                          }}
                        >
                          {topStatesData.states.slice(0, 10).map((st) => {
                            const isSelected = selectedState === st.state
                            return (
                              <button
                                key={st.state}
                                type="button"
                                onClick={() => setSelectedState(isSelected ? null : st.state)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: isSelected ? '1px solid #3b82f6' : '1px solid #f1f5f9',
                                  backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'all 0.15s ease',
                                  width: '100%',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.8rem',
                                    fontWeight: isSelected ? 700 : 500,
                                    color: isSelected ? '#1d4ed8' : '#334155',
                                  }}
                                >
                                  {st.state}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span
                                    style={{
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      color: isSelected ? '#1d4ed8' : '#0f172a',
                                    }}
                                  >
                                    {st.count}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                    ({st.share_pct}%)
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Selected State Details OR National Overview */}
                      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {selectedStateData ? (
                          <div
                            style={{
                              padding: 12,
                              backgroundColor: '#f8fafc',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                              }}
                            >
                              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                                {selectedStateData.state}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  backgroundColor:
                                    selectedStateData.count > 10
                                      ? '#dbeafe'
                                      : selectedStateData.count >= 5
                                      ? '#e0f2fe'
                                      : '#f1f5f9',
                                  color:
                                    selectedStateData.count > 10
                                      ? '#1e40af'
                                      : selectedStateData.count >= 5
                                      ? '#0369a1'
                                      : '#475569',
                                }}
                              >
                                {selectedStateData.count > 10
                                  ? 'High Density (>10)'
                                  : selectedStateData.count >= 5
                                  ? 'Moderate (5–10)'
                                  : 'Developing (1–4)'}
                              </span>
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 6,
                                marginBottom: 8,
                              }}
                            >
                              <div
                                style={{
                                  backgroundColor: '#ffffff',
                                  padding: '5px 8px',
                                  borderRadius: 4,
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Institutions</div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                  {selectedStateData.count}{' '}
                                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>
                                    ({selectedStateData.share_pct}%)
                                  </span>
                                </div>
                              </div>
                              <div
                                style={{
                                  backgroundColor: '#ffffff',
                                  padding: '5px 8px',
                                  borderRadius: 4,
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Avg NIRF Score</div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                  {selectedStateData.average_score ?? 'N/A'}
                                </div>
                              </div>
                            </div>

                            <div style={{ fontSize: '0.73rem', color: '#334155', marginBottom: 6 }}>
                              <strong>Top Entity:</strong> {selectedStateData.top_institution}{' '}
                              <span style={{ color: '#2563eb', fontWeight: 600 }}>
                                (#{selectedStateData.top_institution_rank})
                              </span>
                            </div>

                            {(selectedStateData.avg_tlr != null || selectedStateData.avg_rpc != null) && (
                              <div
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#64748b',
                                  borderTop: '1px solid #e2e8f0',
                                  paddingTop: 6,
                                }}
                              >
                                <div style={{ fontWeight: 600, color: '#334155', marginBottom: 2 }}>
                                  Parameter Averages:
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                                  <div>TLR: <strong style={{ color: '#0f172a' }}>{selectedStateData.avg_tlr ?? '-'}</strong></div>
                                  <div>RPC: <strong style={{ color: '#0f172a' }}>{selectedStateData.avg_rpc ?? '-'}</strong></div>
                                  <div>GO: <strong style={{ color: '#0f172a' }}>{selectedStateData.avg_go ?? '-'}</strong></div>
                                  <div>OI: <strong style={{ color: '#0f172a' }}>{selectedStateData.avg_oi ?? '-'}</strong></div>
                                  <div>PR: <strong style={{ color: '#0f172a' }}>{selectedStateData.avg_pr ?? '-'}</strong></div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: 10,
                              backgroundColor: '#f8fafc',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              fontSize: '0.74rem',
                              color: '#64748b',
                            }}
                          >
                            Click any state on the map or the list above to inspect its institutional scorecard and metrics.
                          </div>
                        )}

                        {/* Bottom summary insight box matching Reference Image 1 */}
                        <div
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            color: '#1e293b',
                            lineHeight: 1.5,
                          }}
                        >
                          <strong style={{ color: '#0f172a' }}>{topStatesData.leading_state}</strong> leads national representation with{' '}
                          <strong style={{ color: '#0f172a' }}>{topStatesData.leading_state_count}</strong> institutions
                          {topStatesData.states.length > 1 &&
                            `, followed by ${topStatesData.states[1]?.state} (${topStatesData.states[1]?.count}) and ${topStatesData.states[2]?.state} (${topStatesData.states[2]?.count})${topStatesData.states[3] ? ` and ${topStatesData.states[3]?.state} (${topStatesData.states[3]?.count})` : ''}.`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Horizontal Bar Chart (Screenshot 1 primary chart) */}
              {(topStatesView === 'bar' || topStatesView === 'both') && (
                <div className="nirf-card" style={{ padding: 20 }}>
                  <div style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a' }}>
                      State-wise Institution Counts (Top {topStatesN || 'All'})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      Number of institutions representing each state in the {topStatesYear} {category} rankings.
                    </p>
                  </div>
                  <StateBarChart
                    states={topStatesData.states}
                    height={400}
                    maxDisplay={15}
                  />
                </div>
              )}

              {/* State-wise Institutional Table (Screenshot 1 Table) */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  State Representation Breakdown: {category} ({topStatesYear})
                  {selectedState && (
                    <span style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 500, marginLeft: 8 }}>
                      (Filtered / Selected: {selectedState})
                    </span>
                  )}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>State / UT</th>
                        <th>Institutions</th>
                        <th>Share of Cohort</th>
                        <th>Leading Institution</th>
                        <th>Best Rank</th>
                        <th>Cities Represented</th>
                        <th>Average Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topStatesData.states.map((s, idx) => {
                        const isRowSelected = selectedState === s.state
                        return (
                          <tr
                            key={s.state}
                            onClick={() => setSelectedState(isRowSelected ? null : s.state)}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: isRowSelected ? '#eff6ff' : undefined,
                              borderLeft: isRowSelected ? '4px solid #2563eb' : undefined,
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <td style={{ color: '#64748b' }}>{idx + 1}</td>
                            <td>
                              <strong style={{ color: isRowSelected ? '#1d4ed8' : 'inherit' }}>
                                {s.state}
                              </strong>
                            </td>
                            <td>
                              <strong style={{ color: '#2563eb' }}>{s.count}</strong>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="consistency-progress-track">
                                  <div
                                    className="consistency-progress-bar"
                                    style={{ width: `${s.share_pct}%` }}
                                  />
                                </span>
                                <span>{s.share_pct}%</span>
                              </div>
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>{s.top_institution || 'N/A'}</td>
                            <td>
                              <span className="rank-badge rank-badge-top10">
                                #{s.top_institution_rank}
                              </span>
                            </td>
                            <td>{s.cities_count}</td>
                            <td style={{ fontWeight: 600 }}>{s.average_score ?? 'N/A'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          Q2.2 DISTRIBUTION TREND SUBSECTION
          ========================================================================= */}
      {activeTab === 'distribution' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <Globe size={18} style={{ color: '#2563eb' }} />
                <span>Q2.2 Distribution Trend: Geographical Evolution across Editions</span>
              </div>
              <p className="analytics-question-subtitle">
                How has geographical distribution shifted between 2017 and 2025 in {category}?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="dist-trend-year" className="analytics-control-label">Distribution Snapshot Year:</label>
              <select
                id="dist-trend-year"
                value={distTrendYear}
                onChange={(e) => setDistTrendYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {distTrendData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Available editions: <strong style={{ color: '#0f172a' }}>{distTrendData.years.length}</strong> (
                {distTrendData.years[0]}–{distTrendData.years[distTrendData.years.length - 1]})
              </div>
            )}
          </div>

          {distTrendLoading && <Loading text="Computing longitudinal distribution..." />}
          {distTrendError && <ErrorState message={distTrendError} />}

          {!distTrendLoading && !distTrendError && distTrendData && (
            <>
              {/* Longitudinal Line Chart for Top States */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a' }}>
                    Historical Trajectory of Top Representation States (2017–2025)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Longitudinal counts of institutions produced per year by key regional education hubs.
                  </p>
                </div>
                <StateTrendLinesChart
                  trends={distTrendData.top_states_trends}
                  years={distTrendData.years}
                  height={380}
                />
              </div>

              {/* Snapshot State Table for Selected Year */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Geographic Representation in {distTrendYear} ({category})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>State / UT</th>
                        <th>Total Institutions</th>
                        <th>Share (%)</th>
                        <th>Top Entity</th>
                        <th>Peak Rank</th>
                        <th>Average Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distTrendData.states_distribution.map((s, idx) => (
                        <tr key={s.state}>
                          <td style={{ color: '#64748b' }}>{idx + 1}</td>
                          <td><strong>{s.state}</strong></td>
                          <td><strong style={{ color: '#2563eb' }}>{s.count}</strong></td>
                          <td>{s.share_pct}%</td>
                          <td style={{ fontSize: '0.82rem' }}>{s.top_institution || 'N/A'}</td>
                          <td><span className="rank-badge rank-badge-top10">#{s.top_institution_rank}</span></td>
                          <td>{s.average_score ?? 'N/A'}</td>
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
          Q2.3 STATE GROWTH SUBSECTION
          ========================================================================= */}
      {activeTab === 'state-growth' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <TrendingUp size={18} style={{ color: '#059669' }} />
                <span>Q2.3 State Growth: Longitudinal Shifts in Top-Tier Footprint</span>
              </div>
              <p className="analytics-question-subtitle">
                Which states have improved their representation in the top 100 between {growthStartYear} and {growthEndYear}?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="growth-start-year" className="analytics-control-label">Baseline Year:</label>
              <select
                id="growth-start-year"
                value={growthStartYear}
                onChange={(e) => setGrowthStartYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y >= growthEndYear}>{y}</option>
                ))}
              </select>

              <label htmlFor="growth-end-year" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Comparison Year:
              </label>
              <select
                id="growth-end-year"
                value={growthEndYear}
                onChange={(e) => setGrowthEndYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y <= growthStartYear}>{y}</option>
                ))}
              </select>

              <label htmlFor="growth-top-n" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Tier Scope:
              </label>
              <select
                id="growth-top-n"
                value={growthTopN}
                onChange={(e) => setGrowthTopN(Number(e.target.value))}
                className="analytics-select"
                style={{ minWidth: 110 }}
              >
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
                <option value={0}>All Ranks</option>
              </select>
            </div>

            {growthData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                <span style={{ color: '#059669', fontWeight: 600 }}>{growthData.growing_states_count} Growing</span> •{' '}
                <span style={{ color: '#e11d48', fontWeight: 600 }}>{growthData.declining_states_count} Declining</span> •{' '}
                <span>{growthData.stable_states_count} Stable</span>
              </div>
            )}
          </div>

          {growthLoading && <Loading text="Computing state-level representation growth..." />}
          {growthError && <ErrorState message={growthError} />}

          {!growthLoading && !growthError && growthData && (
            <>
              {/* Diverging Bar Chart */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  Net Institutional Growth by State ({growthStartYear} → {growthEndYear})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                  Green bars indicate net gain in institutions; red bars indicate reduction in representation within Top {growthTopN || 'All'}.
                </p>
                <StateGrowthDivergingChart items={growthData.items} height={420} />
              </div>

              {/* State Growth Data Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  State Growth Comparison Details
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>State / UT</th>
                        <th>{growthStartYear} Count</th>
                        <th>{growthEndYear} Count</th>
                        <th>Net Growth (Δ)</th>
                        <th>% Growth</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {growthData.items.map((i, idx) => (
                        <tr key={i.state}>
                          <td style={{ color: '#64748b' }}>{idx + 1}</td>
                          <td><strong>{i.state}</strong></td>
                          <td>{i.start_count}</td>
                          <td style={{ fontWeight: 600 }}>{i.end_count}</td>
                          <td>
                            {i.growth > 0 ? (
                              <span className="rank-badge-improvement">
                                <ArrowUpRight size={13} />+{i.growth} insts
                              </span>
                            ) : i.growth < 0 ? (
                              <span className="rank-badge-decline">
                                <ArrowDownRight size={13} />{i.growth} insts
                              </span>
                            ) : (
                              <span className="rank-badge-neutral">0</span>
                            )}
                          </td>
                          <td style={{ color: i.growth > 0 ? '#059669' : i.growth < 0 ? '#e11d48' : '#64748b' }}>
                            {i.growth_pct !== null ? `${i.growth > 0 ? '+' : ''}${i.growth_pct}%` : 'N/A'}
                          </td>
                          <td>
                            <span
                              style={{
                                textTransform: 'capitalize',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: i.status === 'growing' ? '#059669' : i.status === 'declining' ? '#e11d48' : '#64748b',
                              }}
                            >
                              {i.status}
                            </span>
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
          Q2.4 COMPARE STATES SUBSECTION
          ========================================================================= */}
      {activeTab === 'compare-states' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <GitCompare size={18} style={{ color: '#8b5cf6' }} />
                <span>Q2.4 Compare States: Dual-State Comparative Profiling</span>
              </div>
              <p className="analytics-question-subtitle">
                How do rankings and scores of institutions in {stateA} compare with {stateB} in {compareYear}?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="state-a-select" className="analytics-control-label">State A:</label>
              <select
                id="state-a-select"
                value={stateA}
                onChange={(e) => setStateA(e.target.value)}
                className="analytics-select"
              >
                {availableStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <label htmlFor="state-b-select" className="analytics-control-label" style={{ marginLeft: 12 }}>
                State B:
              </label>
              <select
                id="state-b-select"
                value={stateB}
                onChange={(e) => setStateB(e.target.value)}
                className="analytics-select"
              >
                {availableStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <label htmlFor="compare-year-select" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Edition:
              </label>
              <select
                id="compare-year-select"
                value={compareYear}
                onChange={(e) => setCompareYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {compareLoading && <Loading text="Performing dual-state comparison..." />}
          {compareError && <ErrorState message={compareError} />}

          {!compareLoading && !compareError && compareData && (
            <>
              {/* Head-to-Head Comparative Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 16,
                }}
              >
                {/* State A Profile Card */}
                <div className="nirf-card" style={{ padding: 20, borderTop: '4px solid #2563eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                      {compareData.state_a.state}
                    </h3>
                    <span className="rank-badge rank-badge-top10">
                      {compareData.state_a.total_institutions} Institutions
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.86rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Top 100 Entities:</span>
                      <strong>{compareData.state_a.top_100_count}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Top 10 Entities:</span>
                      <strong>{compareData.state_a.top_100_count ? compareData.state_a.top_10_count : 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Best Rank:</span>
                      <strong style={{ color: '#2563eb' }}>
                        {compareData.state_a.best_rank ? `#${compareData.state_a.best_rank}` : 'N/A'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Leading Institution:</span>
                      <strong style={{ maxWidth: '60%', textAlign: 'right' }}>
                        {compareData.state_a.top_institution || 'N/A'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Average Score:</span>
                      <strong>{compareData.state_a.average_score ?? 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {/* State B Profile Card */}
                <div className="nirf-card" style={{ padding: 20, borderTop: '4px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                      {compareData.state_b.state}
                    </h3>
                    <span className="rank-badge rank-badge-top10" style={{ backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                      {compareData.state_b.total_institutions} Institutions
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.86rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Top 100 Entities:</span>
                      <strong>{compareData.state_b.top_100_count}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Top 10 Entities:</span>
                      <strong>{compareData.state_b.top_10_count}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Best Rank:</span>
                      <strong style={{ color: '#059669' }}>
                        {compareData.state_b.best_rank ? `#${compareData.state_b.best_rank}` : 'N/A'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Leading Institution:</span>
                      <strong style={{ maxWidth: '60%', textAlign: 'right' }}>
                        {compareData.state_b.top_institution || 'N/A'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Average Score:</span>
                      <strong>{compareData.state_b.average_score ?? 'N/A'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Combined Institutions Comparison Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Institutions Ranked in {compareData.state_a.state} & {compareData.state_b.state} ({compareYear})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Institution Name</th>
                        <th>State</th>
                        <th>City</th>
                        <th>Overall Score</th>
                        <th>TLR</th>
                        <th>RPC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareData.institutions.map((inst) => (
                        <tr key={inst.institution_name}>
                          <td>
                            <span className="rank-badge rank-badge-top10">
                              #{inst.rank}
                            </span>
                          </td>
                          <td><strong>{inst.institution_name}</strong></td>
                          <td>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                backgroundColor: inst.state === compareData.state_a.state ? '#eff6ff' : '#ecfdf5',
                                color: inst.state === compareData.state_a.state ? '#2563eb' : '#059669',
                              }}
                            >
                              {inst.state}
                            </span>
                          </td>
                          <td>{inst.city}</td>
                          <td style={{ fontWeight: 600 }}>{inst.overall_score ?? 'N/A'}</td>
                          <td>{inst.tlr_score ?? 'N/A'}</td>
                          <td>{inst.rpc_score ?? 'N/A'}</td>
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
          Q2.5 NEWLY APPEARING SUBSECTION
          ========================================================================= */}
      {activeTab === 'newly-appearing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <Sparkles size={18} style={{ color: '#f59e0b' }} />
                <span>Q2.5 Newly Appearing: Emerging Regional Origins</span>
              </div>
              <p className="analytics-question-subtitle">
                Which states have produced the largest number of newly debuting institutions in NIRF rankings after {newStartYear}?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="new-start-year" className="analytics-control-label">Baseline Year:</label>
              <select
                id="new-start-year"
                value={newStartYear}
                onChange={(e) => setNewStartYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y >= newEndYear}>{y}</option>
                ))}
              </select>

              <label htmlFor="new-end-year" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Span Ending:
              </label>
              <select
                id="new-end-year"
                value={newEndYear}
                onChange={(e) => setNewEndYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y <= newStartYear}>{y}</option>
                ))}
              </select>
            </div>

            {newData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Total inaugural entities: <strong style={{ color: '#0f172a' }}>{newData.total_new_institutions}</strong> across <strong style={{ color: '#0f172a' }}>{newData.states_count}</strong> states (Top: {newData.leading_state} with {newData.leading_state_count})
              </div>
            )}
          </div>

          {newLoading && <Loading text="Aggregating debuting institutions by state..." />}
          {newError && <ErrorState message={newError} />}

          {!newLoading && !newError && newData && (
            <>
              {/* Bar Chart of Newly Appearing by State */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  Inaugural Institutional Entries by Originating State ({newStartYear}–{newEndYear})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                  Counts reflect institutions making their first ever appearance in {category} rankings during this window.
                </p>
                <StateBarChart
                  states={newData.items.map((i) => ({
                    state: i.state,
                    count: i.new_institutions_count,
                    share_pct: i.share_pct,
                    top_institution: i.institution_names[0] || 'N/A',
                  }))}
                  height={380}
                  maxDisplay={12}
                />
              </div>

              {/* Newly Appearing State Data Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Regional Origin of Inaugural Institutions
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>State / UT</th>
                        <th>New Entrants</th>
                        <th>Share (%)</th>
                        <th>Debut Institutions (Sample)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newData.items.map((item, idx) => (
                        <tr key={item.state}>
                          <td style={{ color: '#64748b' }}>{idx + 1}</td>
                          <td><strong>{item.state}</strong></td>
                          <td><strong style={{ color: '#2563eb' }}>{item.new_institutions_count}</strong></td>
                          <td>{item.share_pct}%</td>
                          <td style={{ fontSize: '0.82rem', maxWidth: 450 }}>
                            {item.institution_names.slice(0, 3).join(', ')}
                            {item.institution_names.length > 3 ? ` +${item.institution_names.length - 3} more` : ''}
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
    </div>
  )
}

export default Geospatial
