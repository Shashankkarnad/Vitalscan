'use client'

// All-metrics dotted deviation map — the GitHub-contribution-graph heatmap
// from `feat: multivariate personal-baseline anomaly detector + z-score heatmap`.
// Restored from the pre–PR #2 Dashboard surface without readiness, score chrome,
// metric tiles, or the audit log.

import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import ZHeatmap from '@/components/vitalscan/ZHeatmap'
import EpisodeCards from '@/components/vitalscan/EpisodeCards'
import { hasContract, buildZHeatmap } from '@/lib/vitalscan/derive'
import { numberWord, capitalize } from '@/lib/vitalscan/metrics'
import { COLOR, rgba, FONT_SANS } from '@/lib/vitalscan/tokens'
import { card, kicker, h1, lede } from '@/components/vitalscan/styles'

export default function DashboardPage() {
  const { result, ready } = useScanResult()

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const heatmap = buildZHeatmap(result)
  const episodes = result.combo?.episodes ?? []
  const weekly = result.weekly!

  const parts: string[] = [`${capitalize(numberWord(weekly.in_band.length))} in band`]
  if (weekly.watching.length) parts.push(`${numberWord(weekly.watching.length)} watching`)
  if (weekly.gaps.length) parts.push(`${numberWord(weekly.gaps.length)} ${weekly.gaps.length === 1 ? 'gap' : 'gaps'}`)
  if (weekly.no_data.length) parts.push(`${numberWord(weekly.no_data.length)} without data`)
  const dashTitle =
    parts.length === 1 ? `All ${numberWord(weekly.in_band.length)} signals in band.` : parts.join(', ') + '.'

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={kicker}>Dashboard &middot; last 90 days</div>
      <h1 style={h1(36)}>{dashTitle}</h1>
      <p style={lede}>
        Each cell is how far a signal sat from your rolling baseline that day. Coral moved the concerning way; sage
        the reassuring way. The strip marks days the detector escalated.
      </p>

      {episodes.length > 0 && (
        <div style={{ ...card(16), padding: '22px 26px 20px', marginTop: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR.coral }} />
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 400,
                  fontSize: 11,
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(234,234,234,.55)',
                }}
              >
                Episodes
              </span>
            </div>
            <span
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 400,
                fontSize: 10.5,
                letterSpacing: '.12em',
                color: 'rgba(234,234,234,.32)',
              }}
            >
              {`${episodes.length} IN 90 DAYS`}
            </span>
          </div>
          <p
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 400,
              fontSize: 13.5,
              color: 'rgba(234,234,234,.5)',
              margin: '8px 0 14px',
              maxWidth: 620,
              lineHeight: 1.5,
            }}
          >
            Stretches where several of your signals drifted from their personal baselines together. Tap one to see
            what moved — deviations from your normal, not a diagnosis.
          </p>
          <EpisodeCards episodes={episodes} />
        </div>
      )}

      {heatmap.hasData ? (
        <div style={{ ...card(16), padding: '22px 26px 18px', marginTop: episodes.length > 0 ? 14 : 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: COLOR.coral }} />
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 400,
                  fontSize: 11,
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(234,234,234,.55)',
                }}
              >
                Deviation map
              </span>
            </div>
            <span
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 400,
                fontSize: 10.5,
                letterSpacing: '.12em',
                color: 'rgba(234,234,234,.32)',
              }}
            >
              EVIDENCE · 90 DAYS
            </span>
          </div>
          <p
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 400,
              fontSize: 13,
              color: 'rgba(234,234,234,.5)',
              margin: '8px 0 4px',
              maxWidth: 620,
              lineHeight: 1.5,
            }}
          >
            Each cell is how far a signal sat from your own rolling baseline that day — coral = moved the concerning
            way, sage = the reassuring way. The strip marks the days the detector escalated.
          </p>

          <div style={{ marginTop: 12 }}>
            <ZHeatmap data={heatmap} combo={result.combo} width={940} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', marginTop: 14, alignItems: 'center' }}>
            {[
              { c: rgba(COLOR.teal, 0.85), t: 'reassuring' },
              { c: rgba(COLOR.slate, 0.12), t: '≈ baseline' },
              { c: rgba(COLOR.coral, 0.85), t: 'concerning' },
            ].map((l) => (
              <span key={l.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 12, borderRadius: 2, background: l.c }} />
                <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 10, color: 'rgba(234,234,234,.5)' }}>
                  {l.t}
                </span>
              </span>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 14,
                  height: 12,
                  borderRadius: 2,
                  background:
                    'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(234,234,234,.18) 2px, rgba(234,234,234,.18) 3px)',
                  border: '1px solid rgba(234,234,234,.06)',
                }}
              />
              <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 10, color: 'rgba(234,234,234,.5)' }}>
                no data
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 8, borderRadius: 2, background: COLOR.coral }} />
              <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 10, color: 'rgba(234,234,234,.5)' }}>
                combined alert
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            ...card(16),
            padding: '22px 26px',
            marginTop: 36,
            fontFamily: FONT_SANS,
            fontWeight: 400,
            fontSize: 13,
            color: 'rgba(234,234,234,.42)',
            lineHeight: 1.6,
          }}
        >
          No per-day z-scores in this session — the dotted map needs a 0.3 export with bands.
        </div>
      )}
    </div>
  )
}
