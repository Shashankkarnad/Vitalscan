'use client'

// Per-signal deep dive (VitalScan.dc.html "md" screen). Reached via DEEP DIVE →
// links; the signal is carried in ?m=<metricKey>. Header + big value, the rich
// chart, a stats grid, findings on this signal, and instruments + decisions.

import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import IconChip from '@/components/vitalscan/IconChip'
import MetricChart from '@/components/vitalscan/MetricChart'
import {
  hasContract,
  buildMetricBreakdown,
  buildFindings,
  instrumentsForMetric,
} from '@/lib/vitalscan/derive'
import {
  METRIC_BY_KEY,
  STATUS_WORD,
  STATUS_COLOR,
  BADGE_COLOR,
  badgeLabel,
  formatShortDate,
} from '@/lib/vitalscan/metrics'
import { COLOR, rgba, FONT_MONO, FONT_DISPLAY } from '@/lib/vitalscan/tokens'
import { card, rise } from '@/components/vitalscan/styles'
import type { MetricKey } from '@/lib/types'

const mono = (size: number, color: string): React.CSSProperties => ({ fontFamily: FONT_MONO, fontSize: size, color })
const label: React.CSSProperties = { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(232,234,242,.55)' }

function SignalDetail() {
  const router = useRouter()
  const params = useSearchParams()
  const { result, ready } = useScanResult()

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const raw = params.get('m')
  const selected: MetricKey = raw && raw in METRIC_BY_KEY ? (raw as MetricKey) : 'rhr'
  const meta = METRIC_BY_KEY[selected]
  const band = result.bands?.[selected]
  const breakdown = buildMetricBreakdown(result, selected)
  const findings = buildFindings(result).filter((f) => f.decision.metric === selected)
  const instruments = instrumentsForMetric(result, selected)
  const decisions = (result.decisions ?? []).filter((d) => d.metric === selected).slice(0, 6)
  const statusWord = band ? STATUS_WORD[band.status] : 'No data'
  const statusColor = band ? STATUS_COLOR[band.status] : COLOR.slate

  return (
    <div style={{ paddingTop: 48 }}>
      {/* Back */}
      <Link href="/dashboard" style={{ ...mono(11, 'rgba(232,234,242,.5)'), letterSpacing: '.1em', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden>‹</span> All signals
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 20, ...rise(0.06) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <IconChip path={meta.iconPath} color={meta.color} size={52} />
          <div style={{ minWidth: 0 }}>
            <div style={{ ...mono(10.5, 'rgba(232,234,242,.42)'), letterSpacing: '.18em' }}>METRIC · LAST 90 DAYS</div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.015em', margin: '6px 0 0' }}>{meta.name}</h1>
          </div>
        </div>
        <span style={{ ...mono(10.5, statusColor), letterSpacing: '.12em', padding: '6px 13px', borderRadius: 999, border: `1px solid ${rgba(statusColor, 0.4)}`, background: rgba(statusColor, 0.09), textTransform: 'uppercase' }}>
          {statusWord}
        </span>
      </div>

      {/* Big value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 22, flexWrap: 'wrap', ...rise(0.12) }}>
        <span style={mono(48, '#e8eaf2')}>
          {band?.status !== 'data_gap' && band?.current != null ? meta.fmt(band.current) : '—'}
        </span>
        <span style={mono(16, 'rgba(232,234,242,.45)')}>
          {band?.status === 'data_gap' ? `no data · ${band.gap_days} d` : meta.unit}
        </span>
        {breakdown.bandRange && band?.status !== 'no_data' && band?.status !== 'data_gap' && (
          <span style={{ fontSize: 14, color: 'rgba(232,234,242,.45)', marginLeft: 6 }}>{breakdown.bandRange}</span>
        )}
      </div>

      {/* Reliability chip — coverage + source agreement (see combined-source caveats) */}
      {(() => {
        const arr = result.daily?.[selected] ?? []
        const cov = arr.length ? Math.round((100 * arr.filter((v) => v != null).length) / arr.length) : 0
        const excluded = (result.sources ?? []).filter((s) => s.metrics.some((m) => m.metric === selected && m.grade === 'DISTRUST')).length
        const good = cov >= 70 && excluded === 0
        const col = good ? COLOR.teal : excluded > 0 || cov < 40 ? COLOR.amber : 'rgba(232,234,242,.5)'
        return (
          <div style={{ ...mono(10.5, col), letterSpacing: '.08em', marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '3px 9px', borderRadius: 999, border: `1px solid ${rgba(col, 0.4)}`, background: rgba(col, 0.08) }}>
              {cov}% COVERAGE
            </span>
            <span style={{ color: 'rgba(232,234,242,.45)' }}>
              {excluded > 0
                ? `${excluded} instrument${excluded === 1 ? '' : 's'} excluded — disagrees with your reference device`
                : 'instruments agree · deviation vs your own baseline, not a clinical value'}
            </span>
          </div>
        )
      })()}

      {/* Chart */}
      <div style={{ ...card(18), padding: '24px 26px 20px', marginTop: 24, ...rise(0.18, 0.55) }}>
        <MetricChart result={result} metricKey={selected} height={230} />
      </div>

      {/* Stats grid */}
      {breakdown.stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginTop: 14 }}>
          {breakdown.stats.map((s, i) => (
            <div key={s.label} style={{ ...card(14), padding: '16px 18px', ...rise(0.2 + i * 0.03) }}>
              <div style={{ ...mono(10, 'rgba(232,234,242,.42)'), letterSpacing: '.14em', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ ...mono(19, '#e8eaf2'), marginTop: 9 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Findings on this signal */}
      {findings.length > 0 && (
        <>
          <div style={{ ...mono(10.5, 'rgba(232,234,242,.4)'), letterSpacing: '.18em', marginTop: 40 }}>FINDINGS ON THIS SIGNAL</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {findings.map((f) => (
              <div key={f.decision.date + f.title} style={{ ...card(18), borderColor: rgba(f.color, 0.3), padding: '22px 26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ ...mono(10.5, f.color), letterSpacing: '.14em', padding: '4px 11px', borderRadius: 999, border: `1px solid ${rgba(f.color, 0.4)}`, background: rgba(f.color, 0.09) }}>{f.level}</span>
                  <span style={mono(11, 'rgba(232,234,242,.38)')}>{f.date}</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: '14px 0 0', letterSpacing: '-.01em' }}>{f.title}</h2>
                {f.body && <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(232,234,242,.66)', margin: '9px 0 0', maxWidth: 760, textWrap: 'pretty' }}>{f.body}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Instruments + Decisions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14, alignItems: 'start' }}>
        {instruments.length > 0 && (
          <div style={{ ...card(16), padding: '20px 24px' }}>
            <div style={label}>Instruments for this signal</div>
            <div style={{ marginTop: 10 }}>
              {instruments.map((r, i) => (
                <div key={r.source} style={{ padding: '12px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : undefined, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13.5, color: 'rgba(232,234,242,.85)' }}>{r.source}</span>
                    <span style={{ ...mono(10, r.color), letterSpacing: '.12em', padding: '3px 9px', borderRadius: 999, border: `1px solid ${rgba(r.color, 0.4)}` }}>{r.grade}</span>
                  </div>
                  {r.note && <div style={{ fontSize: 12.5, color: 'rgba(232,234,242,.48)', lineHeight: 1.45 }}>{r.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ ...card(16), padding: '20px 24px 14px', display: 'flex', flexDirection: 'column' }}>
          <div style={label}>Decisions on this signal</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 9, flex: 1 }}>
            {decisions.length === 0 && (
              <div style={{ ...mono(11.5, 'rgba(232,234,242,.42)'), padding: '11px 0', lineHeight: 1.5 }}>
                No decisions for {meta.name.toLowerCase()} — it stayed inside your band.
              </div>
            )}
            {decisions.map((e, i) => {
              const bcol = BADGE_COLOR[e.badge]
              return (
                <div key={i} style={{ padding: '11px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : undefined, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={mono(10.5, 'rgba(232,234,242,.38)')}>{formatShortDate(e.date)}</span>
                    <span style={{ ...mono(9, bcol), letterSpacing: '.1em', padding: '2px 8px', borderRadius: 999, border: `1px solid ${rgba(bcol, 0.4)}`, background: rgba(bcol, 0.09) }}>{badgeLabel(e.badge)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(232,234,242,.78)', lineHeight: 1.45, textWrap: 'pretty' }}>{e.title}</div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => router.push('/audit')}
            style={{ ...mono(11, 'rgba(232,234,242,.5)'), letterSpacing: '.1em', textTransform: 'uppercase', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,.06)', padding: '14px 0 6px', marginTop: 8, textAlign: 'left', cursor: 'pointer', width: '100%' }}
          >
            Open full audit log &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SignalPage() {
  return (
    <Suspense fallback={null}>
      <SignalDetail />
    </Suspense>
  )
}
