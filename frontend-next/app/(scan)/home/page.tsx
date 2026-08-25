'use client'

// Home — weekly note: week label, Fraunces verdict, four system cards,
// findings, STEADY footer. Original type + space scale; no stagger.

import Link from 'next/link'
import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import { Sparkline } from '@/components/vitalscan/BandChart'
import { hasContract, buildCategories, buildVerdict, buildFindings } from '@/lib/vitalscan/derive'
import { COLOR, INK, FONT_DISPLAY, FONT_SANS } from '@/lib/vitalscan/tokens'
import { card, sectionLabel } from '@/components/vitalscan/styles'

export default function HomePage() {
  const { result, ready } = useScanResult()

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const verdict = buildVerdict(result)
  const categories = buildCategories(result)
  const findings = buildFindings(result)

  return (
    <div style={{ paddingTop: 76 }}>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: 11,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'rgba(234,234,234,.42)',
        }}
      >
        {verdict.weekLabel}
      </div>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 300,
          fontSize: 52,
          lineHeight: 1.12,
          letterSpacing: '-0.015em',
          maxWidth: 840,
          margin: '18px 0 0',
          textWrap: 'pretty',
        }}
      >
        {verdict.verdict}
      </h1>
      <p
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: 16.5,
          color: 'rgba(234,234,234,.6)',
          maxWidth: 660,
          margin: '16px 0 0',
          lineHeight: 1.55,
          textWrap: 'pretty',
        }}
      >
        {verdict.verdictSub}
      </p>

      <div style={{ ...sectionLabel, marginTop: 44 }}>SYSTEMS</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginTop: 14,
        }}
      >
        {categories.map((cat) => (
          <div key={cat.key} className="vs-card-hover" style={{ ...card(16), padding: '18px 18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 500,
                  fontSize: 16,
                  letterSpacing: '.005em',
                  color: '#eaeaea',
                }}
              >
                {cat.title}
              </span>
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 400,
                  fontSize: 10.5,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: cat.statusColor,
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.statusWord}
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              <Sparkline
                values={cat.series.values}
                lo={cat.series.lo}
                hi={cat.series.hi}
                color={INK}
                bandColor={COLOR.teal}
                height={38}
                variant={cat.chartKind}
                label={`${cat.label} 90-day trend sparkline`}
              />
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {cat.metrics.map((m) => (
                <Link
                  key={m.key}
                  href={`/evidence#${m.key}`}
                  className="vs-row-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '6px 0',
                    textDecoration: 'none',
                    borderRadius: 6,
                  }}
                >
                  <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 12.5, color: 'rgba(234,234,234,.6)' }}>
                    {m.name}
                  </span>
                  <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 12.5, color: '#eaeaea' }}>
                    {m.cur}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {findings.length > 0 && <div style={{ ...sectionLabel, marginTop: 40 }}>FINDINGS</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
        {findings.map((f) => {
          const id = `${f.decision.metric}-${f.decision.date}`
          return (
            <div key={id} style={{ ...card(16), padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: 400,
                    fontSize: 10.5,
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: f.color,
                  }}
                >
                  {f.level}
                </span>
                <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 11, letterSpacing: '.1em', color: 'rgba(234,234,234,.38)' }}>
                  {f.date}
                </span>
              </div>
              <h2
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 500,
                  fontSize: 19,
                  margin: '16px 0 0',
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
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: 'rgba(234,234,234,.66)',
                    margin: '10px 0 0',
                    maxWidth: 760,
                    textWrap: 'pretty',
                  }}
                >
                  {f.body}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 42,
          paddingTop: 22,
          borderTop: '1px solid rgba(234,234,234,.07)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
        }}
      >
        <span
          style={{
            fontFamily: FONT_SANS,
            fontWeight: 400,
            fontSize: 10.5,
            letterSpacing: '.16em',
            color: COLOR.teal,
            whiteSpace: 'nowrap',
          }}
        >
          STEADY
        </span>
        <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(234,234,234,.55)' }}>
          {verdict.steady}
        </span>
      </div>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: 11.5,
          color: 'rgba(234,234,234,.32)',
          marginTop: 14,
        }}
      >
        {verdict.nextNote}
      </div>
    </div>
  )
}
