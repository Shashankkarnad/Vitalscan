'use client'

// Per-signal deep dive (VitalScan.dc.html "md" screen). Restored from
// `feat: per-signal deep-dive screen`. Signal is ?m=<metricKey>.

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
import { COLOR, rgba, FONT_DISPLAY, FONT_SANS } from '@/lib/vitalscan/tokens'
import { card } from '@/components/vitalscan/styles'
import type { MetricKey } from '@/lib/types'

const sans = (size: number, color: string): React.CSSProperties => ({
  fontFamily: FONT_SANS,
  fontWeight: 400,
  fontSize: size,
  color,
})
const label: React.CSSProperties = {
  fontFamily: FONT_SANS,
  fontWeight: 400,
  fontSize: 11,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: 'rgba(234,234,234,.55)',
}

function SignalDetail() {
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
      <Link
        href="/dashboard"
        style={{
          ...sans(11, 'rgba(234,234,234,.5)'),
          letterSpacing: '.1em',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span aria-hidden>‹</span> All signals
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginTop: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <IconChip path={meta.iconPath} color={meta.color} size={52} />
          <div style={{ minWidth: 0 }}>
            <div style={{ ...sans(10.5, 'rgba(234,234,234,.42)'), letterSpacing: '.18em' }}>METRIC · LAST 90 DAYS</div>
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 300,
                fontSize: 40,
                lineHeight: 1.1,
                letterSpacing: '-0.015em',
                margin: '6px 0 0',
              }}
            >
              {meta.name}
            </h1>
          </div>
        </div>
        <span
          style={{
            ...sans(10.5, statusColor),
            letterSpacing: '.12em',
            padding: '6px 13px',
            borderRadius: 999,
            border: `1px solid ${rgba(statusColor, 0.4)}`,
            background: rgba(statusColor, 0.09),
            textTransform: 'uppercase',
          }}
        >
          {statusWord}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
        <span style={sans(48, '#eaeaea')}>
          {band?.status !== 'data_gap' && band?.current != null ? meta.fmt(band.current) : '—'}
        </span>
        <span style={sans(16, 'rgba(234,234,234,.45)')}>
          {band?.status === 'data_gap' ? `no data · ${band.gap_days} d` : meta.unit}
        </span>
        {breakdown.bandRange && band?.status !== 'no_data' && band?.status !== 'data_gap' && (
          <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 14, color: 'rgba(234,234,234,.45)', marginLeft: 6 }}>
            {breakdown.bandRange}
          </span>
        )}
      </div>

      {(() => {
        const arr = result.daily?.[selected] ?? []
        const cov = arr.length ? Math.round((100 * arr.filter((v) => v != null).length) / arr.length) : 0
        const excluded = (result.sources ?? []).filter((s) =>
          s.metrics.some((m) => m.metric === selected && m.grade === 'DISTRUST'),
        ).length
        const good = cov >= 70 && excluded === 0
        const col = good ? COLOR.teal : excluded > 0 || cov < 40 ? COLOR.coral : 'rgba(234,234,234,.5)'
        return (
          <div
            style={{
              ...sans(10.5, col),
              letterSpacing: '.08em',
              marginTop: 14,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                padding: '3px 9px',
                borderRadius: 999,
                border: `1px solid ${rgba(col, 0.4)}`,
                background: rgba(col, 0.08),
              }}
            >
              {cov}% COVERAGE
            </span>
            <span style={{ color: 'rgba(234,234,234,.45)' }}>
              {excluded > 0
                ? `${excluded} instrument${excluded === 1 ? '' : 's'} excluded — disagrees with your reference device`
                : 'instruments agree · deviation vs your own baseline, not a clinical value'}
            </span>
          </div>
        )
      })()}

      <div style={{ ...card(18), padding: '24px 26px 20px', marginTop: 24 }}>
        <MetricChart result={result} metricKey={selected} height={230} />
      </div>

      {breakdown.stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginTop: 14 }}>
          {breakdown.stats.map((s) => (
            <div key={s.label} style={{ ...card(14), padding: '16px 18px' }}>
              <div style={{ ...sans(10, 'rgba(234,234,234,.42)'), letterSpacing: '.14em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ ...sans(19, '#eaeaea'), marginTop: 9 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {findings.length > 0 && (
        <>
          <div style={{ ...sans(10.5, 'rgba(234,234,234,.4)'), letterSpacing: '.18em', marginTop: 40 }}>
            FINDINGS ON THIS SIGNAL
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {findings.map((f) => (
              <div key={f.decision.date + f.title} style={{ ...card(18), padding: '22px 26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span
                    style={{
                      ...sans(10.5, f.color),
                      letterSpacing: '.14em',
                      padding: '4px 11px',
                      borderRadius: 999,
                      border: `1px solid ${rgba(f.color, 0.4)}`,
                      background: rgba(f.color, 0.09),
                    }}
                  >
                    {f.level}
                  </span>
                  <span style={sans(11, 'rgba(234,234,234,.38)')}>{f.date}</span>
                </div>
                <h2
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: 500,
                    fontSize: 18,
                    margin: '14px 0 0',
                    letterSpacing: '-.01em',
                  }}
                >
                  {f.title}
                </h2>
                {f.body && (
                  <p
                    style={{
                      fontFamily: FONT_SANS,
                      fontWeight: 400,
                      fontSize: 14.5,
                      lineHeight: 1.55,
                      color: 'rgba(234,234,234,.66)',
                      margin: '9px 0 0',
                      maxWidth: 760,
                      textWrap: 'pretty',
                    }}
                  >
                    {f.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          marginTop: 14,
          alignItems: 'start',
        }}
      >
        {instruments.length > 0 && (
          <div style={{ ...card(16), padding: '20px 24px' }}>
            <div style={label}>Instruments for this signal</div>
            <div style={{ marginTop: 10 }}>
              {instruments.map((r, i) => (
                <div
                  key={r.source}
                  style={{
                    padding: '12px 0',
                    borderTop: i > 0 ? '1px solid rgba(234,234,234,.06)' : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 7,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 13.5, color: 'rgba(234,234,234,.85)' }}>
                      {r.source}
                    </span>
                    <span
                      style={{
                        ...sans(10, r.color),
                        letterSpacing: '.12em',
                        padding: '3px 9px',
                        borderRadius: 999,
                        border: `1px solid ${rgba(r.color, 0.4)}`,
                      }}
                    >
                      {r.grade}
                    </span>
                  </div>
                  {r.note && (
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontWeight: 400,
                        fontSize: 12.5,
                        color: 'rgba(234,234,234,.48)',
                        lineHeight: 1.45,
                      }}
                    >
                      {r.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ ...card(16), padding: '20px 24px 14px', display: 'flex', flexDirection: 'column' }}>
          <div style={label}>Decisions on this signal</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 9, flex: 1 }}>
            {decisions.length === 0 && (
              <div style={{ ...sans(11.5, 'rgba(234,234,234,.42)'), padding: '11px 0', lineHeight: 1.5 }}>
                No decisions for {meta.name.toLowerCase()} — it stayed inside your band.
              </div>
            )}
            {decisions.map((e, i) => {
              const bcol = BADGE_COLOR[e.badge]
              return (
                <div
                  key={i}
                  style={{
                    padding: '11px 0',
                    borderTop: i > 0 ? '1px solid rgba(234,234,234,.06)' : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={sans(10.5, 'rgba(234,234,234,.38)')}>{formatShortDate(e.date)}</span>
                    <span
                      style={{
                        ...sans(9, bcol),
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
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontWeight: 400,
                      fontSize: 13,
                      color: 'rgba(234,234,234,.78)',
                      lineHeight: 1.45,
                      textWrap: 'pretty',
                    }}
                  >
                    {e.title}
                  </div>
                </div>
              )
            })}
          </div>
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
