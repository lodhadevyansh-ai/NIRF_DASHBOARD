/**
 * NIRF Analytics Dashboard — Top Institutions Table Component.
 *
 * Implements Top 10 data table matching reference screenshot 1:
 * - Columns: Rank, Name, Score, State, TLR (Teaching), RPC (Research)
 * - Optional toggle to display all 5 parameters (GO, OI, PR)
 * - Sortable headers, search bar, limit selector, and N/A missing value handling.
 */

import React, { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  Trophy,
} from 'lucide-react'
import Loading from '../common/Loading'
import EmptyState from '../common/EmptyState'

export function TopInstitutions({
  institutions = [],
  category = 'Overall',
  year = 2025,
  loading = false,
  limit = 10,
  onLimitChange,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('rank')
  const [sortAsc, setSortAsc] = useState(true)
  const [showAllParams, setShowAllParams] = useState(false)

  // Determine parameter label based on category (Research Institutions uses QNR/QLR)
  const isResearch = category === 'Research Institutions'
  const param1Label = isResearch ? 'QNR (Quant)' : 'TLR (Teaching)'
  const param1Key = isResearch ? 'qnr_score' : 'tlr_score'
  const param2Label = isResearch ? 'QLR (Quality)' : 'RPC (Research)'
  const param2Key = isResearch ? 'qlr_score' : 'rpc_score'

  // Sort and filter institutions
  const filteredAndSorted = useMemo(() => {
    let result = [...institutions]

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(
        (inst) =>
          inst.institution_name?.toLowerCase().includes(q) ||
          inst.state?.toLowerCase().includes(q) ||
          inst.city?.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1

      if (typeof valA === 'string') {
        return sortAsc
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }

      return sortAsc ? valA - valB : valB - valA
    })

    return result
  }, [institutions, searchTerm, sortField, sortAsc])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.4 }} />
    }
    return sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  const formatScore = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A'
    return Number(val).toFixed(2)
  }

  return (
    <div className="nirf-card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Table Header Bar */}
      <div className="nirf-card-header">
        <div>
          <div className="nirf-card-title">
            <Trophy size={18} style={{ color: '#123b65' }} />
            <span>Top {limit} Institutions</span>
          </div>
          <div className="nirf-card-subtitle" style={{ marginTop: 2 }}>
            {category} • {year}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Parameter Columns Toggle */}
          <button
            type="button"
            onClick={() => setShowAllParams(!showAllParams)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.74rem',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 4,
              border: '1px solid #d5dce5',
              backgroundColor: showAllParams ? '#eaf1f8' : '#ffffff',
              color: showAllParams ? '#123b65' : '#64748b',
              cursor: 'pointer',
            }}
            title="Toggle additional parameter score columns"
          >
            <SlidersHorizontal size={13} />
            <span>{showAllParams ? 'Compact View' : 'All Parameters'}</span>
          </button>

          {/* Limit Selector */}
          {onLimitChange && (
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{
                fontSize: '0.76rem',
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid #d5dce5',
                backgroundColor: '#ffffff',
                color: '#202b38',
                outline: 'none',
              }}
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          )}
        </div>
      </div>

      {/* Filter / Search Sub-bar */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #d5dce5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          backgroundColor: '#f4f6f9',
        }}
      >
        <div style={{ position: 'relative', width: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search in table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              fontSize: '0.8rem',
              borderRadius: 4,
              border: '1px solid #d5dce5',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#202b38',
            }}
          />
        </div>

        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
          Showing {filteredAndSorted.length} of {institutions.length} records
        </span>
      </div>

      {/* Table Content */}
      <div className="top-institutions-table-wrapper">
        {loading ? (
          <Loading message="Loading top institutions..." />
        ) : filteredAndSorted.length === 0 ? (
          <EmptyState
            title="No institutions found"
            description={`No ranking data matches your criteria for ${category} (${year}).`}
          />
        ) : (
          <table className="nirf-data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('rank')} style={{ width: 68 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Rank</span>
                    {renderSortIcon('rank')}
                  </div>
                </th>
                <th onClick={() => handleSort('institution_name')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Name</span>
                    {renderSortIcon('institution_name')}
                  </div>
                </th>
                <th onClick={() => handleSort('overall_score')} style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span>Score</span>
                    {renderSortIcon('overall_score')}
                  </div>
                </th>
                <th onClick={() => handleSort('state')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>State</span>
                    {renderSortIcon('state')}
                  </div>
                </th>
                <th onClick={() => handleSort(param1Key)} style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span>{param1Label}</span>
                    {renderSortIcon(param1Key)}
                  </div>
                </th>
                <th onClick={() => handleSort(param2Key)} style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span>{param2Label}</span>
                    {renderSortIcon(param2Key)}
                  </div>
                </th>
                {showAllParams && (
                  <>
                    <th onClick={() => handleSort('go_score')} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <span>GO</span>
                        {renderSortIcon('go_score')}
                      </div>
                    </th>
                    <th onClick={() => handleSort('oi_score')} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <span>OI</span>
                        {renderSortIcon('oi_score')}
                      </div>
                    </th>
                    <th onClick={() => handleSort('pr_score')} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <span>PR</span>
                        {renderSortIcon('pr_score')}
                      </div>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((inst, index) => {
                const numericRank = Number(inst.rank)
                const isTop3 = numericRank >= 1 && numericRank <= 3
                return (
                  <tr key={inst.institute_id || `${inst.institution_name}-${index}`}>
                    <td>
                      <span className={`rank-pill ${isTop3 ? 'top-3' : ''}`}>
                        {inst.rank}
                      </span>
                    </td>
                    <td className="inst-name-cell">
                      <span>{inst.institution_name}</span>
                      {inst.city && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>
                          {inst.city}
                        </span>
                      )}
                    </td>
                    <td className="score-cell" style={{ textAlign: 'right' }}>
                      {formatScore(inst.overall_score)}
                    </td>
                    <td>{inst.state || 'N/A'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      {formatScore(inst[param1Key])}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      {formatScore(inst[param2Key])}
                    </td>
                    {showAllParams && (
                      <>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {formatScore(inst.go_score)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {formatScore(inst.oi_score)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {formatScore(inst.pr_score)}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default TopInstitutions

