/**
 * NIRF Analytics Dashboard — Multi-State Trend & Growth Charts.
 *
 * Implements:
 * 1. Longitudinal trajectory lines for top states over editions.
 * 2. Diverging bar chart for state growth and representation shifts.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

const STATE_PALETTE = [
  '#2563eb', // Blue (Tamil Nadu)
  '#10b981', // Emerald (Maharashtra)
  '#8b5cf6', // Violet (Karnataka)
  '#f59e0b', // Amber (Delhi)
  '#ec4899', // Pink (Uttar Pradesh)
  '#06b6d4', // Cyan (West Bengal)
  '#f97316', // Orange (Punjab)
  '#6366f1', // Indigo (Telangana)
]

export function StateTrendLinesChart({
  trends = [],
  years = [],
  height = 380,
}) {
  if (!trends || trends.length === 0 || !years || years.length === 0) {
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
        No longitudinal state trend data available.
      </div>
    )
  }

  const traces = trends.map((t, idx) => {
    const color = STATE_PALETTE[idx % STATE_PALETTE.length]
    return {
      x: years,
      y: years.map((y) => t.yearly_counts[String(y)] || 0),
      name: t.state,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color, width: 2.5 },
      marker: { size: 6, color },
      hovertemplate: `<b>${t.state}</b><br>Year: %{x}<br>Institutions: %{y}<extra></extra>`,
    }
  })

  const layout = {
    height,
    margin: { l: 48, r: 24, t: 24, b: 46 },
    showlegend: true,
    legend: {
      orientation: 'h',
      x: 0,
      y: 1.15,
      font: { size: 11, color: '#475569' },
    },
    xaxis: {
      title: { text: 'NIRF Ranking Edition', font: { size: 11, color: '#475569' } },
      dtick: 1,
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    yaxis: {
      title: { text: 'Institutions in Category', font: { size: 11, color: '#475569' } },
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    hovermode: 'x unified',
  }

  return <ChartContainer data={traces} layout={layout} />
}

export function StateGrowthDivergingChart({
  items = [],
  height = 420,
}) {
  if (!items || items.length === 0) {
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
        No state growth data available for the selected period.
      </div>
    )
  }

  // Filter out 0-change states or show top changes
  const activeItems = items.filter((i) => i.growth !== 0).slice(0, 16).reverse()

  const stateNames = activeItems.map((i) => i.state)
  const growths = activeItems.map((i) => i.growth)
  const colors = activeItems.map((i) => (i.growth > 0 ? '#10b981' : '#f43f5e'))

  const trace = {
    x: growths,
    y: stateNames,
    type: 'bar',
    orientation: 'h',
    marker: {
      color: colors,
      opacity: 0.9,
    },
    text: growths.map((g) => `${g > 0 ? '+' : ''}${g}`),
    textposition: 'outside',
    customdata: activeItems.map((i) => [
      i.state,
      i.start_year,
      i.start_count,
      i.end_year,
      i.end_count,
      i.growth_pct,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b><br>' +
      '%{customdata[1]}: %{customdata[2]} institutions<br>' +
      '%{customdata[3]}: %{customdata[4]} institutions<br>' +
      '<b>Growth: %{x} (%{customdata[5]}%)</b><extra></extra>',
  }

  const maxAbs = Math.max(...growths.map((g) => Math.abs(g)), 4)

  const layout = {
    height,
    margin: { l: 140, r: 50, t: 20, b: 42 },
    xaxis: {
      title: {
        text: 'Net Representation Shift (Δ Institutions)',
        font: { size: 11, color: '#475569' },
      },
      range: [-maxAbs * 1.25, maxAbs * 1.25],
      zerolinecolor: '#94a3b8',
      zerolinewidth: 1.5,
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    yaxis: {
      tickfont: { size: 11, color: '#1e293b' },
      automargin: true,
    },
    showlegend: false,
  }

  return <ChartContainer data={[trace]} layout={layout} />
}

export default { StateTrendLinesChart, StateGrowthDivergingChart }

