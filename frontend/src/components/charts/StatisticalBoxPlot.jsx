/**
 * NIRF Analytics Dashboard — Comprehensive Statistical Box Plot.
 *
 * Displays median line, Interquartile Range (Q1–Q3), Tukey fences whiskers,
 * dashed mean marker line, and discrete red outlier points.
 * Built with Plotly `type: 'box'`.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

const DEFAULT_PALETTE = [
  '#2563eb', // Royal Blue
  '#64748b', // Slate Grey
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Orange
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
]

export function StatisticalBoxPlot({
  groups = [],
  title = '',
  yAxisTitle = 'NIRF Overall Score (0–100)',
  xAxisTitle = 'Institution Group / Category',
  height = 420,
  showPoints = 'outliers', // 'outliers', 'all', false
  boxmean = true, // true (dashed line) or 'sd' (dashed line with std dev)
}) {
  if (!groups || groups.length === 0) {
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
        No distribution data available for box plot.
      </div>
    )
  }

  // Filter groups that have valid numerical observations
  const validGroups = groups
    .map((g) => {
      const validScores = (g.scores || [])
        .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)))
        .map(Number)
      return {
        ...g,
        scores: validScores,
      }
    })
    .filter((g) => g.scores.length > 0)

  if (validGroups.length === 0) {
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
        No valid score observations to generate box plot.
      </div>
    )
  }

  const traces = validGroups.map((g, idx) => {
    const color = g.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
    return {
      type: 'box',
      x: Array(g.scores.length).fill(g.name),
      y: g.scores,
      name: g.name,
      boxpoints: showPoints,
      jitter: 0.28,
      pointpos: -1.6,
      whiskerwidth: 0.5,
      marker: {
        size: 5,
        color: color,
        outliercolor: '#dc2626',
        line: { outliercolor: '#991b1b', outlierwidth: 1 },
        opacity: 0.78,
      },
      line: {
        color: color,
        width: 1.8,
      },
      fillcolor: `${color}25`, // 15% opacity fill
      boxmean: boxmean,
      hovertemplate:
        `<b>%{x}</b><br>` +
        `Score: <b>%{y:.2f}</b><br>` +
        `<extra>${g.name} (n=${g.scores.length})</extra>`,
    }
  })

  // Detect whether X labels are long and need rotation
  const maxLabelLen = Math.max(...validGroups.map((g) => (g.name ? g.name.length : 0)))
  const needsRotation = maxLabelLen > 14 || validGroups.length > 4

  const layout = {
    title: title
      ? {
          text: title,
          font: { family: 'Inter, sans-serif', size: 14, color: '#0f172a', weight: 600 },
          x: 0.02,
          y: 0.98,
        }
      : undefined,
    height,
    boxgap: 0.25,
    boxgroupgap: 0.15,
    margin: {
      l: 65,
      r: 28,
      t: title ? 48 : 28,
      b: needsRotation ? 85 : 55,
    },
    xaxis: {
      title: xAxisTitle ? { text: xAxisTitle, font: { size: 12, color: '#475569', weight: 600 } } : undefined,
      tickfont: { size: 11, color: '#1e293b', weight: 500 },
      tickangle: needsRotation ? -40 : 0,
      gridcolor: '#f1f5f9',
      automargin: true,
    },
    yaxis: {
      title: { text: yAxisTitle, font: { size: 12, color: '#475569', weight: 600 } },
      tickfont: { size: 11, color: '#64748b' },
      gridcolor: '#f1f5f9',
      zerolinecolor: '#e2e8f0',
      rangemode: 'tozero',
      automargin: true,
    },
    showlegend: false,
  }

  return <ChartContainer data={traces} layout={layout} style={{ height }} />
}

export default StatisticalBoxPlot
