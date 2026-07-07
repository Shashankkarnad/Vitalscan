'use client'

// Home — weekly note (design lines 37–121): week label, verdict h1 + sub,
// SYSTEMS grid of 4 category cards, FINDINGS expandable cards, STEADY footer.

import { useState } from 'react'
import Link from 'next/link'
import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import BandChart, { Sparkline } from '@/components/vitalscan/BandChart'
import IconChip from '@/components/vitalscan/IconChip'
import { hasContract, buildCategories, buildVerdict, buildFindings } from '@/lib/vitalscan/derive'
import { COLOR, rgba, FONT_DISPLAY, FONT_MONO, CARD_SHADOW } from '@/lib/vitalscan/tokens'
import { card, sectionLabel, pill, rise } from '@/components/vitalscan/styles'

export default function HomePage() {
  const { result, ready } = useScanResult()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const verdict = buildVerdict(result)
  const categories = buildCategories(result)
  const findings = buildFindings(result)

  return (
    <div style={{ paddingTop: 76 }}>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'rgba(232,234,242,.42)',
          animation: 'rise .5s cubic-bezier(.2,.7,.3,1) both',
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
          animation: 'rise .55s cubic-bezier(.2,.7,.3,1) .06s both',
        }}
      >
        {verdict.verdict}
      </h1>
      <p
        style={{
          fontSize: 16.5,
          color: 'rgba(232,234,242,.6)',
          maxWidth: 660,
          margin: '16px 0 0',
          lineHeight: 1.55,
          textWrap: 'pretty',
          animation: 'rise .55s cubic-bezier(.2,.7,.3,1) .12s both',
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
            style={{ ...card(16), padding: '18px 18px 16px', ...rise(0.2 + i * 0.05) }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <IconChip path={cat.icon} color={cat.color} />
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, letterSpacing: '.005em', color: '#e8eaf2' }}>
                  {cat.title}
                </span>
              </span>
              <span style={pill(cat.statusColor, rgba(cat.statusColor, 0.4), rgba(cat.statusColor, 0.09))}>
                {cat.statusWord}
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              <Sparkline
                values={cat.series.values}
                lo={cat.series.lo}
                hi={cat.series.hi}
                color={cat.color}
                height={38}
                variant={cat.chartKind}
                label={`${cat.label} 90-day trend sparkline`}
              />
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {cat.metrics.map((m) => (
                <Link
                  key={m.key}
                  href={`/signal?m=${m.key}`}
                  className="vs-row-hover"
                  style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '6px 0', textDecoration: 'none', borderRadius: 6 }}
                >
                  <span style={{ fontSize: 12.5, color: 'rgba(232,234,242,.6)' }}>{m.name}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: '#e8eaf2' }}>{m.cur}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FINDINGS */}
      {findings.length > 0 && <div style={{ ...sectionLabel, marginTop: 40, ...rise(0.2) }}>FINDINGS</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
        {findings.map((f, i) => {
          const id = `${f.decision.metric}-${f.decision.date}`
          const isOpen = !!open[id]
          return (
            <div
              key={id}
              style={{
                borderRadius: 18,
                border: `1px solid ${rgba(f.color, 0.28)}`,
                background: 'rgba(255,255,255,.03)',
                boxShadow: CARD_SHADOW,
                padding: '24px 28px',
                ...rise(0.18 + i * 0.09, 0.55),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10.5,
                    letterSpacing: '.14em',
                    padding: '4px 11px',
                    borderRadius: 999,
                    color: f.color,
                    border: `1px solid ${rgba(f.color, 0.4)}`,
                    background: rgba(f.color, 0.09),
                  }}
                >
                  {f.level}
                </span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '.1em', color: 'rgba(232,234,242,.38)' }}>
                  {f.date}
                </span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 600, margin: '16px 0 0', letterSpacing: '-.01em' }}>{f.title}</h2>
              {f.body && (
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: 'rgba(232,234,242,.66)',
                    margin: '10px 0 0',
                    maxWidth: 760,
                    textWrap: 'pretty',
                  }}
                >
                  {f.body}
                </p>
              )}
              <button
                className="vs-ghost-btn"
                onClick={() => setOpen((s) => ({ ...s, [id]: !s[id] }))}
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(232,234,242,.5)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  marginTop: 16,
                  cursor: 'pointer',
                }}
              >
                {isOpen ? 'Hide evidence ▴' : 'Show evidence — chart + rationale ▾'}
              </button>
              {isOpen && (
                <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 18 }}>
                  {f.meta && (
                    <BandChart
                      values={f.series.values}
                      dates={f.series.dates}
                      lo={f.series.lo}
                      hi={f.series.hi}
                      color={f.meta.color}
                      height={132}
                      fmt={f.meta.key === 'steps' ? (v) => (v / 1000).toFixed(1).replace('.0', '') + 'k' : f.meta.fmt}
                      unit={f.meta.unit}
                      refLine={f.meta.key === 'sleep_hours' ? { value: 7, label: '7 h' } : undefined}
                      variant={f.meta.chartKind}
                      label={`${f.meta.name} — 90 days against your personal band`}
                    />
                  )}
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      background: 'rgba(0,0,0,.28)',
                      border: '1px solid rgba(255,255,255,.06)',
                      borderRadius: 12,
                      padding: '14px 18px',
                      marginTop: 14,
                    }}
                  >
                    {f.decision.lines.map((ln, k) => (
                      <div
                        key={k}
                        style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12, padding: '3px 0' }}
                      >
                        <div style={{ color: 'rgba(232,234,242,.38)' }}>{ln.k}</div>
                        <div style={{ color: 'rgba(232,234,242,.72)' }}>{ln.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
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
          borderTop: '1px solid rgba(255,255,255,.07)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          ...rise(0.4, 0.55),
        }}
      >
        <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: '.16em', color: COLOR.teal, whiteSpace: 'nowrap' }}>
          STEADY
        </span>
        <span style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(232,234,242,.55)' }}>{verdict.steady}</span>
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: 'rgba(232,234,242,.32)', marginTop: 14, ...rise(0.46, 0.55) }}>
        {verdict.nextNote}
      </div>
    </div>
  )
}
