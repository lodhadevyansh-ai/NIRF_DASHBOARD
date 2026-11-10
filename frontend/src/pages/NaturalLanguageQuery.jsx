/**
 * NIRF Analytics Dashboard — Natural Language Query Page (Ask NIRF Data).
 *
 * Implements conversational intelligence over NIRF Master Dataset:
 * - Deterministic parsing fallback
 * - Context integration with global category & year
 * - Interactive multi-turn chat stream with embedded Plotly charts
 * - Categorized prompt suggestions
 */

import React, { useState, useRef } from 'react'
import { Sparkles, MessageSquare } from 'lucide-react'
import { useFilters } from '../hooks/useFilters'
import { api } from '../services/api'
import ChatInterface from '../components/analytics/ChatInterface'

// Minimum loading indicator duration to provide a smooth, professional analytical experience
const MIN_LOADING_MS = 2400

export function NaturalLanguageQuery() {
  const { category, selectedYear } = useFilters()
  const [messages, setMessages] = useState([])
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const activeRequestIdRef = useRef(0)

  const handleExecuteQuery = async (queryText) => {
    const q = (queryText || inputQuery).trim()
    if (!q || loading) return

    // Track sequential request ID to handle consecutive submissions correctly
    const currentRequestId = ++activeRequestIdRef.current

    // Append user message immediately
    const userMsg = { role: 'user', content: q }
    setMessages((prev) => [...prev, userMsg])
    setInputQuery('')
    setLoading(true)

    // Enforce 2–3 second visual loading period without delaying queries that take longer
    const minDelayPromise = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS))

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content || m.result?.answer || '',
      }))

      // Concurrently execute NLQ backend analysis and min loading timer
      const [response] = await Promise.all([
        api.askNLQ({
          query: q,
          category: category !== 'All' ? category : 'Overall',
          year: selectedYear ? Number(selectedYear) : 2025,
          conversation_history: history,
        }),
        minDelayPromise,
      ])

      // Only apply answer if this is still the active request
      if (activeRequestIdRef.current === currentRequestId) {
        const botMsg = {
          role: 'assistant',
          content: response.answer,
          result: response,
          error: response.error,
        }
        setMessages((prev) => [...prev, botMsg])
      }
    } catch (err) {
      console.error('NLQ Query execution failed:', err)
      if (activeRequestIdRef.current === currentRequestId) {
        const errorMsg = {
          role: 'assistant',
          content: 'Failed to process inquiry.',
          error: err.message || 'An unexpected error occurred while querying the NIRF analytical engine.',
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    } finally {
      if (activeRequestIdRef.current === currentRequestId) {
        setLoading(false)
      }
    }
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    handleExecuteQuery()
  }

  const handleSelectSuggestion = (suggestionText) => {
    handleExecuteQuery(suggestionText)
  }

  const handleClear = () => {
    // Invalidate active requests and clear message history
    activeRequestIdRef.current += 1
    setLoading(false)
    setMessages([])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.32rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Ask NIRF Data
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4, margin: 0 }}>
            Conversational analytical intelligence over 9 ranking cycles (2017–2025) across Indian higher education institutions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#2563eb',
              backgroundColor: '#eff6ff',
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #bfdbfe',
            }}
          >
            <Sparkles size={13} />
            <span>Active Scope: {category} ({selectedYear})</span>
          </span>
        </div>
      </div>

      {/* Main Conversational Interface */}
      <ChatInterface
        messages={messages}
        inputQuery={inputQuery}
        onInputChange={setInputQuery}
        onSubmit={handleSubmit}
        loading={loading}
        onClear={handleClear}
        onSelectSuggestion={handleSelectSuggestion}
      />
    </div>
  )
}

export default NaturalLanguageQuery
