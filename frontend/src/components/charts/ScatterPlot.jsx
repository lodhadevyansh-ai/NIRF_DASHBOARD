/**
 * NIRF Analytics Dashboard — Interactive Plotly Scatter Plot.
 *
 * Supports:
 * - Institution scatter points with custom tooltips (Name, Rank, State, City, X, Y)
 * - Linear OLS regression line with equation and R^2 annotations
 * - Optional median crosshairs dividing institutions into 4 analytical quadrants
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

export function ScatterPlot({
  points = [],
  regression = null,
  title = '',
  xAxisTitle = 'X Variable',
  yAxisTitle = 'Y Variable',
  showQuadrants = false,
  height = 420,
}) {
  if (!points || points.length === 0) {
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
        No scatter points available for this selection.
      </div>
    )
  }

  const xVals = points.map((p) => p.x)
  const yVals = points.map((p) => p.y)

  // 1. Scatter Trace
  const scatterTrace = {
    x: xVals,
    y: yVals,
    mode: 'markers',
    type: 'scatter',
    name: 'Institutions',
    marker: {
      size: 8,
      color: '#2563eb',
      opacity: 0.82,
      line: { color: '#ffffff', width: 1.2 },
    },
    customdata: points.map((p) => [
      p.institution_name,
      p.rank,
      p.state,
      p.city,
      p.x,
      p.y,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b> (#%{customdata[1]})<br>' +
      'State: %{customdata[2]} • City: %{customdata[3]}<br>' +
      `${xAxisTitle}: <b>%{customdata[4]}</b><br>` +
      `${yAxisTitle}: <b>%{customdata[5]}</b><extra></extra>`,
  }

  const traces = [scatterTrace]

  // 2. Linear Regression Trend Line Trace
  if (regression && regression.x_start !== undefined) {
    traces.push({
      x: [regression.x_start, regression.x_end],
      y: [regression.y_start, regression.y_end],
      mode: 'lines',
      type: 'scatter',
      name: `Fit: ${regression.equation}`,
      line: {
        color: '#dc2626',
        width: 2.5,
        dash: 'solid',
      },
      hoverinfo: 'skip',
    })
  }

  const shapes = []
  const annotations = []

  // 3. Optional Quadrant Dividers
  if (showQuadrants && xVals.length > 0 && yVals.length > 0) {
    const medX = [...xVals].sort((a, b) => a - b)[Math.floor(xVals.length / 2)]
    const medY = [...yVals].sort((a, b) => a - b)[Math.floor(yVals.length / 2)]

    // Vertical median line
    shapes.push({
      type: 'line',
      x0: medX,
      x1: medX,
      y0: 0,
      y1: 1,
      yref: 'paper',
      line: { color: '#94a3b8', width: 1.5, dash: 'dot' },
    })

    // Horizontal median line
    shapes.push({
      type: 'line',
      x0: 0,
      x1: 1,
      xref: 'paper',
      y0: medY,
      y1: medY,
      line: { color: '#94a3b8', width: 1.5, dash: 'dot' },
    })

    // Quadrant label annotations
    annotations.push({
      xref: 'paper',
      yref: 'paper',
      x: 0.98,
      y: 0.96,
      text: 'High X, High Y (Champions)',
      showarrow: false,
      font: { size: 10, color: '#059669', family: 'Inter, sans-serif' },
      xanchor: 'right',
    })
    annotations.push({
      xref: 'paper',
      yref: 'paper',
      x: 0.02,
      y: 0.96,
      text: 'Low X, High Y',
      showarrow: false,
      font: { size: 10, color: '#475569', family: 'Inter, sans-serif' },
      xanchor: 'left',
    })
  }

  // Regression Formula & R^2 Annotation badge
  if (regression && regression.r_squared !== undefined) {
    annotations.push({
      xref: 'paper',
      yref: 'paper',
      x: 0.02,
      y: 0.04,
      text: `<b>${regression.equation}</b><br>R² = ${regression.r_squared}`,
      showarrow: false,
      align: 'left',
      bgcolor: 'rgba(255, 255, 255, 0.92)',
      bordercolor: '#cbd5e1',
      borderwidth: 1,
      borderpad: 6,
      font: { size: 11, color: '#0f172a', family: 'Inter, sans-serif' },
    })
  }

  const layout = {
    title: title
      ? {
          text: title,
          font: { size: 14, color: '#0f172a', family: 'Inter, sans-serif' },
          x: 0.02,
        }
      : undefined,
    height,
    margin: { l: 65, r: 24, t: title ? 55 : (regression !== null ? 42 : 24), b: 58 },
    xaxis: {
      title: { text: xAxisTitle, font: { size: 12, color: '#475569', weight: 600 } },
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    yaxis: {
      title: { text: yAxisTitle, font: { size: 12, color: '#475569', weight: 600 } },
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    shapes,
    annotations,
    showlegend: regression !== null,
    legend: {
      orientation: 'h',
      x: 0,
      y: title ? 1.16 : 1.12,
      font: { size: 11, color: '#475569' },
    },
    hovermode: 'closest',
  }

  return <ChartContainer data={traces} layout={layout} />
}

export default ScatterPlot

