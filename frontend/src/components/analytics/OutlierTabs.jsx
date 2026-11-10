/**
 * NIRF Analytics Dashboard — Outlier Sub-Navigation Tabs.
 *
 * Implements horizontal pill tab selector for Questions Q8.1 through Q8.5:
 * - Q8.1 Research Outliers (Residual analysis relative to Overall Score)
 * - Q8.2 Research vs Teaching Gap (RPC vs TLR Divergence & relative gap outliers)
 * - Q8.3 Year-to-Year Score Change Outliers (Longitudinal Jump & Drop Anomalies)
 * - Q8.4 Strong Parameter, Poor Overall Rank (Pillar Excellence vs Overall Rank)
 * - Q8.5 Ranking Volatility (Multi-Year Rank Std Dev & Mean Absolute Shifts)
 */

import React from 'react'
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Target,
} from 'lucide-react'

export const OUTLIER_TABS = [
  {
    id: 'research-outliers',
    code: 'Q8.1',
    label: 'Q8.1 Research Outliers',
    title: 'Research Outliers Relative to Overall Score',
    description: 'Detect institutions with anomalous RPC scores relative to composite standing.',
    icon: Sparkles,
  },
  {
    id: 'research-teaching-gap',
    code: 'Q8.2',
    label: 'Q8.2 Research vs Teaching Gap',
    title: 'Research vs Teaching Performance Gap',
    description: 'Unusual divergence where research output significantly exceeds teaching resources.',
    icon: BookOpen,
  },
  {
    id: 'score-change-outliers',
    code: 'Q8.3',
    label: 'Q8.3 Year-to-Year Anomalies',
    title: 'Year-to-Year Score Change Outliers',
    description: 'Unusually large longitudinal score jumps and drops between editions.',
    icon: AlertTriangle,
  },
  {
    id: 'strong-param-poor-rank',
    code: 'Q8.4',
    label: 'Q8.4 Strong Parameter, Poor Rank',
    title: 'Strong Parameter, Poor Overall Rank',
    description: 'Institutions with elite pillar achievement but lagging composite rankings.',
    icon: Target,
  },
  {
    id: 'ranking-volatility',
    code: 'Q8.5',
    label: 'Q8.5 Ranking Volatility',
    title: 'Multi-Year Ranking Volatility',
    description: 'Institutions with severe longitudinal rank fluctuation and instability.',
    icon: Activity,
  },
]

export function OutlierTabs({ activeTab, onChange }) {
  return (
    <div className="analytics-tabs-container">
      <div className="analytics-tabs-list" role="tablist">
        {OUTLIER_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`analytics-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              <Icon size={16} className="analytics-tab-icon" />
              <span className="analytics-tab-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OutlierTabs

