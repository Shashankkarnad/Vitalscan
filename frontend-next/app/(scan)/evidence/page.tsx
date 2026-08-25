'use client'

// Evidence — timelines (design lines 223–278): full-width 90-day BandChart
// per metric with band, outlier dots, NO DATA gap rect, 7h sleep hairline,
// month ticks, per-chart note. SLEEP additionally carries the hypnogram.
// Craft pass: the 90-day band chart is the figure — no 26px hero number, no
// nested MetricBreakdown (card-on-card), no "Deep dive →".

import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import BandChart from '@/components/vitalscan/BandChart'
import Hypnogram from '@/components/vitalscan/Hypnogram'
import { hasContract, getSeries, evidenceNote } from '@/lib/vitalscan/derive'
import { METRICS, STATUS_WORD, STATUS_COLOR, formatStepsK } from '@/lib/vitalscan/metrics'
import { COLOR, INK, FONT_SANS } from '@/lib/vitalscan/tokens'
import { card, kicker, h1, lede } from '@/components/vitalscan/styles'

export default function EvidencePage() {
  const { result, ready } = useScanResult()

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={kicker}>Evidence &middot; last 90 days</div>
      <h1 style={h1(36)}>Seven signals against your own band.</h1>
      <p style={lede}>
        The shaded band is your personal normal — rolling 60-day median &plusmn; 2 robust SD, not a population chart.
        Points outside it are the only points that matter.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36 }}>
        {METRICS.map((meta) => {
          const series = getSeries(result, meta.key)
          const band = series.band
          const status = band?.status ?? 'no_data'
          const noData = status === 'no_data' || series.values.every((v) => v == null)
          const note = evidenceNote(result, meta.key)

          // Latest non-null band edges → "your normal lo–hi" caption
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
              ? `your normal ${fmtAxis(lo)}–${fmtAxis(hi)}${meta.unit ? ' ' + meta.unit : ''}`
              : STATUS_WORD[status].toLowerCase()
          const curTxt =
            status === 'data_gap'
              ? `no data · ${band?.gap_days ?? 0} d`
              : band?.current != null
                ? `${meta.fmt(band.current)}${meta.unit ? ' ' + meta.unit : ''}`
                : '—'
          const isSleep = meta.key === 'sleep_hours'

          return (
            <div
              key={meta.key}
              id={meta.key}
              className="vs-card-hover"
              style={{
                ...card(16),
                padding: '22px 26px',
                scrollMarginTop: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: 500,
                    fontSize: 11,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(234,234,234,.55)',
                  }}
                >
                  {meta.name}
                </span>
                {(status === 'watching' || status === 'data_gap' || status === 'no_data') && (
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontWeight: 500,
                      fontSize: 10.5,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      color: STATUS_COLOR[status],
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {STATUS_WORD[status]}
                  </span>
                )}
              </div>

              {/* Caption, not a hero number — the chart is the figure. */}
              <div
                style={{
                  marginTop: 8,
                  fontFamily: FONT_SANS,
                  fontWeight: 400,
                  fontSize: 13.5,
                  color: 'rgba(234,234,234,.6)',
                }}
              >
                {curTxt} &middot; {bandText}
              </div>

              <div style={{ marginTop: 12 }}>
                {noData ? (
                  <div
                    style={{
                      height: 120,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      background: 'rgba(234,234,234,.025)',
                      fontFamily: FONT_SANS,
                      fontWeight: 500,
                      fontSize: 10.5,
                      letterSpacing: '.1em',
                      color: 'rgba(234,234,234,.38)',
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
                    color={INK}
                    bandColor={COLOR.teal}
                    outlierColor={COLOR.coral}
                    width={940}
                    height={176}
                    fmt={fmtAxis}
                    unit={meta.unit || (isSleep ? 'h' : '')}
                    refLine={isSleep ? { value: 7, label: '7h' } : undefined}
                    variant={meta.chartKind}
                    label={`${meta.name} — 90 days against your personal band`}
                  />
                )}
              </div>

              {note && (
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: 400,
                    fontSize: 12,
                    color: 'rgba(234,234,234,.42)',
                    marginTop: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {note}
                </div>
              )}

              {/* SLEEP carries its domain visualization: the hypnogram */}
              {isSleep && (
                <div style={{ marginTop: 18, borderTop: '1px solid rgba(234,234,234,.08)', paddingTop: 16 }}>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontWeight: 500,
                      fontSize: 10.5,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(234,234,234,.4)',
                      marginBottom: 12,
                    }}
                  >
                    Last night &middot; hypnogram
                  </div>
                  {result.sleep_timeline && Object.keys(result.sleep_timeline).length > 0 ? (
                    <Hypnogram timeline={result.sleep_timeline} nights={result.sleep_nights ?? {}} />
                  ) : (
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontWeight: 400,
                        fontSize: 12,
                        color: 'rgba(234,234,234,.42)',
                        lineHeight: 1.5,
                      }}
                    >
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
