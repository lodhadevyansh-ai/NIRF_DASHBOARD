/**
 * NIRF Analytics Dashboard — Largest Rank Movement Bar Chart.
 *
 * Visualizes institutions with the highest positive (climbers) and negative (fallers)
 * rank movements between two selected editions.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

export function MovementChart({
  climbers = [],
  fallers = [],
  title = '',
  height = 420,
}) {
  if ((!climbers || climbers.length === 0) && (!fallers || fallers.length === 0)) {
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
        No rank movement data recorded for selected editions.
      </div>
    )
  }

  // Combined or split items
  // Sort climbers ascending so the largest climber is at the top when orientation='h'
  const sortedClimbers = [...climbers].reverse()
  const sortedFallers = [...fallers]

  const climberTrace = {
    x: sortedClimbers.map((c) => c.rank_delta),
    y: sortedClimbers.map((c) =>
      c.institution_name.length > 28
        ? c.institution_name.slice(0, 26) + '...'
        : c.institution_name
    ),
    name: 'Rank Climbers (+)',
    type: 'bar',
    orientation: 'h',
    marker: {
      color: '#10b981',
      opacity: 0.88,
    },
    customdata: sortedClimbers.map((c) => [
      c.institution_name,
      c.start_rank,
      c.end_rank,
      c.score_delta,
      c.state,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b> (%{customdata[4]})<br>' +
      'Rank Movement: <b>+%{x} places</b> (#%{customdata[1]} → #%{customdata[2]})<br>' +
      'Score Delta: %{customdata[3]:+.2f} pts<extra></extra>',
  }

  const fallerTrace = {
    x: sortedFallers.map((f) => f.rank_delta),
    y: sortedFallers.map((f) =>
      f.institution_name.length > 28
        ? f.institution_name.slice(0, 26) + '...'
        : f.institution_name
    ),
    name: 'Rank Fallers (-)',
    type: 'bar',
    orientation: 'h',
    marker: {
      color: '#ef4444',
      opacity: 0.88,
    },
    customdata: sortedFallers.map((f) => [
      f.institution_name,
      f.start_rank,
      f.end_rank,
      f.score_delta,
      f.state,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b> (%{customdata[4]})<br>' +
      'Rank Movement: <b>%{x} places</b> (#%{customdata[1]} → #%{customdata[2]})<br>' +
      'Score Delta: %{customdata[3]:+.2f} pts<extra></extra>',
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
      title: { text: 'Rank Movement Delta (Places: Positive = Climbed, Negative = Dropped)', font: { size: 12, color: '#475569', weight: 600 } },
      zerolinecolor: '#cbd5e1',
      zerolinewidth: 2,
      gridcolor: '#f1f5f9',
    },
    yaxis: {
      title: { text: 'Institution Name', font: { size: 12, color: '#475569', weight: 600 } },
      tickfont: { size: 11, color: '#1e293b' },
      automargin: true,
    },
    showlegend: true,
    legend: {
      orientation: 'h',
      x: 0.5,
      y: -0.18,
      xanchor: 'center',
      yanchor: 'top',
      font: { size: 11, color: '#334155' },
    },
  }

  return <ChartContainer data={[climberTrace, fallerTrace]} layout={layout} style={{ height }} />
}

export default MovementChart

