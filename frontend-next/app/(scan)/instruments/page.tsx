'use client'

// Instrument trust (design lines 280–312): per-source cards, per-metric rows
// (dot, metric, r/coverage, grade pill, note), methodology footer.

import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import { hasContract, buildTrust } from '@/lib/vitalscan/derive'
import { rgba, FONT_MONO } from '@/lib/vitalscan/tokens'
import { card, kicker, h1, lede, rise } from '@/components/vitalscan/styles'

export default function InstrumentsPage() {
  const { result, ready } = useScanResult()

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const groups = buildTrust(result.sources ?? [])
  const referenceName = (result.sources ?? []).find((s) => s.role === 'reference')?.name ?? 'the reference instrument'

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={kicker}>Instrument trust</div>
      <h1 style={h1(36)}>Which instruments earn belief.</h1>
      <p style={lede}>
        Every source is graded per metric against the reference instrument. Distrusted pairs are excluded from your
        baselines and render faded and dashed everywhere in VitalScan — including the charts you just saw.
      </p>

      {groups.length === 0 && (
        <div
          style={{
            ...card(18),
            border: '1px solid rgba(237,234,226,.1)',
            padding: '22px 26px',
            marginTop: 36,
            fontFamily: FONT_MONO,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: 'rgba(237,234,226,.42)',
            ...rise(0.16, 0.55),
          }}
        >
          No per-source summary in this export — every record carried a single source, or source names were absent.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36 }}>
        {groups.map((g, i) => (
          <div
            key={g.source}
            style={{
              ...card(18),
              border: '1px solid rgba(237,234,226,.1)',
              padding: '22px 26px',
              ...rise(0.16 + i * 0.08, 0.55),
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 16.5, fontWeight: 600 }}>{g.source}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '.08em', color: 'rgba(237,234,226,.4)' }}>
                {g.role}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              {g.rows.map((r, k) => (
                <div
                  key={k}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(160px, 220px) minmax(140px, 200px) 120px 1fr',
                    gap: 14,
                    alignItems: 'center',
                    padding: '11px 0',
                    borderTop: '1px solid rgba(237,234,226,.06)',
                    opacity: r.opacity,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color }} />
                    <span style={{ fontSize: 14, color: 'rgba(237,234,226,.85)' }}>{r.metric}</span>
                  </div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: 'rgba(237,234,226,.5)' }}>{r.rText}</div>
                  <div>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        letterSpacing: '.12em',
                        padding: '3px 9px',
                        borderRadius: 999,
                        color: r.gradeColor,
                        border: `1px ${r.dashed ? 'dashed' : 'solid'} ${rgba(r.gradeColor, r.dashed ? 0.5 : 0.4)}`,
                      }}
                    >
                      {r.grade}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(237,234,226,.48)' }}>{r.note}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11.5,
          lineHeight: 1.7,
          color: 'rgba(237,234,226,.38)',
          marginTop: 22,
          maxWidth: 720,
          ...rise(0.4, 0.55),
        }}
      >
        {`r = Pearson agreement vs ${referenceName} over shared days · ≥ 0.70 trusted · 0.40–0.69 partial · < 0.40 distrust · fewer than 15 shared days ungraded. Demotions are logged in the audit trail, never silent.`}
      </div>
    </div>
  )
}
