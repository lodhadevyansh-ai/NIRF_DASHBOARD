/**
 * NIRF Analytics Dashboard — State Institution Count Bar Chart.
 *
 * Implements the horizontal bar chart visualization from Screenshot 1:
 * - State representation counts
 * - Rich tooltips with top institution and average score
 * - Gradient/blue styling matching the design tokens
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

export function StateBarChart({
  states = [],
  title = '',
  height = 420,
  maxDisplay = 15,
  color = '#2563eb',
}) {
  if (!states || states.length === 0) {
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
        No state distribution data available.
      </div>
    )
  }

  // Slice and reverse for horizontal bar chart (top ranked at top)
  const displayed = states.slice(0, maxDisplay).reverse()

  const stateNames = displayed.map((s) => s.state)
  const counts = displayed.map((s) => s.count)
  const shares = displayed.map((s) => s.share_pct)
  const topInsts = displayed.map((s) => s.top_institution || 'N/A')
  const avgScores = displayed.map((s) => s.average_score ?? 'N/A')

  const trace = {
    x: counts,
    y: stateNames,
    type: 'bar',
    orientation: 'h',
    marker: {
      color: displayed.map((s, idx) => {
        // Subtle gradient highlight for top 3
        if (displayed.length - 1 - idx === 0) return '#1d4ed8'
        if (displayed.length - 1 - idx === 1) return '#2563eb'
        if (displayed.length - 1 - idx === 2) return '#3b82f6'
        return '#60a5fa'
      }),
      opacity: 0.92,
      line: {
        color: '#1e40af',
        width: 1,
      },
    },
    text: counts.map((c) => `${c} insts`),
    textposition: 'outside',
    customdata: displayed.map((s) => [
      s.state,
      s.count,
      s.share_pct,
      s.top_institution || 'N/A',
      s.top_institution_rank || 'N/A',
      s.average_score ?? 'N/A',
      s.cities_count || 1,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b><br>' +
      'Institutions: <b>%{customdata[1]}</b> (%{customdata[2]}% share)<br>' +
      'Top Entity: %{customdata[3]} (#%{customdata[4]})<br>' +
      'Average Score: %{customdata[5]}<br>' +
      'Cities Represented: %{customdata[6]}<extra></extra>',
  }

  const maxVal = Math.max(...counts, 5)

  const layout = {
    title: title
      ? {
          text: title,
          font: { size: 14, color: '#0f172a', family: 'Inter, sans-serif' },
          x: 0.02,
        }
      : undefined,
    height,
    margin: { l: 150, r: 50, t: title ? 36 : 16, b: 50 },
    xaxis: {
      title: {
        text: 'Number of Ranked Institutions',
        font: { size: 12, color: '#475569', weight: 600 },
      },
      range: [0, maxVal * 1.18],
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    yaxis: {
      title: {
        text: 'State / Union Territory',
        font: { size: 12, color: '#475569', weight: 600 },
      },
      tickfont: { size: 11, color: '#1e293b', family: 'Inter, sans-serif' },
      automargin: true,
    },
    showlegend: false,
  }

  return <ChartContainer data={[trace]} layout={layout} />
}

export default StateBarChart

