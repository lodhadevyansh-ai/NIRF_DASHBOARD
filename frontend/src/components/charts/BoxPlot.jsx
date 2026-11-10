/**
 * NIRF Analytics Dashboard — Multi-Category Plotly Box Plot.
 *
 * Visualizes cross-category score spread:
 * - Median, Interquartile Range (Q1–Q3), Tukey fences whiskers, and discrete outlier points.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

const BOX_PALETTE = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#d946ef', // Fuchsia
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#a855f7', // Purple
]

export function BoxPlot({
  categories = [],
  title = '',
  height = 420,
  yAxisTitle = 'NIRF Overall Score (0–100)',
  xAxisTitle = 'Discipline Category',
}) {
  if (!categories || categories.length === 0) {
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
        No category score distributions recorded.
      </div>
    )
  }

  // Filter categories with valid numerical scores
  const validCategories = categories
    .map((cat) => {
      const validScores = (cat.scores || [])
        .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)))
        .map(Number)
      return {
        ...cat,
        scores: validScores,
      }
    })
    .filter((cat) => cat.scores.length > 0)

  if (validCategories.length === 0) {
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
        No valid numerical observations recorded for selected category spread.
      </div>
    )
  }

  const traces = validCategories.map((cat, idx) => {
    const color = BOX_PALETTE[idx % BOX_PALETTE.length]
    return {
      type: 'box',
      x: Array(cat.scores.length).fill(cat.category),
      y: cat.scores,
      name: cat.category,
      boxpoints: 'outliers',
      jitter: 0.3,
      pointpos: -1.8,
      whiskerwidth: 0.5,
      marker: {
        size: 4,
        color,
        outliercolor: '#dc2626',
      },
      line: {
        color,
        width: 1.8,
      },
      fillcolor: `${color}20`,
      boxmean: true, // displays dashed mean line within box
      hovertemplate:
        `<b>%{x}</b><br>` +
        `Score: <b>%{y:.2f}</b><br>` +
        `<extra>${cat.category} (n=${cat.scores.length})</extra>`,
    }
  })

  const layout = {
    title: title
      ? {
          text: title,
          font: { size: 14, color: '#0f172a', family: 'Inter, sans-serif' },
          x: 0.02,
        }
      : undefined,
    height,
    boxgap: 0.22,
    margin: { l: 65, r: 24, t: title ? 36 : 20, b: 95 },
    showlegend: false,
    xaxis: {
      title: xAxisTitle ? { text: xAxisTitle, font: { size: 12, color: '#475569', weight: 600 } } : undefined,
      tickfont: { size: 11, color: '#1e293b' },
      tickangle: -40,
      gridcolor: '#f1f5f9',
      automargin: true,
    },
    yaxis: {
      title: { text: yAxisTitle, font: { size: 12, color: '#475569', weight: 600 } },
      gridcolor: '#f1f5f9',
      zerolinecolor: '#e2e8f0',
      tickfont: { size: 11, color: '#64748b' },
      rangemode: 'tozero',
      automargin: true,
    },
  }

  return <ChartContainer data={traces} layout={layout} />
}

export default BoxPlot
