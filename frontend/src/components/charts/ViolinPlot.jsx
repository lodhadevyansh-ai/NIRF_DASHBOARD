/**
 * NIRF Analytics Dashboard — Interactive Violin Distribution Plot.
 *
 * Combines Kernel Density Estimation (KDE) with an embedded Tukey box plot,
 * mean marker line, quartile indicators, and outlier points.
 * Built with Plotly `type: 'violin'` and scaled for statistical distribution fidelity.
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

export function ViolinPlot({
  groups = [],
  title = '',
  yAxisTitle = 'NIRF Overall Score (0–100)',
  xAxisTitle = 'Institution Group / Category',
  height = 420,
  showInnerBox = true,
  showPoints = 'outliers', // 'outliers', 'all', false
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
        No score distribution data available for violin plot.
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
        Insufficient valid score records to compute kernel density distribution.
      </div>
    )
  }

  const traces = validGroups.map((g, idx) => {
    const color = g.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
    const hasSufficientKde = g.scores.length >= 3

    return {
      type: 'violin',
      x: Array(g.scores.length).fill(g.name),
      y: g.scores,
      name: g.name,
      scalemode: 'width', // Scale each violin to equal maximum width to prevent compression
      spanmode: 'soft', // Smooth KDE tails without abrupt flat horizontal truncation
      box: {
        visible: showInnerBox,
        width: 0.28,
        line: { color: '#0f172a', width: 1.5 },
        fillcolor: '#ffffff',
      },
      meanline: {
        visible: true,
        color: '#dc2626',
        width: 1.8,
      },
      points: hasSufficientKde ? showPoints : 'all',
      jitter: 0.25,
      pointpos: -1.5,
      marker: {
        size: 5,
        color: color,
        opacity: 0.82,
        line: { color: '#ffffff', width: 0.8 },
      },
      line: {
        color: color,
        width: 1.8,
      },
      fillcolor: `${color}28`, // 16% opacity
      side: 'both',
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
    violingap: 0.25,
    violingroupgap: 0.15,
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

export default ViolinPlot
