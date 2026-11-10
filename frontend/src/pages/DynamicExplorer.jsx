/**
 * NIRF Analytics Dashboard — Dynamic Data Explorer Page.
 *
 * Provides a self-service analytical playground to independently explore
 * the NIRF master dataset across:
 * - Faceted Filters (Category, Year, State, Institution Search, Rank, Score)
 * - Variable Mapping (X, Y, Group, Color, Size)
 * - 14 Supported Chart Types with Automated Recommendation
 * - Descriptive Statistics
 * - Filtered Interactive Data Table with CSV Export
 * - PNG Chart Download
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Database,
  Download,
  RotateCcw,
  Search,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react'
import { api } from '../services/api'
import DynamicFilterPanel from '../components/analytics/DynamicFilterPanel'
import DynamicChartBuilder from '../components/analytics/DynamicChartBuilder'
import DynamicChart from '../components/charts/DynamicChart'

export function DynamicExplorer() {
  // Schema State
  const [schema, setSchema] = useState(null)
  const [loadingSchema, setLoadingSchema] = useState(true)

  // Filter State (defaults to Overall, 2025, Top 100 matching Image 1)
  const [filters, setFilters] = useState({
    category: 'Overall',
    year: 2025,
    state: null,
    institution_query: '',
    rank_min: 1,
    rank_max: 100,
    score_min: null,
    score_max: null,
  })

  // Query / Builder State
  const [queryConfig, setQueryConfig] = useState({
    chartType: 'bar',
    xVariable: 'institution_name',
    yVariable: 'overall_score',
    groupVariable: 'none',
    colorVariable: 'none',
    sizeVariable: 'none',
    aggregation: 'mean',
    sortBy: 'y_desc',
    limit: 25,
    analysisPurpose: 'none',
  })

  // Query Results State
  const [chartResponse, setChartResponse] = useState(null)
  const [loadingQuery, setLoadingQuery] = useState(false)
  const [recommendation, setRecommendation] = useState(null)
  const [loadingRecommend, setLoadingRecommend] = useState(false)
  const [error, setError] = useState(null)

  // Table State
  const [tableSearch, setTableSearch] = useState('')
  const [tablePage, setTablePage] = useState(1)
  const tablePageSize = 15

  // 1. Load Schema on Mount
  useEffect(() => {
    let isMounted = true
    async function fetchSchema() {
      try {
        setLoadingSchema(true)
        const data = await api.getExplorerSchema()
        if (isMounted) {
          setSchema(data)
        }
      } catch (err) {
        console.error('Failed to load explorer schema:', err)
        if (isMounted) setError('Failed to introspect dataset schema.')
      } finally {
        if (isMounted) setLoadingSchema(false)
      }
    }
    fetchSchema()
    return () => {
      isMounted = false
    }
  }, [])

  // 2. Execute Query
  const handleExecuteQuery = useCallback(async (customConfig = null, customFilters = null) => {
    const activeConfig = customConfig || queryConfig
    const activeFilters = customFilters || filters

    try {
      setLoadingQuery(true)
      setError(null)

      const payload = {
        chart_type: activeConfig.chartType,
        x_variable: activeConfig.xVariable,
        y_variable: activeConfig.yVariable,
        group_variable: activeConfig.groupVariable !== 'none' ? activeConfig.groupVariable : null,
        color_variable: activeConfig.colorVariable !== 'none' ? activeConfig.colorVariable : null,
        size_variable: activeConfig.sizeVariable !== 'none' ? activeConfig.sizeVariable : null,
        aggregation: activeConfig.aggregation,
        limit: activeConfig.limit,
        sort_by: activeConfig.sortBy,
        filters: activeFilters,
        analysis_purpose: activeConfig.analysisPurpose !== 'none' ? activeConfig.analysisPurpose : null,
      }

      const res = await api.executeExplorerQuery(payload)
      setChartResponse(res)
      if (res.recommendation) {
        setRecommendation(res.recommendation)
      }
      setTablePage(1)
    } catch (err) {
      console.error('Query execution failed:', err)
      setError(err.message || 'Failed to generate dynamic chart.')
    } finally {
      setLoadingQuery(false)
    }
  }, [queryConfig, filters])

  // Trigger initial query once schema is ready
  useEffect(() => {
    if (schema) {
      handleExecuteQuery()
    }
  }, [schema]) // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Recommend Chart Action
  const handleRecommend = async () => {
    try {
      setLoadingRecommend(true)
      const res = await api.recommendChart({
        x_var: queryConfig.xVariable,
        y_var: queryConfig.yVariable !== 'none' ? queryConfig.yVariable : null,
        group_var: queryConfig.groupVariable !== 'none' ? queryConfig.groupVariable : null,
        color_var: queryConfig.colorVariable !== 'none' ? queryConfig.colorVariable : null,
        size_var: queryConfig.sizeVariable !== 'none' ? queryConfig.sizeVariable : null,
        analysis_purpose: queryConfig.analysisPurpose !== 'none' ? queryConfig.analysisPurpose : null,
      })

      setRecommendation(res)
      if (res.chart_type) {
        setQueryConfig((prev) => ({ ...prev, chartType: res.chart_type }))
      }
    } catch (err) {
      console.error('Chart recommendation error:', err)
    } finally {
      setLoadingRecommend(false)
    }
  }

  // 4. Reset Filters Action
  const handleResetFilters = () => {
    const defaultFilters = {
      category: 'Overall',
      year: 2025,
      state: null,
      institution_query: '',
      rank_min: null,
      rank_max: null,
      score_min: null,
      score_max: null,
    }
    setFilters(defaultFilters)
    handleExecuteQuery(null, defaultFilters)
  }

  // 5. Reset All (Filters + Builder)
  const handleResetAll = () => {
    const defaultFilters = {
      category: 'Overall',
      year: 2025,
      state: null,
      institution_query: '',
      rank_min: null,
      rank_max: null,
      score_min: null,
      score_max: null,
    }
    const defaultConfig = {
      chartType: 'bar',
      xVariable: 'institution_name',
      yVariable: 'overall_score',
      groupVariable: 'none',
      colorVariable: 'none',
      sizeVariable: 'none',
      aggregation: 'mean',
      sortBy: 'y_desc',
      limit: 25,
      analysisPurpose: 'none',
    }
    setFilters(defaultFilters)
    setQueryConfig(defaultConfig)
    setRecommendation(null)
    handleExecuteQuery(defaultConfig, defaultFilters)
  }

  // 6. Download Filtered Data as CSV
  const handleDownloadCSV = () => {
    if (!chartResponse || !chartResponse.table_records || chartResponse.table_records.length === 0) return

    const records = chartResponse.table_records
    const headers = Object.keys(records[0])
    const csvRows = [headers.join(',')]

    for (const row of records) {
      const values = headers.map((header) => {
        const val = row[header]
        if (val === null || val === undefined) return ''
        const escaped = String(val).replace(/"/g, '""')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    }

    const csvData = csvRows.join('\n')
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `nirf_explorer_${filters.category || 'all'}_${filters.year || 'all'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtered Table Records
  const rawTableRecords = chartResponse?.table_records || []
  const filteredTableRecords = rawTableRecords.filter((row) => {
    if (!tableSearch) return true
    const term = tableSearch.toLowerCase()
    return (
      (row.institution_name && String(row.institution_name).toLowerCase().includes(term)) ||
      (row.city && String(row.city).toLowerCase().includes(term)) ||
      (row.state && String(row.state).toLowerCase().includes(term)) ||
      (row.category && String(row.category).toLowerCase().includes(term))
    )
  })

  const totalPages = Math.max(1, Math.ceil(filteredTableRecords.length / tablePageSize))
  const paginatedRecords = filteredTableRecords.slice(
    (tablePage - 1) * tablePageSize,
    tablePage * tablePageSize
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Title & Header Actions (Original Structure) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div className="gov-section-badge" style={{ marginBottom: 6 }}>
            <Building2 size={13} />
            <span>INSTITUTION DIRECTORY</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gov-navy-primary)', margin: 0 }}>
            Dynamic Data Explorer & Rankings
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--gov-text-secondary)', marginTop: 4, margin: 0 }}>
            Search, sort, and inspect detailed NIRF scores and parameter analytics for ranked institutions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={!chartResponse || rawTableRecords.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--gov-border)',
              color: 'var(--gov-navy-primary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: (!chartResponse || rawTableRecords.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (!chartResponse || rawTableRecords.length === 0) ? 0.6 : 1,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--gov-border)',
              color: 'var(--gov-text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} />
            <span>Reset filters</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            color: '#b91c1c',
            fontSize: '0.84rem',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* A. Data Filters Panel */}
      <DynamicFilterPanel
        filters={filters}
        onChange={(newFilters) => {
          setFilters(newFilters)
          handleExecuteQuery(null, newFilters)
        }}
        onApply={() => handleExecuteQuery()}
        onReset={handleResetFilters}
        schema={schema}
        loading={loadingQuery}
        recordsCount={chartResponse?.records_count}
      />

      {/* B & C & D. Variable Mapping, Chart Types, Controls */}
      <DynamicChartBuilder
        schema={schema}
        queryConfig={queryConfig}
        onConfigChange={setQueryConfig}
        onGenerate={() => handleExecuteQuery()}
        onRecommend={handleRecommend}
        recommendation={recommendation}
        loading={loadingQuery}
        loadingRecommend={loadingRecommend}
      />

      {/* E. Chart Output Component */}
      <DynamicChart
        response={chartResponse}
        loading={loadingQuery}
      />

      {/* F. Descriptive Statistics Ribbon */}
      {chartResponse?.statistics && chartResponse.statistics.length > 0 && (
        <div className="nirf-card" style={{ padding: '18px 20px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--gov-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calculator size={16} style={{ color: 'var(--gov-navy-primary)' }} />
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--gov-navy-primary)', margin: 0 }}>
              Cohort Descriptive Statistics
            </h4>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {chartResponse.statistics.map((stat) => (
              <div
                key={stat.variable}
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--gov-border)',
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gov-text-main)', marginBottom: 6 }}>
                  {stat.label} ({stat.count} items)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '0.76rem', color: 'var(--gov-text-secondary)' }}>
                  <div>Mean: <strong style={{ color: 'var(--gov-text-main)' }}>{stat.mean ?? 'N/A'}</strong></div>
                  <div>Std Dev: <strong style={{ color: 'var(--gov-text-main)' }}>{stat.std ?? 'N/A'}</strong></div>
                  <div>Median: <strong style={{ color: 'var(--gov-text-main)' }}>{stat.median ?? 'N/A'}</strong></div>
                  <div>IQR: <strong style={{ color: 'var(--gov-text-main)' }}>{stat.iqr ?? 'N/A'}</strong></div>
                  <div>Min: <strong style={{ color: 'var(--gov-text-main)' }}>{stat.min ?? 'N/A'}</strong></div>
                  <div>Max: <strong style={{ color: 'var(--gov-text-main)' }}>{stat.max ?? 'N/A'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* G. Filtered Data Table */}
      {rawTableRecords.length > 0 && (
        <div
          className="nirf-card"
          style={{
            padding: '18px 20px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--gov-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ position: 'relative', flex: '1', maxWidth: 420 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--gov-text-secondary)' }} />
              <input
                type="text"
                placeholder="Search institution, city or state..."
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value)
                  setTablePage(1)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--gov-border)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: 'var(--gov-text-main)',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: '0.80rem', color: 'var(--gov-text-secondary)', fontWeight: 500 }}>
                {filteredTableRecords.length.toLocaleString()} results
              </span>
              <button
                type="button"
                onClick={handleDownloadCSV}
                disabled={!chartResponse || rawTableRecords.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--gov-border)',
                  color: 'var(--gov-navy-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: (!chartResponse || rawTableRecords.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (!chartResponse || rawTableRecords.length === 0) ? 0.6 : 1,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid var(--gov-border)', color: 'var(--gov-text-main)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', width: 65, fontWeight: 700 }}>Rank ↑</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Institution</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>City</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>State</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Year</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Score</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>TLR</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>RPC</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>GO</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>OI</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>PR</th>
                </tr>
              </thead>
              <tbody>
                {loadingQuery ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--gov-text-secondary)' }}>
                      Loading rankings directory...
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--gov-text-secondary)' }}>
                      No institutions match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((row, idx) => (
                    <tr
                      key={`${row.institution_name}-${row.year}-${idx}`}
                      style={{
                        borderBottom: '1px solid #eef2f6',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fbfcfd',
                        transition: 'background-color 0.1s ease',
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--gov-navy-primary)' }}>
                        {row.rank ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--gov-text-main)' }}>
                        {row.institution_name}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--gov-text-secondary)' }}>
                        {row.city || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--gov-text-secondary)' }}>
                        {row.state || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--gov-text-secondary)' }}>
                        {row.category}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--gov-text-secondary)' }}>
                        {row.year}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--gov-navy-primary)' }}>
                        {row.overall_score !== null && row.overall_score !== undefined ? Number(row.overall_score).toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--gov-text-secondary)' }}>
                        {row.tlr_score !== null && row.tlr_score !== undefined ? Number(row.tlr_score).toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--gov-text-secondary)' }}>
                        {row.rpc_score !== null && row.rpc_score !== undefined ? Number(row.rpc_score).toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--gov-text-secondary)' }}>
                        {row.go_score !== null && row.go_score !== undefined ? Number(row.go_score).toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--gov-text-secondary)' }}>
                        {row.oi_score !== null && row.oi_score !== undefined ? Number(row.oi_score).toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--gov-text-secondary)' }}>
                        {row.pr_score !== null && row.pr_score !== undefined ? Number(row.pr_score).toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 14,
              paddingTop: 10,
              borderTop: '1px solid var(--gov-border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--gov-text-secondary)' }}>
              Page {tablePage} of {totalPages} ({filteredTableRecords.length} records)
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                disabled={tablePage <= 1}
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--gov-border)',
                  backgroundColor: tablePage <= 1 ? '#f8fafc' : '#ffffff',
                  color: tablePage <= 1 ? '#94a3b8' : 'var(--gov-text-main)',
                  cursor: tablePage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '0.78rem', padding: '0 6px', fontWeight: 600 }}>
                {tablePage}
              </span>
              <button
                type="button"
                disabled={tablePage >= totalPages}
                onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--gov-border)',
                  backgroundColor: tablePage >= totalPages ? '#f8fafc' : '#ffffff',
                  color: tablePage >= totalPages ? '#94a3b8' : 'var(--gov-text-main)',
                  cursor: tablePage >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DynamicExplorer
