/**
 * NIRF Analytics Dashboard — Score Distribution Component.
 *
 * Implements Plotly histogram of overall scores matching reference screenshot 1.
 * Features vibrant blue bars, responsive resize, hover tooltips, and summary stats ribbon.
 */

import React, { useMemo } from 'react'
import { BarChart3, Info } from 'lucide-react'
import ChartContainer from '../charts/ChartContainer'
import Loading from '../common/Loading'

export function ScoreDistribution({
  data,
  category = 'Overall',
  year = 2025,
  loading = false,
}) {
  const chartConfig = useMemo(() => {
    if (!data || !data.has_scores || !data.bin_counts || data.bin_counts.length === 0) {
      return null
    }

    // Build Plotly bar trace matching reference histogram
    const binWidth = data.bin_edges && data.bin_edges.length > 1
      ? Math.max(1, Number((data.bin_edges[1] - data.bin_edges[0]).toFixed(2)))
      : 2.5

    const trace = {
      x: data.bin_centers,
      y: data.bin_counts,
      type: 'bar',
      width: binWidth * 0.88,
      marker: {
        color: '#2563eb',
        line: {
          color: '#1d4ed8',
          width: 1,
        },
      },
      hovertext: data.bin_counts.map(
        (count, i) =>
          `<b>Score Range:</b> ${data.bin_edges[i]} – ${data.bin_edges[i + 1]}<br><b>Institutions:</b> ${count}`
      ),
      hoverinfo: 'text',
      textposition: 'none',
      hoverlabel: {
        bgcolor: '#0f172a',
        font: { family: 'Inter, sans-serif', size: 12, color: '#ffffff' },
      },
    }

    const minX = Math.max(0, Math.floor((data.min_score || 40) / 10) * 10 - 5)
    const maxX = Math.min(100, Math.ceil((data.max_score || 95) / 10) * 10 + 5)

    const layout = {
      height: 340,
      margin: { l: 50, r: 24, t: 24, b: 55 },
      xaxis: {
        title: {
          text: 'NIRF Overall Score (0–100)',
          font: { size: 11, color: '#64748b', family: 'Inter, sans-serif' },
        },
        range: [minX, maxX],
        dtick: 10,
        gridcolor: '#f1f5f9',
        tickfont: { size: 10, color: '#64748b' },
      },
      yaxis: {
        title: {
          text: 'Number of Institutions',
          font: { size: 11, color: '#64748b', family: 'Inter, sans-serif' },
        },
        gridcolor: '#f1f5f9',
        tickfont: { size: 10, color: '#64748b' },
      },
      bargap: 0.12,
    }

    return { data: [trace], layout }
  }, [data])

  return (
    <div className="nirf-card score-dist-card">
      {/* Header */}
      <div className="nirf-card-header">
        <div>
          <div className="nirf-card-title">
            <BarChart3 size={18} style={{ color: '#2563eb' }} />
            <span>Score Distribution</span>
          </div>
          <div className="nirf-card-subtitle" style={{ marginTop: 2 }}>
            Overall score spread across {category}
          </div>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{year}</span>
      </div>

      {/* Chart Canvas */}
      <div style={{ flex: 1, minHeight: 300, position: 'relative', padding: '12px 16px' }}>
        {loading ? (
          <Loading message="Computing score distribution..." />
        ) : !data || !data.has_scores ? (
          <div
            style={{
              height: '100%',
              minHeight: 280,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              textAlign: 'center',
              backgroundColor: '#fafbfc',
              borderRadius: 8,
              border: '1px dashed #e2e8f0',
              gap: 8,
            }}
          >
            <Info size={24} style={{ color: '#94a3b8' }} />
            <h4 style={{ fontSize: '0.94rem', color: '#334155' }}>
              Scores Not Published
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: 300 }}>
              The <strong>{category}</strong> category publishes institutional ranks without numeric composite scores.
            </p>
          </div>
        ) : (
          chartConfig && (
            <ChartContainer
              data={chartConfig.data}
              layout={chartConfig.layout}
              style={{ minHeight: 300 }}
            />
          )
        )}
      </div>

      {/* Summary Stats Ribbon */}
      {data && data.has_scores && (
        <div className="score-stats-ribbon">
          <div className="score-stat-item">
            <span className="score-stat-label">Mean</span>
            <span className="score-stat-val">{data.mean_score?.toFixed(2)}</span>
          </div>
          <div className="score-stat-item">
            <span className="score-stat-label">Median</span>
            <span className="score-stat-val">{data.median_score?.toFixed(2)}</span>
          </div>
          <div className="score-stat-item">
            <span className="score-stat-label">Min</span>
            <span className="score-stat-val">{data.min_score?.toFixed(2)}</span>
          </div>
          <div className="score-stat-item">
            <span className="score-stat-label">Max</span>
            <span className="score-stat-val">{data.max_score?.toFixed(2)}</span>
          </div>
          <div className="score-stat-item">
            <span className="score-stat-label">Std Dev</span>
            <span className="score-stat-val">±{data.std_score?.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScoreDistribution

