/**
 * NIRF Analytics Dashboard — Error State Display Component.
 */

import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

export function ErrorState({
  title = 'Failed to load analytical data',
  message = 'An unexpected error occurred while processing your request.',
  onRetry,
}) {
  return (
    <div
      className="nirf-card"
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        maxWidth: 520,
        margin: '24px auto',
        borderColor: '#fecaca',
        backgroundColor: '#fff5f5',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
        }}
      >
        <AlertCircle size={24} />
      </div>

      <div>
        <h3 style={{ fontSize: '1.05rem', color: '#991b1b', marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: '0.84rem', color: '#7f1d1d', lineHeight: 1.4 }}>{message}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #f87171',
            borderRadius: 6,
            color: '#b91c1c',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  )
}

export default ErrorState

