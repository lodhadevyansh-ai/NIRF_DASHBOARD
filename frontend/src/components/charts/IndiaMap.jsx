/**
 * NIRF Analytics Dashboard — Interactive India Choropleth Map.
 *
 * Implements:
 * 1. State-level Choropleth Map of India using official 36/37 state and UT boundaries.
 * 2. Institutional density fill using discrete blue tiers:
 *    - High (>10 insts): Dark Blue (#1e40af)
 *    - Moderate (5-10 insts): Medium Blue (#0284c7)
 *    - Developing (1-4 insts): Light Blue (#93c5fd)
 *    - None in cohort: Light Grey (#f1f5f9)
 * 3. Automatic map bounds fitting the entire Indian subcontinent edge-to-edge without requiring zoom.
 * 4. Distinct dark border highlight on selected state.
 * 5. State centroid count badges (#0f172a circles with white numerals) matching reference design.
 * 6. Rich interactive hover tooltips with parameter averages (TLR, RPC, GO, OI, PR).
 * 7. Compact floating legend inside the card at bottom-left.
 */

import React, { useMemo, useCallback } from 'react'
import { ChartContainer } from './ChartContainer'
import indiaGeoJSON from '../../data/indiaStatesGeo.json'

// Representative points inside each state/UT polygon
const STATE_CENTROIDS = {
  'Andaman and Nicobar Islands': { lat: 11.8582, lon: 92.6504 },
  'Andhra Pradesh': { lat: 15.8954, lon: 79.616 },
  'Arunachal Pradesh': { lat: 28.0551, lon: 95.0277 },
  Assam: { lat: 26.0501, lon: 90.7614 },
  Bihar: { lat: 25.9018, lon: 86.1278 },
  Chandigarh: { lat: 30.7306, lon: 76.7801 },
  Chhattisgarh: { lat: 20.9586, lon: 81.5113 },
  'Dadra and Nagar Haveli': { lat: 20.2126, lon: 73.0093 },
  'Daman and Diu': { lat: 20.7214, lon: 70.9323 },
  Delhi: { lat: 28.6429, lon: 77.1287 },
  Goa: { lat: 15.3461, lon: 74.1027 },
  Gujarat: { lat: 22.4165, lon: 71.9899 },
  Haryana: { lat: 29.2872, lon: 76.2407 },
  'Himachal Pradesh': { lat: 31.8193, lon: 77.3369 },
  'Jammu and Kashmir': { lat: 33.7245, lon: 74.8991 },
  Jharkhand: { lat: 23.6566, lon: 85.1667 },
  Karnataka: { lat: 15.0237, lon: 75.5343 },
  Kerala: { lat: 10.5392, lon: 76.4497 },
  Ladakh: { lat: 34.7058, lon: 77.6437 },
  Lakshadweep: { lat: 11.2863, lon: 74.0379 },
  'Madhya Pradesh': { lat: 23.973, lon: 79.3942 },
  Maharashtra: { lat: 18.8196, lon: 75.366 },
  Manipur: { lat: 24.7679, lon: 93.8656 },
  Meghalaya: { lat: 25.5734, lon: 91.2657 },
  Mizoram: { lat: 23.2273, lon: 92.8735 },
  Nagaland: { lat: 26.1142, lon: 94.561 },
  Odisha: { lat: 20.1951, lon: 84.4885 },
  Puducherry: { lat: 10.9175, lon: 79.7974 },
  Punjab: { lat: 31.0651, lon: 75.6524 },
  Rajasthan: { lat: 26.6317, lon: 73.8236 },
  Sikkim: { lat: 27.6084, lon: 88.4616 },
  'Tamil Nadu': { lat: 10.8197, lon: 78.3499 },
  Telangana: { lat: 17.874, lon: 79.2951 },
  Tripura: { lat: 23.7359, lon: 91.6622 },
  'Uttar Pradesh': { lat: 27.1431, lon: 80.7873 },
  Uttarakhand: { lat: 30.0914, lon: 79.322 },
  'West Bengal': { lat: 24.4104, lon: 88.0551 },
}

export function IndiaMap({
  states = [],
  selectedState = null,
  onSelectState = null,
  height = 540,
  category = 'Overall',
  year = 2025,
  scopeN = 100,
}) {
  // Extract all official state names from GeoJSON
  const geoStates = useMemo(() => {
    return (indiaGeoJSON.features || []).map((f) => f.properties.state_name)
  }, [])

  // Build indexed map of states data
  const stateDataMap = useMemo(() => {
    const map = new Map()
    states.forEach((s) => {
      if (s && s.state) {
        map.set(s.state.trim(), s)
      }
    })
    return map
  }, [states])

  // Prepare Choropleth data structures
  const { choroplethTrace, badgeTrace, highlightTrace } = useMemo(() => {
    const locations = []
    const zValues = []
    const customdata = []
    const hovertexts = []

    const badgeLats = []
    const badgeLons = []
    const badgeTexts = []
    const badgeStates = []
    const badgeHovertexts = []

    geoStates.forEach((stateName) => {
      locations.push(stateName)
      const data = stateDataMap.get(stateName)

      if (data && data.count > 0) {
        const count = data.count
        let z = 1
        let tierLabel = 'Developing (1–4 insts)'

        if (count > 10) {
          z = 3
          tierLabel = 'High (>10 insts)'
        } else if (count >= 5) {
          z = 2
          tierLabel = 'Moderate (5–10 insts)'
        }

        zValues.push(z)

        // Custom data for hover
        customdata.push([
          stateName,
          tierLabel,
          count,
          data.share_pct ?? 0,
          data.average_score ?? 'N/A',
          data.top_institution || 'N/A',
          data.top_institution_rank || 'N/A',
          data.avg_tlr ?? 'N/A',
          data.avg_rpc ?? 'N/A',
          data.avg_go ?? 'N/A',
          data.avg_oi ?? 'N/A',
          data.avg_pr ?? 'N/A',
        ])

        const hoverStr =
          `<b>${stateName}</b><br>` +
          `Density: <b>${tierLabel}</b><br>` +
          `Institutions: <b>${count}</b> (${data.share_pct ?? 0}% share)<br>` +
          `Avg NIRF Score: <b>${data.average_score ?? 'N/A'}</b><br>` +
          `Top Entity: <b>${data.top_institution || 'N/A'}</b> (#${data.top_institution_rank || 'N/A'})<br>` +
          `<span style="font-size:11px;color:#94a3b8">Parameters:</span><br>` +
          `• TLR: <b>${data.avg_tlr ?? 'N/A'}</b> | RPC: <b>${data.avg_rpc ?? 'N/A'}</b><br>` +
          `• GO: <b>${data.avg_go ?? 'N/A'}</b> | OI: <b>${data.avg_oi ?? 'N/A'}</b> | PR: <b>${data.avg_pr ?? 'N/A'}</b>`

        hovertexts.push(hoverStr)

        // Centroid badge coordinates
        const centroid = STATE_CENTROIDS[stateName]
        if (centroid) {
          badgeLats.push(centroid.lat)
          badgeLons.push(centroid.lon)
          badgeTexts.push(String(count))
          badgeStates.push(stateName)
          badgeHovertexts.push(hoverStr)
        }
      } else {
        // Zero representation in cohort
        zValues.push(0)
        customdata.push([
          stateName,
          'None in Cohort',
          0,
          0,
          'N/A',
          'None',
          'N/A',
          'N/A',
          'N/A',
          'N/A',
          'N/A',
          'N/A',
        ])
        hovertexts.push(
          `<b>${stateName}</b><br>` +
            `<span style="color:#64748b">No institutions in ${scopeN === 0 ? 'ranked' : `Top ${scopeN || 100}`} cohort</span>`
        )
      }
    })

    // Main Choropleth Trace
    const choro = {
      type: 'choropleth',
      geojson: indiaGeoJSON,
      locations,
      featureidkey: 'properties.state_name',
      z: zValues,
      zmin: 0,
      zmax: 3,
      colorscale: [
        [0.0, '#f1f5f9'],
        [0.1667, '#f1f5f9'],
        [0.1667, '#93c5fd'],
        [0.5, '#93c5fd'],
        [0.5, '#0284c7'],
        [0.8333, '#0284c7'],
        [0.8333, '#1e40af'],
        [1.0, '#1e40af'],
      ],
      showscale: false,
      marker: {
        line: {
          color: '#cbd5e1',
          width: 0.9,
        },
      },
      text: hovertexts,
      hoverinfo: 'text',
      hoverlabel: {
        bgcolor: '#0f172a',
        bordercolor: '#334155',
        font: { family: 'Inter, sans-serif', color: '#ffffff', size: 12 },
      },
    }

    // Centroid Count Badges Trace (Circular dark badge with white number)
    const badge = {
      type: 'scattergeo',
      lon: badgeLons,
      lat: badgeLats,
      mode: 'markers+text',
      text: badgeTexts,
      textposition: 'middle center',
      textfont: {
        family: 'Inter, -apple-system, sans-serif',
        size: 9.5,
        color: '#ffffff',
      },
      customdata: badgeStates,
      hovertext: badgeHovertexts,
      hoverinfo: 'text',
      hoverlabel: {
        bgcolor: '#0f172a',
        bordercolor: '#334155',
        font: { family: 'Inter, sans-serif', color: '#ffffff', size: 12 },
      },
      marker: {
        size: 19,
        color: '#0f172a',
        line: {
          color: '#ffffff',
          width: 1.4,
        },
      },
    }

    // Selected state border highlight trace
    let highlight = null
    if (selectedState && geoStates.includes(selectedState)) {
      highlight = {
        type: 'choropleth',
        geojson: indiaGeoJSON,
        locations: [selectedState],
        featureidkey: 'properties.state_name',
        z: [1],
        colorscale: [
          [0, 'rgba(0,0,0,0)'],
          [1, 'rgba(0,0,0,0)'],
        ],
        showscale: false,
        marker: {
          line: {
            color: '#0f172a',
            width: 3.2,
          },
        },
        hoverinfo: 'skip',
      }
    }

    return {
      choroplethTrace: choro,
      badgeTrace: badge,
      highlightTrace: highlight,
    }
  }, [geoStates, stateDataMap, selectedState, scopeN])

  // Combine traces
  const traces = useMemo(() => {
    const list = [choroplethTrace]
    if (highlightTrace) {
      list.push(highlightTrace)
    }
    list.push(badgeTrace)
    return list
  }, [choroplethTrace, badgeTrace, highlightTrace])

  // Plotly Map Layout with automatic fitbounds to entire India
  const layout = useMemo(
    () => ({
      height,
      autosize: true,
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      dragmode: false,
      geo: {
        scope: 'asia',
        fitbounds: 'locations',
        visible: false,
        projection: {
          type: 'mercator',
        },
        showland: false,
        showocean: false,
        showlakes: false,
        showcountries: false,
        showsubunits: false,
        bgcolor: 'transparent',
      },
    }),
    [height]
  )

  const config = useMemo(
    () => ({
      responsive: true,
      displayModeBar: false,
      scrollZoom: false,
    }),
    []
  )

  // Handle click on state or badge
  const handlePlotClick = useCallback(
    (eventData) => {
      if (!onSelectState || !eventData || !eventData.points || !eventData.points.length) {
        return
      }
      const pt = eventData.points[0]
      const clickedLocation = pt.location || pt.customdata
      if (clickedLocation) {
        onSelectState(clickedLocation)
      }
    },
    [onSelectState]
  )

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        background: '#ffffff',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <ChartContainer
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%', minHeight: height }}
        onClick={handlePlotClick}
      />

      {/* Floating Map Legend (Bottom-Left as in Reference Image 1) */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 14px',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 6,
            letterSpacing: '0.01em',
          }}
        >
          {scopeN === 0 ? 'Institutional Density' : `Top ${scopeN || 100} Density`}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: '#1e40af',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500 }}>
              High (&gt;10 insts)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: '#0284c7',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500 }}>
              Moderate (5–10 insts)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: '#93c5fd',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500 }}>
              Developing (1–4 insts)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
              None in Cohort
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IndiaMap
