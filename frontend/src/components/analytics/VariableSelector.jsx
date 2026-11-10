/**
 * NIRF Analytics Dashboard — Variable Selector Component.
 *
 * Populates X, Y, Group, Color, and Size variable pickers from actual dataset schema.
 * Provides Analysis Purpose dropdown and automated "Recommend Chart" trigger.
 */

import React from 'react'
import { Sparkles, HelpCircle, Layers, Palette, Maximize2 } from 'lucide-react'

export function VariableSelector({
  variables = [],
  xVariable,
  yVariable,
  groupVariable,
  colorVariable,
  sizeVariable,
  analysisPurpose,
  onVariableChange,
  onRecommend,
  recommendation = null,
  loadingRecommend = false,
}) {
  const numericalVars = variables.filter((v) => v.data_type === 'numerical')
  const categoricalVars = variables.filter((v) => v.data_type === 'categorical')

  return (
    <div className="nirf-card" style={{ padding: '18px 20px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--gov-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={17} style={{ color: 'var(--gov-navy-primary)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--gov-text-primary)', margin: 0 }}>
            Variable & Dimension Mapping
          </h3>
        </div>

        {/* Recommend Chart Button */}
        <button
          type="button"
          onClick={onRecommend}
          disabled={loadingRecommend}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#e6f4ea',
            color: 'var(--gov-success)',
            border: '1px solid #ceead6',
            cursor: loadingRecommend ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Analyze selected variable data types and suggest the most effective chart type"
        >
          <Sparkles size={13} />
          <span>{loadingRecommend ? 'Recommending...' : 'Recommend Chart'}</span>
        </button>
      </div>

      {/* Recommendation Notification Banner */}
      {recommendation && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--gov-blue-subtle)',
            border: '1px solid var(--gov-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            marginBottom: 14,
            fontSize: '0.8rem',
            color: 'var(--gov-navy-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} style={{ color: 'var(--gov-navy-primary)', flexShrink: 0 }} />
            <span>
              <strong>Recommended Chart: {recommendation.name}</strong> — {recommendation.reason}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              backgroundColor: '#ffffff',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--gov-navy-primary)',
              border: '1px solid var(--gov-border)',
            }}
          >
            {Math.round(recommendation.confidence * 100)}% Match
          </span>
        </div>
      )}

      {/* Variable Dropdowns Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {/* X Variable (Primary) */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            <span>Primary Variable (X-Axis) *</span>
            <span style={{ fontSize: '0.7rem', color: '#dc2626' }}>Required</span>
          </label>
          <select
            value={xVariable || 'institution_name'}
            onChange={(e) => onVariableChange('xVariable', e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              outline: 'none',
              fontWeight: 500,
            }}
          >
            <optgroup label="Categorical Dimensions">
              {categoricalVars.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Numerical Metrics">
              {numericalVars.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Y Variable (Secondary / Metric) */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            <span>Metric Variable (Y-Axis)</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>(Optional)</span>
          </label>
          <select
            value={yVariable || 'overall_score'}
            onChange={(e) => onVariableChange('yVariable', e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              outline: 'none',
            }}
          >
            <option value="none">None / Record Frequency</option>
            <optgroup label="Numerical Metrics">
              {numericalVars.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Categorical Dimensions">
              {categoricalVars.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Group Variable */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            <Layers size={13} style={{ color: '#64748b' }} />
            <span>Grouping Variable</span>
          </label>
          <select
            value={groupVariable || 'none'}
            onChange={(e) => onVariableChange('groupVariable', e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              outline: 'none',
            }}
          >
            <option value="none">None (Single Series)</option>
            <option value="category">Category Discipline</option>
            <option value="year">Ranking Edition Year</option>
            <option value="state">State / UT</option>
          </select>
        </div>

        {/* Color Variable */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            <Palette size={13} style={{ color: '#64748b' }} />
            <span>Color Dimension</span>
          </label>
          <select
            value={colorVariable || 'none'}
            onChange={(e) => onVariableChange('colorVariable', e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              outline: 'none',
            }}
          >
            <option value="none">Default Uniform Color</option>
            <option value="state">State / UT</option>
            <option value="category">Category Discipline</option>
            <option value="overall_score">Overall Score (Continuous Gradient)</option>
            <option value="rpc_score">Research Score (Continuous Gradient)</option>
          </select>
        </div>

        {/* Size Variable (Bubble Size) */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            <Maximize2 size={13} style={{ color: '#64748b' }} />
            <span>Size Dimension (Bubbles)</span>
          </label>
          <select
            value={sizeVariable || 'none'}
            onChange={(e) => onVariableChange('sizeVariable', e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              outline: 'none',
            }}
          >
            <option value="none">Fixed Size</option>
            {numericalVars.map((v) => (
              <option key={v.name} value={v.name}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* Analysis Purpose */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            <HelpCircle size={13} style={{ color: '#2563eb' }} />
            <span>Analysis Goal / Purpose</span>
          </label>
          <select
            value={analysisPurpose || 'none'}
            onChange={(e) => onVariableChange('analysisPurpose', e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              outline: 'none',
            }}
          >
            <option value="none">Automatic Detection</option>
            <option value="trend">Trend & Trajectory over Time</option>
            <option value="correlation">Correlation & Parameter Relationships</option>
            <option value="distribution">Distribution, Spread & Modality</option>
            <option value="composition">Part-to-Whole Composition & Shares</option>
            <option value="multivariate">Multivariate 5-Pillar Profile</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default VariableSelector

