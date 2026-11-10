/**
 * NIRF Analytics Dashboard — Left Navigation Sidebar.
 *
 * Implements collapsible sidebar navigation matching reference screenshots.
 * Deep government navy styling (#0B2D50), crisp white active indicators,
 * clean line icons, and exact preservation of all 11 modules.
 */

import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Globe,
  GraduationCap,
  Layers,
  LayoutDashboard,
  MessageSquareQuote,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    title: 'Dashboard',
    items: [
      {
        path: '/',
        label: 'Overview',
        icon: LayoutDashboard,
        tooltip: 'Executive Overview & Macro KPIs',
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        path: '/analytics/time-series',
        label: 'Time-Series',
        icon: TrendingUp,
        tooltip: 'Longitudinal Trajectories & Trends (2017–2025)',
      },
      {
        path: '/analytics/geospatial',
        label: 'Geospatial',
        icon: Globe,
        tooltip: 'Regional State Representation & Growth Hubs',
      },
      {
        path: '/analytics/univariate',
        label: 'Univariate',
        icon: BarChart2,
        tooltip: 'Single-Parameter Distributions & Boxplots',
      },
      {
        path: '/analytics/bivariate',
        label: 'Bivariate & Corr',
        icon: GitBranch,
        tooltip: 'Correlation Heatmaps & Parameter Scatters',
      },
      {
        path: '/analytics/multivariate',
        label: 'Multivariate',
        icon: Layers,
        tooltip: '5-Parameter Radar Profiles & Trade-offs',
      },
      {
        path: '/analytics/statistics',
        label: 'Statistics',
        icon: Calculator,
        tooltip: 'Parametric Metrics & Percentile Distribution Tables',
      },
      {
        path: '/analytics/transitions',
        label: 'Transitions',
        icon: ArrowLeftRight,
        tooltip: 'Rank Volatility & Stability Transitions',
      },
      {
        path: '/analytics/outliers',
        label: 'Outliers & Gaps',
        icon: AlertTriangle,
        tooltip: 'Statistical Anomaly Detection & Score Gaps',
      },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      {
        path: '/intelligence/explorer',
        label: 'Dynamic Explorer',
        icon: Sparkles,
        tooltip: 'Interactive Multi-faceted Data Explorer',
      },
      {
        path: '/intelligence/ask-nirf',
        label: 'Ask NIRF Data',
        icon: MessageSquareQuote,
        tooltip: 'Natural Language Query Engine',
      },
    ],
  },
]

export function Sidebar({ collapsed, onToggleCollapse, isMobile, mobileOpen, onMobileClose }) {
  const handleNavClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <aside
      className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label="Sidebar Navigation"
    >
      {/* Sidebar Header Branding (IMAGE 2 Structure + IMAGE 1 Navy Styling) */}
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-brand" onClick={handleNavClick}>
          <div className="brand-icon-box" title="NIRF Analytics Platform">
            <GraduationCap size={20} />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-title">NIRF Analytics</span>
              <span className="brand-subtitle">Govt. of India • MoE</span>
            </div>
          )}
        </NavLink>

        {!isMobile && (
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="nav-section">
            {!collapsed && <div className="nav-section-title">{group.title}</div>}
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                  title={collapsed ? `${item.label} — ${item.tooltip}` : item.tooltip}
                >
                  <span className="nav-icon">
                    <Icon size={18} />
                  </span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* System Status Footer */}
      <div className="sidebar-footer">
        <div className="footer-status">
          <span className="status-dot" aria-hidden="true" />
          <span>NIRF 2017–2025</span>
        </div>
        {!collapsed && (
          <div className="footer-subtext">FastAPI Engine • React 19 Client</div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
