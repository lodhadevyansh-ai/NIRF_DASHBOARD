/**
 * Centralized API client for NIRF Analytics Dashboard.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Perform a JSON fetch request with standard error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`
      try {
        const errorData = await response.json()
        if (errorData.message) errorMessage = errorData.message
        else if (errorData.detail) errorMessage = errorData.detail
      } catch {
        // use fallback errorMessage
      }
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error) {
    console.error(`API Request failed for [${endpoint}]:`, error)
    throw error
  }
}

export const api = {
  // Filters & Metadata
  getFilterOptions: (params = {}) => {
    const query = new URLSearchParams()
    if (params.category) query.set('category', params.category)
    if (params.year) query.set('year', params.year)
    if (params.state) query.set('state', params.state)
    const qs = query.toString()
    return request(`/filters/options${qs ? `?${qs}` : ''}`)
  },

  // Dashboard Overview
  getDashboardKPIs: (category = 'Overall', year = null) => {
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (year) query.set('year', year)
    const qs = query.toString()
    return request(`/dashboard/kpis${qs ? `?${qs}` : ''}`)
  },

  getTopInstitutions: (category = 'Overall', year = 2025, limit = 10) => {
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (year) query.set('year', year)
    if (limit) query.set('limit', limit)
    return request(`/dashboard/top-institutions?${query.toString()}`)
  },

  getScoreDistribution: (category = 'Overall', year = 2025, bins = 15) => {
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (year) query.set('year', year)
    if (bins) query.set('bins', bins)
    return request(`/dashboard/score-distribution?${query.toString()}`)
  },

  getDashboardInsights: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (year) query.set('year', year)
    return request(`/dashboard/insights?${query.toString()}`)
  },

  // Institutions
  getInstitutions: (params = {}) => {
    const query = new URLSearchParams()
    if (params.query) query.set('query', params.query)
    if (params.category) query.set('category', params.category)
    if (params.year) query.set('year', params.year)
    if (params.state) query.set('state', params.state)
    if (params.page) query.set('page', params.page)
    if (params.page_size) query.set('page_size', params.page_size)
    if (params.sort_by) query.set('sort_by', params.sort_by)
    if (params.sort_order) query.set('sort_order', params.sort_order)
    return request(`/institutions?${query.toString()}`)
  },

  getInstitutionDetail: (institutionId) => {
    return request(`/institutions/${encodeURIComponent(institutionId)}`)
  },

  // Dataset & System
  getHealth: () => request('/health'),
  getDatasetStatus: () => request('/dataset/status'),
  getDatasetSummary: () => request('/dataset/summary'),
  getDatasetColumns: () => request('/dataset/columns'),

  // Time-Series & Trend Analysis
  getTimeSeriesInstitutions: (category = 'Overall') => {
    const query = new URLSearchParams({ category })
    return request(`/analytics/time-series/institutions?${query.toString()}`)
  },

  getTrajectory: (category = 'Overall', institution = null) => {
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (institution) query.set('institution', institution)
    return request(`/analytics/time-series/trajectory?${query.toString()}`)
  },

  getImprovements: (category = 'Overall', startYear = 2017, endYear = 2025, limit = 10) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
      limit,
    })
    return request(`/analytics/time-series/improvements?${query.toString()}`)
  },

  getDeclines: (category = 'Overall', startYear = 2017, endYear = 2025, limit = 10) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
      limit,
    })
    return request(`/analytics/time-series/declines?${query.toString()}`)
  },

  getAverageScoreTrend: (category = 'Overall', startYear = null, endYear = null) => {
    const query = new URLSearchParams({ category })
    if (startYear) query.set('start_year', startYear)
    if (endYear) query.set('end_year', endYear)
    return request(`/analytics/time-series/average-score?${query.toString()}`)
  },

  getConsistentTop: (category = 'Overall', startYear = null, endYear = null, topN = 10, limit = 20) => {
    const query = new URLSearchParams({
      category,
      top_n: topN,
      limit,
    })
    if (startYear) query.set('start_year', startYear)
    if (endYear) query.set('end_year', endYear)
    return request(`/analytics/time-series/consistent-top?${query.toString()}`)
  },

  // Geospatial & Regional Intelligence
  getTopStates: (category = 'Overall', year = 2025, topN = 100) => {
    const query = new URLSearchParams({
      category,
      year,
      top_n: topN,
    })
    return request(`/analytics/geospatial/top-states?${query.toString()}`)
  },

  getDistributionTrend: (category = 'Overall', year = null) => {
    const query = new URLSearchParams({ category })
    if (year) query.set('year', year)
    return request(`/analytics/geospatial/distribution-trend?${query.toString()}`)
  },

  getStateGrowth: (category = 'Overall', startYear = 2017, endYear = 2025, topN = 100) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
      top_n: topN,
    })
    return request(`/analytics/geospatial/state-growth?${query.toString()}`)
  },

  compareStates: (category = 'Overall', year = 2025, stateA = 'Karnataka', stateB = 'Tamil Nadu') => {
    const query = new URLSearchParams({
      category,
      year,
      state_a: stateA,
      state_b: stateB,
    })
    return request(`/analytics/geospatial/compare-states?${query.toString()}`)
  },

  getNewlyAppearing: (category = 'Overall', startYear = 2017, endYear = 2025) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
    })
    return request(`/analytics/geospatial/newly-appearing?${query.toString()}`)
  },

  // Univariate Statistical Analysis
  getScoreDistributionAnalytics: (category = 'Overall', year = 2025, bins = 15) => {
    const query = new URLSearchParams({
      category,
      year,
      bins,
    })
    return request(`/analytics/univariate/score-distribution?${query.toString()}`)
  },

  getRankDistribution: (category = 'Overall', year = null, minRank = null, maxRank = null) => {
    const query = new URLSearchParams({ category })
    if (year) query.set('year', year)
    if (minRank) query.set('min_rank', minRank)
    if (maxRank) query.set('max_rank', maxRank)
    return request(`/analytics/univariate/rank-distribution?${query.toString()}`)
  },

  getDescriptiveStatistics: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({
      category,
      year,
    })
    return request(`/analytics/univariate/descriptive-statistics?${query.toString()}`)
  },

  getScoreQuartiles: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({
      category,
      year,
    })
    return request(`/analytics/univariate/score-quartiles?${query.toString()}`)
  },

  getCategorySpread: (year = 2025) => {
    const query = new URLSearchParams({ year })
    return request(`/analytics/univariate/category-spread?${query.toString()}`)
  },

  // Bivariate Analysis & Correlation
  getRpcVsOverall: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({ category, year })
    return request(`/analytics/bivariate/rpc-score?${query.toString()}`)
  },

  getPrVsOverall: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({ category, year })
    return request(`/analytics/bivariate/pr-score?${query.toString()}`)
  },

  getParameterCorrelation: (category = 'Overall', year = 2025, targetVariable = 'overall_score') => {
    const query = new URLSearchParams({
      category,
      year,
      target_variable: targetVariable,
    })
    return request(`/analytics/bivariate/parameter-correlation?${query.toString()}`)
  },

  getTlrVsRpc: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({ category, year })
    return request(`/analytics/bivariate/tlr-rpc?${query.toString()}`)
  },

  getHistoricalCorrelation: (category = 'Overall', varX = 'rpc_score', varY = 'overall_score', startYear = 2017, endYear = 2025) => {
    const query = new URLSearchParams({
      category,
      var_x: varX,
      var_y: varY,
      start_year: startYear,
      end_year: endYear,
    })
    return request(`/analytics/bivariate/historical-correlation?${query.toString()}`)
  },

  postCustomBivariate: (payload) => {
    return request('/analytics/bivariate/custom', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Multivariate Analysis
  getTopFive: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({ category, year })
    return request(`/analytics/multivariate/top-five?${query.toString()}`)
  },

  getResearchTeachingGap: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({ category, year })
    return request(`/analytics/multivariate/research-teaching-gap?${query.toString()}`)
  },

  getTeachingPerceptionGap: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({ category, year })
    return request(`/analytics/multivariate/teaching-perception-gap?${query.toString()}`)
  },

  getScoreImprovement: (category = 'Overall', startYear = 2023, endYear = 2025) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
    })
    return request(`/analytics/multivariate/score-improvement?${query.toString()}`)
  },

  getParameterGap: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({ category, year })
    return request(`/analytics/multivariate/parameter-gap?${query.toString()}`)
  },

  // Distribution & Statistical Comparison
  getTop10Comparison: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({ category, year })
    return request(`/analytics/statistics/top10-comparison?${query.toString()}`)
  },

  getScoreDispersion: (category = 'Overall') => {
    const query = new URLSearchParams({ category })
    return request(`/analytics/statistics/score-dispersion?${query.toString()}`)
  },

  getParameterVariability: (category = 'Overall', year = 2025) => {
    const query = new URLSearchParams({ category, year })
    return request(`/analytics/statistics/parameter-variability?${query.toString()}`)
  },

  getMedianIqrTrend: (category = 'Overall') => {
    const query = new URLSearchParams({ category })
    return request(`/analytics/statistics/median-iqr-trend?${query.toString()}`)
  },

  getStateDistribution: (category = 'Overall', year = 2025, minInstitutions = 1) => {
    const query = new URLSearchParams({
      category,
      year,
      min_institutions: minInstitutions,
    })
    return request(`/analytics/statistics/state-distribution?${query.toString()}`)
  },

  // Ranking Transitions & Institutional Mobility
  getBandMovement: (category = 'Overall', startYear = 2023, endYear = 2025) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
    })
    return request(`/analytics/transitions/band-movement?${query.toString()}`)
  },

  getTop10EntryExit: (category = 'Overall', startYear = 2024, endYear = 2025) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
    })
    return request(`/analytics/transitions/top10-entry-exit?${query.toString()}`)
  },

  getBandRetention: (category = 'Overall', startYear = 2023, endYear = 2025) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
    })
    return request(`/analytics/transitions/retention?${query.toString()}`)
  },

  getLargestMovements: (category = 'Overall', startYear = 2023, endYear = 2025, limit = 10) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
      limit,
    })
    return request(`/analytics/transitions/largest-movements?${query.toString()}`)
  },

  getInstitutionalMobility: (category = 'Overall') => {
    const query = new URLSearchParams({ category })
    return request(`/analytics/transitions/mobility?${query.toString()}`)
  },

  // Outlier Detection & Performance Gaps
  getResearchOutliers: (category = 'Overall', year = 2025, method = 'zscore', threshold = 2.0) => {
    const query = new URLSearchParams({
      category,
      year,
      method,
      threshold,
    })
    return request(`/analytics/outliers/research?${query.toString()}`)
  },

  getResearchTeachingGapOutliers: (category = 'Overall', year = 2025, method = 'zscore', threshold = 2.0) => {
    const query = new URLSearchParams({
      category,
      year,
      method,
      threshold,
    })
    return request(`/analytics/outliers/research-teaching?${query.toString()}`)
  },

  getScoreChangeOutliers: (category = 'Overall', startYear = 2024, endYear = 2025, method = 'zscore', threshold = 2.0) => {
    const query = new URLSearchParams({
      category,
      start_year: startYear,
      end_year: endYear,
      method,
      threshold,
    })
    return request(`/analytics/outliers/score-changes?${query.toString()}`)
  },

  getStrongParamPoorRank: (category = 'Overall', year = 2025, parameter = 'rpc_score', paramPercentileMin = 60.0, rankMin = 50) => {
    const query = new URLSearchParams({
      category,
      year,
      parameter,
      param_percentile_min: paramPercentileMin,
      rank_min: rankMin,
    })
    return request(`/analytics/outliers/parameter-performance?${query.toString()}`)
  },

  getRankingVolatility: (category = 'Overall', minYears = 4, method = 'zscore', threshold = 1.5) => {
    const query = new URLSearchParams({
      category,
      min_years: minYears,
      method,
      threshold,
    })
    return request(`/analytics/outliers/ranking-volatility?${query.toString()}`)
  },

  // Dynamic Explorer & Chart Service
  getExplorerSchema: () => {
    return request('/analytics/explorer/schema')
  },

  executeExplorerQuery: (payload) => {
    return request('/analytics/explorer/query', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  recommendChart: (params = {}) => {
    const query = new URLSearchParams()
    if (params.x_var) query.set('x_var', params.x_var)
    if (params.y_var) query.set('y_var', params.y_var)
    if (params.group_var) query.set('group_var', params.group_var)
    if (params.color_var) query.set('color_var', params.color_var)
    if (params.size_var) query.set('size_var', params.size_var)
    if (params.analysis_purpose) query.set('analysis_purpose', params.analysis_purpose)
    const qs = query.toString()
    return request(`/analytics/explorer/recommend${qs ? `?${qs}` : ''}`)
  },

  // Natural Language Query (Ask NIRF Data)
  askNLQ: (payload) => {
    return request('/nlq/query', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export default api
