/**
 * NIRF Analytics Dashboard — Univariate Sub-Navigation Tabs.
 *
 * Implements horizontal pill tab selector for Questions Q3.1 through Q3.5.
 */

import React from 'react'
import {
  BarChart2,
  BoxSelect,
  Hash,
  PieChart,
  Sigma,
} from 'lucide-react'

export const UNIVARIATE_TABS = [
  {
    id: 'score-dist',
    code: 'Q3.1',
    label: 'Q3.1 Score Distribution',
    title: 'Score Distribution',
    description: 'Histogram, bin frequencies, and percentage shares for composite scores.',
    icon: BarChart2,
  },
  {
    id: 'rank-dist',
    code: 'Q3.2',
    label: 'Q3.2 Rank Distribution',
    title: 'Rank Distribution',
    description: 'Frequency across rank brackets with separate exact and rank-band handling.',
    icon: Hash,
  },
  {
    id: 'descriptive-stats',
    code: 'Q3.3',
    label: 'Q3.3 Descriptive Statistics',
    title: 'Descriptive Statistics',
    description: 'Mean, median, min, max, std dev, variance, and IQR across all parameters.',
    icon: Sigma,
  },
  {
    id: 'score-quartiles',
    code: 'Q3.4',
    label: 'Q3.4 Score Quartiles',
    title: 'Score Quartiles',
    description: 'Institutions segmented by statistical quartiles (Q1, Q2, Q3, Q4).',
    icon: PieChart,
  },
  {
    id: 'category-spread',
    code: 'Q3.5',
    label: 'Q3.5 Category Spread',
    title: 'Category Spread',
    description: 'Cross-category comparative box plots, median comparisons, and IQR spreads.',
    icon: BoxSelect,
  },
]

export function UnivariateTabs({ activeTab, onChange }) {
  return (
    <div className="analytics-tabs-container">
      <div className="analytics-tabs-list" role="tablist">
        {UNIVARIATE_TABS.map((tab) => {
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

export default UnivariateTabs

