/**
 * NIRF Analytics Dashboard — Transitions Sub-Navigation Tabs.
 *
 * Implements horizontal pill tab selector for Questions Q7.1 through Q7.5:
 * - Q7.1 Rank Band Movement & Sankey Flow (51–100 into Top 50, Between Bands)
 * - Q7.2 Top 10 Entries and Exits (Turnover, New Entrants, Stability Rate)
 * - Q7.3 Rank Band Retention & Markov Transition Matrix
 * - Q7.4 Largest Movements (Top Climbers & Fallers)
 * - Q7.5 Institutional Mobility Over Time (Up, Down, Retained Annual Shares)
 */

import React from 'react'
import {
  ArrowLeftRight,
  ArrowUpRight,
  Award,
  Grid,
  History,
} from 'lucide-react'

export const TRANSITION_TABS = [
  {
    id: 'band-movement',
    code: 'Q7.1',
    label: 'Q7.1 Rank Band Movement',
    title: 'Rank Band Movement & Sankey Flow',
    description: 'Track institutional flow across bands and into Top 50.',
    icon: ArrowLeftRight,
  },
  {
    id: 'top10-entry-exit',
    code: 'Q7.2',
    label: 'Q7.2 Top 10 Turnover',
    title: 'Top 10 Entries and Exits',
    description: 'Track new entrants, exits, and stability in the premier tier.',
    icon: Award,
  },
  {
    id: 'band-retention',
    code: 'Q7.3',
    label: 'Q7.3 Band Retention & Matrix',
    title: 'Rank Band Retention & Markov Matrix',
    description: 'Retention shares and full cross-band Markov transition matrix.',
    icon: Grid,
  },
  {
    id: 'largest-movements',
    code: 'Q7.4',
    label: 'Q7.4 Largest Climbers & Fallers',
    title: 'Largest Rank Movements',
    description: 'Institutions with highest positive and negative rank deltas.',
    icon: ArrowUpRight,
  },
  {
    id: 'mobility-history',
    code: 'Q7.5',
    label: 'Q7.5 Mobility Over Time',
    title: 'Institutional Mobility Annual History',
    description: 'Annual shares of upward, downward, and unchanged institutions.',
    icon: History,
  },
]

export function TransitionTabs({ activeTab, onChange }) {
  return (
    <div className="analytics-tabs-container">
      <div className="analytics-tabs-list" role="tablist">
        {TRANSITION_TABS.map((tab) => {
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

export default TransitionTabs

