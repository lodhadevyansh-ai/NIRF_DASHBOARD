/**
 * NIRF Analytics Dashboard — Interactive Radar (Spider) Chart.
 *
 * Visualizes multi-parameter institutional profiles on polar axes (0-100 scale).
 * Built with Plotly `scatterpolar`.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'
import { truncateInstitutionName, getParameterAbbr, getParameterFullName } from '../../utils/formatters'

const DEFAULT_PALETTE = [
  '#2563eb', // Royal Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Orange
  '#8b5cf6', // Violet
  '#ec4899', // Rose Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
]

export function RadarChart({
  institutions = [],
  parameters = [],
  parameterLabels = {},
  title = '',
  height = 460,
}) {
  if (!institutions || institutions.length === 0 || !parameters || parameters.length === 0) {
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
        No parameter profile data available for radar visualization.
      </div>
    )
  }

  // Concise parameter abbreviations for clean spider spokes (TLR, RPC, GO, OI, PR)
  const labels = parameters.map((p) => {
    const abbr = getParameterAbbr(p)
    return abbr || (parameterLabels[p] ? parameterLabels[p].replace(/\s*\([^)]*\)/, '') : p)
  })
  // To close the polygon in polar plots, append the first label to the end
  const closedLabels = [...labels, labels[0]]
  const closedFullNames = [
    ...parameters.map((p) => getParameterFullName(p) || parameterLabels[p] || p),
    getParameterFullName(parameters[0]) || parameterLabels[parameters[0]] || parameters[0],
  ]

  const traces = institutions.map((inst, idx) => {
    const color = DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
    const values = parameters.map((p) => {
      const val = inst.scores ? inst.scores[p] : inst[p]
      return typeof val === 'number' && !isNaN(val) ? Number(val.toFixed(2)) : 0
    })
    const closedValues = [...values, values[0]]
    const rankVal = inst.rank || inst.numeric_rank || idx + 1
    const shortName = truncateInstitutionName(inst.institution_name, 22)

    return {
      type: 'scatterpolar',
      r: closedValues,
      theta: closedLabels,
      name: `#${rankVal} ${shortName}`,
      fill: 'toself',
      fillcolor: `${color}20`, // 12% opacity fill
      line: {
        color: color,
        width: 2.2,
      },
      marker: {
        size: 6,
        color: color,
      },
      customdata: closedFullNames,
      hovertemplate:
        `<b>${inst.institution_name}</b> (Rank #${rankVal})<br>` +
        `%{customdata}: <b>%{r:.2f}</b> / 100<extra></extra>`,
    }
  })

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
    margin: { l: 60, r: 60, t: title ? 50 : 30, b: 75 },
    polar: {
      radialaxis: {
        visible: true,
        range: [0, 100],
        tickfont: { size: 10, color: '#64748b' },
        linecolor: '#e2e8f0',
        gridcolor: '#e2e8f0',
        dtick: 20,
      },
      angularaxis: {
        tickfont: { size: 11, color: '#1e293b', weight: 600 },
        rotation: 90,
        direction: 'clockwise',
        linecolor: '#cbd5e1',
        gridcolor: '#f1f5f9',
      },
      bgcolor: '#ffffff',
    },
    showlegend: true,
    legend: {
      orientation: 'h',
      x: 0.5,
      y: -0.20,
      xanchor: 'center',
      yanchor: 'top',
      font: { size: 11, color: '#334155' },
    },
  }

  return <ChartContainer data={traces} layout={layout} style={{ height }} />
}

export default RadarChart

