/**
 * NIRF Analytics Dashboard — Interactive Outlier Scatter Plot.
 *
 * Visualizes parameter relationships (e.g. RPC vs Overall) with:
 * - OLS Linear Regression Trend Line
 * - Highlighted statistical outliers (Z-score or IQR flagged)
 * - Custom tooltips displaying residual surprise and Z-scores.
 */

import React from 'react'
import { ChartContainer } from './ChartContainer'

export function OutlierScatterPlot({
  points = [],
  regressionSlope = 0,
  regressionIntercept = 0,
  regressionR2 = 0,
  xAxisTitle = 'NIRF Overall Score (0–100)',
  yAxisTitle = 'Research & Professional Practice (RPC: 0–100)',
  title = '',
  height = 440,
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
        No scatter points available for outlier detection.
      </div>
    )
  }

  const normalPoints = points.filter((p) => !p.is_outlier)
  const highOutliers = points.filter(
    (p) => p.is_outlier && (p.outlier_type === 'high_research_outlier' || p.residual > 0)
  )
  const lowOutliers = points.filter(
    (p) => p.is_outlier && (p.outlier_type === 'low_research_outlier' || p.residual <= 0)
  )

  // 1. Normal Cohort Trace
  const normalTrace = {
    x: normalPoints.map((p) => p.overall_score),
    y: normalPoints.map((p) => p.rpc_score),
    mode: 'markers',
    type: 'scatter',
    name: 'Standard Cohort',
    marker: {
      size: 7,
      color: '#3b82f6',
      opacity: 0.65,
      line: { color: '#ffffff', width: 1 },
    },
    customdata: normalPoints.map((p) => [
      p.institution_name,
      p.rank,
      p.expected_rpc,
      p.residual,
      p.z_score,
      p.state,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b> (#%{customdata[1]}, %{customdata[5]})<br>' +
      'Overall: %{x:.2f} | RPC: %{y:.2f}<br>' +
      'Expected RPC: %{customdata[2]:.2f} (Residual: %{customdata[3]:+.2f}, Z: %{customdata[4]:+.2f})<extra></extra>',
  }

  // 2. High Outliers Trace (Positive Surprises)
  const highOutlierTrace = {
    x: highOutliers.map((p) => p.overall_score),
    y: highOutliers.map((p) => p.rpc_score),
    mode: 'markers+text',
    type: 'scatter',
    name: 'High Research Outliers (+)',
    text: highOutliers.map((p) => (p.z_score >= 1.8 ? p.institution_name.split(' ')[0] : '')),
    textposition: 'top center',
    textfont: { size: 10, color: '#b91c1c', weight: 600 },
    marker: {
      size: 11,
      color: '#dc2626',
      symbol: 'diamond',
      line: { color: '#ffffff', width: 1.5 },
    },
    customdata: highOutliers.map((p) => [
      p.institution_name,
      p.rank,
      p.expected_rpc,
      p.residual,
      p.z_score,
      p.state,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b> (#%{customdata[1]}, %{customdata[5]})<br>' +
      '<b>Statistical Outlier (High Research)</b><br>' +
      'Overall: %{x:.2f} | RPC: %{y:.2f}<br>' +
      'Expected: %{customdata[2]:.2f} (Residual: <b>%{customdata[3]:+.2f} pts</b>, Z: <b>%{customdata[4]:+.2f}</b>)<extra></extra>',
  }

  // 3. Low Outliers Trace (Negative Surprises, if any)
  const lowOutlierTrace = {
    x: lowOutliers.map((p) => p.overall_score),
    y: lowOutliers.map((p) => p.rpc_score),
    mode: 'markers',
    type: 'scatter',
    name: 'Low Research Outliers (-)',
    marker: {
      size: 9,
      color: '#f59e0b',
      symbol: 'triangle-down',
      line: { color: '#ffffff', width: 1.5 },
    },
    customdata: lowOutliers.map((p) => [
      p.institution_name,
      p.rank,
      p.expected_rpc,
      p.residual,
      p.z_score,
      p.state,
    ]),
    hovertemplate:
      '<b>%{customdata[0]}</b> (#%{customdata[1]}, %{customdata[5]})<br>' +
      '<b>Statistical Outlier (Low Research)</b><br>' +
      'Overall: %{x:.2f} | RPC: %{y:.2f}<br>' +
      'Expected: %{customdata[2]:.2f} (Residual: <b>%{customdata[3]:+.2f} pts</b>, Z: <b>%{customdata[4]:+.2f}</b>)<extra></extra>',
  }

  // 4. Regression Line
  const allX = points.map((p) => p.overall_score)
  const minX = Math.min(...allX)
  const maxX = Math.max(...allX)
  const regTrace = {
    x: [minX, maxX],
    y: [regressionSlope * minX + regressionIntercept, regressionSlope * maxX + regressionIntercept],
    mode: 'lines',
    type: 'scatter',
    name: `OLS Fit (R²=${(regressionR2 ?? 0).toFixed(3)})`,
    line: { color: '#0f172a', width: 1.8, dash: 'dash' },
    hoverinfo: 'skip',
  }

  const traces = [normalTrace, regTrace]
  if (highOutliers.length > 0) traces.push(highOutlierTrace)
  if (lowOutliers.length > 0) traces.push(lowOutlierTrace)

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
    margin: { l: 65, r: 30, t: title ? 45 : 20, b: 65 },
    xaxis: {
      title: { text: xAxisTitle, font: { size: 12, color: '#475569', weight: 600 } },
      gridcolor: '#f1f5f9',
    },
    yaxis: {
      title: { text: yAxisTitle, font: { size: 12, color: '#475569', weight: 600 } },
      gridcolor: '#f1f5f9',
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

export default OutlierScatterPlot

