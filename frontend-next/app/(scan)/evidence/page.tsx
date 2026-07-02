'use client'

// Evidence — timelines (design lines 223–278): full-width 90-day BandChart
// per metric with band, outlier dots, NO DATA gap rect, 7h sleep reference,
// month ticks, per-chart note. The SLEEP section additionally carries the
// sleep hypnogram (charts-per-vital-section requirement). Cards carry
// id anchors so Dashboard tiles can deep-link.

import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import BandChart from '@/components/vitalscan/BandChart'
import Hypnogram from '@/components/vitalscan/Hypnogram'
import { hasContract, getSeries, evidenceNote } from '@/lib/vitalscan/derive'
import { METRICS, STATUS_WORD, STATUS_COLOR, formatStepsK } from '@/lib/vitalscan/metrics'
import { rgba, FONT_MONO } from '@/lib/vitalscan/tokens'
import { card, kicker, h1, lede, rise, pill } from '@/components/vitalscan/styles'

export default function EvidencePage() {
  const { result, ready } = useScanResult()

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const mono = (size: number, color: string): React.CSSProperties => ({ fontFamily: FONT_MONO, fontSize: size, color })

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={kicker}>Evidence &middot; last 90 days</div>
      <h1 style={h1(36)}>Seven signals against your own band.</h1>
      <p style={lede}>
        The shaded band is your personal normal — rolling 60-day median &plusmn; 2 robust SD, not a population chart.
        Points outside it are the only points that matter.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36 }}>
        {METRICS.map((meta, i) => {
          const series = getSeries(result, meta.key)
          const band = series.band
          const status = band?.status ?? 'no_data'
          const noData = status === 'no_data' || series.values.every((v) => v == null)
          const note = evidenceNote(result, meta.key)

          // Latest non-null band edges → "your normal lo–hi" text
          let lo: number | null = null
          let hi: number | null = null
          for (let k = series.dates.length - 1; k >= 0; k--) {
            if (hi == null && series.hi[k] != null) hi = series.hi[k]
            if (lo == null && series.lo[k] != null) lo = series.lo[k]
            if (lo != null && hi != null) break
          }
          const fmtAxis = meta.key === 'steps' ? formatStepsK : meta.fmt
          const bandText =
            lo != null && hi != null
              ? `your normal ${fmtAxis(lo)}–${fmtAxis(hi)}${meta.unit ? ' ' + meta.unit : meta.key === 'sleep_hours' ? '' : ''}`
              : STATUS_WORD[status].toLowerCase()

          const isSleep = meta.key === 'sleep_hours'

          return (
            <div
              key={meta.key}
              id={meta.key}
              className="vs-card-hover"
              style={{
                ...card(18),
                border: '1px solid rgba(255,255,255,.1)',
                padding: '22px 26px',
                scrollMarginTop: 24,
                ...rise(0.16 + i * 0.06, 0.55),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                  <span style={{ ...mono(11, 'rgba(232,234,242,.55)'), letterSpacing: '.16em', textTransform: 'uppercase' }}>
                    {meta.name}
                  </span>
                  {(status === 'watching' || status === 'data_gap' || status === 'no_data') && (
                    <span style={pill(STATUS_COLOR[status], rgba(STATUS_COLOR[status], 0.4), rgba(STATUS_COLOR[status], 0.09))}>
                      {STATUS_WORD[status]}
                    </span>
                  )}
                </div>
                <span style={{ ...mono(10.5, 'rgba(232,234,242,.32)'), letterSpacing: '.12em' }}>90 DAYS</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
                <span style={mono(26, '#e8eaf2')}>
                  {status !== 'data_gap' && band?.current != null ? meta.fmt(band.current) : '—'}
                </span>
                <span style={mono(13, 'rgba(232,234,242,.45)')}>
                  {status === 'data_gap' ? `no data · ${band?.gap_days ?? 0} d` : band?.current != null ? meta.unit : ''}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(232,234,242,.45)', marginLeft: 8 }}>{bandText}</span>
              </div>

              <div style={{ marginTop: 10 }}>
                {noData ? (
                  <div
                    style={{
                      height: 120,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,.025)',
                      ...mono(10, 'rgba(232,234,242,.38)'),
                      letterSpacing: '.18em',
                    }}
                  >
                    NO DATA IN THIS EXPORT
                  </div>
                ) : (
                  <BandChart
                    values={series.values}
                    dates={series.dates}
                    lo={series.lo}
                    hi={series.hi}
                    color={meta.color}
                    width={940}
                    height={176}
                    fmt={fmtAxis}
                    unit={meta.unit || (isSleep ? 'h' : '')}
                    refLine={isSleep ? { value: 7, label: '7 h reference' } : undefined}
                    variant={meta.chartKind}
                    label={`${meta.name} — 90 days against your personal band`}
                  />
                )}
              </div>

              {note && (
                <div style={{ ...mono(11.5, 'rgba(232,234,242,.42)'), marginTop: 10, lineHeight: 1.5 }}>{note}</div>
              )}

              {/* SLEEP carries its domain visualization: the hypnogram */}
              {isSleep && (
                <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 18 }}>
                  <div
                    style={{
                      ...mono(10.5, 'rgba(232,234,242,.4)'),
                      letterSpacing: '.18em',
                      textTransform: 'uppercase',
                      marginBottom: 14,
                    }}
                  >
                    Last night &middot; hypnogram
                  </div>
                  {result.sleep_timeline && Object.keys(result.sleep_timeline).length > 0 ? (
                    <Hypnogram timeline={result.sleep_timeline} nights={result.sleep_nights ?? {}} />
                  ) : (
                    <div style={{ ...mono(11.5, 'rgba(232,234,242,.42)'), lineHeight: 1.5 }}>
                      No staged sleep in this export — the hypnogram needs the watch worn overnight.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
