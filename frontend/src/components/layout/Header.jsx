/**
 * NIRF Analytics Dashboard — Official Government Portal Header.
 *
 * Implements the official Indian Government web portal header matching IMAGE 1:
 * - Circular navy badge with analytics icon
 * - Devanagari (Hindi) title: राष्ट्रीय संस्थागत रैंकिंग विश्लेषण डैशबोर्ड
 * - Primary English title: NIRF Ranking Analytics Dashboard
 * - Subtitle: Analytics on NIRF data, 2017–2025
 * - Search institution input
 * - Download Report button
 * - Discipline/Category selector
 * - Platform methodology info modal
 */

import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Download, Info, Menu, Search, X } from 'lucide-react'
import CategorySelector from './CategorySelector'

const PAGE_TITLES = {
  '/': {
    title: 'Executive Overview',
    subtitle: 'High-level rankings summary and macro statistics across Indian higher education institutions.',
  },
  '/overview': {
    title: 'Executive Overview',
    subtitle: 'High-level rankings summary and macro statistics across Indian higher education institutions.',
  },
  '/analytics/time-series': {
    title: 'Time-Series Analysis',
    subtitle: 'Longitudinal institutional trajectories, ranking volatility, and progress trends (2017–2025).',
  },
  '/analytics/geospatial': {
    title: 'Geospatial Analysis',
    subtitle: 'Interactive map and regional distribution of ranked higher education institutions.',
  },
  '/analytics/univariate': {
    title: 'Univariate Analysis',
    subtitle: 'Statistical distributions, histograms, and boxplots across NIRF evaluation parameters.',
  },
  '/analytics/bivariate': {
    title: 'Bivariate & Correlation',
    subtitle: 'Cross-parameter correlations, scatter plots, and inter-metric relationships.',
  },
  '/analytics/multivariate': {
    title: 'Multivariate Analysis',
    subtitle: '5-parameter radar charts, parallel coordinate trajectories, and multi-factor institutional comparisons.',
  },
  '/analytics/statistics': {
    title: 'Statistical Summaries',
    subtitle: 'Parametric summaries, quartiles, and statistical distribution tables across ranking categories.',
  },
  '/analytics/transitions': {
    title: 'Ranking Transitions',
    subtitle: 'Year-over-year rank migration, volatility matrices, and institutional quartile shifts.',
  },
  '/analytics/outliers': {
    title: 'Outliers & Gaps',
    subtitle: 'Statistical anomaly detection, metric gaps, and exceptional performance outliers.',
  },
  '/intelligence/explorer': {
    title: 'Dynamic Data Explorer',
    subtitle: 'Faceted dataset slicers, custom chart generator, and searchable institutional directory.',
  },
  '/intelligence/ask-nirf': {
    title: 'Ask NIRF Data',
    subtitle: 'Natural language analytical querying and multi-layer AI intelligence engine.',
  },
}

export function Header({ onMobileMenuToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/intelligence/explorer?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleDownloadReport = () => {
    window.print()
  }

  const currentPage = PAGE_TITLES[location.pathname] || {
    title: 'NIRF Ranking Analytics',
    subtitle: 'National Institutional Ranking Framework analytics platform (2017–2025).',
  }

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onMobileMenuToggle}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>

          <div className="header-page-title-group">
            <h1 className="header-page-title">{currentPage.title}</h1>
            <p className="header-page-subtitle">{currentPage.subtitle}</p>
          </div>
        </div>

        <div className="header-right">
          {/* Global Institution Search */}
          <div className="gov-header-search">
            <Search size={15} className="gov-header-search-icon" />
            <input
              type="text"
              placeholder="Search institution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="gov-header-search-input"
              aria-label="Search institution"
            />
          </div>

          {/* Download Report Button */}
          <button
            type="button"
            onClick={handleDownloadReport}
            className="gov-download-report-btn"
            title="Download / Print Analytics Summary Report"
            aria-label="Download Report"
          >
            <Download size={15} />
            <span>Download Report</span>
          </button>

          {/* Category Selector Dropdown (IMAGE 2 Positioning) */}
          <CategorySelector />

          {/* Platform Info Button (IMAGE 2 Positioning) */}
          <button
            type="button"
            className="info-icon-btn"
            onClick={() => setShowInfoModal(true)}
            title="Platform Information & Data Methodology"
            aria-label="Platform Information"
          >
            <Info size={18} />
          </button>
        </div>
      </header>

      {/* Information Modal */}
      {showInfoModal && (
        <div className="info-modal-backdrop" onClick={() => setShowInfoModal(false)}>
          <div
            className="info-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="gov-header-emblem" style={{ width: 34, height: 34 }}>
                  <BarChart2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: '#123b65', fontWeight: 700 }}>
                    NIRF Ranking Analytics Dashboard
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Ministry of Education, Government of India • 2017–2025 Editions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                style={{ color: '#64748b', padding: 4, cursor: 'pointer' }}
                aria-label="Close information modal"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.86rem', color: '#202b38', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p>
                This platform provides multidimensional analytics and exploratory visual tools for all 9 official cycles
                (<strong>2017–2025</strong>) of the National Institutional Ranking Framework (NIRF), Ministry of Education,
                Government of India.
              </p>

              <div style={{ background: '#f4f6f9', padding: '12px 14px', borderRadius: 6, border: '1px solid #d5dce5' }}>
                <strong style={{ display: 'block', marginBottom: 6, color: '#123b65' }}>Verified Ground Truth:</strong>
                <ul style={{ paddingLeft: 18, margin: 0, fontSize: '0.82rem', color: '#202b38', lineHeight: 1.6 }}>
                  <li><strong>6,572 verified records</strong> strictly reconciled against official published rankings.</li>
                  <li><strong>17 disciplines</strong> covering Universities, Engineering, Management, Colleges, Medical, and more.</li>
                  <li><strong>32 Indian States & UTs</strong> represented across nationwide institutional cohorts.</li>
                  <li><strong>5 Core Evaluation Dimensions</strong>: Teaching (TLR), Research (RPC), Outcomes (GO), Outreach (OI), and Perception (PR).</li>
                </ul>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                Official Ranking Data Source: Ministry of Education NIRF Master Archive (2017–2025). All metrics deterministically computed.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
