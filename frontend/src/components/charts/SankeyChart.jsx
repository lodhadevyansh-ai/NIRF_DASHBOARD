/**
 * NIRF Analytics Dashboard — Interactive Plotly Sankey Flow Diagram.
 *
 * Visualizes multi-band institutional flows between ranking editions:
 * - Starting rank bands -> Ending rank bands
 * - Distinct styling for New Entrants and Exited institutions.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

function getNodeColor(label = '') {
  if (label.includes('1–10')) return '#2563eb' // Blue
  if (label.includes('11–25')) return '#0284c7' // Light Blue
  if (label.includes('26–50')) return '#10b981' // Green
  if (label.includes('51–100')) return '#f59e0b' // Amber
  if (label.includes('New Entrant')) return '#8b5cf6' // Violet
  if (label.includes('Exit')) return '#e11d48' // Rose/Red
  return '#64748b'
}

export function SankeyChart({
  nodes = [],
  links = [],
  title = '',
  height = 460,
}) {
  if (!nodes || nodes.length === 0 || !links || links.length === 0) {
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
        No transition flow data available for Sankey diagram.
      </div>
    )
  }

  const nodeColors = nodes.map((n) => getNodeColor(n.name))
  const linkColors = links.map((l) => {
    const srcNode = nodes[l.source]
    const baseColor = srcNode ? getNodeColor(srcNode.name) : '#94a3b8'
    return `${baseColor}40` // 25% opacity
  })

  const trace = {
    type: 'sankey',
    orientation: 'h',
    node: {
      pad: 18,
      thickness: 22,
      line: { color: '#ffffff', width: 1.5 },
      label: nodes.map((n) => n.name),
      color: nodeColors,
      hovertemplate: '<b>%{label}</b><br>Total Flow: %{value} institutions<extra></extra>',
    },
    link: {
      source: links.map((l) => l.source),
      target: links.map((l) => l.target),
      value: links.map((l) => l.value),
      color: linkColors,
      customdata: links.map((l) => l.label),
      hovertemplate: '%{customdata}<extra></extra>',
    },
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
    margin: { l: 30, r: 30, t: title ? 45 : 20, b: 30 },
    font: {
      family: 'Inter, sans-serif',
      size: 11,
      color: '#1e293b',
    },
  }

  return <ChartContainer data={[trace]} layout={layout} style={{ height }} />
}

export default SankeyChart

