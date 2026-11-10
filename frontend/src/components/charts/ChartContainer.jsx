/**
 * NIRF Analytics Dashboard — Reusable Plotly Chart Container.
 *
 * Wraps Plotly.js with dynamic resize observation, DHV design system styling,
 * responsive container sizing, standardized margins, and clean lifecycle management.
 */

import React, { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-dist-min'

export function ChartContainer({
  data = [],
  layout = {},
  config = {},
  style = {},
  className = '',
  loading = false,
  onClick = null,
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || loading) return

    // Base layout defaults matching DHV Analytics aesthetic
    const isHorizontalBar = Array.isArray(data) && data.some((t) => t && t.orientation === 'h')
    const fallbackLeftMargin = isHorizontalBar ? 270 : 65

    const defaultLayout = {
      autosize: true,
      height: layout.height,
      margin: {
        l: layout.margin?.l ?? fallbackLeftMargin,
        r: layout.margin?.r ?? (isHorizontalBar ? 55 : 30),
        t: layout.margin?.t ?? 40,
        b: layout.margin?.b ?? (isHorizontalBar ? 60 : 65),
      },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 12,
        color: '#202b38',
      },
      hoverlabel: {
        bgcolor: '#0b2d50',
        bordercolor: '#0b2d50',
        font: { family: 'Inter, sans-serif', color: '#ffffff', size: 12 },
      },
      xaxis: {
        color: '#475569',
        gridcolor: '#eaeff5',
        zerolinecolor: '#d5dce5',
        tickfont: { size: 11, color: '#475569' },
        automargin: true,
      },
      yaxis: {
        color: '#475569',
        gridcolor: '#eaeff5',
        zerolinecolor: '#d5dce5',
        tickfont: { size: 11, color: '#475569' },
        automargin: true,
      },
    }

    const mergedLayout = {
      ...defaultLayout,
      ...layout,
      margin: { ...defaultLayout.margin, ...(layout.margin || {}) },
      xaxis: { ...defaultLayout.xaxis, ...(layout.xaxis || {}) },
      yaxis: { ...defaultLayout.yaxis, ...(layout.yaxis || {}) },
    }

    const defaultConfig = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      ...config,
    }

    const validData = Array.isArray(data) ? data : []
    const node = containerRef.current
    Plotly.react(node, validData, mergedLayout, defaultConfig)

    // Handle plot click events if listener provided
    if (onClick && node) {
      if (node.removeAllListeners) {
        node.removeAllListeners('plotly_click')
      }
      if (node.on) {
        node.on('plotly_click', onClick)
      }
    }

    // Resize observer to handle dynamic window / layout resizing
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current)
      }
    })
    resizeObserver.observe(node)

    return () => {
      resizeObserver.disconnect()
      if (node) {
        if (node.removeAllListeners) {
          node.removeAllListeners('plotly_click')
        }
        Plotly.purge(node)
      }
    }
  }, [data, layout, config, loading, onClick])

  return (
    <div
      ref={containerRef}
      className={`nirf-chart-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: layout.height || 340,
        ...style,
      }}
    />
  )
}

export default ChartContainer
