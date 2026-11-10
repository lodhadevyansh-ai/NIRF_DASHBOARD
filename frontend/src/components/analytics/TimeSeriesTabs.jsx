/**
 * NIRF Analytics Dashboard — Time-Series Sub-Navigation Tabs.
 *
 * Implements the horizontal tab selector for Questions Q1.1 through Q1.5
 * styled with the design system (pill badges, active blue highlight).
 */

import React from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  LineChart,
  TrendingUp,
} from 'lucide-react'

export const TIME_SERIES_TABS = [
  {
    id: 'trajectory',
    code: 'Q1.1',
    title: 'Trajectory',
    label: 'Q1.1 Trajectory',
    description: 'Longitudinal rank and score movement for individual institutions (2017–2025).',
    icon: TrendingUp,
  },
  {
    id: 'improvements',
    code: 'Q1.2',
    title: 'Improvements',
    label: 'Q1.2 Improvements',
    description: 'Institutions achieving the largest positive rank advancement between two editions.',
    icon: ArrowUpRight,
  },
  {
    id: 'declines',
    code: 'Q1.3',
    title: 'Declines',
    label: 'Q1.3 Declines',
    description: 'Institutions experiencing the largest rank drops across selected years.',
    icon: ArrowDownRight,
  },
  {
    id: 'average-trend',
    code: 'Q1.4',
    title: 'Average Score Trend',
    label: 'Q1.4 Average Score Trend',
    description: 'Macro score trajectories, cohort averages, median thresholds, and dispersion.',
    icon: LineChart,
  },
  {
    id: 'consistent-top',
    code: 'Q1.5',
    title: 'Consistent Top',
    label: 'Q1.5 Consistent Top',
    description: 'Institutions maintaining persistent appearances in top ranking tiers.',
    icon: Award,
  },
]

export function TimeSeriesTabs({ activeTab, onChange }) {
  return (
    <div className="analytics-tabs-container">
      <div className="analytics-tabs-list" role="tablist">
        {TIME_SERIES_TABS.map((tab) => {
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

export default TimeSeriesTabs

