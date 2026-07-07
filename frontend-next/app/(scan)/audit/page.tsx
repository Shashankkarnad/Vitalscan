'use client'

// Audit log (design lines 314–350): dated entries (signal, title, badge,
// mono key-value rationale box) + show-suppressed toggle.

import { useState } from 'react'
import { useScanResult } from '@/components/vitalscan/useScanResult'
import ContractNotice from '@/components/vitalscan/ContractNotice'
import { hasContract, buildAudit } from '@/lib/vitalscan/derive'
import { formatShortDate } from '@/lib/vitalscan/metrics'
import { rgba, FONT_MONO } from '@/lib/vitalscan/tokens'
import { card, kicker, h1, lede, rise } from '@/components/vitalscan/styles'

export default function AuditPage() {
  const { result, ready } = useScanResult()
  const [showSuppressed, setShowSuppressed] = useState(true)

  if (!ready || !result) return null
  if (!hasContract(result)) return <ContractNotice />

  const decisions = result.decisions ?? []
  const entries = buildAudit(decisions, showSuppressed)
  const suppressedCount = decisions.filter((d) => d.suppressed).length

  return (
    <div style={{ paddingTop: 64 }}>
      <div style={kicker}>Audit log</div>
      <h1 style={h1(36)}>Every decision, on the record.</h1>
      <p style={lede}>
        Each escalation — and each suppression — is logged with the arithmetic that produced it. Nothing VitalScan
        tells you is a black box.
      </p>

      {suppressedCount > 0 && (
        <button
          className="vs-ghost-btn"
          onClick={() => setShowSuppressed((v) => !v)}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'rgba(234,234,234,.5)',
            background: 'rgba(234,234,234,.04)',
            border: '1px solid rgba(234,234,234,.1)',
            borderRadius: 9,
            padding: '7px 13px',
            marginTop: 18,
            cursor: 'pointer',
          }}
        >
          {showSuppressed
            ? `Hide suppressed (${suppressedCount})`
            : `Show suppressed (${suppressedCount})`}
        </button>
      )}
      {!showSuppressed && suppressedCount > 0 && (
        <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: 'rgba(234,234,234,.38)', marginTop: 12 }}>
          {`${suppressedCount} suppressed decision${suppressedCount === 1 ? '' : 's'} hidden — suppressions are logged, not shown.`}
        </div>
      )}

      {entries.length === 0 && (
        <div
          style={{
            ...card(16),
            border: '1px solid rgba(234,234,234,.09)',
            padding: '20px 24px',
            marginTop: 32,
            fontFamily: FONT_MONO,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: 'rgba(234,234,234,.42)',
            ...rise(0.14, 0.55),
          }}
        >
          No decisions in the last 90 days — every signal stayed inside your band with nothing to corroborate.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32 }}>
        {entries.map((a, i) => (
          <div
            key={`${a.decision.metric}-${a.decision.date}-${i}`}
            style={{
              ...card(16),
              border: '1px solid rgba(234,234,234,.09)',
              padding: '20px 24px',
              opacity: a.decision.suppressed ? 0.66 : 1,
              ...rise(0.14 + Math.min(i, 8) * 0.06, 0.55),
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color }} />
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(234,234,234,.5)',
                  }}
                >
                  {a.decision.signal}
                </span>
              </div>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'rgba(234,234,234,.36)' }}>
                {formatShortDate(a.date)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginTop: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.01em' }}>{a.decision.title}</div>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  letterSpacing: '.12em',
                  padding: '3px 10px',
                  borderRadius: 999,
                  color: a.badgeColor,
                  border: `1px solid ${rgba(a.badgeColor, 0.4)}`,
                  background: rgba(a.badgeColor, 0.09),
                }}
              >
                {a.badgeText}
              </span>
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                background: 'rgba(0,0,0,.28)',
                border: '1px solid rgba(234,234,234,.06)',
                borderRadius: 12,
                padding: '13px 17px',
                marginTop: 14,
              }}
            >
              {a.decision.lines.map((ln, k) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '3px 0' }}>
                  <div style={{ color: 'rgba(234,234,234,.38)' }}>{ln.k}</div>
                  <div style={{ color: 'rgba(234,234,234,.72)' }}>{ln.v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
