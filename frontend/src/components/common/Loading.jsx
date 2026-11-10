/**
 * NIRF Analytics Dashboard — Loading Spinner & Skeleton.
 */

import React from 'react'
import { Loader2 } from 'lucide-react'

export function Loading({ message = 'Loading NIRF analytical data...', size = 32, fullPage = false }) {
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        gap: 12,
        color: '#64748b',
      }}
    >
      <Loader2
        size={size}
        style={{
          animation: 'spin 1s linear infinite',
          color: '#2563eb',
        }}
      />
      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{message}</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  if (fullPage) {
    return (
      <div
        style={{
          height: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </div>
    )
  }

  return content
}

export default Loading

