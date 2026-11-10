/**
 * NIRF Analytics Dashboard — NLQ Chat Message Component.
 *
 * Renders user query bubbles and assistant response cards with integrated charts.
 */

import React from 'react'
import { Bot, User, AlertCircle } from 'lucide-react'
import QueryResult from './QueryResult'

export function ChatMessage({ message, onSelectFollowUp }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div
          style={{
            maxWidth: '75%',
            backgroundColor: '#123b65',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '6px 6px 2px 6px',
            fontSize: '0.88rem',
            lineHeight: 1.45,
            boxShadow: '0 1px 2px rgba(18, 59, 101, 0.2)',
          }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  // Assistant Message
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
      {/* Bot Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          backgroundColor: '#eaf1f8',
          border: '1px solid #d5dce5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Bot size={17} style={{ color: '#123b65' }} />
      </div>

      {/* Message Body Card */}
      <div
        style={{
          flex: 1,
          maxWidth: '92%',
          backgroundColor: '#ffffff',
          border: '1px solid #d5dce5',
          borderRadius: '2px 8px 8px 8px',
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(11, 45, 80, 0.04)',
        }}
      >
        {message.error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: '0.86rem' }}>
            <AlertCircle size={16} />
            <span>{message.error}</span>
          </div>
        ) : (
          <QueryResult
            result={message.result || { answer: message.content }}
            onSelectFollowUp={onSelectFollowUp}
          />
        )}
      </div>
    </div>
  )
}

export default ChatMessage

