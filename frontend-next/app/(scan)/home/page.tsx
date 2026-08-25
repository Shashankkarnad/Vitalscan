'use client'

// Home — weekly note (design lines 37–121): week label, verdict h1 + sub,
// SYSTEMS grid of 4 category cards, FINDINGS cards, STEADY footer.
// Craft pass: verdict is the only large type on the page — no readiness
// chrome, no coloured icon chips, no nested evidence inside findings.

import Link from 'next/link'
import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import { Sparkline } from '@/components/vitalscan/BandChart'
import { hasContract, buildCategories, buildVerdict, buildFindings } from '@/lib/vitalscan/derive'
import { COLOR, INK, FONT_SANS } from '@/lib/vitalscan/tokens'
import { card, sectionLabel, rise } from '@/components/vitalscan/styles'

export default function HomePage() {
  const { result, ready } = useScanResult()

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const verdict = buildVerdict(result)
  const categories = buildCategories(result)
  const findings = buildFindings(result)

  return (
    <div style={{ paddingTop: 76 }}>
      <div style={{ ...sectionLabel, ...rise(0, 0.5) }}>{verdict.weekLabel}</div>

      {/* The only large type on Home. */}
      <h1
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: 46,
          lineHeight: 1.16,
          letterSpacing: '-0.01em',
          maxWidth: 820,
          margin: '18px 0 0',
          textWrap: 'pretty',
          ...rise(0.06, 0.55),
        }}
      >
        {verdict.verdict}
      </h1>
      <p
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: 15.5,
          color: 'rgba(234,234,234,.6)',
          maxWidth: 640,
          margin: '14px 0 0',
          lineHeight: 1.55,
          textWrap: 'pretty',
          ...rise(0.12, 0.55),
        }}
      >
        {verdict.verdictSub}
      </p>

      {/* SYSTEMS */}
      <div style={{ ...sectionLabel, marginTop: 44, ...rise(0.16) }}>SYSTEMS</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginTop: 14,
        }}
      >
        {categories.map((cat, i) => (
          <div
            key={cat.key}
            className="vs-card-hover"
            style={{ ...card(14), padding: '16px 18px 15px', ...rise(0.2 + i * 0.05) }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: 14, letterSpacing: '-0.005em', color: '#eaeaea' }}>
                {cat.title}
              </span>
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 500,
                  fontSize: 10.5,
                  letterSpacing: '.06em',
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
                height={36}
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

      {/* FINDINGS — title + body only, no nested chart or rationale box */}
      {findings.length > 0 && <div style={{ ...sectionLabel, marginTop: 40, ...rise(0.2) }}>FINDINGS</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        {findings.map((f, i) => {
          const id = `${f.decision.metric}-${f.decision.date}`
          return (
            <div
              key={id}
              style={{
                ...card(14),
                padding: '22px 26px',
                ...rise(0.24 + i * 0.08, 0.55),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: 500,
                    fontSize: 10.5,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: f.color,
                  }}
                >
                  {f.level}
                </span>
                <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 11, color: 'rgba(234,234,234,.38)' }}>
                  {f.date}
                </span>
              </div>
              <h2
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 500,
                  fontSize: 16,
                  margin: '14px 0 0',
                  letterSpacing: '-.005em',
                }}
              >
                {f.title}
              </h2>
              {f.body && (
                <p
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(234,234,234,.66)',
                    margin: '8px 0 0',
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

      {/* STEADY */}
      <div
        style={{
          marginTop: 42,
          paddingTop: 22,
          borderTop: '1px solid rgba(234,234,234,.07)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          ...rise(0.4, 0.55),
        }}
      >
        <span
          style={{
            fontFamily: FONT_SANS,
            fontWeight: 500,
            fontSize: 10.5,
            letterSpacing: '.12em',
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
          fontSize: 12,
          color: 'rgba(234,234,234,.32)',
          marginTop: 14,
          ...rise(0.46, 0.55),
        }}
      >
        {verdict.nextNote}
      </div>
    </div>
  )
}
