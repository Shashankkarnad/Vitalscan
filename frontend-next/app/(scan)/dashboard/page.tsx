'use client'

// Dashboard: metric-centric view — select any signal to see your personal chart,
// breakdown (what / why), and filtered decisions. Tiles double as selector + Evidence link.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import BandChart, { Sparkline } from '@/components/vitalscan/BandChart'
import MetricBreakdown from '@/components/vitalscan/MetricBreakdown'
import ZHeatmap from '@/components/vitalscan/ZHeatmap'
import {
  hasContract,
  buildDashboardTiles,
  buildMetricBreakdown,
  buildZHeatmap,
  defaultDashboardMetric,
  getSeries,
} from '@/lib/vitalscan/derive'
import {
  METRIC_BY_KEY,
  BADGE_COLOR,
  badgeLabel,
  formatStepsK,
  numberWord,
  capitalize,
  formatShortDate,
} from '@/lib/vitalscan/metrics'
import { COLOR, rgba, FONT_MONO } from '@/lib/vitalscan/tokens'
import { card, kicker, h1, rise } from '@/components/vitalscan/styles'
import type { MetricKey, Source, SourceGrade } from '@/lib/types'

function sourceGrade(s: Source): { grade: string; color: string } {
  const grades = new Set<SourceGrade>(s.metrics.map((m) => m.grade))
  if (grades.has('DISTRUST')) {
    return grades.has('TRUSTED') || grades.has('PARTIAL')
      ? { grade: 'MIXED', color: COLOR.amber }
      : { grade: 'DISTRUST', color: COLOR.coral }
  }
  if (grades.has('PARTIAL')) return { grade: 'PARTIAL', color: COLOR.amber }
  if (grades.has('TRUSTED')) return { grade: 'TRUSTED', color: COLOR.teal }
  return { grade: 'UNGRADED', color: COLOR.slate }
}

export default function DashboardPage() {
  const router = useRouter()
  const { result, ready } = useScanResult()
  const [selected, setSelected] = useState<MetricKey>('rhr')
  const [picked, setPicked] = useState(false)

  useEffect(() => {
    if (result && hasContract(result) && !picked) {
      setSelected(defaultDashboardMetric(result))
    }
  }, [result, picked])

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const tiles = buildDashboardTiles(result)
  const heatmap = buildZHeatmap(result)
  const episodes = result.combo?.episodes ?? []
  const weekly = result.weekly!
  const sources = result.sources ?? []
  const decisions = result.decisions ?? []

  const meta = METRIC_BY_KEY[selected]
  const series = getSeries(result, selected)
  const band = series.band
  const breakdown = buildMetricBreakdown(result, selected)
  const fmtAxis = selected === 'steps' ? formatStepsK : meta.fmt
  const isSleep = selected === 'sleep_hours'

  const metricDecisions = decisions.filter((d) => d.metric === selected).slice(0, 4)

  const parts: string[] = [`${capitalize(numberWord(weekly.in_band.length))} in band`]
  if (weekly.watching.length) parts.push(`${numberWord(weekly.watching.length)} watching`)
  if (weekly.gaps.length) parts.push(`${numberWord(weekly.gaps.length)} ${weekly.gaps.length === 1 ? 'gap' : 'gaps'}`)
  if (weekly.no_data.length) parts.push(`${numberWord(weekly.no_data.length)} without data`)
  const dashTitle =
    parts.length === 1 ? `All ${numberWord(weekly.in_band.length)} signals in band.` : parts.join(', ') + '.'

  const distrusted = sources.reduce(
    (n, s) => n + s.metrics.filter((m) => m.grade === 'DISTRUST').length,
    0,
  )

  const mono = (size: number, color: string): React.CSSProperties => ({ fontFamily: FONT_MONO, fontSize: size, color })

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={kicker}>Dashboard &middot; last 90 days</div>
      <h1 style={h1(36)}>{dashTitle}</h1>
      <p style={{ fontSize: 14.5, color: 'rgba(232,234,242,.5)', marginTop: 10, maxWidth: 560, lineHeight: 1.5 }}>
        Select a signal to see your personal chart and what it means for you.
      </p>

      {/* Metric selector tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginTop: 28,
        }}
      >
        {tiles.map((t, i) => {
          const active = t.meta.key === selected
          return (
            <button
              key={t.meta.key}
              type="button"
              onClick={() => {
                setPicked(true)
                setSelected(t.meta.key)
              }}
              className="vs-tile-hover"
              style={{
                textAlign: 'left',
                display: 'block',
                width: '100%',
                color: '#e8eaf2',
                ...card(16),
                padding: '16px 16px 14px',
                cursor: 'pointer',
                border: active ? `1px solid ${rgba(t.meta.color, 0.55)}` : undefined,
                boxShadow: active ? `0 0 0 1px ${rgba(t.meta.color, 0.2)}` : undefined,
                background: active ? rgba(t.meta.color, 0.06) : undefined,
                ...rise(0.12 + i * 0.04),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span
                  style={{
                    ...mono(10, active ? t.meta.color : 'rgba(232,234,242,.45)'),
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t.meta.name}
                </span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.statusColor }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
                <span style={{ ...mono(24, '#e8eaf2'), letterSpacing: '-.01em' }}>{t.cur}</span>
                <span style={mono(11.5, 'rgba(232,234,242,.45)')}>{t.meta.unit}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <Sparkline
                  values={t.series.values}
                  lo={t.series.lo}
                  hi={t.series.hi}
                  color={t.meta.color}
                  height={40}
                  variant={t.meta.chartKind}
                  label={`${t.meta.name} 90-day trend sparkline`}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
                <span style={{ ...mono(10, t.statusColor), letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  {t.statusWord}
                </span>
                <span style={mono(10.5, 'rgba(232,234,242,.4)')}>{t.zTxt}</span>
              </div>
            </button>
          )
        })}

        {/* Instruments tile */}
        <Link
          href="/instruments"
          className="vs-tile-hover"
          style={{
            textAlign: 'left',
            display: 'block',
            width: '100%',
            color: '#e8eaf2',
            textDecoration: 'none',
            ...card(16),
            padding: '16px 16px 14px',
            cursor: 'pointer',
            ...rise(0.4),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ ...mono(10, 'rgba(232,234,242,.45)'), letterSpacing: '.14em', textTransform: 'uppercase' }}>
              Instruments
            </span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: distrusted > 0 ? COLOR.coral : COLOR.teal,
              }}
            />
          </div>
          {sources.length === 0 ? (
            <div style={{ ...mono(11.5, 'rgba(232,234,242,.42)'), marginTop: 15, lineHeight: 1.5 }}>
              No per-source data in this export.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 15 }}>
              {sources.slice(0, 4).map((s) => {
                const g = sourceGrade(s)
                return (
                  <div
                    key={s.name}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                  >
                    <span style={{ fontSize: 12.5, color: 'rgba(232,234,242,.7)' }}>{s.name}</span>
                    <span
                      style={{
                        ...mono(9, g.color),
                        letterSpacing: '.1em',
                        padding: '2px 7px',
                        borderRadius: 999,
                        border: `1px solid ${rgba(g.color, 0.4)}`,
                      }}
                    >
                      {g.grade}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
            <span
              style={{
                ...mono(10, distrusted > 0 ? COLOR.coral : 'rgba(232,234,242,.4)'),
                letterSpacing: '.1em',
                textTransform: 'uppercase',
              }}
            >
              {distrusted > 0 ? `${distrusted} pair${distrusted === 1 ? '' : 's'} distrusted` : 'no pairs distrusted'}
            </span>
            <span style={mono(10.5, 'rgba(232,234,242,.4)')}>graded per export</span>
          </div>
        </Link>
      </div>

      {/* Multivariate deviation map */}
      {heatmap.hasData && (
        <div style={{ ...card(16), padding: '22px 26px 18px', marginTop: 14, ...rise(0.46, 0.55) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: COLOR.coral }} />
              <span style={{ ...mono(11, 'rgba(232,234,242,.55)'), letterSpacing: '.16em', textTransform: 'uppercase' }}>
                Deviation map
              </span>
            </div>
            <span style={{ ...mono(10.5, 'rgba(232,234,242,.32)'), letterSpacing: '.12em' }}>
              {episodes.length === 0
                ? 'NO COMBINED ALERTS · 90 DAYS'
                : `${episodes.length} EPISODE${episodes.length === 1 ? '' : 'S'} · 90 DAYS`}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(232,234,242,.5)', margin: '8px 0 4px', maxWidth: 620, lineHeight: 1.5 }}>
            Each cell is how far a signal sat from <em>your own</em> rolling baseline that day (robust z).
            Coral = moved the concerning way, teal = the reassuring way. The strip marks days the
            multivariate detector escalated — a coherent pattern across signals, not one noisy metric.
          </p>

          <div style={{ marginTop: 12 }}>
            <ZHeatmap data={heatmap} combo={result.combo} width={940} />
          </div>

          {/* Legend — identity never by color alone */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', marginTop: 14, alignItems: 'center' }}>
            {[
              { c: rgba(COLOR.teal, 0.85), t: 'reassuring' },
              { c: rgba(COLOR.slate, 0.12), t: '≈ baseline' },
              { c: rgba(COLOR.coral, 0.85), t: 'concerning' },
            ].map((l) => (
              <span key={l.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 12, borderRadius: 2, background: l.c }} />
                <span style={mono(10, 'rgba(232,234,242,.5)')}>{l.t}</span>
              </span>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 12, borderRadius: 2, background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(232,234,242,.18) 2px, rgba(232,234,242,.18) 3px)', border: '1px solid rgba(255,255,255,.06)' }} />
              <span style={mono(10, 'rgba(232,234,242,.5)')}>no data</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 8, borderRadius: 2, background: COLOR.coral }} />
              <span style={mono(10, 'rgba(232,234,242,.5)')}>combined alert</span>
            </span>
          </div>
        </div>
      )}

      {/* Selected metric — chart + personal breakdown */}
      <div style={{ ...card(16), padding: '22px 26px', marginTop: 14, ...rise(0.48, 0.55) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
            <span
              style={{
                ...mono(11, 'rgba(232,234,242,.55)'),
                letterSpacing: '.16em',
                textTransform: 'uppercase',
              }}
            >
              {meta.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ ...mono(10.5, 'rgba(232,234,242,.32)'), letterSpacing: '.12em' }}>90 DAYS · YOUR BAND</span>
            <Link
              href={`/evidence#${selected}`}
              style={{
                ...mono(10, meta.color),
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Full evidence &rarr;
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <span style={mono(26, '#e8eaf2')}>
            {band?.status !== 'data_gap' && band?.current != null ? meta.fmt(band.current) : '—'}
          </span>
          <span style={mono(13, 'rgba(232,234,242,.45)')}>
            {band?.status === 'data_gap' ? `no data · ${band.gap_days} d` : meta.unit || (isSleep ? 'h' : '')}
          </span>
          {breakdown.bandRange && band?.status !== 'no_data' && band?.status !== 'data_gap' && (
            <span style={{ fontSize: 13, color: 'rgba(232,234,242,.45)' }}>{breakdown.bandRange}</span>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <BandChart
            values={series.values}
            dates={series.dates}
            lo={series.lo}
            hi={series.hi}
            color={meta.color}
            width={940}
            height={210}
            fmt={fmtAxis}
            unit={meta.unit || (isSleep ? 'h' : '')}
            refLine={isSleep ? { value: 7, label: '7 h reference' } : undefined}
            variant={meta.chartKind}
            label={`${meta.name} — 90 days against your personal band`}
          />
        </div>

        <MetricBreakdown breakdown={breakdown} accent={meta.color} />
      </div>

      {/* Decisions for selected metric */}
      <div style={{ ...card(16), padding: '20px 24px 14px', marginTop: 14, ...rise(0.54, 0.55) }}>
        <div style={{ ...mono(11, 'rgba(232,234,242,.55)'), letterSpacing: '.16em', textTransform: 'uppercase' }}>
          {meta.name} &middot; decision log
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 9 }}>
          {metricDecisions.length === 0 && (
            <div style={{ ...mono(11.5, 'rgba(232,234,242,.42)'), padding: '11px 0', lineHeight: 1.5 }}>
              No decisions for {meta.name.toLowerCase()} in this window — it stayed inside your band.
            </div>
          )}
          {metricDecisions.map((e, i) => {
            const bcol = BADGE_COLOR[e.badge]
            return (
              <div
                key={i}
                style={{
                  padding: '11px 0',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={mono(10.5, 'rgba(232,234,242,.38)')}>{formatShortDate(e.date)}</span>
                  <span
                    style={{
                      ...mono(9, bcol),
                      letterSpacing: '.1em',
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: `1px solid ${rgba(bcol, 0.4)}`,
                      background: rgba(bcol, 0.09),
                    }}
                  >
                    {badgeLabel(e.badge)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(232,234,242,.78)', lineHeight: 1.45, textWrap: 'pretty' }}>
                  {e.title}
                </div>
                {e.lines.length > 0 && (
                  <div style={{ ...mono(10.5, 'rgba(232,234,242,.45)'), lineHeight: 1.5 }}>
                    {e.lines.map((ln) => ln.v).join(' · ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <button
          className="vs-ghost-btn"
          onClick={() => router.push('/audit')}
          style={{
            ...mono(11, 'rgba(232,234,242,.5)'),
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            background: 'none',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,.06)',
            padding: '14px 0 6px',
            marginTop: 8,
            textAlign: 'left',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Open full audit log &rarr;
        </button>
      </div>
    </div>
  )
}
