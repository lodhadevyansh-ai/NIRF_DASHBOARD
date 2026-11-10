/**
 * NIRF Analytics Dashboard — Dynamic Filter Panel Component.
 *
 * Provides faceted multi-dimensional dataset slicing:
 * - Category, Year, State, Institution Search, Rank Range, Score Range
 * - Reset and Apply actions
 */

import React from 'react'
import { Filter, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'

export function DynamicFilterPanel({
  filters,
  onChange,
  onApply,
  onReset,
  schema = null,
  loading = false,
  recordsCount = null,
}) {
  const categories = schema?.categories || ['Overall']
  const years = schema?.years || [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
  const states = schema?.states || []

  const handleChange = (key, val) => {
    onChange({ ...filters, [key]: val })
  }

  return (
    <div
      className="nirf-card"
      style={{
        padding: '18px 20px',
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--gov-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Panel Header (Original Structure) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SlidersHorizontal size={17} style={{ color: 'var(--gov-navy-primary)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--gov-text-main)', margin: 0 }}>
            Dataset Slicers & Cohort Filters
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {recordsCount !== null && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--gov-navy-primary)',
                backgroundColor: 'var(--gov-blue-subtle)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--gov-border)',
              }}
            >
              {recordsCount.toLocaleString()} Matching Records
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.78rem',
              color: 'var(--gov-text-secondary)',
              backgroundColor: '#ffffff',
              border: '1px solid var(--gov-border)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={12} />
            <span>Reset filters</span>
          </button>
        </div>
      </div>

      {/* Faceted Filters Grid (Original Structure) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {/* Category */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            Discipline Category
          </label>
          <select
            value={filters.category || 'Overall'}
            onChange={(e) => handleChange('category', e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--gov-border)',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: 'var(--gov-text-main)',
              outline: 'none',
            }}
          >
            <option value="All">All Disciplines</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            Ranking Year
          </label>
          <select
            value={filters.year ?? 'All'}
            onChange={(e) => handleChange('year', e.target.value === 'All' ? null : Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--gov-border)',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: 'var(--gov-text-main)',
              outline: 'none',
            }}
          >
            <option value="All">All Years (2017–2025)</option>
            {[...years].reverse().map((y) => (
              <option key={y} value={y}>
                {y} Edition
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            State / UT
          </label>
          <select
            value={filters.state || 'All'}
            onChange={(e) => handleChange('state', e.target.value === 'All' ? null : e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--gov-border)',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: 'var(--gov-text-main)',
              outline: 'none',
            }}
          >
            <option value="All">All States & UTs</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Institution Search */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            Institution / City Search
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: 8, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="e.g. Madras, Delhi, NIT..."
              value={filters.institution_query || ''}
              onChange={(e) => handleChange('institution_query', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 28px',
                borderRadius: 6,
                border: '1px solid var(--gov-border)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Rank Range */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            Rank Range (Min – Max)
          </label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              placeholder="1"
              value={filters.rank_min ?? ''}
              onChange={(e) => handleChange('rank_min', e.target.value ? Number(e.target.value) : null)}
              style={{
                width: '50%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--gov-border)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>–</span>
            <input
              type="number"
              placeholder="100"
              value={filters.rank_max ?? ''}
              onChange={(e) => handleChange('rank_max', e.target.value ? Number(e.target.value) : null)}
              style={{
                width: '50%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--gov-border)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Score Range */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            Score Range (Min – Max)
          </label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              placeholder="30"
              value={filters.score_min ?? ''}
              onChange={(e) => handleChange('score_min', e.target.value ? Number(e.target.value) : null)}
              style={{
                width: '50%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--gov-border)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>–</span>
            <input
              type="number"
              placeholder="100"
              value={filters.score_max ?? ''}
              onChange={(e) => handleChange('score_max', e.target.value ? Number(e.target.value) : null)}
              style={{
                width: '50%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--gov-border)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Apply Filters Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <button
          type="button"
          onClick={onApply}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 18px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--gov-navy-primary)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 1px 2px rgba(18, 59, 101, 0.15)',
          }}
        >
          <Filter size={14} />
          <span>{loading ? 'Querying Cohort...' : 'Apply Filters'}</span>
        </button>
      </div>
    </div>
  )
}

export default DynamicFilterPanel

