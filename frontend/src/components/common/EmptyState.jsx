/**
 * NIRF Analytics Dashboard — Empty State Component.
 */

import React from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  title = 'No records found',
  description = 'No institutional data matches your current filter selection.',
  actionLabel,
  onAction,
}) {
  return (
    <div
      className="nirf-card"
      style={{
        padding: '36px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        maxWidth: 460,
        margin: '24px auto',
        backgroundColor: '#fafbfc',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
        }}
      >
        <Inbox size={26} />
      </div>

      <div>
        <h4 style={{ fontSize: '0.98rem', color: '#1e293b', marginBottom: 4 }}>{title}</h4>
        <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>{description}</p>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 4,
            padding: '7px 14px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            color: '#2563eb',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState

