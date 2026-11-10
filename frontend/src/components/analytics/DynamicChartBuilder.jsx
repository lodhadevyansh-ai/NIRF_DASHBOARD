/**
 * NIRF Analytics Dashboard — Dynamic Chart Builder Component.
 *
 * Coordinates:
 * - Variable selection
 * - 14 Chart types
 * - Aggregation function, entity limits, and sort directions
 * - Primary "Generate Visualization" trigger
 */

import React from 'react'
import { Play, Sliders, ArrowUpDown, Hash } from 'lucide-react'
import VariableSelector from './VariableSelector'
import ChartTypeSelector from './ChartTypeSelector'

export function DynamicChartBuilder({
  schema,
  queryConfig,
  onConfigChange,
  onGenerate,
  onRecommend,
  recommendation,
  loading = false,
  loadingRecommend = false,
}) {
  const handleVariableChange = (field, val) => {
    onConfigChange({
      ...queryConfig,
      [field]: val,
    })
  }

  const handleChartTypeChange = (chartType) => {
    onConfigChange({
      ...queryConfig,
      chartType,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1. Variable Mapping */}
      <VariableSelector
        variables={schema?.variables || []}
        xVariable={queryConfig.xVariable}
        yVariable={queryConfig.yVariable}
        groupVariable={queryConfig.groupVariable}
        colorVariable={queryConfig.colorVariable}
        sizeVariable={queryConfig.sizeVariable}
        analysisPurpose={queryConfig.analysisPurpose}
        onVariableChange={handleVariableChange}
        onRecommend={onRecommend}
        recommendation={recommendation}
        loadingRecommend={loadingRecommend}
      />

      {/* 2. Chart Type Picker */}
      <ChartTypeSelector
        selectedChartType={queryConfig.chartType}
        onSelectChartType={handleChartTypeChange}
        recommendedType={recommendation?.chart_type}
      />

      {/* 3. Computation Controls & Generate Trigger */}
      <div className="nirf-card" style={{ padding: '14px 20px', backgroundColor: '#ffffff', borderRadius: 8 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            {/* Aggregation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>
                Aggregation:
              </span>
              <select
                value={queryConfig.aggregation || 'mean'}
                onChange={(e) => onConfigChange({ ...queryConfig, aggregation: e.target.value })}
                style={{
                  padding: '5px 8px',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="mean">Mean (Average)</option>
                <option value="median">Median</option>
                <option value="sum">Sum</option>
                <option value="count">Count</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </select>
            </div>

            {/* Sort Order */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowUpDown size={13} style={{ color: '#64748b' }} />
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>
                Sorting:
              </span>
              <select
                value={queryConfig.sortBy || 'y_desc'}
                onChange={(e) => onConfigChange({ ...queryConfig, sortBy: e.target.value })}
                style={{
                  padding: '5px 8px',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="y_desc">Metric Descending (Highest First)</option>
                <option value="y_asc">Metric Ascending (Lowest First)</option>
                <option value="x_asc">Category / X (A to Z)</option>
                <option value="x_desc">Category / X (Z to A)</option>
              </select>
            </div>

            {/* Limit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Hash size={13} style={{ color: '#64748b' }} />
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>
                Limit:
              </span>
              <select
                value={queryConfig.limit || 50}
                onChange={(e) => onConfigChange({ ...queryConfig, limit: Number(e.target.value) })}
                style={{
                  padding: '5px 8px',
                  borderRadius: 5,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
                <option value={200}>Top 200</option>
              </select>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 20px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--gov-navy-primary)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 1px 3px rgba(18, 59, 101, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <Play size={14} fill="#ffffff" />
            <span>{loading ? 'Building Visualization...' : 'Generate Visualization'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DynamicChartBuilder

