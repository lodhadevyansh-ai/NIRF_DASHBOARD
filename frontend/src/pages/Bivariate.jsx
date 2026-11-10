/**
 * NIRF Analytics Dashboard — Bivariate Analysis & Correlation Module.
 *
 * Implements:
 * - Q4.1 RPC vs Overall Score: Scatter plot, OLS trend line, statistical interpretation.
 * - Q4.2 PR vs Overall Score: Perception weight correlation and scatter points.
 * - Q4.3 Strongest Correlation: Parameter correlation ranking & full heatmap matrix.
 * - Q4.4 TLR vs RPC: Teaching vs Research quadrant scatter analysis.
 * - Q4.5 Historical Correlation: Longitudinal stability tracking from 2017 to 2025.
 * - General-purpose Select Two Variables bivariate interface.
 */

import React, { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle,
  ChevronDown,
  Eye,
  Filter,
  History,
  Info,
  LineChart as LineChartIcon,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import { api } from '../services/api'
import { BivariateTabs } from '../components/analytics/BivariateTabs'
import { ScatterPlot } from '../components/charts/ScatterPlot'
import { CorrelationHeatmap } from '../components/charts/CorrelationHeatmap'
import { LineChart } from '../components/charts/LineChart'
import { Loading } from '../components/common/Loading'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import '../styles/analytics.css'

const VARIABLE_OPTIONS = [
  { value: 'overall_score', label: 'Overall Composite Score' },
  { value: 'tlr_score', label: 'Teaching, Learning & Resources (TLR)' },
  { value: 'rpc_score', label: 'Research & Professional Practice (RPC)' },
  { value: 'go_score', label: 'Graduation Outcomes (GO)' },
  { value: 'oi_score', label: 'Outreach & Inclusivity (OI)' },
  { value: 'pr_score', label: 'Perception (PR)' },
  { value: 'numeric_rank', label: 'Numerical Rank' },
  { value: 'qnr_score', label: 'Quantitative Research (QNR - Research)' },
  { value: 'qlr_score', label: 'Qualitative Research (QLR - Research)' },
  { value: 'sfc_score', label: 'Students & Faculty Contribution (SFC - Research)' },
]

export function Bivariate() {
  const { category, selectedYear, availableYears } = useFilters()

  // Sub-navigation tab state
  const [activeTab, setActiveTab] = useState('rpc-overall')

  // Global year bounds
  const minAvailableYear = availableYears && availableYears.length ? Math.min(...availableYears) : 2017
  const maxAvailableYear = availableYears && availableYears.length ? Math.max(...availableYears) : 2025

  // Tab 1: RPC vs Overall state
  const [rpcYear, setRpcYear] = useState(selectedYear || maxAvailableYear)
  const [rpcData, setRpcData] = useState(null)
  const [rpcLoading, setRpcLoading] = useState(false)
  const [rpcError, setRpcError] = useState(null)

  // Tab 2: PR vs Overall state
  const [prYear, setPrYear] = useState(selectedYear || maxAvailableYear)
  const [prData, setPrData] = useState(null)
  const [prLoading, setPrLoading] = useState(false)
  const [prError, setPrError] = useState(null)

  // Tab 3: Strongest Correlation state
  const [strongestYear, setStrongestYear] = useState(selectedYear || maxAvailableYear)
  const [strongestData, setStrongestData] = useState(null)
  const [strongestLoading, setStrongestLoading] = useState(false)
  const [strongestError, setStrongestError] = useState(null)

  // Tab 4: TLR vs RPC state
  const [tlrRpcYear, setTlrRpcYear] = useState(selectedYear || maxAvailableYear)
  const [tlrRpcData, setTlrRpcData] = useState(null)
  const [tlrRpcLoading, setTlrRpcLoading] = useState(false)
  const [tlrRpcError, setTlrRpcError] = useState(null)

  // Tab 5: Historical Correlation state
  const [histStartYear, setHistStartYear] = useState(minAvailableYear)
  const [histEndYear, setHistEndYear] = useState(maxAvailableYear)
  const [histData, setHistData] = useState(null)
  const [histLoading, setHistLoading] = useState(false)
  const [histError, setHistError] = useState(null)

  // Tab 6: Custom Two-Variable Selection state
  const [customYear, setCustomYear] = useState(selectedYear || maxAvailableYear)
  const [customVarX, setCustomVarX] = useState('rpc_score')
  const [customVarY, setCustomVarY] = useState('overall_score')
  const [customData, setCustomData] = useState(null)
  const [customLoading, setCustomLoading] = useState(false)
  const [customError, setCustomError] = useState(null)

  // Sync year defaults when global filter changes
  useEffect(() => {
    if (selectedYear) {
      setRpcYear(selectedYear)
      setPrYear(selectedYear)
      setStrongestYear(selectedYear)
      setTlrRpcYear(selectedYear)
      setCustomYear(selectedYear)
    }
    if (availableYears && availableYears.length >= 2) {
      const minY = Math.min(...availableYears)
      const maxY = Math.max(...availableYears)
      setHistStartYear(minY)
      setHistEndYear(maxY)
    }
  }, [category, selectedYear, availableYears])

  // ---------------------------------------------------------------------------
  // Tab 1: Fetch RPC vs Overall
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'rpc-overall') return

    let isMounted = true
    async function loadRpc() {
      setRpcLoading(true)
      setRpcError(null)
      try {
        const data = await api.getRpcVsOverall(category, rpcYear)
        if (isMounted) setRpcData(data)
      } catch (err) {
        if (isMounted) setRpcError(err.message || 'Failed to load RPC analysis.')
      } finally {
        if (isMounted) setRpcLoading(false)
      }
    }

    loadRpc()
    return () => {
      isMounted = false
    }
  }, [category, rpcYear, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 2: Fetch PR vs Overall
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'pr-overall') return

    let isMounted = true
    async function loadPr() {
      setPrLoading(true)
      setPrError(null)
      try {
        const data = await api.getPrVsOverall(category, prYear)
        if (isMounted) setPrData(data)
      } catch (err) {
        if (isMounted) setPrError(err.message || 'Failed to load PR analysis.')
      } finally {
        if (isMounted) setPrLoading(false)
      }
    }

    loadPr()
    return () => {
      isMounted = false
    }
  }, [category, prYear, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 3: Fetch Strongest Parameter Correlation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'strongest-corr') return

    let isMounted = true
    async function loadStrongest() {
      setStrongestLoading(true)
      setStrongestError(null)
      try {
        const data = await api.getParameterCorrelation(category, strongestYear, 'overall_score')
        if (isMounted) setStrongestData(data)
      } catch (err) {
        if (isMounted) setStrongestError(err.message || 'Failed to load parameter correlation.')
      } finally {
        if (isMounted) setStrongestLoading(false)
      }
    }

    loadStrongest()
    return () => {
      isMounted = false
    }
  }, [category, strongestYear, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 4: Fetch TLR vs RPC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'tlr-rpc') return

    let isMounted = true
    async function loadTlrRpc() {
      setTlrRpcLoading(true)
      setTlrRpcError(null)
      try {
        const data = await api.getTlrVsRpc(category, tlrRpcYear)
        if (isMounted) setTlrRpcData(data)
      } catch (err) {
        if (isMounted) setTlrRpcError(err.message || 'Failed to load TLR vs RPC analysis.')
      } finally {
        if (isMounted) setTlrRpcLoading(false)
      }
    }

    loadTlrRpc()
    return () => {
      isMounted = false
    }
  }, [category, tlrRpcYear, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 5: Fetch Historical Correlation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'historical-corr') return
    if (histStartYear >= histEndYear) return

    let isMounted = true
    async function loadHistorical() {
      setHistLoading(true)
      setHistError(null)
      try {
        const data = await api.getHistoricalCorrelation(category, 'rpc_score', 'overall_score', histStartYear, histEndYear)
        if (isMounted) setHistData(data)
      } catch (err) {
        if (isMounted) setHistError(err.message || 'Failed to load historical correlation.')
      } finally {
        if (isMounted) setHistLoading(false)
      }
    }

    loadHistorical()
    return () => {
      isMounted = false
    }
  }, [category, histStartYear, histEndYear, activeTab])

  // ---------------------------------------------------------------------------
  // Tab 6: Fetch Custom Two-Variable Bivariate
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'custom-variables') return

    let isMounted = true
    async function loadCustom() {
      setCustomLoading(true)
      setCustomError(null)
      try {
        const data = await api.postCustomBivariate({
          category,
          year: customYear,
          var_x: customVarX,
          var_y: customVarY,
        })
        if (isMounted) setCustomData(data)
      } catch (err) {
        if (isMounted) setCustomError(err.message || 'Failed to calculate custom bivariate analysis.')
      } finally {
        if (isMounted) setCustomLoading(false)
      }
    }

    loadCustom()
    return () => {
      isMounted = false
    }
  }, [category, customYear, customVarX, customVarY, activeTab])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Heading matching specification */}
      <div className="dashboard-header-container" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="dashboard-title">Bivariate Analysis & Correlation</h1>
          <p className="dashboard-subtitle">
            Investigate relationships, correlation hierarchies, and regression trajectories between NIRF ranking parameters.
          </p>
        </div>
      </div>

      {/* Horizontal Sub-Navigation Tabs */}
      <BivariateTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* =========================================================================
          Q4.1 RPC VS OVERALL SCORE SUBSECTION
          ========================================================================= */}
      {activeTab === 'rpc-overall' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <Activity size={18} style={{ color: '#2563eb' }} />
                <span>Q4.1 RPC vs Overall Score: Research Output & Final Standing</span>
              </div>
              <p className="analytics-question-subtitle">
                How does Research and Professional Practice (RPC) relate to overall institutional score in {category} ({rpcYear})?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="rpc-year-select" className="analytics-control-label">Edition:</label>
              <select
                id="rpc-year-select"
                value={rpcYear}
                onChange={(e) => setRpcYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {rpcData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Sample: <strong style={{ color: '#0f172a' }}>{rpcData.sample_size}</strong> pairwise observations
              </div>
            )}
          </div>

          {rpcLoading && <Loading text="Computing RPC correlation and regression..." />}
          {rpcError && <ErrorState message={rpcError} />}

          {!rpcLoading && !rpcError && rpcData && (
            <>
              {/* Correlation Stats Ribbon */}
              <div className="analytics-metrics-ribbon">
                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Pearson Correlation (r)</span>
                  <span className="analytics-metric-val" style={{ color: '#2563eb' }}>
                    {rpcData.pearson_r}
                  </span>
                  <span className="analytics-metric-sub">Linear association strength</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Spearman Rho (ρ)</span>
                  <span className="analytics-metric-val" style={{ color: '#0ea5e9' }}>
                    {rpcData.spearman_rho}
                  </span>
                  <span className="analytics-metric-sub">Rank-order monotonic trend</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Coefficient of Determination (R²)</span>
                  <span className="analytics-metric-val">
                    {rpcData.regression ? rpcData.regression.r_squared : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Variance explained</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Regression Model</span>
                  <span className="analytics-metric-val" style={{ fontSize: '1.05rem' }}>
                    {rpcData.regression ? rpcData.regression.equation : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Ordinary least squares</span>
                </div>
              </div>

              {/* Scatter Plot with Regression Line */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  Scatter Plot: RPC vs Overall Score ({rpcYear})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                  Red line denotes fitted linear trend line. Hover over dots to inspect individual institution standings.
                </p>
                <ScatterPlot
                  points={rpcData.points}
                  regression={rpcData.regression}
                  xAxisTitle="Research & Professional Practice (RPC: 0–100)"
                  yAxisTitle="NIRF Overall Score (0–100)"
                  height={420}
                />
              </div>

              {/* Statistical Interpretation Card */}
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 8,
                  fontSize: '0.86rem',
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Info size={18} style={{ flexShrink: 0, color: '#2563eb' }} />
                <div>
                  <strong>Statistical Interpretation:</strong> {rpcData.interpretation}
                </div>
              </div>

              {/* Institution Roster Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Institution Performance Roster ({category} {rpcYear})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Institution Name</th>
                        <th>State</th>
                        <th>City</th>
                        <th>RPC Score (X)</th>
                        <th>Overall Score (Y)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rpcData.points.map((pt) => (
                        <tr key={pt.institution_name}>
                          <td>
                            <span className="rank-badge rank-badge-top10">
                              #{pt.rank}
                            </span>
                          </td>
                          <td><strong>{pt.institution_name}</strong></td>
                          <td>{pt.state}</td>
                          <td>{pt.city}</td>
                          <td style={{ fontWeight: 600, color: '#2563eb' }}>{pt.x}</td>
                          <td style={{ fontWeight: 600 }}>{pt.y}</td>
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
          Q4.2 PR VS OVERALL SCORE SUBSECTION
          ========================================================================= */}
      {activeTab === 'pr-overall' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <Eye size={18} style={{ color: '#2563eb' }} />
                <span>Q4.2 Perception (PR) vs Overall Score</span>
              </div>
              <p className="analytics-question-subtitle">
                How strongly does institutional perception (PR) correlate with final overall scores in {category} ({prYear})?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="pr-year-select" className="analytics-control-label">Edition:</label>
              <select
                id="pr-year-select"
                value={prYear}
                onChange={(e) => setPrYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {prData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Sample: <strong style={{ color: '#0f172a' }}>{prData.sample_size}</strong> pairwise observations
              </div>
            )}
          </div>

          {prLoading && <Loading text="Computing perception correlation and regression..." />}
          {prError && <ErrorState message={prError} />}

          {!prLoading && !prError && prData && (
            <>
              {/* Correlation Stats Ribbon */}
              <div className="analytics-metrics-ribbon">
                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Pearson Correlation (r)</span>
                  <span className="analytics-metric-val" style={{ color: '#2563eb' }}>
                    {prData.pearson_r}
                  </span>
                  <span className="analytics-metric-sub">Linear association strength</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Spearman Rho (ρ)</span>
                  <span className="analytics-metric-val" style={{ color: '#0ea5e9' }}>
                    {prData.spearman_rho}
                  </span>
                  <span className="analytics-metric-sub">Rank-order correlation</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">R-Squared</span>
                  <span className="analytics-metric-val">
                    {prData.regression ? prData.regression.r_squared : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Variance explained</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Trendline Equation</span>
                  <span className="analytics-metric-val" style={{ fontSize: '1.05rem' }}>
                    {prData.regression ? prData.regression.equation : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Linear fit</span>
                </div>
              </div>

              {/* Scatter Plot */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  Scatter Plot: Perception (PR) vs Overall Score
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                  Perception score reflecting peer review and stakeholder reputation versus overall institutional composite score.
                </p>
                <ScatterPlot
                  points={prData.points}
                  regression={prData.regression}
                  xAxisTitle="Perception (PR: 0–100)"
                  yAxisTitle="NIRF Overall Score (0–100)"
                  height={420}
                />
              </div>

              {/* Interpretation Card */}
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 8,
                  fontSize: '0.86rem',
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Info size={18} style={{ flexShrink: 0, color: '#2563eb' }} />
                <div>
                  <strong>Statistical Interpretation:</strong> {prData.interpretation}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          Q4.3 STRONGEST CORRELATION SUBSECTION
          ========================================================================= */}
      {activeTab === 'strongest-corr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <Award size={18} style={{ color: '#2563eb' }} />
                <span>Q4.3 Strongest Correlation: Parameter Hierarchy & Correlation Matrix</span>
              </div>
              <p className="analytics-question-subtitle">
                Which NIRF parameter exhibits the strongest predictive correlation with the overall score in {category} ({strongestYear})?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="strongest-year-select" className="analytics-control-label">Edition:</label>
              <select
                id="strongest-year-select"
                value={strongestYear}
                onChange={(e) => setStrongestYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {strongestData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Primary Driver: <strong style={{ color: '#2563eb' }}>{strongestData.strongest_parameter}</strong> (r = {strongestData.strongest_pearson_r})
              </div>
            )}
          </div>

          {strongestLoading && <Loading text="Analyzing parameter correlation hierarchy..." />}
          {strongestError && <ErrorState message={strongestError} />}

          {!strongestLoading && !strongestError && strongestData && (
            <>
              {/* Correlation Hierarchy Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Parameter Correlation Ranking with Overall Score
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>NIRF Parameter</th>
                        <th>Pearson (r)</th>
                        <th>Spearman (ρ)</th>
                        <th>R-Squared (R²)</th>
                        <th>Association Strength</th>
                        <th>Visual Relative Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strongestData.ranked_parameters.map((p) => (
                        <tr key={p.parameter}>
                          <td>
                            <span className="rank-badge rank-badge-top10">
                              #{p.rank}
                            </span>
                          </td>
                          <td>
                            <strong>{p.parameter_label}</strong>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}><code>{p.parameter}</code></div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#2563eb' }}>{p.pearson_r}</td>
                          <td style={{ fontWeight: 600, color: '#0ea5e9' }}>{p.spearman_rho}</td>
                          <td>{(p.r_squared * 100).toFixed(1)}%</td>
                          <td>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                backgroundColor: p.pearson_r >= 0.8 ? '#eff6ff' : '#f8fafc',
                                color: p.pearson_r >= 0.8 ? '#2563eb' : '#64748b',
                              }}
                            >
                              {p.strength}
                            </span>
                          </td>
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
                                    width: `${Math.abs(p.pearson_r) * 100}%`,
                                    backgroundColor: p.pearson_r >= 0.8 ? '#2563eb' : '#3b82f6',
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

              {/* Pairwise Parameter Correlation Heatmap */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a' }}>
                    Full Pairwise Parameter Correlation Matrix Heatmap
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Pearson r coefficients computed across all evaluated parameters. Red indicates strong positive correlation.
                  </p>
                </div>
                <CorrelationHeatmap
                  matrix={strongestData.correlation_matrix}
                  parameters={strongestData.parameters}
                  height={420}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          Q4.4 TLR VS RPC SUBSECTION
          ========================================================================= */}
      {activeTab === 'tlr-rpc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <BookOpen size={18} style={{ color: '#2563eb' }} />
                <span>Q4.4 TLR vs RPC: Teaching Resources vs Research Output</span>
              </div>
              <p className="analytics-question-subtitle">
                How do teaching resources (TLR) balance against research output (RPC) across institutions in {category} ({tlrRpcYear})?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="tlr-year-select" className="analytics-control-label">Edition:</label>
              <select
                id="tlr-year-select"
                value={tlrRpcYear}
                onChange={(e) => setTlrRpcYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {tlrRpcData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Correlation: <strong>r = {tlrRpcData.pearson_r}</strong> • Monotonic: <strong>ρ = {tlrRpcData.spearman_rho}</strong>
              </div>
            )}
          </div>

          {tlrRpcLoading && <Loading text="Computing TLR vs RPC quadrants..." />}
          {tlrRpcError && <ErrorState message={tlrRpcError} />}

          {!tlrRpcLoading && !tlrRpcError && tlrRpcData && (
            <>
              {/* Scatter Plot with Quadrant Crosshairs */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a' }}>
                    Teaching (TLR) vs Research (RPC) Performance Quadrants
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Dotted crosshairs denote cohort medians. Top-right represents balanced champions excelling in both dimensions.
                  </p>
                </div>
                <ScatterPlot
                  points={tlrRpcData.points}
                  regression={tlrRpcData.regression}
                  showQuadrants={true}
                  xAxisTitle="Teaching, Learning & Resources (TLR: 0–100)"
                  yAxisTitle="Research & Professional Practice (RPC: 0–100)"
                  height={440}
                />
              </div>

              {/* Roster Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Institution Teaching vs Research Profile ({category} {tlrRpcYear})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Institution Name</th>
                        <th>State</th>
                        <th>TLR Score (X)</th>
                        <th>RPC Score (Y)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tlrRpcData.points.map((pt) => (
                        <tr key={pt.institution_name}>
                          <td>
                            <span className="rank-badge rank-badge-top10">
                              #{pt.rank}
                            </span>
                          </td>
                          <td><strong>{pt.institution_name}</strong></td>
                          <td>{pt.state}</td>
                          <td style={{ fontWeight: 600, color: '#059669' }}>{pt.x}</td>
                          <td style={{ fontWeight: 600, color: '#2563eb' }}>{pt.y}</td>
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
          Q4.5 HISTORICAL CORRELATION SUBSECTION
          ========================================================================= */}
      {activeTab === 'historical-corr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <History size={18} style={{ color: '#2563eb' }} />
                <span>Q4.5 Historical Correlation: Longitudinal Stability of Research Impact</span>
              </div>
              <p className="analytics-question-subtitle">
                Has the correlation between research scores and overall scores changed between {histStartYear} and {histEndYear}?
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="hist-start-year" className="analytics-control-label">Baseline Year:</label>
              <select
                id="hist-start-year"
                value={histStartYear}
                onChange={(e) => setHistStartYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y >= histEndYear}>{y}</option>
                ))}
              </select>

              <label htmlFor="hist-end-year" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Ending Year:
              </label>
              <select
                id="hist-end-year"
                value={histEndYear}
                onChange={(e) => setHistEndYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} disabled={y <= histStartYear}>{y}</option>
                ))}
              </select>
            </div>

            {histData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Longitudinal Span Change:
                <strong style={{ color: '#2563eb', marginLeft: 6 }}>
                  {histData.overall_change >= 0 ? '+' : ''}{histData.overall_change}
                </strong>
              </div>
            )}
          </div>

          {histLoading && <Loading text="Analyzing longitudinal correlation trajectory..." />}
          {histError && <ErrorState message={histError} />}

          {!histLoading && !histError && histData && (
            <>
              {/* Historical Correlation Line Chart */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  Annual Pearson Correlation Trend: RPC vs Overall Score ({histStartYear}–{histEndYear})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                  Demonstrates the persistent high association between research output and final NIRF composite rank scores.
                </p>
                <LineChart
                  series={[
                    {
                      name: 'Pearson Correlation (r)',
                      x: histData.yearly_correlations.map((p) => p.year),
                      y: histData.yearly_correlations.map((p) => p.pearson_r),
                      color: '#2563eb',
                      lineWidth: 3,
                      markerSize: 8,
                    },
                  ]}
                  xAxisTitle="Academic Year"
                  yAxisTitle="Pearson Correlation (r)"
                  height={360}
                  yRange={[0.75, 1.0]}
                />
              </div>

              {/* Summary Insight Card */}
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 8,
                  fontSize: '0.86rem',
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Info size={18} style={{ flexShrink: 0, color: '#2563eb' }} />
                <div>{histData.summary_insight}</div>
              </div>

              {/* Annual Correlation Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Year-by-Year Research Correlation Values
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Edition</th>
                        <th>Sample Institutions</th>
                        <th>Pearson (r)</th>
                        <th>Spearman (ρ)</th>
                        <th>R-Squared (R²)</th>
                        <th>Correlation Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {histData.yearly_correlations.map((p) => (
                        <tr key={p.year}>
                          <td><strong>{p.year}</strong></td>
                          <td>{p.sample_size}</td>
                          <td style={{ fontWeight: 700, color: '#2563eb' }}>{p.pearson_r}</td>
                          <td style={{ fontWeight: 600 }}>{p.spearman_rho ?? 'N/A'}</td>
                          <td>{(p.pearson_r ** 2 * 100).toFixed(1)}%</td>
                          <td>
                            <span className="rank-badge rank-badge-top10">
                              Very Strong
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
          CUSTOM TWO-VARIABLE SELECTION INTERFACE
          ========================================================================= */}
      {activeTab === 'custom-variables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Banner */}
          <div className="analytics-question-banner">
            <div>
              <div className="analytics-question-title">
                <SlidersHorizontal size={18} style={{ color: '#2563eb' }} />
                <span>General-Purpose Bivariate Interface: Select Any Two Variables</span>
              </div>
              <p className="analytics-question-subtitle">
                Select any two numerical columns to compute real-time scatter plots, Pearson/Spearman coefficients, OLS regression, and interpretations.
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="analytics-controls-bar">
            <div className="analytics-control-group">
              <label htmlFor="custom-x-select" className="analytics-control-label">Variable X (Independent):</label>
              <select
                id="custom-x-select"
                value={customVarX}
                onChange={(e) => setCustomVarX(e.target.value)}
                className="analytics-select"
              >
                {VARIABLE_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>

              <label htmlFor="custom-y-select" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Variable Y (Dependent):
              </label>
              <select
                id="custom-y-select"
                value={customVarY}
                onChange={(e) => setCustomVarY(e.target.value)}
                className="analytics-select"
              >
                {VARIABLE_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>

              <label htmlFor="custom-year-select" className="analytics-control-label" style={{ marginLeft: 12 }}>
                Edition:
              </label>
              <select
                id="custom-year-select"
                value={customYear}
                onChange={(e) => setCustomYear(Number(e.target.value))}
                className="analytics-select"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {customData && (
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Complete Pairs: <strong style={{ color: '#0f172a' }}>{customData.sample_size}</strong>
                {customData.missing_count > 0 && ` (${customData.missing_count} missing)`}
              </div>
            )}
          </div>

          {customLoading && <Loading text="Calculating custom bivariate analysis..." />}
          {customError && <ErrorState message={customError} />}

          {!customLoading && !customError && customData && (
            <>
              {/* Correlation Stats Ribbon */}
              <div className="analytics-metrics-ribbon">
                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Pearson (r)</span>
                  <span
                    className="analytics-metric-val"
                    style={{
                      color: customData.pearson_r >= 0.5 ? '#2563eb' : customData.pearson_r <= -0.5 ? '#e11d48' : '#0f172a',
                    }}
                  >
                    {customData.pearson_r}
                  </span>
                  <span className="analytics-metric-sub">Linear correlation</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Spearman (ρ)</span>
                  <span className="analytics-metric-val" style={{ color: '#0ea5e9' }}>
                    {customData.spearman_rho}
                  </span>
                  <span className="analytics-metric-sub">Rank correlation</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">R-Squared (R²)</span>
                  <span className="analytics-metric-val">
                    {customData.regression ? customData.regression.r_squared : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Variance explained</span>
                </div>

                <div className="analytics-metric-card">
                  <span className="analytics-metric-label">Regression Line</span>
                  <span className="analytics-metric-val" style={{ fontSize: '1.05rem' }}>
                    {customData.regression ? customData.regression.equation : 'N/A'}
                  </span>
                  <span className="analytics-metric-sub">Fitted equation</span>
                </div>
              </div>

              {/* Scatter Plot */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  Scatter Plot: {customData.var_x_label} vs {customData.var_y_label}
                </h3>
                <ScatterPlot
                  points={customData.points}
                  regression={customData.regression}
                  xAxisTitle={customData.var_x_label}
                  yAxisTitle={customData.var_y_label}
                  height={420}
                />
              </div>

              {/* Interpretation Card */}
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 8,
                  fontSize: '0.86rem',
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Info size={18} style={{ flexShrink: 0, color: '#2563eb' }} />
                <div>
                  <strong>Statistical Interpretation:</strong> {customData.interpretation}
                </div>
              </div>

              {/* Pairwise Data Table */}
              <div className="nirf-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Pairwise Observations ({customData.var_x_label} & {customData.var_y_label})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="nirf-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Institution Name</th>
                        <th>State</th>
                        <th>{customData.var_x_label} (X)</th>
                        <th>{customData.var_y_label} (Y)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customData.points.map((pt) => (
                        <tr key={pt.institution_name}>
                          <td>
                            <span className="rank-badge rank-badge-top10">
                              #{pt.rank}
                            </span>
                          </td>
                          <td><strong>{pt.institution_name}</strong></td>
                          <td>{pt.state}</td>
                          <td style={{ fontWeight: 600, color: '#2563eb' }}>{pt.x}</td>
                          <td style={{ fontWeight: 600 }}>{pt.y}</td>
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

export default Bivariate
