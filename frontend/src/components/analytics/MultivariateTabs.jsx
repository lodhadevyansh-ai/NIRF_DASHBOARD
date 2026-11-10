/**
 * NIRF Analytics Dashboard — Multivariate Sub-Navigation Tabs.
 *
 * Implements horizontal pill tab selector for Questions Q5.1 through Q5.5:
 * - Q5.1 Top Five Comparison (Radar & Grouped Bar Profiles)
 * - Q5.2 High Research, Low Teaching (RPC vs TLR Discrepancy)
 * - Q5.3 High Teaching, Low Perception (TLR vs PR Brand Lag)
 * - Q5.4 Score Improvement Despite Parameter Decline (Longitudinal Divergence)
 * - Q5.5 Parameter Gap (Institutional Dispersion & Extreme Imbalances)
 */

import React from 'react'
import {
  Award,
  BookOpen,
  Eye,
  Maximize2,
  TrendingUp,
} from 'lucide-react'

export const MULTIVARIATE_TABS = [
  {
    id: 'top-five',
    code: 'Q5.1',
    label: 'Q5.1 Top Five Profiles',
    title: 'Top Five Institutions Comparison',
    description: 'Radar and grouped-bar parametric benchmarking of the premier five institutions.',
    icon: Award,
  },
  {
    id: 'research-teaching',
    code: 'Q5.2',
    label: 'Q5.2 High Research, Low Teaching',
    title: 'High Research, Low Teaching Discrepancy',
    description: 'Identifies institutions where research output significantly outpaces teaching resources.',
    icon: BookOpen,
  },
  {
    id: 'teaching-perception',
    code: 'Q5.3',
    label: 'Q5.3 High Teaching, Low Perception',
    title: 'High Teaching, Low Perception Discrepancy',
    description: 'Pinpoints institutions excelling in instructional resources but constrained by reputation.',
    icon: Eye,
  },
  {
    id: 'score-improvement',
    code: 'Q5.4',
    label: 'Q5.4 Paradoxical Improvement',
    title: 'Score Improvement Despite Parameter Decline',
    description: 'Longitudinal analysis of composite score gains accompanied by component regressions.',
    icon: TrendingUp,
  },
  {
    id: 'parameter-gap',
    code: 'Q5.5',
    label: 'Q5.5 Parameter Gap & Dispersion',
    title: 'Institutional Parameter Spread & Gap',
    description: 'Calculates the disparity spread between highest and lowest parameter scores.',
    icon: Maximize2,
  },
]

export function MultivariateTabs({ activeTab, onChange }) {
  return (
    <div className="analytics-tabs-container">
      <div className="analytics-tabs-list" role="tablist">
        {MULTIVARIATE_TABS.map((tab) => {
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

export default MultivariateTabs

