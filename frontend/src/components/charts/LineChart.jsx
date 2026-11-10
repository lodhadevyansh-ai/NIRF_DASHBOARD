/**
 * NIRF Analytics Dashboard — Reusable Plotly Line Chart.
 *
 * Supports single-line, multi-line series, custom hover templates,
 * and inverted Y-axes (crucial for NIRF rankings where Rank 1 is top).
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

export function LineChart({
  series = [],
  title = '',
  xAxisTitle = 'Academic Year',
  yAxisTitle = 'NIRF Rank (Lower Rank = Better Performance)',
  invertedY = false,
  height = 360,
  showLegend = true,
  yRange = null,
  dtick = null,
  emptyMessage = 'No trajectory data available.',
}) {
  if (!series || series.length === 0 || series.every((s) => !s.x || s.x.length === 0)) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '0.88rem',
          backgroundColor: '#fafbfc',
          borderRadius: 8,
          border: '1px dashed #cbd5e1',
        }}
      >
        {emptyMessage}
      </div>
    )
  }

  // Format Plotly traces
  const traces = series.map((s) => ({
    x: s.x,
    y: s.y,
    name: s.name || 'Value',
    type: 'scatter',
    mode: s.mode || 'lines+markers',
    line: {
      color: s.color || '#2563eb',
      width: s.lineWidth || 2.5,
      dash: s.dash || 'solid',
      shape: s.shape || 'linear',
    },
    marker: {
      size: s.markerSize || 7,
      color: s.color || '#2563eb',
      symbol: s.symbol || 'circle',
      line: {
        color: '#ffffff',
        width: 1.5,
      },
    },
    hovertemplate:
      s.hovertemplate ||
      `<b>${s.name || 'Value'}</b><br>Year: %{x}<br>${yAxisTitle}: %{y}<extra></extra>`,
    connectgaps: true,
  }))

  const yaxisConfig = {
    title: {
      text: yAxisTitle,
      font: { size: 12, color: '#475569' },
    },
    autorange: invertedY ? 'reversed' : true,
    gridcolor: '#f1f5f9',
    zeroline: false,
    tickfont: { size: 11, color: '#64748b' },
  }

  if (yRange) {
    yaxisConfig.range = invertedY ? [yRange[1], yRange[0]] : yRange
    yaxisConfig.autorange = false
  }

  if (dtick) {
    yaxisConfig.dtick = dtick
  }

  const layout = {
    title: title
      ? {
          text: title,
          font: { size: 14, color: '#0f172a', family: 'Inter, sans-serif' },
          x: 0.02,
          y: 0.95,
        }
      : undefined,
    height,
    margin: { l: 65, r: 24, t: title ? 55 : (showLegend ? 40 : 25), b: 50 },
    showlegend: showLegend,
    legend: {
      orientation: 'h',
      x: 0,
      y: title ? 1.18 : 1.12,
      font: { size: 11, color: '#475569' },
    },
    xaxis: {
      title: {
        text: xAxisTitle,
        font: { size: 12, color: '#475569', weight: 600 },
      },
      dtick: 1,
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    yaxis: yaxisConfig,
    hovermode: 'x unified',
  }

  return <ChartContainer data={traces} layout={layout} />
}

export default LineChart

