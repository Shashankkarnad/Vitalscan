'use client'

// Stacked sleep-stage bars: one bar per night, segmented deep/core/REM/awake,
// so duration AND composition read at once. Same SVG idiom as BandChart
// (PL/PR/PT/PB padding, month ticks, column-hover tooltip). Stage colors reuse
// the Hypnogram blue family — identity carries a legend, never color alone.

import { useCallback, useRef, useState } from 'react'
import { FONT_MONO, COLOR, SLEEP_STAGE } from '@/lib/vitalscan/tokens'
import { formatHours } from '@/lib/utils'

const PL = 46
const PR = 14
const PT = 16
const PB = 22

// bottom → top, matching sleep depth; colors from Hypnogram STAGE_CONFIG
const STAGES = [
  { key: 'deep', label: 'Deep', color: SLEEP_STAGE.deep },
  { key: 'core', label: 'Core', color: SLEEP_STAGE.core },
  { key: 'rem', label: 'REM', color: SLEEP_STAGE.rem },
  { key: 'awake', label: 'Awake', color: SLEEP_STAGE.awake },
] as const

export interface StageBarsProps {
  dates: string[]
  deep: (number | null)[]
  core: (number | null)[]
  rem: (number | null)[]
  awake: (number | null)[]
  alerts?: boolean[]
  width?: number
  height?: number
}

export default function StageBars(p: StageBarsProps) {
  const W = p.width ?? 940
  const H = p.height ?? 210
  const N = p.dates.length
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hi, setHi] = useState<number | null>(null)

  const val = (s: (typeof STAGES)[number]['key'], i: number) => p[s][i] ?? 0
  const total = (i: number) => STAGES.reduce((t, s) => t + val(s.key, i), 0)
  const hasNight = (i: number) => STAGES.some((s) => p[s.key][i] != null)

  // Robust y-scale: cap at the 95th-percentile night so a rare double-counted
  // session (a nap merged into a night) doesn't squash every real bar. Taller
  // bars clamp to the top rather than rescaling the chart.
  const totals: number[] = []
  for (let i = 0; i < N; i++) if (hasNight(i)) totals.push(total(i))
  totals.sort((a, b) => a - b)
  const p95 = totals.length ? totals[Math.floor(0.95 * (totals.length - 1))] : 0
  const mx = p95 > 0 ? p95 * 1.1 : 1

  const x = (i: number) => PL + (i * (W - PL - PR)) / Math.max(1, N)
  const y = (v: number) => PT + ((mx - v) * (H - PT - PB)) / mx
  const slot = (W - PL - PR) / Math.max(1, N)
  const barW = Math.max(1, slot - 2)

  const onMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      const svg = svgRef.current
      if (!svg || N < 1) return
      const rect = svg.getBoundingClientRect()
      const px = ((e.clientX - rect.left) / rect.width) * W
      setHi(Math.max(0, Math.min(N - 1, Math.floor((px - PL) / slot))))
    },
    [N, slot, W],
  )

  if (N < 2) return <div style={{ height: H }} aria-hidden />

  // Month ticks
  const ticks: { x: number; label: string }[] = []
  p.dates.forEach((d, i) => {
    if (d.slice(8, 10) === '01') {
      const dt = new Date(d + 'T12:00:00')
      ticks.push({ x: x(i) + barW / 2, label: dt.toLocaleString('en', { month: 'short' }).toUpperCase() })
    }
  })

  const yBase = y(0)
  const hvDate = hi != null ? new Date(p.dates[hi] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const tooltipLeftPct = hi != null ? Math.min(78, Math.max(2, (x(hi) / W) * 100)) : 0

  return (
    <div style={{ position: 'relative', maxWidth: '100%' }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
        role="img"
        aria-label="Nightly sleep broken into deep, core, REM and awake stages over the last 90 days."
      >
        {/* Stacked bars */}
        {p.dates.map((_, i) => {
          if (!hasNight(i)) return null
          let acc = 0
          return (
            <g key={i}>
              {STAGES.map((s) => {
                const v = val(s.key, i)
                if (v <= 0) return null
                const yTop = Math.max(PT, y(acc + v)) // clamp overflow to the top
                const yBot = Math.max(PT, y(acc))
                acc += v
                const h = yBot - yTop
                if (h <= 0) return null
                return <rect key={s.key} x={x(i) + (slot - barW) / 2} y={yTop} width={barW} height={Math.max(0.5, h - 0.6)} fill={s.color} rx={1.5} />
              })}
            </g>
          )
        })}

        {/* Alert ticks */}
        {p.alerts?.map((a, i) => (a ? <path key={`a${i}`} d={`M${x(i) + slot / 2 - 3} ${PT - 9} L${x(i) + slot / 2 + 3} ${PT - 9} L${x(i) + slot / 2} ${PT - 3} Z`} fill={COLOR.coral} /> : null))}

        {/* y label at the 95th-percentile gridline */}
        {p95 > 0 && (
          <text x="6" y={y(p95) + 3} fontFamily="IBM Plex Mono" fontSize="10" fill="rgba(237,234,226,.35)">
            {formatHours(p95)}
          </text>
        )}

        {/* Month ticks */}
        {ticks.map((tk, i) => (
          <text key={i} x={tk.x} y={H - 7} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9.5" letterSpacing="1" fill="rgba(237,234,226,.3)">
            {tk.label}
          </text>
        ))}

        {/* Hover crosshair */}
        {hi != null && <line x1={x(hi) + slot / 2} x2={x(hi) + slot / 2} y1={PT} y2={yBase} stroke="rgba(237,234,226,.22)" strokeWidth="1" />}

        {/* Hover capture */}
        <rect x={PL} y={PT} width={W - PL - PR} height={H - PT - PB} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHi(null)} />
      </svg>

      {hi != null && hasNight(hi) && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipLeftPct}%`,
            top: 0,
            pointerEvents: 'none',
            background: 'rgba(10,10,16,.94)',
            border: '1px solid rgba(237,234,226,.12)',
            borderRadius: 8,
            padding: '8px 11px',
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            lineHeight: 1.6,
            color: 'rgba(237,234,226,.85)',
            whiteSpace: 'nowrap',
            zIndex: 2,
          }}
        >
          <div style={{ color: 'rgba(237,234,226,.5)' }}>{hvDate}</div>
          <div style={{ marginBottom: 2 }}>{formatHours(total(hi))} total</div>
          {STAGES.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                {s.label}
              </span>
              <span>{p[s.key][hi] == null ? '—' : formatHours(val(s.key, hi))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
