'use client'

// Dashboard (design lines 123–221): 7 metric tiles linking to Evidence,
// Instruments tile with per-source grades, hero resting-HR chart (620×210),
// Recent decisions list → audit link.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import BandChart, { Sparkline } from '@/components/vitalscan/BandChart'
import { hasContract, buildDashboardTiles, getSeries } from '@/lib/vitalscan/derive'
import { METRIC_BY_KEY, GRADE_COLOR, BADGE_COLOR, badgeLabel, numberWord, capitalize, formatShortDate } from '@/lib/vitalscan/metrics'
import { COLOR, rgba, FONT_MONO } from '@/lib/vitalscan/tokens'
import { card, kicker, h1, rise } from '@/components/vitalscan/styles'
import type { Source, SourceGrade } from '@/lib/types'

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

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const tiles = buildDashboardTiles(result)
  const weekly = result.weekly!
  const sources = result.sources ?? []
  const decisions = result.decisions ?? []
  const rhrSeries = getSeries(result, 'rhr')
  const rhrMeta = METRIC_BY_KEY.rhr
  const rhrBand = rhrSeries.band

  const parts: string[] = [`${capitalize(numberWord(weekly.in_band.length))} in band`]
  if (weekly.watching.length) parts.push(`${numberWord(weekly.watching.length)} watching`)
  if (weekly.gaps.length) parts.push(`${numberWord(weekly.gaps.length)} ${weekly.gaps.length === 1 ? 'gap' : 'gaps'}`)
  if (weekly.no_data.length) parts.push(`${numberWord(weekly.no_data.length)} without data`)
  const dashTitle =
    parts.length === 1 ? `All ${numberWord(weekly.in_band.length)} signals in band.` : parts.join(', ') + '.'

  // Latest non-null band edges for the hero subtitle
  let heroLo: number | null = null
  let heroHi: number | null = null
  for (let i = rhrSeries.dates.length - 1; i >= 0; i--) {
    if (heroHi == null && rhrSeries.hi[i] != null) heroHi = rhrSeries.hi[i]
    if (heroLo == null && rhrSeries.lo[i] != null) heroLo = rhrSeries.lo[i]
    if (heroLo != null && heroHi != null) break
  }

  const distrusted = sources.reduce(
    (n, s) => n + s.metrics.filter((m) => m.grade === 'DISTRUST').length,
    0,
  )

  const mono = (size: number, color: string): React.CSSProperties => ({ fontFamily: FONT_MONO, fontSize: size, color })

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={kicker}>Dashboard &middot; last 90 days</div>
      <h1 style={h1(36)}>{dashTitle}</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginTop: 32,
        }}
      >
        {tiles.map((t, i) => (
          <Link
            key={t.meta.key}
            href={`/evidence#${t.meta.key}`}
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
              ...rise(0.12 + i * 0.04),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span
                style={{
                  ...mono(10, 'rgba(232,234,242,.45)'),
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
                label={`${t.meta.name} 90-day trend sparkline`}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
              <span style={{ ...mono(10, t.statusColor), letterSpacing: '.1em', textTransform: 'uppercase' }}>
                {t.statusWord}
              </span>
              <span style={mono(10.5, 'rgba(232,234,242,.4)')}>{t.zTxt}</span>
            </div>
          </Link>
        ))}

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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
          gap: 14,
          marginTop: 14,
        }}
      >
        {/* Hero resting-HR chart */}
        <div style={{ ...card(16), padding: '20px 24px', ...rise(0.48, 0.55) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR.coral }} />
              <span
                style={{
                  ...mono(11, 'rgba(232,234,242,.55)'),
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                }}
              >
                Resting heart rate
              </span>
            </div>
            <span style={{ ...mono(10.5, 'rgba(232,234,242,.32)'), letterSpacing: '.12em' }}>90 DAYS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
            <span style={mono(26, '#e8eaf2')}>{rhrBand?.current != null ? Math.round(rhrBand.current) : '—'}</span>
            <span style={mono(13, 'rgba(232,234,242,.45)')}>bpm</span>
            {heroLo != null && heroHi != null && (
              <span style={{ fontSize: 13, color: 'rgba(232,234,242,.45)', marginLeft: 8 }}>
                your normal {Math.round(heroLo)}&ndash;{Math.round(heroHi)} bpm
              </span>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <BandChart
              values={rhrSeries.values}
              dates={rhrSeries.dates}
              lo={rhrSeries.lo}
              hi={rhrSeries.hi}
              color={COLOR.coral}
              width={620}
              height={210}
              fmt={rhrMeta.fmt}
              unit="bpm"
              label="Resting heart rate — 90 days against your personal band"
            />
          </div>
        </div>

        {/* Recent decisions */}
        <div style={{ ...card(16), padding: '20px 24px 14px', display: 'flex', flexDirection: 'column', ...rise(0.54, 0.55) }}>
          <div style={{ ...mono(11, 'rgba(232,234,242,.55)'), letterSpacing: '.16em', textTransform: 'uppercase' }}>
            Recent decisions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 9, flex: 1 }}>
            {decisions.length === 0 && (
              <div style={{ ...mono(11.5, 'rgba(232,234,242,.42)'), padding: '11px 0', lineHeight: 1.5 }}>
                No decisions logged for this window.
              </div>
            )}
            {decisions.slice(0, 4).map((e, i) => {
              const bcol = BADGE_COLOR[e.badge]
              return (
                <div
                  key={i}
                  style={{
                    padding: '11px 0',
                    borderTop: '1px solid rgba(255,255,255,.06)',
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
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Open audit log &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
