/**
 * NIRF Analytics Dashboard — Performance Gap Bar Chart.
 *
 * Visualizes the parametric gap between Research (RPC) and Teaching (TLR):
 * - Ranked horizontal bars showing institutional gap width (RPC - TLR)
 * - Highlights statistical outlier entities
 * - Benchmark reference vertical line for cohort mean gap.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

export function PerformanceGapChart({
  institutions = [],
  meanGap = 0,
  title = '',
  height = 420,
}) {
  if (!institutions || institutions.length === 0) {
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
        No performance gap records available.
      </div>
    )
  }

  // Display top 15 institutions by gap
  const topSlice = [...institutions].slice(0, 15).reverse()

  const trace = {
    x: topSlice.map((i) => i.gap),
    y: topSlice.map((i) =>
      i.institution_name.length > 28
        ? i.institution_name.slice(0, 26) + '...'
        : i.institution_name
    ),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: topSlice.map((i) => (i.is_outlier ? '#dc2626' : (i.gap >= 0 ? '#10b981' : '#3b82f6'))),
      opacity: 0.88,
    },
    customdata: topSlice.map((i) => [
      i.institution_name,
      i.rank,
      i.rpc_score,
      i.tlr_score,
      i.gap_zscore,
      i.is_outlier ? 'Statistical Outlier' : 'Normal',
      i.state,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b> (#%{customdata[1]}, %{customdata[6]})<br>' +
      'Status: <b>%{customdata[5]}</b><br>' +
      'RPC: %{customdata[2]:.2f} | TLR: %{customdata[3]:.2f}<br>' +
      'Gap (RPC - TLR): <b>%{x:+.2f} pts</b> (Z: %{customdata[4]:+.2f})<extra></extra>',
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
    margin: { l: 200, r: 40, t: title ? 45 : 20, b: 50 },
    xaxis: {
      title: { text: 'Performance Gap: Research (RPC) − Teaching (TLR) Points', font: { size: 12, color: '#475569', weight: 600 } },
      zerolinecolor: '#cbd5e1',
      zerolinewidth: 2,
      gridcolor: '#f1f5f9',
    },
    yaxis: {
      title: { text: 'Institution Name', font: { size: 12, color: '#475569', weight: 600 } },
      tickfont: { size: 11, color: '#1e293b' },
      automargin: true,
    },
    shapes: [
      {
        type: 'line',
        x0: meanGap,
        x1: meanGap,
        y0: -0.5,
        y1: topSlice.length - 0.5,
        line: { color: '#64748b', width: 1.8, dash: 'dash' },
      },
    ],
    annotations: [
      {
        x: meanGap,
        y: topSlice.length - 0.5,
        text: `Cohort Mean: ${meanGap.toFixed(1)} pts`,
        showarrow: true,
        arrowhead: 2,
        ax: 40,
        ay: -25,
        font: { size: 10, color: '#475569', weight: 600 },
      },
    ],
  }

  return <ChartContainer data={[trace]} layout={layout} style={{ height }} />
}

export default PerformanceGapChart

