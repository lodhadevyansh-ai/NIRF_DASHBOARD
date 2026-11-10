/**
 * NIRF Analytics Dashboard — Main Layout Shell.
 *
 * Coordinates Sidebar, Header, Breadcrumbs, mobile backdrop, and page view Outlet.
 */

import React, { useEffect, useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import Header from './Header'
import Sidebar from './Sidebar'
import ErrorBoundary from '../common/ErrorBoundary'

const BREADCRUMB_MAP = {
  '/': 'Executive Overview',
  '/overview': 'Executive Overview',
  '/analytics/time-series': 'Time-Series & Trend Analysis',
  '/analytics/geospatial': 'Geospatial & State Analysis',
  '/analytics/univariate': 'Univariate Distribution Analysis',
  '/analytics/bivariate': 'Bivariate & Correlation Intelligence',
  '/analytics/multivariate': 'Multivariate Institutional Profiles',
  '/analytics/statistics': 'Statistical Summaries & Percentiles',
  '/analytics/transitions': 'Ranking Transitions & Volatility',
  '/analytics/outliers': 'Outlier Detection & Performance Gaps',
  '/intelligence/explorer': 'Dynamic Multidimensional Explorer',
  '/intelligence/ask-nirf': 'Ask NIRF Data (NLQ Engine)',
}

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('nirf_sidebar_collapsed') === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('nirf_sidebar_collapsed', String(next))
      return next
    })
  }

  const toggleMobileMenu = () => {
    setMobileOpen((prev) => !prev)
  }

  const closeMobileMenu = () => {
    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && <div className="mobile-backdrop" onClick={closeMobileMenu} />}

      {/* Left Navigation Sidebar — Full Viewport Height in Deep Navy (IMAGE 2 Structure) */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileMenu}
      />

      {/* Main Workspace Area (Right Column) */}
      <div className="app-main-area">
        {/* Government Portal Header Bar */}
        <Header onMobileMenuToggle={toggleMobileMenu} />

        {/* Scrollable Content Body */}
        <main className="app-content-body">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default MainLayout
