/**
 * NIRF Analytics Dashboard — Statistics Sub-Navigation Tabs.
 *
 * Implements horizontal pill tab selector for Questions Q6.1 through Q6.5:
 * - Q6.1 Top 10 vs Remaining (Score Distribution & Box/Violin Comparison)
 * - Q6.2 Score Dispersion (Variance, Std Dev, IQR & CV across Editions)
 * - Q6.3 Parameter Variability (Relative Dispersion Ranking by CV)
 * - Q6.4 Median & IQR Trend (Longitudinal Band Analysis)
 * - Q6.5 State Score Distribution (State-Wise Box & Violin Plots)
 */

import React from 'react'
import {
  Activity,
  Award,
  Layers,
  MapPin,
  TrendingUp,
} from 'lucide-react'

export const STATISTICS_TABS = [
  {
    id: 'top10-comparison',
    code: 'Q6.1',
    label: 'Q6.1 Top 10 vs Remaining',
    title: 'Top 10 vs Remaining Score Distribution',
    description: 'Score distribution contrast between premier top 10 and the remaining cohort.',
    icon: Award,
  },
  {
    id: 'score-dispersion',
    code: 'Q6.2',
    label: 'Q6.2 Score Dispersion',
    title: 'Yearly Score Dispersion',
    description: 'Longitudinal variance, standard deviation, IQR, and relative spread.',
    icon: Activity,
  },
  {
    id: 'parameter-variability',
    code: 'Q6.3',
    label: 'Q6.3 Parameter Variability',
    title: 'Parameter Variability Ranking',
    description: 'Coefficient of Variation and standard deviation across ranking pillars.',
    icon: Layers,
  },
  {
    id: 'median-iqr-trend',
    code: 'Q6.4',
    label: 'Q6.4 Median & IQR Trend',
    title: 'Median & IQR Longitudinal Trend',
    description: 'Central tendency and interquartile dispersion bands over time.',
    icon: TrendingUp,
  },
  {
    id: 'state-distribution',
    code: 'Q6.5',
    label: 'Q6.5 State Distribution',
    title: 'State-Wise Score Distribution',
    description: 'Geographic box and violin distribution comparison across Indian states.',
    icon: MapPin,
  },
]

export function StatisticsTabs({ activeTab, onChange }) {
  return (
    <div className="analytics-tabs-container">
      <div className="analytics-tabs-list" role="tablist">
        {STATISTICS_TABS.map((tab) => {
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

export default StatisticsTabs

