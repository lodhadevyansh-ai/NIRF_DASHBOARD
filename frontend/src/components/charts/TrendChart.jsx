/**
 * NIRF Analytics Dashboard — Reusable Plotly Trend & Distribution Chart.
 *
 * Implements:
 * 1. Longitudinal score distribution trend (Mean, Median, and IQR 25th-75th percentile ribbon).
 * 2. Bar chart for Top Improvements and Largest Declines.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

export function ScoreTrendChart({
  yearlyStats = [],
  height = 360,
  category = 'Overall',
}) {
  if (!yearlyStats || yearlyStats.length === 0) {
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
        No longitudinal score data recorded for {category}.
      </div>
    )
  }

  const years = yearlyStats.map((s) => s.year)
  const means = yearlyStats.map((s) => s.mean_score)
  const medians = yearlyStats.map((s) => s.median_score)
  const q25 = yearlyStats.map((s) => s.q25_score)
  const q75 = yearlyStats.map((s) => s.q75_score)

  const traces = [
    // Lower IQR bound (invisible line)
    {
      x: years,
      y: q25,
      type: 'scatter',
      mode: 'lines',
      line: { color: 'transparent', width: 0 },
      showlegend: false,
      hoverinfo: 'skip',
    },
    // Upper IQR bound (fills down to q25)
    {
      x: years,
      y: q75,
      type: 'scatter',
      mode: 'lines',
      fill: 'tonexty',
      fillcolor: 'rgba(37, 99, 235, 0.10)',
      line: { color: 'transparent', width: 0 },
      name: 'IQR (25th–75th %ile)',
      hoverinfo: 'skip',
    },
    // Median Line
    {
      x: years,
      y: medians,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Median Score',
      line: { color: '#0ea5e9', width: 2, dash: 'dash' },
      marker: { size: 6, color: '#0ea5e9' },
      hovertemplate: 'Median: %{y:.2f}<extra></extra>',
    },
    // Mean Line
    {
      x: years,
      y: means,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Mean Score',
      line: { color: '#2563eb', width: 3 },
      marker: { size: 7, color: '#2563eb' },
      hovertemplate: 'Mean: %{y:.2f}<extra></extra>',
    },
  ]

  const layout = {
    height,
    margin: { l: 56, r: 24, t: 24, b: 46 },
    showlegend: true,
    legend: {
      orientation: 'h',
      x: 0,
      y: 1.14,
      font: { size: 11, color: '#475569' },
    },
    xaxis: {
      title: { text: 'NIRF Ranking Edition', font: { size: 12, color: '#475569' } },
      dtick: 1,
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    yaxis: {
      title: { text: 'NIRF Overall Score (0–100)', font: { size: 12, color: '#475569' } },
      gridcolor: '#f1f5f9',
      tickfont: { size: 11, color: '#64748b' },
    },
    hovermode: 'x unified',
  }

  return <ChartContainer data={traces} layout={layout} />
}

export function RankShiftBarChart({
  items = [],
  metricType = 'improvement',
  height,
}) {
  if (!items || items.length === 0) {
    return (
      <div
        style={{
          height: height || 360,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '0.88rem',
        }}
      >
        No {metricType === 'improvement' ? 'rank improvement' : 'rank regression'} observations recorded between selected years.
      </div>
    )
  }

  const isImprovement = metricType === 'improvement'
  const sign = isImprovement ? '+' : '-'
  // Restrained, official government colors: green for improvement, red for regression
  const barColor = isImprovement ? '#16a34a' : '#dc2626'
  const barBorderColor = isImprovement ? '#15803d' : '#b91c1c'

  // Reverse items so that the #1 rank shift (highest change) appears at the TOP of the horizontal bar chart
  const displayItems = [...items].reverse()

  // Format Y-axis labels with clean multi-line wrapping so full names are preserved without truncation,
  // while guaranteeing that each Y categorical key is 100% unique so Plotly never collapses/overlaps bars.
  const seenLabels = new Map()
  const yLabels = displayItems.map((item) => {
    const rawName = item.institution_name || 'Unknown Institution'
    let formatted = rawName
    if (rawName.length > 36) {
      const words = rawName.split(' ')
      const lines = []
      let currentLine = ''
      for (const word of words) {
        if (currentLine && (currentLine + ' ' + word).length > 36) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = currentLine ? `${currentLine} ${word}` : word
        }
      }
      if (currentLine) lines.push(currentLine)
      formatted = lines.join('<br>')
    }

    // Ensure absolute uniqueness of categorical Y keys so Plotly never merges or stacks bars
    const count = (seenLabels.get(formatted) || 0) + 1
    seenLabels.set(formatted, count)
    if (count > 1) {
      return `${formatted} (${item.state || count})`
    }
    return formatted
  })

  const changes = displayItems.map((i) => i.rank_change)
  const maxChange = Math.max(...changes, 10)

  // One institution = One bar, One label, exactly aligned customdata
  const trace = {
    x: changes,
    y: yLabels,
    type: 'bar',
    orientation: 'h',
    marker: {
      color: barColor,
      opacity: 0.90,
      line: { color: barBorderColor, width: 1.5 },
    },
    text: changes.map((c) => `${sign}${c} ranks`),
    textposition: 'outside',
    cliponaxis: false,
    constraintext: 'none',
    textfont: {
      size: 11,
      color: '#202b38',
      weight: 600,
      family: 'Inter, sans-serif',
    },
    customdata: displayItems.map((i) => [
      i.institution_name,
      i.state || 'N/A',
      i.start_year,
      i.start_rank,
      i.end_year,
      i.end_rank,
      i.rank_change,
      i.start_score !== null && i.start_score !== undefined ? i.start_score : 'N/A',
      i.end_score !== null && i.end_score !== undefined ? i.end_score : 'N/A',
      i.city || 'N/A',
    ]),
    hovertemplate:
      '<b style="font-size:13px">%{customdata[0]}</b><br>' +
      'Location: %{customdata[9]}, %{customdata[1]}<br>' +
      '----------------------------------------<br>' +
      '%{customdata[2]} Edition: <b>Rank #%{customdata[3]}</b> (Score: %{customdata[7]})<br>' +
      '%{customdata[4]} Edition: <b>Rank #%{customdata[5]}</b> (Score: %{customdata[8]})<br>' +
      `<b>${isImprovement ? 'Rank Improvement' : 'Rank Regression'}: ${sign}%{customdata[6]} ranks</b>` +
      '<extra></extra>',
  }

  // Calculate dynamic height based on number of items: at least 44px per item + 80px for axes/margins
  const computedHeight = height || Math.max(420, displayItems.length * 44 + 80)

  const layout = {
    height: computedHeight,
    margin: { l: 280, r: 90, t: 24, b: 50 },
    xaxis: {
      title: {
        text: isImprovement
          ? 'Rank Improvement (+ places climbed)'
          : 'Rank Regression (- places dropped)',
        font: { size: 12, color: '#475569', weight: 600 },
      },
      // 35% headroom ensures outside text labels never get forced inside the bar
      range: [0, maxChange * 1.35],
      gridcolor: '#eaeff5',
      zerolinecolor: '#d5dce5',
      tickfont: { size: 11, color: '#64748b' },
      automargin: true,
    },
    yaxis: {
      type: 'category',
      categoryorder: 'array',
      categoryarray: yLabels,
      tickfont: { size: 11, color: '#202b38', family: 'Inter, sans-serif' },
      automargin: true,
    },
    bargap: 0.32,
    barmode: 'group',
    showlegend: false,
    hoverlabel: {
      bgcolor: '#0b2d50',
      font: { color: '#ffffff', size: 12, family: 'Inter, sans-serif' },
      bordercolor: '#0b2d50',
    },
  }

  return <ChartContainer data={[trace]} layout={layout} />
}

export default { ScoreTrendChart, RankShiftBarChart }

