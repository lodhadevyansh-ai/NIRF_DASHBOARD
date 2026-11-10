/**
 * NIRF Analytics Dashboard — Component-Level Error Boundary.
 *
 * Catches JavaScript runtime rendering errors anywhere in child component tree,
 * logs them for diagnosis, and displays a graceful fallback UI instead of crashing
 * to a blank screen.
 */

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="nirf-card"
          style={{
            margin: '24px 0',
            padding: '24px',
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={24} color="#dc2626" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#991b1b', fontWeight: 600 }}>
                {this.props.title || 'Component Rendering Error'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#b91c1c' }}>
                {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="analytics-refresh-btn"
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
              <span>Retry Rendering</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '6px 14px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

