'use client'

// Instruments — the only restage in the craft pass. Two equal columns, one
// per instrument source, each with device name/role/coverage up top and
// per-metric rows that lead with the number (r or coverage), then the
// TRUSTED/PARTIAL/DISTRUST/UNGRADED chip, then an optional muted note.

import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import SourcePicker from '@/components/vitalscan/SourcePicker'
import { hasContract, buildTrust, type TrustRow } from '@/lib/vitalscan/derive'
import { rgba, FONT_SANS } from '@/lib/vitalscan/tokens'
import { card, kicker, h1, lede, rise } from '@/components/vitalscan/styles'

function chipStyle(row: TrustRow): React.CSSProperties {
  return {
    fontFamily: FONT_SANS,
    fontWeight: 500,
    fontSize: 9.5,
    letterSpacing: '.07em',
    textTransform: 'uppercase',
    padding: '3px 9px',
    borderRadius: 999,
    color: row.gradeColor,
    border: `1px ${row.dashed ? 'dashed' : 'solid'} ${rgba(row.gradeColor, row.dashed ? 0.5 : 0.35)}`,
    background: rgba(row.gradeColor, 0.06),
    whiteSpace: 'nowrap',
  }
}

export default function InstrumentsPage() {
  const { result, ready } = useScanResult()

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const sources = result.sources ?? []
  const groups = buildTrust(sources)
  const referenceName = sources.find((s) => s.role === 'reference')?.name ?? 'the reference instrument'
  const names = sources.map((s) => s.name)
  const heading = names.length >= 2 ? `${names[0]} vs ${names.slice(1).join(' vs ')}.` : names[0] ? `${names[0]}.` : 'Your instruments.'

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={kicker}>Instruments</div>
      <h1 style={h1(34)}>{heading}</h1>
      <p style={lede}>Every source is graded per metric against {referenceName}, not by a settings checklist.</p>

      <SourcePicker />

      {groups.length === 0 && (
        <div
          style={{
            ...card(14),
            padding: '22px 26px',
            marginTop: 32,
            fontFamily: FONT_SANS,
            fontWeight: 400,
            fontSize: 13,
            lineHeight: 1.6,
            color: 'rgba(234,234,234,.42)',
            ...rise(0.16, 0.55),
          }}
        >
          No per-source summary in this export — every record carried a single source, or source names were absent.
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
          marginTop: 32,
        }}
      >
        {groups.map((g, i) => (
          <div key={g.source} style={{ ...card(14), padding: '20px 22px', ...rise(0.16 + i * 0.08, 0.55) }}>
            <div style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: 16, color: '#eaeaea' }}>{g.source}</div>
            <div style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 12, color: 'rgba(234,234,234,.42)', marginTop: 4 }}>
              {g.roleLabel} &middot; {g.avgCoverage}%
            </div>

            <div style={{ marginTop: 14 }}>
              {g.rows.map((r, k) => (
                <div
                  key={k}
                  style={{
                    padding: '11px 0',
                    borderTop: k > 0 ? '1px solid rgba(234,234,234,.06)' : undefined,
                  }}
                >
                  <div style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 12.5, color: 'rgba(234,234,234,.5)' }}>
                    {r.metric}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginTop: 5,
                    }}
                  >
                    <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: 14.5, color: '#eaeaea' }}>{r.number}</span>
                    <span style={chipStyle(r)}>{r.grade}</span>
                  </div>
                  {r.note && (
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontWeight: 400,
                        fontSize: 12,
                        color: 'rgba(234,234,234,.4)',
                        marginTop: 5,
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
        ))}
      </div>

      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: 12,
          lineHeight: 1.65,
          color: 'rgba(234,234,234,.36)',
          marginTop: 24,
          maxWidth: 720,
          ...rise(0.4, 0.55),
        }}
      >
        {`r = agreement vs ${referenceName} over shared days · \u2265 0.70 trusted · 0.40–0.69 partial · < 0.40 distrust · fewer than 15 shared days ungraded. Demotions are logged in the audit trail.`}
      </div>
    </div>
  )
}
