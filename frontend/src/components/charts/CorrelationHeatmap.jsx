/**
 * NIRF Analytics Dashboard — Interactive Plotly Correlation Heatmap.
 *
 * Visualizes pairwise Pearson correlation matrix across NIRF parameters:
 * - Color-coded from cool to warm (-1.0 to +1.0)
 * - In-cell correlation coefficient labels
 * - Interactive hover tooltips
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

const LABEL_MAP = {
  overall_score: 'Overall',
  tlr_score: 'TLR',
  rpc_score: 'RPC',
  go_score: 'GO',
  oi_score: 'OI',
  pr_score: 'PR',
  qnr_score: 'QNR',
  qlr_score: 'QLR',
  sfc_score: 'SFC',
}

export function CorrelationHeatmap({
  matrix = {},
  parameters = [],
  height = 420,
}) {
  if (!matrix || !parameters || parameters.length === 0) {
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
        No correlation matrix data available.
      </div>
    )
  }

  const shortLabels = parameters.map((p) => LABEL_MAP[p] || p)

  const zValues = []
  const textValues = []

  parameters.forEach((rowParam) => {
    const rowZ = []
    const rowText = []
    parameters.forEach((colParam) => {
      const val = matrix[rowParam] && matrix[rowParam][colParam] !== undefined
        ? matrix[rowParam][colParam]
        : 0.0
      rowZ.push(val)
      rowText.push(val.toFixed(2))
    })
    zValues.push(rowZ)
    textValues.push(rowText)
  })

  const trace = {
    z: zValues,
    x: shortLabels,
    y: shortLabels,
    text: textValues,
    type: 'heatmap',
    hoverongaps: false,
    colorscale: [
      [0.0, '#3b82f6'], // Negative / low correlation (Blue)
      [0.5, '#f8fafc'], // Neutral (Light grey)
      [0.7, '#f59e0b'], // Moderate (Amber)
      [1.0, '#ef4444'], // High positive correlation (Red)
    ],
    zmin: 0.0,
    zmax: 1.0,
    colorbar: {
      title: { text: 'Pearson r', font: { size: 11, color: '#475569' } },
      thickness: 12,
      len: 0.8,
    },
    hovertemplate:
      '<b>%{y}</b> vs <b>%{x}</b><br>' +
      'Pearson Correlation: <b>%{z:.3f}</b><extra></extra>',
  }

  // Annotations inside each cell
  const annotations = []
  parameters.forEach((rowParam, rowIdx) => {
    parameters.forEach((colParam, colIdx) => {
      const val = zValues[rowIdx][colIdx]
      annotations.push({
        x: shortLabels[colIdx],
        y: shortLabels[rowIdx],
        text: `<b>${val.toFixed(2)}</b>`,
        font: {
          family: 'Inter, sans-serif',
          size: 11,
          color: val > 0.75 || val < 0.25 ? '#ffffff' : '#0f172a',
        },
        showarrow: false,
      })
    })
  })

  const layout = {
    height,
    margin: { l: 80, r: 24, t: 30, b: 70 },
    xaxis: {
      title: { text: 'NIRF Ranking Parameters', font: { size: 12, color: '#475569', weight: 600 } },
      tickfont: { size: 11, color: '#0f172a', weight: 'bold' },
      side: 'bottom',
    },
    yaxis: {
      title: { text: 'NIRF Ranking Parameters', font: { size: 12, color: '#475569', weight: 600 } },
      tickfont: { size: 11, color: '#0f172a', weight: 'bold' },
      autorange: 'reversed',
    },
    annotations,
  }

  return <ChartContainer data={[trace]} layout={layout} />
}

export default CorrelationHeatmap

