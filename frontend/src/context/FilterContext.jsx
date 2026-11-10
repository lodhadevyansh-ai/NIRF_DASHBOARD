/**
 * NIRF Analytics Dashboard — Global Filter Context.
 *
 * Manages shared state for the active discipline category, ranking year,
 * dependent year ranges, and evaluated parameters across all views.
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

// Fallback category roster if backend is temporarily disconnected
const DEFAULT_CATEGORIES = [
  'Overall',
  'Universities',
  'Colleges',
  'Engineering',
  'Management',
  'Pharmacy',
  'Medical',
  'Dental',
  'Law',
  'Architecture and Planning',
  'Agriculture and Allied Sectors',
  'Research Institutions',
  'State Public University',
  'Innovation',
  'Open University',
  'Skill University',
  'Sustainable Development Goals',
]

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [category, setCategoryState] = useState(() => {
    return localStorage.getItem('nirf_active_category') || 'Overall'
  })
  const [selectedYear, setSelectedYear] = useState(2025)
  const [availableCategories, setAvailableCategories] = useState(DEFAULT_CATEGORIES)
  const [availableYears, setAvailableYears] = useState([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025])
  const [availableStates, setAvailableStates] = useState([])
  const [parameters, setParameters] = useState(['overall_score', 'tlr_score', 'rpc_score', 'go_score', 'oi_score', 'pr_score'])
  const [rankRange, setRankRange] = useState({ min: 1, max: 100 })
  const [scoreRange, setScoreRange] = useState({ min: 0, max: 100 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const setCategory = (newCategory) => {
    setCategoryState(newCategory)
    localStorage.setItem('nirf_active_category', newCategory)
  }

  // Fetch dynamic dependent options whenever active category changes
  useEffect(() => {
    let isMounted = true

    async function loadOptions() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getFilterOptions({ category })
        if (!isMounted) return

        if (data.all_categories && data.all_categories.length > 0) {
          setAvailableCategories(data.all_categories)
        }
        if (data.available_years && data.available_years.length > 0) {
          setAvailableYears(data.available_years)
          // If the currently selected year is not valid for this category, reset to latest
          if (!data.available_years.includes(selectedYear)) {
            setSelectedYear(data.available_years[data.available_years.length - 1])
          }
        }
        if (data.available_states) {
          setAvailableStates(data.available_states)
        }
        if (data.parameters) {
          setParameters(data.parameters)
        }
        if (data.rank_range) {
          setRankRange(data.rank_range)
        }
        if (data.score_range) {
          setScoreRange(data.score_range)
        }
      } catch (err) {
        if (!isMounted) return
        console.warn('Could not load dynamic filter options from API, using default fallbacks:', err.message)
        setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadOptions()

    return () => {
      isMounted = false
    }
  }, [category])

  const value = {
    category,
    setCategory,
    selectedYear,
    setSelectedYear,
    availableCategories,
    availableYears,
    availableStates,
    parameters,
    rankRange,
    scoreRange,
    loading,
    error,
  }

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}

export default FilterContext

