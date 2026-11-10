/**
 * NIRF Analytics Dashboard — Universal Formatters & Standardized Parameter Mappings.
 *
 * Enforces NIRF Annexure standards across all dashboard visualizations:
 * - Standard parameter names & abbreviations
 * - Standard axis titles with measurement units (0–100, Academic Year, etc.)
 * - Safe numeric rounding & null guards
 * - Institution name truncation with full names preserved for tooltips
 */

/**
 * Standard NIRF Parameter Mappings
 */
export const NIRF_PARAMETERS = {
  tlr_score: {
    abbr: 'TLR',
    name: 'Teaching, Learning & Resources',
    full: 'Teaching, Learning & Resources (TLR)',
    unit: 'Score (0–100)',
    description: 'Faculty-student ratio, faculty qualifications, financial resources and utilization.',
  },
  rpc_score: {
    abbr: 'RPC',
    name: 'Research & Professional Practice',
    full: 'Research & Professional Practice (RPC)',
    unit: 'Score (0–100)',
    description: 'Publications, citations, intellectual property (patents), and sponsored research.',
  },
  go_score: {
    abbr: 'GO',
    name: 'Graduation Outcomes',
    full: 'Graduation Outcomes (GO)',
    unit: 'Score (0–100)',
    description: 'Metric for university examinations, median salary, and PhD students graduated.',
  },
  oi_score: {
    abbr: 'OI',
    name: 'Outreach & Inclusivity',
    full: 'Outreach & Inclusivity (OI)',
    unit: 'Score (0–100)',
    description: 'Regional diversity, women student ratio, economically & socially challenged students.',
  },
  pr_score: {
    abbr: 'PR',
    name: 'Perception',
    full: 'Perception (PR)',
    unit: 'Score (0–100)',
    description: 'Academic peers and employers perception survey ratings.',
  },
  overall_score: {
    abbr: 'Score',
    name: 'Overall Score',
    full: 'NIRF Overall Composite Score',
    unit: 'Overall Score (0–100)',
    description: 'Weighted aggregate composite score across all five NIRF ranking pillars.',
  },
  numeric_rank: {
    abbr: 'Rank',
    name: 'NIRF Rank',
    full: 'NIRF Official Rank',
    unit: 'NIRF Rank (Lower Rank = Better Performance)',
    description: 'Official ordinal ranking position awarded by the Ministry of Education.',
  },
  rank: {
    abbr: 'Rank',
    name: 'NIRF Rank',
    full: 'NIRF Official Rank',
    unit: 'NIRF Rank (Lower Rank = Better Performance)',
    description: 'Official ordinal ranking position awarded by the Ministry of Education.',
  },
  year: {
    abbr: 'Year',
    name: 'Academic Year',
    full: 'NIRF Ranking Edition Year',
    unit: 'Academic Year',
    description: 'Annual edition of the National Institutional Ranking Framework (2017–2025).',
  },
  state: {
    abbr: 'State',
    name: 'State / Union Territory',
    full: 'Indian State / Union Territory',
    unit: 'State / Union Territory',
    description: 'Geographic state or union territory in India.',
  },
  institution_name: {
    abbr: 'Institution',
    name: 'Institution Name',
    full: 'Higher Education Institution Name',
    unit: 'Institution Name',
    description: 'Accredited Indian university, college, or institute.',
  },
  category: {
    abbr: 'Category',
    name: 'Discipline Category',
    full: 'NIRF Discipline Category',
    unit: 'Discipline Category',
    description: 'Overall, Engineering, Management, Pharmacy, Medical, Law, Architecture, etc.',
  },
}

/**
 * Return full official name for a given parameter key or abbreviation.
 */
export function getParameterFullName(keyOrAbbr) {
  if (!keyOrAbbr) return ''
  const clean = String(keyOrAbbr).trim().toLowerCase()

  // Match by key
  if (NIRF_PARAMETERS[clean]) {
    return NIRF_PARAMETERS[clean].full
  }

  // Match by abbr
  for (const info of Object.values(NIRF_PARAMETERS)) {
    if (info.abbr.toLowerCase() === clean) {
      return info.full
    }
  }

  // Fallback humanizer
  return keyOrAbbr.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Return abbreviation for a parameter key.
 */
export function getParameterAbbr(key) {
  if (!key) return ''
  const clean = String(key).trim().toLowerCase()
  if (NIRF_PARAMETERS[clean]) {
    return NIRF_PARAMETERS[clean].abbr
  }
  return key.replace(/_score/g, '').toUpperCase()
}

/**
 * Return standardized descriptive axis title with unit of measurement.
 */
export function getStandardAxisTitle(variableKey, fallback = '') {
  if (!variableKey) return fallback
  const clean = String(variableKey).trim().toLowerCase()
  if (NIRF_PARAMETERS[clean]) {
    return NIRF_PARAMETERS[clean].unit
  }
  return fallback || getParameterFullName(variableKey)
}

/**
 * Truncate long institution name with ellipsis while preserving readability.
 */
export function truncateInstitutionName(name, maxLength = 28) {
  if (!name) return ''
  let str = String(name).trim()
  // Replace long recurring national prefixes to preserve distinct identity
  str = str
    .replace(/^Indian Institute of Technology\b/i, 'IIT')
    .replace(/^National Institute of Technology\b/i, 'NIT')
    .replace(/^Indian Institute of Science Education and Research\b/i, 'IISER')
    .replace(/^Indian Institute of Science\b/i, 'IISc')
    .replace(/^All India Institute of Medical Sciences\b/i, 'AIIMS')
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 1)}…`
}

/**
 * Safely format numerical score to fixed decimal places, handling null/undefined/NaN.
 */
export function formatScore(value, decimals = 2, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (isNaN(num)) return fallback
  return num.toFixed(decimals)
}

/**
 * Safely format rank value.
 */
export function formatRank(value, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (isNaN(num)) return String(value)
  return `#${num}`
}

/**
 * Standardize Plotly categorical X-axis layout for institution or category labels:
 * - 45° to 60° rotation for long institution names
 * - Ample bottom margin to avoid clipping
 * - Clean grid & font styling
 */
export function getCategoricalXAxisConfig(title = '', isInstitutionAxis = false) {
  return {
    title: title ? { text: title, font: { size: 12, color: '#475569' } } : undefined,
    tickangle: isInstitutionAxis ? -45 : -35,
    tickfont: { size: 11, color: '#1e293b' },
    gridcolor: '#f1f5f9',
    automargin: true,
  }
}

/**
 * Standardize Plotly Y-axis layout with unit scale and clean zero line.
 */
export function getNumericalYAxisConfig(title = 'NIRF Overall Score (0–100)', inverted = false) {
  return {
    title: { text: title, font: { size: 12, color: '#475569' } },
    tickfont: { size: 11, color: '#64748b' },
    gridcolor: '#f1f5f9',
    zerolinecolor: '#e2e8f0',
    autorange: inverted ? 'reversed' : true,
  }
}

