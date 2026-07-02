'use client'

import { useCallback, useState } from 'react'
import type { SleepSegment, SleepNight } from '@/lib/types'
import { formatHours } from '@/lib/utils'

const STAGE_CONFIG = {
  awake: { y: 0, color: '#9AA5B4', label: 'Awake' },
  rem:   { y: 1, color: '#7C3AED', label: 'REM' },
  core:  { y: 2, color: 'rgba(124,58,237,0.45)', label: 'Light (N1+N2)' },
  deep:  { y: 3, color: '#4C1D95', label: 'N3 Deep' },
} as const

const ROW_H = 34
const PADDING = { top: 8, right: 12, bottom: 28, left: 60 }
const SVG_W = 600
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

export default function SleepHypnogram({ timeline, nights }: Props) {
  const dateKeys = Object.keys(timeline).sort().slice(-7).reverse()
  const [selectedDate, setSelectedDate] = useState(dateKeys[0] ?? '')
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const handleSegmentTap = useCallback(
    (cfg: typeof STAGE_CONFIG[keyof typeof STAGE_CONFIG], s: Date, e: Date, x: number, y: number, w: number) => {
      const dur = durMin(s, e)
      setTooltip((prev) => {
        const next = { label: `${cfg.label} · ${fmtTime(s)} – ${fmtTime(e)}`, detail: `${dur} min`, x: x + w / 2, y }
        if (prev?.label === next.label) return null
        return next
      })
    },
    [],
  )

  if (!selectedDate || !timeline[selectedDate]?.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No timeline data for this night.</p>
  }

  const segments = timeline[selectedDate]
  const starts = segments.map((s) => parseDate(s.start))
  const ends = segments.map((s) => parseDate(s.end))
  const nightStartMs = Math.min(...starts.map((d) => d.getTime()))
  const nightEndMs = Math.max(...ends.map((d) => d.getTime()))
  const totalMs = nightEndMs - nightStartMs

  if (!totalMs || !isFinite(totalMs)) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Sleep data incomplete for this night.</p>
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
    const label = tickCursor.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
    hourTicks.push({ x, label })
    tickCursor.setHours(tickCursor.getHours() + 1)
  }

  const night = nights[selectedDate]

  return (
    <div className="flex flex-col gap-4">
      {/* Night selector */}
      <div className="flex gap-1.5 flex-wrap">
        {dateKeys.map((d) => (
          <button
            key={d}
            onClick={() => { setSelectedDate(d); setTooltip(null) }}
            className={[
              'px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[36px]',
              d === selectedDate
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/70 active:bg-secondary',
            ].join(' ')}
          >
            {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </button>
        ))}
      </div>

      {/* SVG hypnogram */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ minWidth: 320 }}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Y-axis labels */}
          {Object.entries(STAGE_CONFIG).map(([stage, cfg]) => (
            <text
              key={stage}
              x={PADDING.left - 8}
              y={PADDING.top + cfg.y * ROW_H + ROW_H / 2 + 4}
              textAnchor="end"
              fontSize={10}
              fill="#9AA5B4"
            >
              {cfg.label}
            </text>
          ))}

          {/* Grid rows */}
          {[0, 1, 2, 3].map((row) => (
            <line
              key={row}
              x1={PADDING.left}
              y1={PADDING.top + row * ROW_H + ROW_H}
              x2={PADDING.left + CHART_W}
              y2={PADDING.top + row * ROW_H + ROW_H}
              stroke="#F3F4F6"
              strokeWidth={1}
            />
          ))}

          {/* Segments */}
          {segments.map((seg, i) => {
            const cfg = STAGE_CONFIG[seg.stage]
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
                rx={3}
                fill={cfg.color}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={() => handleSegmentTap(cfg, s, e, x, y, w)}
                onClick={() => handleSegmentTap(cfg, s, e, x, y, w)}
              />
            )
          })}

          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect
                x={Math.min(tooltip.x - 4, SVG_W - 180)}
                y={Math.max(0, tooltip.y - 44)}
                width={172}
                height={38}
                rx={6}
                fill="#1A1D23"
                opacity={0.9}
              />
              <text
                x={Math.min(tooltip.x + 82, SVG_W - 6)}
                y={Math.max(0, tooltip.y - 28)}
                textAnchor="end"
                fontSize={10}
                fill="#fff"
              >
                {tooltip.label}
              </text>
              <text
                x={Math.min(tooltip.x + 82, SVG_W - 6)}
                y={Math.max(0, tooltip.y - 14)}
                textAnchor="end"
                fontSize={10}
                fill="#9AA5B4"
              >
                {tooltip.detail}
              </text>
            </g>
          )}

          {/* X-axis ticks */}
          {hourTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={t.x}
                y1={PADDING.top + CHART_H}
                x2={t.x}
                y2={PADDING.top + CHART_H + 4}
                stroke="#E4E7EB"
                strokeWidth={1}
              />
              <text
                x={t.x}
                y={PADDING.top + CHART_H + 16}
                textAnchor="middle"
                fontSize={9}
                fill="#9AA5B4"
              >
                {t.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(STAGE_CONFIG).map(([stage, cfg]) => (
          <div key={stage} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: cfg.color }}
            />
            <span className="text-xs text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Per-night stats — sleep_nights values are already in hours */}
      {night && (
        <div className="flex gap-4 flex-wrap text-sm">
          {[
            { label: 'Total', value: formatHours(night.asleep) },
            { label: 'N3 Deep', value: formatHours(night.deep) },
            { label: 'REM', value: formatHours(night.rem) },
            { label: 'Light', value: formatHours(night.core) },
            { label: 'Awake', value: formatHours(night.awake) },
          ].map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="font-semibold text-foreground">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Honesty note */}
      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
        <strong>Note on Light sleep:</strong> Apple Watch uses motion and heart rate to stage sleep.
        N1 and N2 cannot be separated without EEG — they are reported together as "Light (N1+N2)".
        N3 deep and REM are independently detectable and clinically reliable.
      </p>
    </div>
  )
}
