/**
 * NIRF Analytics Dashboard — Reusable Executive KPI Card Component.
 *
 * Implements the 5 metric summary cards matching reference screenshot 1.
 */

import React from 'react'

export function KPICard({
  title,
  value,
  badge,
  description,
  icon: Icon,
  color = 'blue',
  loading = false,
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <span className="kpi-card-label">{title}</span>
        <div className={`kpi-icon-badge ${color}`}>
          {Icon && <Icon size={16} />}
        </div>
      </div>

      <div className="kpi-card-value">
        {loading ? (
          <span style={{ color: '#cbd5e1' }}>...</span>
        ) : (
          value
        )}
      </div>

      <div className="kpi-card-bottom">
        {badge && <span className={`kpi-pill-badge ${color}`}>{badge}</span>}
        {description && <span>{description}</span>}
      </div>
    </div>
  )
}

export default KPICard

