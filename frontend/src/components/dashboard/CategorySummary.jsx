/**
 * NIRF Analytics Dashboard — Additional Insights & Category Summary.
 *
 * Implements:
 * - State representation distribution
 * - Parameter leaders (highest performers in TLR, RPC, GO, OI, PR)
 * - Longitudinal discipline record counts (2017–2025)
 */

import React from 'react'
import {
  Compass,
  MapPin,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import Loading from '../common/Loading'

const PARAMETER_NAMES = {
  tlr_score: 'Teaching & Resources (TLR)',
  rpc_score: 'Research & Practice (RPC)',
  go_score: 'Graduation Outcomes (GO)',
  oi_score: 'Outreach & Inclusivity (OI)',
  pr_score: 'Perception (PR)',
  qnr_score: 'Quantitative Research (QNR)',
  qlr_score: 'Quality of Pubs (QLR)',
  sfc_score: 'Faculty Capacity (SFC)',
}

export function CategorySummary({
  insights,
  category = 'Overall',
  year = 2025,
  loading = false,
}) {
  if (loading || !insights) {
    return <Loading message="Loading cohort intelligence..." />
  }

  const { top_states = [], parameter_leaders = {}, year_counts = {} } = insights

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Compass size={18} style={{ color: '#2563eb' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
          Cohort Macro Intelligence & Benchmarks
        </h3>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}
      >
        {/* Card 1: Top State Representation */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <MapPin size={16} style={{ color: '#10b981' }} />
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
              State Footprint & Concentration
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {top_states.length > 0 ? (
              top_states.map((st) => (
                <div key={st.state} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{st.state}</span>
                    <span style={{ color: '#64748b' }}>
                      {st.count} insts ({st.percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 6,
                      backgroundColor: '#f1f5f9',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, st.percentage * 2.5)}%`,
                        height: '100%',
                        backgroundColor: '#2563eb',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>No state records available.</p>
            )}
          </div>
        </div>

        {/* Card 2: Parameter Leaders */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkles size={16} style={{ color: '#f59e0b' }} />
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
              Parameter Champions ({category})
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.keys(parameter_leaders).length > 0 ? (
              Object.entries(parameter_leaders).slice(0, 5).map(([paramKey, leader]) => (
                <div
                  key={paramKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 6,
                    backgroundColor: '#fafbfc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: 8 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      {PARAMETER_NAMES[paramKey] || paramKey}
                    </span>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={leader.institution_name}
                    >
                      {leader.institution_name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: '#2563eb',
                      flexShrink: 0,
                    }}
                  >
                    {leader.score?.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Parameter scores not published for this category.
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Longitudinal Discipline Trend */}
        <div className="nirf-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={16} style={{ color: '#8b5cf6' }} />
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
              Historical Edition Availability
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Ranked institutional cohort count per edition for <strong>{category}</strong>:
            </span>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {Object.entries(year_counts).map(([yr, count]) => {
                const isCurrent = Number(yr) === Number(year)
                return (
                  <div
                    key={yr}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: `1px solid ${isCurrent ? '#bfdbfe' : '#e2e8f0'}`,
                      backgroundColor: isCurrent ? '#eff6ff' : '#ffffff',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#2563eb' : '#64748b' }}>
                      {yr}
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isCurrent ? '#1d4ed8' : '#0f172a' }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategorySummary

