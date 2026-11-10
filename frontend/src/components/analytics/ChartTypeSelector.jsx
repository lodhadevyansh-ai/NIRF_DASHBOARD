/**
 * NIRF Analytics Dashboard — Chart Type Selector Component.
 *
 * Supports selection across all 14 visualization types:
 * 1. Bar, 2. Grouped Bar, 3. Stacked Bar, 4. Line, 5. Scatter, 6. Histogram,
 * 7. Box, 8. Violin, 9. Heatmap, 10. Correlation Heatmap, 11. Radar,
 * 12. Pie, 13. Area, 14. Parallel Coordinates.
 */

import React from 'react'
import {
  BarChart2,
  BarChart3,
  TrendingUp,
  CircleDot as ScatterIcon,
  PieChart as PieIcon,
  Activity,
  Layers,
  Grid,
  GitBranch,
  Sparkles,
} from 'lucide-react'

const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart', icon: BarChart2, category: 'Comparison' },
  { id: 'grouped_bar', label: 'Grouped Bar', icon: BarChart3, category: 'Comparison' },
  { id: 'stacked_bar', label: 'Stacked Bar', icon: Layers, category: 'Composition' },
  { id: 'line', label: 'Line Chart', icon: TrendingUp, category: 'Trend' },
  { id: 'scatter', label: 'Scatter Plot', icon: Activity, category: 'Correlation' },
  { id: 'histogram', label: 'Histogram', icon: BarChart2, category: 'Distribution' },
  { id: 'box', label: 'Box Plot', icon: Activity, category: 'Distribution' },
  { id: 'violin', label: 'Violin Plot', icon: Activity, category: 'Distribution' },
  { id: 'heatmap', label: 'Heatmap Matrix', icon: Grid, category: 'Density' },
  { id: 'correlation_heatmap', label: 'Corr Heatmap', icon: Grid, category: 'Correlation' },
  { id: 'radar', label: 'Radar Chart', icon: Activity, category: 'Multivariate' },
  { id: 'pie', label: 'Pie / Donut', icon: PieIcon, category: 'Composition' },
  { id: 'area', label: 'Area Chart', icon: TrendingUp, category: 'Trend' },
  { id: 'parallel_coordinates', label: 'Parallel Coords', icon: GitBranch, category: 'Multivariate' },
]

export function ChartTypeSelector({ selectedChartType, onSelectChartType, recommendedType = null }) {
  return (
    <div className="nirf-card" style={{ padding: '16px 20px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--gov-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--gov-text-primary)', margin: 0 }}>
          Visualization Format (14 Chart Types)
        </h3>
        <span style={{ fontSize: '0.76rem', color: 'var(--gov-text-secondary)' }}>
          Select or use recommended configuration
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 8,
        }}
      >
        {CHART_TYPES.map((chart) => {
          const isSelected = selectedChartType === chart.id
          const isRecommended = recommendedType === chart.id
          const IconComponent = chart.icon

          return (
            <button
              key={chart.id}
              type="button"
              onClick={() => onSelectChartType(chart.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '10px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isSelected ? 'var(--gov-blue-subtle)' : '#ffffff',
                border: isSelected ? '1.5px solid var(--gov-navy-primary)' : '1px solid var(--gov-border)',
                color: isSelected ? 'var(--gov-navy-primary)' : 'var(--gov-text-primary)',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 1px 3px rgba(18, 59, 101, 0.15)' : 'none',
              }}
              title={chart.label}
            >
              {isRecommended && (
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    right: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: '#16a34a',
                    backgroundColor: '#dcfce7',
                    padding: '1px 4px',
                    borderRadius: 3,
                  }}
                  title="Recommended based on selected variables"
                >
                  <Sparkles size={9} />
                  <span>Rec</span>
                </span>
              )}
              <IconComponent size={18} style={{ color: isSelected ? '#2563eb' : '#64748b' }} />
              <span style={{ fontSize: '0.74rem', fontWeight: isSelected ? 700 : 500, textAlign: 'center' }}>
                {chart.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ChartTypeSelector
