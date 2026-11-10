/**
 * NIRF Analytics Dashboard — NLQ Query Result Component.
 *
 * Renders the assistant's analytical payload:
 * - Text answer formatting
 * - Standardized, fully responsive Plotly chart with dynamic height and margin calculations
 * - Complete attribute labels without clipping or truncation
 * - Applied filters tags
 * - Source record count
 * - Contextual follow-up question pills
 */

import React, { useMemo } from 'react'
import { Filter, Database, ArrowRight, CornerDownRight, BarChart2, CheckCircle, Sparkles, Cpu } from 'lucide-react'
import { ChartContainer } from '../charts/ChartContainer'

export function QueryResult({ result, onSelectFollowUp }) {
  if (!result) return null

  const { answer, chart, applied_filters, records_count, follow_up_suggestions } = result

  // Simple markdown renderer for bold and line breaks
  const renderFormattedText = (text) => {
    if (!text) return null
    const lines = text.split('\n')
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g)
      return (
        <p key={lIdx} style={{ margin: '4px 0', lineHeight: 1.5 }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} style={{ color: '#0f172a' }}>
                  {part.slice(2, -2)}
                </strong>
              )
            }
            return part
          })}
        </p>
      )
    })
  }

  const filterEntries = Object.entries(applied_filters || {})

  // Compute dynamic chart height and responsive margin layout based on chart type and item count
  const { chartHeight, mergedLayout } = useMemo(() => {
    if (!chart || !chart.traces || !chart.traces.length) {
      return { chartHeight: 400, mergedLayout: {} }
    }

    const isHorizontal =
      chart.traces.some((t) => t && t.orientation === 'h') ||
      chart.chart_type === 'horizontal_bar'

    let height = chart.layout?.height

    if (!height) {
      if (isHorizontal) {
        const itemsCount = chart.traces[0]?.y?.length || 10
        height = Math.max(460, itemsCount * 42 + 90)
      } else if (chart.chart_type === 'radar' || chart.traces.some((t) => t.type === 'scatterpolar')) {
        height = 440
      } else if (chart.chart_type === 'pie' || chart.traces.some((t) => t.type === 'pie')) {
        height = 420
      } else {
        height = 430
      }
    }

    const defaultMargins = isHorizontal
      ? { l: 270, r: 55, t: 40, b: 60 }
      : { l: 70, r: 35, t: 40, b: 70 }

    const layout = {
      autosize: true,
      height,
      ...chart.layout,
      margin: {
        ...defaultMargins,
        ...(chart.layout?.margin || {}),
      },
      xaxis: {
        automargin: true,
        ...(chart.layout?.xaxis || {}),
      },
      yaxis: {
        automargin: true,
        ...(chart.layout?.yaxis || {}),
      },
    }

    return { chartHeight: height, mergedLayout: layout }
  }, [chart])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Answer Text */}
      <div style={{ fontSize: '0.88rem', color: '#334155' }}>
        {renderFormattedText(answer)}
      </div>

      {/* Applied Filters, Engine Badge & Record Count */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 2 }}>
        {result.engine_used && String(result.engine_used).startsWith('hybrid_llm') ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: '#faf5ff',
              color: '#7e22ce',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid #e9d5ff',
            }}
          >
            <Sparkles size={11} style={{ color: '#9333ea' }} />
            <span>AI-Grounded Synthesis {result.provider_used && result.provider_used !== 'Custom NIRF NLQ Engine' ? `(${result.provider_used})` : ''}</span>
          </span>
        ) : (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid #bbf7d0',
            }}
          >
            <CheckCircle size={11} style={{ color: '#16a34a' }} />
            <span>Verified NLQ Engine</span>
          </span>
        )}

        {records_count !== undefined && records_count !== null && records_count > 0 && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: '#eaf1f8',
              color: '#123b65',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid #d5dce5',
            }}
          >
            <Database size={11} />
            <span>{records_count.toLocaleString()} Records Analyzed</span>
          </span>
        )}

        {filterEntries.map(([k, v]) => (
          <span
            key={k}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.72rem',
              backgroundColor: '#f4f6f9',
              color: '#475569',
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 500,
              border: '1px solid #d5dce5',
            }}
          >
            <Filter size={10} style={{ color: '#64748b' }} />
            <span>{k.replace('_', ' ')}: <strong>{String(v)}</strong></span>
          </span>
        ))}
      </div>

      {/* Render Embedded Plotly Chart if Available */}
      {chart && chart.traces && chart.traces.length > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: '16px 18px',
            backgroundColor: '#ffffff',
            border: '1px solid #d5dce5',
            borderRadius: 6,
            boxShadow: '0 1px 3px rgba(11, 45, 80, 0.04)',
          }}
        >
          {chart.title && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
                {chart.title}
              </h4>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              >
                {chart.chart_type || 'chart'}
              </span>
            </div>
          )}
          <div style={{ height: chartHeight, width: '100%', minHeight: chartHeight }}>
            <ChartContainer data={chart.traces} layout={mergedLayout} />
          </div>
        </div>
      )}

      {/* Follow-up Question Suggestions */}
      {follow_up_suggestions && follow_up_suggestions.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>
            <CornerDownRight size={12} style={{ color: '#2563eb' }} />
            <span>Suggested follow-up questions:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {follow_up_suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectFollowUp(s)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.76rem',
                  padding: '5px 10px',
                  borderRadius: 14,
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff'
                  e.currentTarget.style.borderColor = '#93c5fd'
                  e.currentTarget.style.color = '#1d4ed8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.color = '#334155'
                }}
              >
                <span>{s}</span>
                <ArrowRight size={11} style={{ opacity: 0.6 }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default QueryResult
