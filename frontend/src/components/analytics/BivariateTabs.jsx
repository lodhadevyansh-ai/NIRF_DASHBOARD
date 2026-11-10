/**
 * NIRF Analytics Dashboard — Bivariate Sub-Navigation Tabs.
 *
 * Implements horizontal pill tab selector for Questions Q4.1 through Q4.5
 * plus the general-purpose Select Two Variables interface.
 */

import React from 'react'
import {
  Activity,
  Award,
  BookOpen,
  Eye,
  History,
  SlidersHorizontal,
} from 'lucide-react'

export const BIVARIATE_TABS = [
  {
    id: 'rpc-overall',
    code: 'Q4.1',
    label: 'Q4.1 RPC vs Overall',
    title: 'RPC vs Overall Score',
    description: 'Research output versus composite institutional scores.',
    icon: Activity,
  },
  {
    id: 'pr-overall',
    code: 'Q4.2',
    label: 'Q4.2 PR vs Overall',
    title: 'PR vs Overall Score',
    description: 'Perception weight versus composite rank performance.',
    icon: Eye,
  },
  {
    id: 'strongest-corr',
    code: 'Q4.3',
    label: 'Q4.3 Strongest Correlation',
    title: 'Strongest Correlation',
    description: 'Ranking parameters by correlation strength and full correlation matrix.',
    icon: Award,
  },
  {
    id: 'tlr-rpc',
    code: 'Q4.4',
    label: 'Q4.4 TLR vs RPC',
    title: 'TLR vs RPC',
    description: 'Teaching resources versus research performance quadrants.',
    icon: BookOpen,
  },
  {
    id: 'historical-corr',
    code: 'Q4.5',
    label: 'Q4.5 Historical Correlation',
    title: 'Historical Correlation',
    description: 'Longitudinal stability of research impact from 2017 to 2025.',
    icon: History,
  },
  {
    id: 'custom-variables',
    code: 'Custom',
    label: 'Select Two Variables',
    title: 'Custom Bivariate',
    description: 'Interactive pair-wise exploration of any two numerical metrics.',
    icon: SlidersHorizontal,
  },
]

export function BivariateTabs({ activeTab, onChange }) {
  return (
    <div className="analytics-tabs-container">
      <div className="analytics-tabs-list" role="tablist">
        {BIVARIATE_TABS.map((tab) => {
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

export default BivariateTabs

