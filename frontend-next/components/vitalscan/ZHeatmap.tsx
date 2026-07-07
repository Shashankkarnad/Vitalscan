'use client'

// Z-score deviation heatmap for the multivariate detector. Rows = metrics,
// columns = ~90 days. Cell hue is DIRECTION-aware (coral = moved the concerning
// way, teal = the reassuring way, faint slate = near baseline); "no data" cells
// are a diagonal hatch, never rendered as zero deviation. A strip under the grid
// marks days the combo alert fired. Hovering a column shows that day's per-metric
// z and, on alert days, the top distance contributors.
//
// Custom SVG in the BandChart idiom: PL/PR/PT/PB padding, IBM Plex Mono labels,
// month ticks, a pure-DOM hover tooltip. Diverging color = the brand coral/teal
// pair + a neutral gray midpoint (dataviz: two hues + gray mid, never a rainbow).

import { useCallback, useRef, useState } from 'react'
import { COLOR, rgba, FONT_MONO } from '@/lib/vitalscan/tokens'
import { CONCERN_DIRECTION, type ZHeatmap as ZHeatmapData } from '@/lib/vitalscan/derive'
import type { Combo, MetricKey } from '@/lib/types'
import { METRIC_BY_KEY } from '@/lib/vitalscan/metrics'

const PL = 92
const PR = 14
const PT = 10
const PB = 20
const ROW_H = 22
const ROW_GAP = 3
const STRIP_H = 10
const Z_FULL = 3.5 // |z| that saturates the cell

export interface ZHeatmapProps {
  data: ZHeatmapData
  combo?: Combo
  width?: number
}

/** Diverging, direction-aware cell fill. null z -> hatch handled by caller. */
function cellFill(z: number, direction: 1 | -1 | 0): string {
  const mag = Math.min(Math.abs(z) / Z_FULL, 1)
  if (Math.abs(z) < 0.4) return rgba(COLOR.slate, 0.12) // neutral midpoint
  const a = 0.16 + 0.82 * mag
  if (direction === 0) return rgba(COLOR.slate, a) // steps: magnitude only
  const concern = direction * z
  return rgba(concern > 0 ? COLOR.coral : COLOR.teal, a)
}

export default function ZHeatmap({ data, combo, width = 940 }: ZHeatmapProps) {
  const { dates, rows, comboAlert } = data
  const N = dates.length
  const R = rows.length
  const W = width
  const H = PT + R * (ROW_H + ROW_GAP) + STRIP_H + PB
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hi, setHi] = useState<number | null>(null)

  const gridW = W - PL - PR
  const cw = N > 0 ? gridW / N : 0
  const x = (i: number) => PL + i * cw
  const rowY = (r: number) => PT + r * (ROW_H + ROW_GAP)
  const stripY = PT + R * (ROW_H + ROW_GAP)

  const onMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      const svg = svgRef.current
      if (!svg || N < 1) return
      const rect = svg.getBoundingClientRect()
      const px = ((e.clientX - rect.left) / rect.width) * W
      const i = Math.max(0, Math.min(N - 1, Math.floor((px - PL) / cw)))
      setHi(i)
    },
    [N, cw, W],
  )

  if (N < 2 || R === 0) {
    return (
      <div
        style={{
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: '.12em',
          color: 'rgba(234,234,234,.4)',
        }}
      >
        NOT ENOUGH DATA FOR A DEVIATION MAP
      </div>
    )
  }

  // Month ticks — first of each month
  const ticks: { x: number; label: string }[] = []
  dates.forEach((d, i) => {
    if (d.slice(8, 10) === '01') {
      const dt = new Date(d + 'T12:00:00')
      ticks.push({ x: x(i) + cw / 2, label: dt.toLocaleString('en', { month: 'short' }).toUpperCase() })
    }
  })

  const alertDay = hi != null && comboAlert[hi]
  const episode = alertDay ? combo?.alerts.find((a) => a.date === dates[hi!]) : undefined
  const hvDate = hi != null ? new Date(dates[hi] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const tooltipLeftPct = hi != null ? Math.min(74, Math.max(2, (x(hi) / W) * 100)) : 0

  return (
    <div style={{ position: 'relative', maxWidth: '100%' }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
        role="img"
        aria-label="Per-metric z-score deviation heatmap over the last 90 days, with multivariate alert days marked."
      >
        <defs>
          <pattern id="vs-nodata" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="rgba(234,234,234,.015)" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(234,234,234,.14)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Alert-column highlight (behind cells) */}
        {comboAlert.map((on, i) =>
          on ? <rect key={`c${i}`} x={x(i)} y={PT} width={cw} height={R * (ROW_H + ROW_GAP)} fill={rgba(COLOR.coral, 0.07)} /> : null,
        )}

        {/* Cells */}
        {rows.map((row, r) => (
          <g key={row.key}>
            <text
              x={PL - 10}
              y={rowY(r) + ROW_H / 2 + 3.5}
              textAnchor="end"
              fontFamily="IBM Plex Mono"
              fontSize="10"
              fill="rgba(234,234,234,.62)"
            >
              {row.label}
            </text>
            {row.z.map((z, i) => {
              const yy = rowY(r)
              if (z == null) {
                return <rect key={i} x={x(i) + 0.5} y={yy} width={Math.max(0.5, cw - 1)} height={ROW_H} rx={2} fill="url(#vs-nodata)" />
              }
              return (
                <rect
                  key={i}
                  x={x(i) + 0.5}
                  y={yy}
                  width={Math.max(0.5, cw - 1)}
                  height={ROW_H}
                  rx={2}
                  fill={cellFill(z, row.direction)}
                />
              )
            })}
          </g>
        ))}

        {/* Combo alert strip */}
        <text x={PL - 10} y={stripY + STRIP_H - 1} textAnchor="end" fontFamily="IBM Plex Mono" fontSize="8.5" letterSpacing="1" fill="rgba(234,234,234,.4)">
          ALERT
        </text>
        {comboAlert.map((on, i) =>
          on ? <rect key={`s${i}`} x={x(i) + 0.5} y={stripY + 1} width={Math.max(1, cw - 1)} height={STRIP_H - 2} rx={2} fill={COLOR.coral} /> : null,
        )}

        {/* Month ticks */}
        {ticks.map((tk, i) => (
          <text key={i} x={tk.x} y={H - 6} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9.5" letterSpacing="1" fill="rgba(234,234,234,.3)">
            {tk.label}
          </text>
        ))}

        {/* Hover crosshair */}
        {hi != null && <rect x={x(hi)} y={PT} width={cw} height={R * (ROW_H + ROW_GAP) + STRIP_H} fill="none" stroke="rgba(234,234,234,.35)" strokeWidth="1" rx={2} />}

        {/* Hover capture */}
        <rect x={PL} y={PT} width={gridW} height={R * (ROW_H + ROW_GAP) + STRIP_H} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHi(null)} />
      </svg>

      {hi != null && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipLeftPct}%`,
            top: 0,
            transform: 'translateY(-2px)',
            pointerEvents: 'none',
            background: 'rgba(10,10,16,.94)',
            border: `1px solid ${alertDay ? rgba(COLOR.coral, 0.4) : 'rgba(234,234,234,.12)'}`,
            borderRadius: 8,
            padding: '8px 11px',
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            lineHeight: 1.6,
            color: 'rgba(234,234,234,.85)',
            whiteSpace: 'nowrap',
            zIndex: 2,
            minWidth: 150,
          }}
        >
          <div style={{ color: 'rgba(234,234,234,.5)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{hvDate}</span>
            {alertDay && <span style={{ color: COLOR.coral }}>COMBO ALERT</span>}
          </div>
          {episode ? (
            <>
              <div style={{ color: 'rgba(234,234,234,.6)', marginTop: 2 }}>
                dist {episode.dist.toFixed(2)} &middot; cutoff {episode.cutoff.toFixed(2)}
              </div>
              {episode.contributors.map((c) => (
                <div key={c.metric} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span>{METRIC_BY_KEY[c.metric as MetricKey]?.shortName ?? c.metric}</span>
                  <span style={{ color: signZColor(c.z, c.metric) }}>
                    z {c.z >= 0 ? '+' : '−'}
                    {Math.abs(c.z).toFixed(1)}
                  </span>
                </div>
              ))}
            </>
          ) : (
            rows.map((row) => {
              const z = row.z[hi]
              return (
                <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'rgba(234,234,234,.6)' }}>{row.label}</span>
                  <span style={{ color: z == null ? 'rgba(234,234,234,.3)' : signZColor(z, row.key) }}>
                    {z == null ? 'no data' : `z ${z >= 0 ? '+' : '−'}${Math.abs(z).toFixed(1)}`}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

/** Tooltip z text color — mirrors the cell's direction-aware hue. */
function signZColor(z: number, metric: string): string {
  const dir = CONCERN_DIRECTION[metric as MetricKey] ?? 0
  if (Math.abs(z) < 0.4 || dir === 0) return 'rgba(234,234,234,.75)'
  return dir * z > 0 ? COLOR.coral : COLOR.teal
}
