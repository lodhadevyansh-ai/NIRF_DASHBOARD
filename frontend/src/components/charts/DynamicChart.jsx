/**
 * NIRF Analytics Dashboard — Dynamic Chart Renderer Component.
 *
 * Renders dynamic Plotly visualizations with:
 * - Dynamic Title, X-axis title, Y-axis title
 * - Applied filters summary ribbon & record count badge
 * - PNG Download capability
 * - Loading and empty states
 */

import React, { useRef } from 'react'
import Plotly from 'plotly.js-dist-min'
import { Download, Info, BarChart2, Filter } from 'lucide-react'
import { ChartContainer } from './ChartContainer'

export function DynamicChart({
  response,
  loading = false,
  height = 460,
}) {
  const chartWrapperRef = useRef(null)

  if (loading) {
    return (
      <div
        className="nirf-card"
        style={{
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor: '#ffffff',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #e2e8f0',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 500 }}>
          Calculating aggregations and rendering dynamic chart...
        </span>
      </div>
    )
  }

  if (!response || !response.traces || response.traces.length === 0) {
    return (
      <div
        className="nirf-card"
        style={{
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: '#ffffff',
          borderRadius: 8,
          color: '#64748b',
        }}
      >
        <BarChart2 size={36} style={{ color: '#cbd5e1' }} />
        <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 600, color: '#334155' }}>
          No Visualization Generated Yet
        </h4>
        <p style={{ margin: 0, fontSize: '0.82rem', maxWidth: 400, textAlign: 'center' }}>
          Select your variables and chart format above, then click "Generate Visualization" to analyze the NIRF dataset.
        </p>
      </div>
    )
  }

  const { title, x_title, y_title, traces, layout, records_count, applied_filters } = response

  const handleDownloadPNG = () => {
    const el = document.querySelector('.dynamic-plot-container .js-plotly-plot')
    if (el) {
      Plotly.downloadImage(el, {
        format: 'png',
        width: 1200,
        height: 600,
        filename: `nirf_${response.chart_type}_analysis`,
      })
    }
  }

  // Formatting applied filters
  const filterEntries = Object.entries(applied_filters || {})

  const isInstitutionAxis = String(x_title || '').toLowerCase().includes('institution')
  const isStackedOrGrouped = response.chart_type === 'stacked_bar' || response.chart_type === 'grouped_bar'

  // If X is institution names or chart is stacked/grouped, place legend above the chart
  const dynamicLegend = layout?.legend || (
    (isInstitutionAxis || isStackedOrGrouped)
      ? {
          orientation: 'h',
          x: 0.5,
          y: 1.15,
          xanchor: 'center',
          yanchor: 'bottom',
          font: { size: 11, color: '#334155' },
        }
      : {
          orientation: 'h',
          x: 0.5,
          y: -0.25,
          xanchor: 'center',
          yanchor: 'top',
          font: { size: 11, color: '#334155' },
        }
  )

  const dynamicMargin = {
    l: 70,
    r: 30,
    t: (isInstitutionAxis || isStackedOrGrouped) ? 60 : 45,
    b: isInstitutionAxis ? 120 : 85,
    ...(layout?.margin || {})
  }

  return (
    <div
      ref={chartWrapperRef}
      className="nirf-card dynamic-plot-container"
      style={{
        padding: '20px 22px',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Chart Header Ribbon */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              X-Axis: <strong style={{ color: '#334155' }}>{x_title}</strong>
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Y-Axis: <strong style={{ color: '#334155' }}>{y_title}</strong>
            </span>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {records_count.toLocaleString()} Records Sampled
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadPNG}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Download chart image as high-resolution PNG"
        >
          <Download size={13} />
          <span>Download PNG</span>
        </button>
      </div>

      {/* Applied Filters Tags */}
      {filterEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: '#64748b' }}>
            <Filter size={12} />
            <span>Applied Filters:</span>
          </div>
          {filterEntries.map(([key, val]) => (
            <span
              key={key}
              style={{
                fontSize: '0.72rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              {key.replace('_', ' ')}: <strong>{String(val)}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Plotly Canvas Container */}
      <div style={{ width: '100%', height }}>
        <ChartContainer
          data={traces}
          layout={{
            ...layout,
            showlegend: layout?.showlegend !== undefined ? layout.showlegend : (traces.length > 1),
            margin: dynamicMargin,
            xaxis: {
              automargin: true,
              tickangle: -35,
              ...(layout?.xaxis || {}),
              title: {
                text: x_title || (typeof layout?.xaxis?.title === 'object' ? layout.xaxis.title.text : layout?.xaxis?.title) || '',
                font: { size: 12, color: '#475569', weight: 600 },
              },
            },
            yaxis: {
              automargin: true,
              ...(layout?.yaxis || {}),
              title: {
                text: y_title || (typeof layout?.yaxis?.title === 'object' ? layout.yaxis.title.text : layout?.yaxis?.title) || '',
                font: { size: 12, color: '#475569', weight: 600 },
              },
            },
            legend: dynamicLegend,
          }}
        />
      </div>
    </div>
  )
}

export default DynamicChart

