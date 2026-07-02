'use client'

// Custom-SVG band timeline — exact port of the design's chart() geometry
// (docs/design/VitalScan.dc.html:391-422): padding PL46/PR14/PT16/PB22,
// personal-normal band polygon, trailing-null NO DATA rect, dashed reference
// line, outlier dots, month ticks, y hi/lo labels, optional distrusted-source
// dashed overlay. Adds a pure-SVG/DOM hover layer (crosshair + tooltip).

import { useCallback, useRef, useState } from 'react'
import { INK, SURFACE, rgba, FONT_MONO } from '@/lib/vitalscan/tokens'

const PL = 46
const PR = 14
const PT = 16
const PB = 22

export interface BandChartProps {
  values: (number | null)[]
  /** ISO YYYY-MM-DD strings aligned to values. */
  dates: string[]
  lo: (number | null)[]
  hi: (number | null)[]
  color: string
  width?: number
  height?: number
  /** Dashed horizontal reference line, e.g. { value: 7, label: '7 h reference' }. */
  refLine?: { value: number; label: string }
  /** Distrusted-source overlay, drawn faint + dashed under the main line. */
  overlay?: { values: (number | null)[]; label?: string }
  /** Value formatter for axis labels + tooltip. */
  fmt?: (v: number) => string
  /** Unit appended to the tooltip value. */
  unit?: string
  /** Accessible name — identity is never carried by color alone. */
  label: string
}

interface Geometry {
  x: (i: number) => number
  y: (v: number) => number
  linePath: string
  bandPaths: string[]
  overlayPath: string
  dots: { x: number; y: number }[]
  ticks: { x: number; label: string }[]
  yHi: { y: number; text: string } | null
  yLo: { y: number; text: string } | null
  gap: { x: number; w: number; cx: number; days: number } | null
  refY: number | null
}

function buildGeometry(p: BandChartProps, W: number, H: number): Geometry | null {
  const N = p.dates.length
  if (N < 2 || p.values.length !== N) return null
  const fmt = p.fmt ?? ((v: number) => String(v))

  let mn = Infinity
  let mx = -Infinity
  const scan = (arr: (number | null)[]) => {
    for (const v of arr) {
      if (v == null) continue
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
  }
  scan(p.lo)
  scan(p.hi)
  scan(p.values)
  if (p.overlay) scan(p.overlay.values)
  if (p.refLine) {
    mn = Math.min(mn, p.refLine.value)
    mx = Math.max(mx, p.refLine.value)
  }
  if (!isFinite(mn) || !isFinite(mx)) return null
  if (mn === mx) {
    mn -= 1
    mx += 1
  }
  const pd = (mx - mn) * 0.13
  mn -= pd
  mx += pd

  const x = (i: number) => +(PL + (i * (W - PL - PR)) / (N - 1)).toFixed(1)
  const y = (v: number) => +(PT + ((mx - v) * (H - PT - PB)) / (mx - mn)).toFixed(1)

  // Value line — pen lifts across nulls
  let linePath = ''
  let pen = false
  p.values.forEach((v, i) => {
    if (v == null) {
      pen = false
      return
    }
    linePath += (pen ? 'L' : 'M') + x(i) + ' ' + y(v) + ' '
    pen = true
  })

  // Band polygon(s): contiguous runs where both lo & hi are non-null
  const bandPaths: string[] = []
  let run: number[] = []
  const flush = () => {
    if (run.length >= 2) {
      let d = 'M' + x(run[0]) + ' ' + y(p.hi[run[0]]!) + ' '
      for (let k = 1; k < run.length; k++) d += 'L' + x(run[k]) + ' ' + y(p.hi[run[k]]!) + ' '
      for (let k = run.length - 1; k >= 0; k--) d += 'L' + x(run[k]) + ' ' + y(p.lo[run[k]]!) + ' '
      bandPaths.push(d + 'Z')
    }
    run = []
  }
  for (let i = 0; i < N; i++) {
    if (p.lo[i] != null && p.hi[i] != null) run.push(i)
    else flush()
  }
  flush()

  // Outlier dots — value outside band
  const dots: { x: number; y: number }[] = []
  p.values.forEach((v, i) => {
    if (v != null && p.lo[i] != null && p.hi[i] != null && (v > p.hi[i]! || v < p.lo[i]!)) {
      dots.push({ x: x(i), y: y(v) })
    }
  })

  // Month ticks — first of each month
  const ticks: { x: number; label: string }[] = []
  p.dates.forEach((d, i) => {
    if (d.slice(8, 10) === '01') {
      const dt = new Date(d + 'T12:00:00')
      ticks.push({ x: x(i), label: dt.toLocaleString('en', { month: 'short' }).toUpperCase() })
    }
  })

  // y hi/lo labels from latest non-null band edges
  let hiVal: number | null = null
  let loVal: number | null = null
  for (let i = N - 1; i >= 0; i--) {
    if (hiVal == null && p.hi[i] != null) hiVal = p.hi[i]
    if (loVal == null && p.lo[i] != null) loVal = p.lo[i]
    if (hiVal != null && loVal != null) break
  }
  const yHi = hiVal != null ? { y: y(hiVal) + 3, text: fmt(hiVal) } : null
  const yLo = loVal != null ? { y: y(loVal) + 3, text: fmt(loVal) } : null

  // Trailing-null gap rect
  let lastIdx = -1
  for (let i = N - 1; i >= 0; i--) {
    if (p.values[i] != null) {
      lastIdx = i
      break
    }
  }
  let gap: Geometry['gap'] = null
  const trailing = N - 1 - lastIdx
  if (lastIdx >= 0 && trailing >= 2) {
    const gx = x(lastIdx + 1)
    gap = { x: gx, w: +(W - PR - gx).toFixed(1), cx: +((gx + W - PR) / 2).toFixed(1), days: trailing }
  }

  // Distrusted overlay — every 2nd point, dashed (design draws i % 2 skip)
  let overlayPath = ''
  if (p.overlay) {
    let p2 = false
    p.overlay.values.forEach((v, i) => {
      if (i % 2 || v == null) {
        if (v == null) p2 = false
        return
      }
      overlayPath += (p2 ? 'L' : 'M') + x(i) + ' ' + y(v) + ' '
      p2 = true
    })
  }

  return {
    x,
    y,
    linePath,
    bandPaths,
    overlayPath,
    dots,
    ticks,
    yHi,
    yLo,
    gap,
    refY: p.refLine ? y(p.refLine.value) : null,
  }
}

interface Hover {
  i: number
  px: number
}

export default function BandChart(props: BandChartProps) {
  const W = props.width ?? 940
  const H = props.height ?? 176
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)

  const geo = buildGeometry(props, W, H)
  const N = props.dates.length
  const fmt = props.fmt ?? ((v: number) => String(v))

  const onMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      const svg = svgRef.current
      if (!svg || N < 2) return
      const rect = svg.getBoundingClientRect()
      const px = ((e.clientX - rect.left) / rect.width) * W
      const i = Math.max(0, Math.min(N - 1, Math.round(((px - PL) * (N - 1)) / (W - PL - PR))))
      setHover({ i, px })
    },
    [N, W],
  )

  if (!geo) {
    return (
      <div
        style={{
          height: H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: '.12em',
          color: 'rgba(232,234,242,.4)',
        }}
      >
        NO DATA
      </div>
    )
  }

  const hv = hover
  const hvValue = hv ? props.values[hv.i] : null
  const hvLo = hv ? props.lo[hv.i] : null
  const hvHi = hv ? props.hi[hv.i] : null
  let hvZ: number | null = null
  if (hvValue != null && hvLo != null && hvHi != null && hvHi > hvLo) {
    const mid = (hvHi + hvLo) / 2
    const sd = (hvHi - hvLo) / 4 // band = median ± 2 robust SD
    hvZ = sd > 0 ? (hvValue - mid) / sd : null
  }
  const hvDate = hv
    ? new Date(props.dates[hv.i] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  const tooltipLeftPct = hv ? Math.min(82, Math.max(2, (geo.x(hv.i) / W) * 100)) : 0

  return (
    <div style={{ position: 'relative', maxWidth: '100%' }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
        role="img"
        aria-label={props.label}
      >
        {geo.bandPaths.map((d, i) => (
          <path key={i} d={d} fill={rgba(props.color, 0.08)} />
        ))}
        {geo.gap && (
          <>
            <rect x={geo.gap.x} y={PT} width={geo.gap.w} height={H - PT - PB} fill="rgba(255,255,255,.035)" />
            <text
              x={geo.gap.cx}
              y={(PT + H - PB) / 2}
              textAnchor="middle"
              fontFamily="IBM Plex Mono"
              fontSize="9.5"
              letterSpacing="2"
              fill="rgba(232,234,242,.4)"
            >
              {`NO DATA · ${geo.gap.days} D`}
            </text>
          </>
        )}
        {geo.refY != null && props.refLine && (
          <>
            <line x1={PL} x2={W - PR} y1={geo.refY} y2={geo.refY} stroke="rgba(255,255,255,.22)" strokeDasharray="3 4" strokeWidth="1" />
            <text x={W - PR} y={geo.refY - 6} textAnchor="end" fontFamily="IBM Plex Mono" fontSize="9.5" fill="rgba(232,234,242,.4)">
              {props.refLine.label}
            </text>
          </>
        )}
        {geo.overlayPath && (
          <path d={geo.overlayPath} fill="none" stroke={rgba(props.color, 0.25)} strokeWidth="1.2" strokeDasharray="2 5" />
        )}
        <path d={geo.linePath} fill="none" stroke={props.color} strokeWidth="1.8" strokeLinejoin="round" />
        {geo.dots.map((dt, i) => (
          <circle key={i} cx={dt.x} cy={dt.y} r="3.4" fill={props.color} stroke={SURFACE} strokeWidth="1.4" />
        ))}
        {geo.yHi && (
          <text x="6" y={geo.yHi.y} fontFamily="IBM Plex Mono" fontSize="10" fill="rgba(232,234,242,.35)">
            {geo.yHi.text}
          </text>
        )}
        {geo.yLo && (
          <text x="6" y={geo.yLo.y} fontFamily="IBM Plex Mono" fontSize="10" fill="rgba(232,234,242,.35)">
            {geo.yLo.text}
          </text>
        )}
        {geo.ticks.map((tk, i) => (
          <text key={i} x={tk.x} y={H - 7} fontFamily="IBM Plex Mono" fontSize="9.5" letterSpacing="1" fill="rgba(232,234,242,.3)">
            {tk.label}
          </text>
        ))}

        {/* Hover crosshair */}
        {hv && (
          <line x1={geo.x(hv.i)} x2={geo.x(hv.i)} y1={PT} y2={H - PB} stroke="rgba(232,234,242,.25)" strokeWidth="1" />
        )}
        {hv && hvValue != null && (
          <circle cx={geo.x(hv.i)} cy={geo.y(hvValue)} r="3.2" fill={INK} stroke={SURFACE} strokeWidth="1.2" />
        )}

        {/* Hover capture layer */}
        <rect
          x={PL}
          y={PT}
          width={W - PL - PR}
          height={H - PT - PB}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {hv && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipLeftPct}%`,
            top: 0,
            transform: 'translateY(-2px)',
            pointerEvents: 'none',
            background: 'rgba(10,10,16,.92)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 8,
            padding: '7px 10px',
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            lineHeight: 1.55,
            color: 'rgba(232,234,242,.85)',
            whiteSpace: 'nowrap',
            zIndex: 2,
          }}
        >
          <div style={{ color: 'rgba(232,234,242,.5)' }}>{hvDate}</div>
          <div>
            {hvValue != null ? `${fmt(hvValue)}${props.unit ? ' ' + props.unit : ''}` : 'no data'}
          </div>
          {hvLo != null && hvHi != null && (
            <div style={{ color: 'rgba(232,234,242,.55)' }}>
              band {fmt(hvLo)}–{fmt(hvHi)}
              {hvZ != null ? ` · z ${hvZ >= 0 ? '+' : '−'}${Math.abs(hvZ).toFixed(1)}` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sparkline variant — mini band + line, no axes, no hover ───────────────

export interface SparklineProps {
  values: (number | null)[]
  lo: (number | null)[]
  hi: (number | null)[]
  color: string
  height?: number
  label: string
}

export function Sparkline({ values, lo, hi, color, height = 38, label }: SparklineProps) {
  const W = 100
  const H = 30
  const N = values.length
  if (N < 2) {
    return <div style={{ height }} aria-hidden />
  }

  let mn = Infinity
  let mx = -Infinity
  for (const arr of [values, lo, hi]) {
    for (const v of arr) {
      if (v == null) continue
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
  }
  if (!isFinite(mn) || !isFinite(mx)) return <div style={{ height }} aria-hidden />
  if (mn === mx) {
    mn -= 1
    mx += 1
  }
  const pd = (mx - mn) * 0.1
  mn -= pd
  mx += pd
  const x = (i: number) => +((i * W) / (N - 1)).toFixed(2)
  const y = (v: number) => +(((mx - v) * H) / (mx - mn)).toFixed(2)

  let line = ''
  let pen = false
  values.forEach((v, i) => {
    if (v == null) {
      pen = false
      return
    }
    line += (pen ? 'L' : 'M') + x(i) + ' ' + y(v) + ' '
    pen = true
  })

  const bands: string[] = []
  let run: number[] = []
  const flush = () => {
    if (run.length >= 2) {
      let d = 'M' + x(run[0]) + ' ' + y(hi[run[0]]!) + ' '
      for (let k = 1; k < run.length; k++) d += 'L' + x(run[k]) + ' ' + y(hi[run[k]]!) + ' '
      for (let k = run.length - 1; k >= 0; k--) d += 'L' + x(run[k]) + ' ' + y(lo[run[k]]!) + ' '
      bands.push(d + 'Z')
    }
    run = []
  }
  for (let i = 0; i < N; i++) {
    if (lo[i] != null && hi[i] != null) run.push(i)
    else flush()
  }
  flush()

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
      role="img"
      aria-label={label}
    >
      {bands.map((d, i) => (
        <path key={i} d={d} fill={rgba(color, 0.08)} />
      ))}
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
