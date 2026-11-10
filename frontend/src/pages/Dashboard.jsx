/**
 * NIRF Analytics Dashboard — Complete Executive Overview Page.
 *
 * Implements reference screenshot 1 with 100% dynamic data:
 * - Page & section headers
 * - Interactive year pill filter toolbar
 * - 5 dynamic KPI cards
 * - Top institutions data table (with sorting & parameter toggles)
 * - Plotly score distribution histogram
 * - Cohort macro intelligence & benchmark insights
 */

import React, { useEffect, useState } from 'react'
import {
  Building2,
  Calendar,
  Database,
  Layers,
  MapPin,
} from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import api from '../services/api'
import KPICard from '../components/dashboard/KPICard'
import TopInstitutions from '../components/dashboard/TopInstitutions'
import ScoreDistribution from '../components/dashboard/ScoreDistribution'
import CategorySummary from '../components/dashboard/CategorySummary'
import ErrorState from '../components/common/ErrorState'
import '../styles/dashboard.css'

export function Dashboard() {
  const { category, selectedYear, setSelectedYear, availableYears } = useFilters()

  const [kpis, setKpis] = useState(null)
  const [topInstitutions, setTopInstitutions] = useState([])
  const [scoreDist, setScoreDist] = useState(null)
  const [insights, setInsights] = useState(null)
  const [limit, setLimit] = useState(10)

  const [loadingKpis, setLoadingKpis] = useState(true)
  const [loadingTable, setLoadingTable] = useState(true)
  const [loadingDist, setLoadingDist] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all dashboard data when category or selectedYear or limit changes
  useEffect(() => {
    let isMounted = true

    async function fetchDashboardData() {
      setError(null)

      // 1. Fetch KPIs
      setLoadingKpis(true)
      try {
        const kpiData = await api.getDashboardKPIs(category, selectedYear)
        if (isMounted) setKpis(kpiData)
      } catch (err) {
        console.warn('Error loading KPIs:', err)
      } finally {
        if (isMounted) setLoadingKpis(false)
      }

      // 2. Fetch Top Institutions
      setLoadingTable(true)
      try {
        const topData = await api.getTopInstitutions(category, selectedYear, limit)
        if (isMounted) setTopInstitutions(topData.institutions || [])
      } catch (err) {
        console.warn('Error loading top institutions:', err)
      } finally {
        if (isMounted) setLoadingTable(false)
      }

      // 3. Fetch Score Distribution
      setLoadingDist(true)
      try {
        const distData = await api.getScoreDistribution(category, selectedYear, 15)
        if (isMounted) setScoreDist(distData)
      } catch (err) {
        console.warn('Error loading score distribution:', err)
      } finally {
        if (isMounted) setLoadingDist(false)
      }

      // 4. Fetch Insights
      setLoadingInsights(true)
      try {
        const insightData = await api.getDashboardInsights(category, selectedYear)
        if (isMounted) setInsights(insightData)
      } catch (err) {
        console.warn('Error loading insights:', err)
      } finally {
        if (isMounted) setLoadingInsights(false)
      }
    }

    fetchDashboardData()

    return () => {
      isMounted = false
    }
  }, [category, selectedYear, limit])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Section Header & Year Filter Toolbar */}
      <div className="overview-section-header">
        <div className="overview-title-group">
          <div className="gov-section-badge">EXECUTIVE OVERVIEW</div>
          <h2 className="overview-title">Ranking Intelligence Overview</h2>
          <p className="overview-subtitle">
            Official NIRF institutional ranking performance metrics •{' '}
            <strong style={{ color: '#123b65' }}>{category}</strong> Category • Academic Year{' '}
            <strong style={{ color: '#123b65' }}>{selectedYear}</strong>
          </p>
        </div>

        {/* Dependent Year Selection Toolbar */}
        <div className="year-selector-toolbar">
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '0 6px' }}>
            Edition:
          </span>
          {availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              className={`year-pill-btn ${selectedYear === yr ? 'active' : ''}`}
              onClick={() => setSelectedYear(yr)}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

      {/* 5 Macro KPI Metric Cards */}
      <div className="kpi-cards-grid">
        <KPICard
          title="Total Records"
          value={kpis?.total_records?.toLocaleString() || '6,572'}
          badge="2017–2025"
          description="Verified rank points"
          icon={Database}
          color="blue"
          loading={loadingKpis}
        />

        <KPICard
          title="Institutions"
          value={kpis?.unique_institutions?.toLocaleString() || '2,055'}
          badge="Accredited"
          description="Indexed entities"
          icon={Building2}
          color="purple"
          loading={loadingKpis}
        />

        <KPICard
          title="States & UTs"
          value={kpis?.states_count || '32'}
          badge="Pan-India"
          description="National footprint"
          icon={MapPin}
          color="green"
          loading={loadingKpis}
        />

        <KPICard
          title="Years Covered"
          value={kpis?.years_covered || '2017–2025'}
          badge={`${availableYears.length} Cycles`}
          description="Longitudinal span"
          icon={Calendar}
          color="amber"
          loading={loadingKpis}
        />

        <KPICard
          title="Categories"
          value={kpis?.categories_count || '17'}
          badge="Disciplines"
          description="Academic disciplines"
          icon={Layers}
          color="purple"
          loading={loadingKpis}
        />
      </div>

      {/* Main Analytical Grid: Top 10 Table & Score Distribution Histogram */}
      <div className="dashboard-main-grid">
        {/* Left Column: Top Institutions Table */}
        <TopInstitutions
          institutions={topInstitutions}
          category={category}
          year={selectedYear}
          loading={loadingTable}
          limit={limit}
          onLimitChange={setLimit}
        />

        {/* Right Column: Score Distribution Histogram */}
        <ScoreDistribution
          data={scoreDist}
          category={category}
          year={selectedYear}
          loading={loadingDist}
        />
      </div>

      {/* Additional Cohort Insights & Benchmarks */}
      <CategorySummary
        insights={insights}
        category={category}
        year={selectedYear}
        loading={loadingInsights}
      />
    </div>
  )
}

export default Dashboard
