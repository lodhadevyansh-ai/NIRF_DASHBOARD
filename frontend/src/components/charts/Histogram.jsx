/**
 * NIRF Analytics Dashboard — Reusable Plotly Histogram.
 *
 * Supports discrete bins with frequencies and percentages,
 * with optional vertical dashed lines for Mean and Median.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

export function Histogram({
  bins = [],
  rawScores = [],
  title = '',
  xAxisTitle = 'NIRF Overall Score (0–100)',
  yAxisTitle = 'Number of Institutions',
  mean = null,
  median = null,
  height = 360,
  barColor = '#2563eb',
}) {
  if ((!bins || bins.length === 0) && (!rawScores || rawScores.length === 0)) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '0.88rem',
        }}
      >
        No distribution data available.
      </div>
    )
  }

  const traces = []

  if (bins && bins.length > 0) {
    const labels = bins.map((b) => b.label)
    const counts = bins.map((b) => b.count)
    const pcts = bins.map((b) => b.percentage)

    traces.push({
      x: labels,
      y: counts,
      type: 'bar',
      marker: {
        color: barColor,
        opacity: 0.88,
        line: { color: '#1e40af', width: 1 },
      },
      text: counts.map((c, i) => `${c} (${pcts[i]}%)`),
      textposition: 'outside',
      customdata: bins.map((b) => [b.bin_start, b.bin_end, b.count, b.percentage]),
      hovertemplate:
        '<b>Score Range: %{customdata[0]} – %{customdata[1]}</b><br>' +
        'Institutions: <b>%{customdata[2]}</b><br>' +
        'Share of Cohort: <b>%{customdata[3]}%</b><extra></extra>',
    })
  } else if (rawScores && rawScores.length > 0) {
    traces.push({
      x: rawScores,
      type: 'histogram',
      marker: {
        color: barColor,
        opacity: 0.85,
        line: { color: '#1e40af', width: 1 },
      },
      hovertemplate: 'Score Range: %{x}<br>Count: %{y}<extra></extra>',
    })
  }

  const shapes = []
  const annotations = []

  // Add Mean Reference Line if provided and rawScores or continuous axis is used
  if (mean !== null && bins.length === 0) {
    shapes.push({
      type: 'line',
      x0: mean,
      x1: mean,
      y0: 0,
      y1: 1,
      yref: 'paper',
      line: { color: '#ef4444', width: 2, dash: 'dash' },
    })
    annotations.push({
      x: mean,
      y: 1,
      yref: 'paper',
      text: `Mean: ${mean}`,
      showarrow: false,
      font: { size: 10, color: '#ef4444' },
      xanchor: 'left',
    })
  }

  const maxCount = bins.length > 0 ? Math.max(...bins.map((b) => b.count), 5) : 20

  const layout = {
    title: title
      ? {
          text: title,
          font: { size: 14, color: '#0f172a', family: 'Inter, sans-serif' },
          x: 0.02,
        }
      : undefined,
    height,
    margin: { l: 65, r: 24, t: title ? 40 : 20, b: 60 },
    xaxis: {
      title: { text: xAxisTitle, font: { size: 12, color: '#475569', weight: 600 } },
      gridcolor: '#f1f5f9',
      tickfont: { size: 10, color: '#64748b' },
      tickangle: bins.length > 8 ? -30 : 0,
    },
    yaxis: {
      title: { text: yAxisTitle, font: { size: 12, color: '#475569', weight: 600 } },
      range: [0, maxCount * 1.18],
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    shapes,
    annotations,
    showlegend: false,
  }

  return <ChartContainer data={traces} layout={layout} />
}

export default Histogram

