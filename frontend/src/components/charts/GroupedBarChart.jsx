/**
 * NIRF Analytics Dashboard — Interactive Grouped Bar Chart.
 *
 * Compares multiple institutions side-by-side across all evaluation parameters.
 * Built with Plotly `barmode: 'group'`.
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

export function GroupedBarChart({
  institutions = [],
  parameters = [],
  parameterLabels = {},
  title = '',
  height = 420,
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
        No parameter profile data available for grouped bar visualization.
      </div>
    )
  }

  // Use standardized concise parameter abbreviations for horizontal X-axis labels
  const xCategories = parameters.map((p) => {
    const abbr = getParameterAbbr(p)
    return abbr || (parameterLabels[p] ? parameterLabels[p].replace(/\s*\([^)]*\)/, '') : p)
  })

  const traces = institutions.map((inst, idx) => {
    const color = DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
    const yValues = parameters.map((p) => {
      const val = inst.scores ? inst.scores[p] : inst[p]
      return typeof val === 'number' && !isNaN(val) ? Number(val.toFixed(2)) : null
    })

    const rankVal = inst.rank || inst.numeric_rank || idx + 1
    const shortName = truncateInstitutionName(inst.institution_name, 22)

    return {
      x: xCategories,
      y: yValues,
      type: 'bar',
      name: `#${rankVal} ${shortName}`,
      marker: {
        color: color,
        line: { color: '#ffffff', width: 1 },
      },
      customdata: parameters.map((p) => getParameterFullName(p) || parameterLabels[p] || p),
      hovertemplate:
        `<b>${inst.institution_name}</b> (Rank #${rankVal})<br>` +
        `%{customdata}: <b>%{y:.2f}</b> / 100<extra></extra>`,
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
    barmode: 'group',
    bargap: 0.22,
    bargroupgap: 0.1,
    margin: { l: 65, r: 24, t: title ? 55 : 30, b: 85 },
    xaxis: {
      title: { text: 'NIRF Evaluation Parameters', font: { size: 12, color: '#475569', weight: 600 } },
      tickfont: { size: 12, color: '#1e293b', weight: 600 },
      tickangle: 0,
      gridcolor: '#f1f5f9',
    },
    yaxis: {
      title: { text: 'Parameter Score (0–100)', font: { size: 12, color: '#475569', weight: 600 } },
      range: [0, 105],
      tickfont: { size: 11, color: '#64748b' },
      gridcolor: '#f1f5f9',
      zerolinecolor: '#e2e8f0',
    },
    showlegend: true,
    legend: {
      orientation: 'h',
      x: 0.5,
      y: -0.22,
      xanchor: 'center',
      yanchor: 'top',
      font: { size: 11, color: '#334155' },
    },
  }

  return <ChartContainer data={traces} layout={layout} style={{ height }} />
}

export default GroupedBarChart

