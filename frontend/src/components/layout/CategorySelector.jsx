/**
 * NIRF Analytics Dashboard — Category Selector Component.
 *
 * Top-right discipline dropdown matching reference screenshots.
 * Supports search, outside-click dismissal, and keyboard accessibility.
 */

import React, { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Layers, Search } from 'lucide-react'
import { useFilters } from '../../hooks/useFilters'

export function CategorySelector() {
  const { category, setCategory, availableCategories } = useFilters()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const filteredCategories = availableCategories.filter((cat) =>
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelect = (cat) => {
    setCategory(cat)
    setIsOpen(false)
  }

  return (
    <div className="category-selector-container" ref={containerRef}>
      <button
        type="button"
        className={`category-trigger-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Select academic discipline category"
      >
        <Layers size={16} className="icon-discipline" />
        <span className="category-active-label">{category}</span>
        <ChevronDown size={14} className="chevron-icon" />
      </button>

      {isOpen && (
        <div className="category-dropdown-popover" role="listbox">
          <div className="category-search-box">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: 8, color: '#94a3b8' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                className="category-search-input"
                placeholder="Search category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 28 }}
              />
            </div>
          </div>

          <div className="category-list">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => {
                const isSelected = cat === category
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`category-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(cat)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check size={14} style={{ color: '#2563eb' }} />}
                  </button>
                )
              })
            ) : (
              <div
                style={{
                  padding: '12px',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  textAlign: 'center',
                }}
              >
                No matching category
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CategorySelector

