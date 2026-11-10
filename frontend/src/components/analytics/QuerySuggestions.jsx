/**
 * NIRF Analytics Dashboard — Query Suggestions Component.
 *
 * Provides organized, clickable example inquiries categorized by analytical theme.
 */

import React from 'react'
import { Sparkles, TrendingUp, MapPin, BarChart2, GitCompare, Activity } from 'lucide-react'

const SUGGESTIONS = [
  {
    theme: 'Rankings & Leadership',
    icon: BarChart2,
    queries: [
      'Show the top 10 institutions in Overall category in 2025.',
      'Which state has the highest number of Engineering institutions in 2025?',
      'What is the rank of IIIT Hyderabad in 2025?',
    ],
  },
  {
    theme: 'Trends & Longitudinal Trajectories',
    icon: TrendingUp,
    queries: [
      'How has IIT Madras performed from 2017 to 2025?',
      'How has IIIT Bangalore performed over the last 8 years?',
      'Which institutions improved their rankings the most?',
    ],
  },
  {
    theme: 'Comparisons & Parameters',
    icon: GitCompare,
    queries: [
      'Compare Karnataka and Tamil Nadu in 2025.',
      'Compare IIT Madras and IIT Bombay across parameters.',
      'Which parameter has the strongest correlation with overall score?',
    ],
  },
  {
    theme: 'Methodology & Educational Intelligence',
    icon: Sparkles,
    queries: [
      'What does TLR mean in NIRF methodology?',
      'Explain the RPC parameter and how citations are scored.',
      'Show institutions with high research scores but low teaching scores.',
    ],
  },
]

export function QuerySuggestions({ onSelectQuery }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>
        <Sparkles size={15} style={{ color: '#2563eb' }} />
        <span>Try asking questions like these:</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {SUGGESTIONS.map((group, gIdx) => {
          const Icon = group.icon
          return (
            <div
              key={gIdx}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                <Icon size={14} style={{ color: '#2563eb' }} />
                <span>{group.theme}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.queries.map((q, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => onSelectQuery(q)}
                    style={{
                      textAlign: 'left',
                      padding: '7px 10px',
                      borderRadius: 6,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#1e293b',
                      fontSize: '0.78rem',
                      lineHeight: '1.35',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff'
                      e.currentTarget.style.borderColor = '#bfdbfe'
                      e.currentTarget.style.color = '#1d4ed8'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.color = '#1e293b'
                    }}
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default QuerySuggestions

