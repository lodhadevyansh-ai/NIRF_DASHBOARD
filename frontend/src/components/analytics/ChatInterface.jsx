/**
 * NIRF Analytics Dashboard — Chat Interface Component.
 *
 * Hosts the conversational exchange:
 * - Empty state with interactive categorized suggestions
 * - Auto-scrolling message list
 * - Input bar with keyboard handling and query execution trigger
 * - Clear conversation control
 */

import React, { useRef, useEffect } from 'react'
import { Send, Trash2, Bot, Loader2 } from 'lucide-react'
import ChatMessage from './ChatMessage'
import QuerySuggestions from './QuerySuggestions'

export function ChatInterface({
  messages = [],
  inputQuery,
  onInputChange,
  onSubmit,
  loading = false,
  onClear,
  onSelectSuggestion,
}) {
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <div
      className="nirf-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '75vh',
        minHeight: 560,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Chat Sub-Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#fafbfc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#10b981',
            }}
          />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
            NIRF Analytical Intelligence Assistant
          </span>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.76rem',
              color: '#64748b',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
            }}
            title="Clear active conversation"
          >
            <Trash2 size={13} />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Message Stream Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: 'auto 0', padding: '20px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  backgroundColor: '#eaf1f8',
                  border: '1px solid #d5dce5',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Bot size={24} style={{ color: '#123b65' }} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#123b65', margin: '0 0 6px 0' }}>
                How can I assist your NIRF institutional analysis today?
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, maxWidth: 540, display: 'inline-block' }}>
                Ask questions in plain English about rankings, trends, regional representations, parameter relationships, and score distributions.
              </p>
            </div>

            <QuerySuggestions onSelectQuery={onSelectSuggestion} />
          </div>
        ) : (
          <div>
            {messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                message={msg}
                onSelectFollowUp={onSelectSuggestion}
              />
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 4,
                    backgroundColor: '#eaf1f8',
                    border: '1px solid #d5dce5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'nlq-pulse-avatar 2s infinite',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={18} style={{ color: '#123b65' }} />
                </div>
                <div className="chat-loading-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span className="chat-dot" />
                      <span className="chat-dot" />
                      <span className="chat-dot" />
                    </div>
                    <span style={{ fontSize: '0.84rem', color: '#202b38', fontWeight: 500 }}>
                      Analyzing NIRF data &amp; generating analytical response...
                    </span>
                  </div>
                  <div className="chat-progress-line" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Docked Input Form */}
      <form
        onSubmit={onSubmit}
        style={{
          display: 'flex',
          gap: 10,
          padding: '14px 18px',
          borderTop: '1px solid #d5dce5',
          backgroundColor: '#ffffff',
        }}
      >
        <input
          type="text"
          placeholder="Ask a question about NIRF rankings (e.g. 'Show top 10 colleges in Overall 2025' or 'How has IIT Madras performed?')..."
          value={inputQuery}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            padding: '11px 16px',
            borderRadius: 4,
            border: '1px solid #d5dce5',
            fontSize: '0.88rem',
            outline: 'none',
            color: '#202b38',
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 20px',
            backgroundColor: '#123b65',
            color: '#ffffff',
            borderRadius: 4,
            fontWeight: 600,
            fontSize: '0.88rem',
            border: 'none',
            cursor: loading || !inputQuery.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !inputQuery.trim() ? 0.6 : 1,
            boxShadow: '0 1px 2px rgba(18, 59, 101, 0.2)',
          }}
        >
          <span>Ask</span>
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}

export default ChatInterface

