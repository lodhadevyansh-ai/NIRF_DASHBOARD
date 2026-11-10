/**
 * NIRF Analytics Dashboard — Markov Transition Matrix Heatmap.
 *
 * Visualizes the probability and count of institutions transitioning between
 * rank bands from baseline year to comparison year.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'
import { ErrorBoundary } from '../common/ErrorBoundary'

const DEFAULT_TARGET_BANDS = ['1–10', '11–25', '26–50', '51–100', 'Exited']
const SOURCE_BANDS = ['1–10', '11–25', '26–50', '51–100']

export function TransitionMatrix({
  matrixBands = DEFAULT_TARGET_BANDS,
  cells = [],
  title = '',
  height = 360,
}) {
  const targetBands = Array.isArray(matrixBands) && matrixBands.length > 0 ? matrixBands : DEFAULT_TARGET_BANDS
  const safeCells = Array.isArray(cells) ? cells : []

  if (safeCells.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '0.88rem',
          backgroundColor: '#f8fafc',
          borderRadius: 8,
          border: '1px dashed #cbd5e1',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <span style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>
          No sufficient historical data available for this selection.
        </span>
        <span style={{ fontSize: '0.78rem' }}>
          Select alternate baseline and comparison years or choose a discipline category with recorded multi-cycle rankings.
        </span>
      </div>
    )
  }

  // Build 2D grid: z[row][col] = percentage or count
  const zValues = SOURCE_BANDS.map((sb) => {
    return targetBands.map((tb) => {
      const match = safeCells.find((c) => c && c.source_band === sb && c.target_band === tb)
      return match && typeof match.percentage === 'number' ? match.percentage : 0
    })
  })

  const textAnnotations = SOURCE_BANDS.map((sb) => {
    return targetBands.map((tb) => {
      const match = safeCells.find((c) => c && c.source_band === sb && c.target_band === tb)
      if (!match || !match.count) return '0'
      return `<b>${match.count}</b><br><span style="font-size:10px">${match.percentage ?? 0}%</span>`
    })
  })

  const trace = {
    type: 'heatmap',
    z: zValues,
    x: targetBands.map((b) => (b === 'Exited' ? 'Exited Ranking' : `End: ${b}`)),
    y: SOURCE_BANDS.map((b) => `Start: ${b}`),
    text: textAnnotations,
    texttemplate: '%{text}',
    textfont: { size: 11, color: '#0f172a' },
    colorscale: [
      [0, '#f8fafc'],
      [0.2, '#eff6ff'],
      [0.5, '#93c5fd'],
      [0.8, '#3b82f6'],
      [1.0, '#1d4ed8'],
    ],
    showscale: true,
    colorbar: {
      title: { text: 'Retention %', side: 'right', font: { size: 11, color: '#475569' } },
      len: 0.9,
      thickness: 14,
      tickfont: { size: 10, color: '#64748b' },
    },
    hovertemplate:
      '<b>%{y}</b> → <b>%{x}</b><br>' +
      'Transition Share: <b>%{z:.1f}%</b><extra></extra>',
  }

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
    margin: { l: 120, r: 80, t: title ? 50 : 25, b: 70 },
    xaxis: {
      title: { text: 'Ending Rank Band (Target Year)', font: { size: 12, color: '#475569', weight: 600 } },
      tickfont: { size: 11, color: '#1e293b', weight: 600 },
      side: 'bottom',
    },
    yaxis: {
      title: { text: 'Starting Rank Band (Base Year)', font: { size: 12, color: '#475569', weight: 600 } },
      autorange: 'reversed',
      tickfont: { size: 11, color: '#1e293b', weight: 600 },
    },
  }

  return (
    <ErrorBoundary title="Markov Transition Matrix Error">
      <ChartContainer data={[trace]} layout={layout} style={{ height }} />
    </ErrorBoundary>
  )
}

export default TransitionMatrix

