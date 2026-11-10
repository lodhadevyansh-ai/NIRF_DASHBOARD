/**
 * NIRF Analytics Dashboard — Score Quartiles Visualization.
 *
 * Visualizes the 4 quartiles (Q1, Q2, Q3, Q4) using a segmented donut or bar chart
 * with exact threshold boundaries, institution tallies, and percentage shares.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

const QUARTILE_COLORS = [
  '#94a3b8', // Q1 (Bottom 25% - Slate)
  '#38bdf8', // Q2 (Lower-Middle 25% - Sky)
  '#2563eb', // Q3 (Upper-Middle 25% - Royal Blue)
  '#10b981', // Q4 (Top 25% Elite - Emerald)
]

export function QuartileChart({
  quartiles = [],
  height = 340,
  type = 'donut', // 'donut' or 'bar'
}) {
  if (!quartiles || quartiles.length === 0) {
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
        No quartile distributions calculated.
      </div>
    )
  }

  if (type === 'donut') {
    const labels = quartiles.map((q) => q.quartile)
    const values = quartiles.map((q) => q.count)
    const custom = quartiles.map((q) => [
      q.quartile,
      q.lower_bound,
      q.upper_bound,
      q.count,
      q.percentage,
    ])

    const trace = {
      labels,
      values,
      type: 'pie',
      hole: 0.54,
      marker: {
        colors: QUARTILE_COLORS,
        line: { color: '#ffffff', width: 2 },
      },
      textinfo: 'label+percent',
      textposition: 'outside',
      customdata: custom,
      hovertemplate:
        '<b>%{customdata[0]}</b><br>' +
        'Score Range: %{customdata[1]} – %{customdata[2]}<br>' +
        'Institutions: <b>%{customdata[3]}</b> (%{customdata[4]}%)<extra></extra>',
    }

    const layout = {
      height,
      margin: { l: 20, r: 20, t: 20, b: 20 },
      showlegend: false,
    }

    return <ChartContainer data={[trace]} layout={layout} />
  }

  // Segmented Bar View
  const trace = {
    x: quartiles.map((q) => q.count),
    y: quartiles.map((q) => q.quartile),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: QUARTILE_COLORS,
      opacity: 0.9,
    },
    text: quartiles.map((q) => `${q.count} insts (${q.percentage}%)`),
    textposition: 'outside',
    customdata: quartiles.map((q) => [
      q.quartile,
      q.lower_bound,
      q.upper_bound,
      q.count,
      q.percentage,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b><br>' +
      'Score Cutoff: %{customdata[1]} – %{customdata[2]}<br>' +
      'Institutions: <b>%{customdata[3]}</b><extra></extra>',
  }

  const maxVal = Math.max(...quartiles.map((q) => q.count), 10)

  const layout = {
    height,
    margin: { l: 150, r: 50, t: 16, b: 50 },
    xaxis: {
      title: { text: 'Number of Institutions', font: { size: 12, color: '#475569', weight: 600 } },
      range: [0, maxVal * 1.2],
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    yaxis: {
      title: { text: 'Score Quartile Bracket', font: { size: 12, color: '#475569', weight: 600 } },
      tickfont: { size: 11, color: '#1e293b' },
      automargin: true,
    },
    showlegend: false,
  }

  return <ChartContainer data={[trace]} layout={layout} />
}

export default QuartileChart

