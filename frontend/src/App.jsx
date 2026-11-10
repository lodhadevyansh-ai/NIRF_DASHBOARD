/**
 * NIRF Analytics Dashboard — Application Router & Root Component.
 *
 * Configures React Router, Global Filter Provider, MainLayout shell,
 * and page routes across Dashboard, Analytics, and Intelligence.
 */

import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FilterProvider } from './context/FilterContext'
import MainLayout from './components/layout/MainLayout'
import ErrorBoundary from './components/common/ErrorBoundary'

// Page Components
import Dashboard from './pages/Dashboard'
import TimeSeries from './pages/TimeSeries'
import Geospatial from './pages/Geospatial'
import Univariate from './pages/Univariate'
import Bivariate from './pages/Bivariate'
import Multivariate from './pages/Multivariate'
import Statistics from './pages/Statistics'
import RankingTransitions from './pages/RankingTransitions'
import OutlierDetection from './pages/OutlierDetection'
import DynamicExplorer from './pages/DynamicExplorer'
import NaturalLanguageQuery from './pages/NaturalLanguageQuery'

export function App() {
  return (
    <FilterProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            {/* Dashboard Navigation */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/overview" element={<Navigate to="/" replace />} />

            {/* Analytics Navigation */}
            <Route path="/analytics/time-series" element={<TimeSeries />} />
            <Route path="/analytics/geospatial" element={<Geospatial />} />
            <Route path="/analytics/univariate" element={<Univariate />} />
            <Route path="/analytics/bivariate" element={<Bivariate />} />
            <Route path="/analytics/multivariate" element={<Multivariate />} />
            <Route path="/analytics/statistics" element={<Statistics />} />
            <Route path="/analytics/transitions" element={<RankingTransitions />} />
            <Route path="/analytics/outliers" element={<OutlierDetection />} />

            {/* Intelligence Navigation */}
            <Route path="/intelligence/explorer" element={<DynamicExplorer />} />
            <Route path="/intelligence/ask-nirf" element={<NaturalLanguageQuery />} />

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FilterProvider>
  )
}

export default App
