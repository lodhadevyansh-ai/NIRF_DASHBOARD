/**
 * NIRF Analytics Dashboard — Interactive Parallel Coordinates Chart.
 *
 * Visualizes high-dimensional institutional performance across multiple axes simultaneously.
 * Built with Plotly `parcoords`.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

export function ParallelCoordinates({
  dimensions = [],
  colorValues = [],
  colorTitle = 'Overall Score',
  colorscale = 'Blues',
  title = '',
  height = 440,
}) {
  if (!dimensions || dimensions.length === 0 || !dimensions[0].values || dimensions[0].values.length === 0) {
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
        No multi-dimensional coordinate data available.
      </div>
    )
  }

  const validColorValues =
    colorValues && colorValues.length === dimensions[0].values.length
      ? colorValues
      : dimensions[0].values

  const trace = {
    type: 'parcoords',
    line: {
      color: validColorValues,
      colorscale: colorscale,
      showscale: true,
      colorbar: {
        title: { text: colorTitle, side: 'right', font: { size: 11, color: '#475569' } },
        len: 0.85,
        thickness: 14,
        tickfont: { size: 10, color: '#64748b' },
      },
    },
    dimensions: dimensions.map((d) => ({
      range: d.range || [
        Math.floor(Math.min(...d.values.filter((v) => typeof v === 'number' && !isNaN(v)))),
        Math.ceil(Math.max(...d.values.filter((v) => typeof v === 'number' && !isNaN(v)))),
      ],
      label: d.label,
      values: d.values,
      tickfont: { size: 10, color: '#64748b' },
      labelfont: { size: 11, color: '#1e293b', weight: 600 },
    })),
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
    margin: { l: 70, r: 90, t: title ? 55 : 35, b: 35 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  }

  return <ChartContainer data={[trace]} layout={layout} style={{ height }} />
}

export default ParallelCoordinates

