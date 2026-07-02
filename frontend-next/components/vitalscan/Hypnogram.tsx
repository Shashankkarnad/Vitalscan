'use client'

// Sleep hypnogram adapted to the redesign language (dark #0a0a10 surface,
// IBM Plex Mono labels, blue #6c8cff family lanes, direct lane labels —
// identity never by color alone). Derived from
// components/results/charts/SleepHypnogram.tsx, which stays untouched for
// the legacy /results page.

import { useCallback, useState } from 'react'
import type { SleepSegment, SleepNight } from '@/lib/types'
import { formatHours } from '@/lib/utils'
import { FONT_MONO } from '@/lib/vitalscan/tokens'

// Blue-family lanes on the dark surface; each lane carries its own text label.
const STAGE_CONFIG = {
  awake: { y: 0, color: 'rgba(108,140,255,.28)', label: 'AWAKE' },
  rem: { y: 1, color: '#8ea6ff', label: 'REM' },
  core: { y: 2, color: 'rgba(108,140,255,.55)', label: 'CORE' },
  deep: { y: 3, color: '#5468d4', label: 'DEEP' },
} as const

const ROW_H = 30
const PADDING = { top: 8, right: 12, bottom: 26, left: 52 }
const SVG_W = 880
const SVG_H = ROW_H * 4 + PADDING.top + PADDING.bottom
const CHART_W = SVG_W - PADDING.left - PADDING.right
const CHART_H = ROW_H * 4

interface Tooltip {
  label: string
  detail: string
  x: number
  y: number
}

function parseDate(str: string): Date {
  // Apple Health dates are "YYYY-MM-DD HH:MM:SS +ZZZZ"; the offset suffix is not
  // valid ISO for Date(). Nights are bucketed by wall-clock time upstream, so
  // parse the wall-clock part and ignore the offset.
  return new Date(str.slice(0, 19).replace(' ', 'T'))
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function durMin(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000)
}

interface Props {
  timeline: Record<string, SleepSegment[]>
  nights: Record<string, SleepNight>
}

export default function Hypnogram({ timeline, nights }: Props) {
  const dateKeys = Object.keys(timeline).sort().slice(-7).reverse()
  const [selectedDate, setSelectedDate] = useState(dateKeys[0] ?? '')
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const handleSegmentTap = useCallback(
    (cfg: (typeof STAGE_CONFIG)[keyof typeof STAGE_CONFIG], s: Date, e: Date, x: number, y: number, w: number) => {
      const dur = durMin(s, e)
      setTooltip((prev) => {
        const next = { label: `${cfg.label} · ${fmtTime(s)} – ${fmtTime(e)}`, detail: `${dur} min`, x: x + w / 2, y }
        if (prev?.label === next.label && prev?.x === next.x) return null
        return next
      })
    },
    [],
  )

  const mono = (size: number, color: string): React.CSSProperties => ({
    fontFamily: FONT_MONO,
    fontSize: size,
    color,
  })

  if (!selectedDate || !timeline[selectedDate]?.length) {
    return (
      <p style={{ ...mono(11.5, 'rgba(232,234,242,.42)'), padding: '14px 0', margin: 0 }}>
        No hypnogram data for this night.
      </p>
    )
  }

  const segments = timeline[selectedDate]
  const starts = segments.map((s) => parseDate(s.start))
  const ends = segments.map((s) => parseDate(s.end))
  const nightStartMs = Math.min(...starts.map((d) => d.getTime()))
  const nightEndMs = Math.max(...ends.map((d) => d.getTime()))
  const totalMs = nightEndMs - nightStartMs

  if (!totalMs || !isFinite(totalMs)) {
    return (
      <p style={{ ...mono(11.5, 'rgba(232,234,242,.42)'), padding: '14px 0', margin: 0 }}>
        Sleep data incomplete for this night.
      </p>
    )
  }

  const nightStart = new Date(nightStartMs)
  const nightEnd = new Date(nightEndMs)

  // X-axis hour ticks
  const hourTicks: { x: number; label: string }[] = []
  const tickCursor = new Date(nightStart)
  tickCursor.setMinutes(0, 0, 0)
  if (tickCursor.getTime() < nightStartMs) tickCursor.setHours(tickCursor.getHours() + 1)
  const MAX_TICKS = 16
  while (tickCursor <= nightEnd && hourTicks.length < MAX_TICKS) {
    const x = PADDING.left + ((tickCursor.getTime() - nightStartMs) / totalMs) * CHART_W
    const label = tickCursor.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toUpperCase().replace(' ', '')
    hourTicks.push({ x, label })
    tickCursor.setHours(tickCursor.getHours() + 1)
  }

  const night = nights[selectedDate]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Night selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {dateKeys.map((d) => {
          const active = d === selectedDate
          return (
            <button
              key={d}
              onClick={() => {
                setSelectedDate(d)
                setTooltip(null)
              }}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10.5,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                padding: '6px 11px',
                borderRadius: 8,
                cursor: 'pointer',
                border: `1px solid ${active ? 'rgba(255,255,255,.14)' : 'transparent'}`,
                background: active ? 'rgba(255,255,255,.08)' : 'transparent',
                color: active ? '#e8eaf2' : 'rgba(232,234,242,.48)',
                transition: 'color .15s ease, background .15s ease',
              }}
            >
              {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </button>
          )
        })}
      </div>

      {/* SVG hypnogram */}
      <div style={{ position: 'relative', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', minWidth: 320, display: 'block' }}
          onMouseLeave={() => setTooltip(null)}
          role="img"
          aria-label={`Sleep hypnogram for ${selectedDate}: stage lanes over the night`}
        >
          {/* Lane labels */}
          {Object.entries(STAGE_CONFIG).map(([stage, cfg]) => (
            <text
              key={stage}
              x={PADDING.left - 8}
              y={PADDING.top + cfg.y * ROW_H + ROW_H / 2 + 3.5}
              textAnchor="end"
              fontFamily="IBM Plex Mono"
              fontSize={9.5}
              letterSpacing="1"
              fill="rgba(232,234,242,.45)"
            >
              {cfg.label}
            </text>
          ))}

          {/* Lane separators */}
          {[0, 1, 2, 3].map((row) => (
            <line
              key={row}
              x1={PADDING.left}
              y1={PADDING.top + row * ROW_H + ROW_H}
              x2={PADDING.left + CHART_W}
              y2={PADDING.top + row * ROW_H + ROW_H}
              stroke="rgba(255,255,255,.06)"
              strokeWidth={1}
            />
          ))}

          {/* Stage blocks — ≥2px wide, 2px surface gaps between lanes */}
          {segments.map((seg, i) => {
            const cfg = STAGE_CONFIG[seg.stage]
            if (!cfg) return null
            const s = parseDate(seg.start)
            const e = parseDate(seg.end)
            const x = PADDING.left + ((s.getTime() - nightStartMs) / totalMs) * CHART_W
            const w = Math.max(2, ((e.getTime() - s.getTime()) / totalMs) * CHART_W)
            const y = PADDING.top + cfg.y * ROW_H + 2
            const h = ROW_H - 4

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={w}
                height={h}
                rx={2.5}
                fill={cfg.color}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => handleSegmentTap(cfg, s, e, x, y, w)}
                onClick={() => handleSegmentTap(cfg, s, e, x, y, w)}
              />
            )
          })}

          {/* Per-mark tooltip */}
          {tooltip && (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={Math.max(PADDING.left, Math.min(tooltip.x - 90, SVG_W - 192))}
                y={Math.max(0, tooltip.y - 44)}
                width={186}
                height={38}
                rx={8}
                fill="rgba(10,10,16,.92)"
                stroke="rgba(255,255,255,.12)"
                strokeWidth={1}
              />
              <text
                x={Math.max(PADDING.left, Math.min(tooltip.x - 90, SVG_W - 192)) + 10}
                y={Math.max(0, tooltip.y - 44) + 16}
                fontFamily="IBM Plex Mono"
                fontSize={9.5}
                fill="#e8eaf2"
              >
                {tooltip.label}
              </text>
              <text
                x={Math.max(PADDING.left, Math.min(tooltip.x - 90, SVG_W - 192)) + 10}
                y={Math.max(0, tooltip.y - 44) + 30}
                fontFamily="IBM Plex Mono"
                fontSize={9.5}
                fill="rgba(232,234,242,.55)"
              >
                {tooltip.detail}
              </text>
            </g>
          )}

          {/* X-axis hour ticks */}
          {hourTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={t.x}
                y1={PADDING.top + CHART_H}
                x2={t.x}
                y2={PADDING.top + CHART_H + 4}
                stroke="rgba(255,255,255,.14)"
                strokeWidth={1}
              />
              <text
                x={t.x}
                y={PADDING.top + CHART_H + 16}
                textAnchor="middle"
                fontFamily="IBM Plex Mono"
                fontSize={9}
                letterSpacing="1"
                fill="rgba(232,234,242,.3)"
              >
                {t.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Per-night stats — mono key-value strip */}
      {night && (
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          {[
            { label: 'TOTAL', value: formatHours(night.asleep) },
            { label: 'DEEP', value: formatHours(night.deep) },
            { label: 'REM', value: formatHours(night.rem) },
            { label: 'CORE', value: formatHours(night.core) },
            { label: 'AWAKE', value: formatHours(night.awake) },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={mono(9.5, 'rgba(232,234,242,.38)')}>{s.label}</span>
              <span style={mono(12.5, '#e8eaf2')}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Honesty note */}
      <p
        style={{
          ...mono(11, 'rgba(232,234,242,.4)'),
          lineHeight: 1.6,
          borderTop: '1px solid rgba(255,255,255,.07)',
          paddingTop: 12,
          margin: 0,
        }}
      >
        Core = N1+N2 — Apple Watch stages sleep from motion and heart rate; N1 and N2 cannot be separated without EEG.
        Deep (N3) and REM are independently detectable.
      </p>
    </div>
  )
}
