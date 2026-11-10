/**
 * NIRF Analytics Dashboard — Geospatial Sub-Navigation Tabs.
 *
 * Implements horizontal pill tab selector for Questions Q2.1 through Q2.5.
 */

import React from 'react'
import {
  ArrowUpRight,
  Building2,
  GitCompare,
  Globe,
  MapPin,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

export const GEOSPATIAL_TABS = [
  {
    id: 'top-states',
    code: 'Q2.1',
    label: 'Q2.1 Top States',
    title: 'Top States',
    description: 'State-wise institutional concentration and representation hubs.',
    icon: Building2,
  },
  {
    id: 'distribution',
    code: 'Q2.2',
    label: 'Q2.2 Distribution Trend',
    title: 'Distribution Trend',
    description: 'Longitudinal shift in geographical distribution across editions (2017–2025).',
    icon: Globe,
  },
  {
    id: 'state-growth',
    code: 'Q2.3',
    label: 'Q2.3 State Growth',
    title: 'State Growth',
    description: 'States achieving the greatest increase in top tier representation.',
    icon: TrendingUp,
  },
  {
    id: 'compare-states',
    code: 'Q2.4',
    label: 'Q2.4 Compare States',
    title: 'Compare States',
    description: 'Direct comparative profiling between two states (e.g. Karnataka vs Tamil Nadu).',
    icon: GitCompare,
  },
  {
    id: 'newly-appearing',
    code: 'Q2.5',
    label: 'Q2.5 Newly Appearing',
    title: 'Newly Appearing',
    description: 'States originating new inaugural institutions entering the NIRF rankings.',
    icon: Sparkles,
  },
]

export function GeospatialTabs({ activeTab, onChange }) {
  return (
    <div className="analytics-tabs-container">
      <div className="analytics-tabs-list" role="tablist">
        {GEOSPATIAL_TABS.map((tab) => {
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

export default GeospatialTabs

