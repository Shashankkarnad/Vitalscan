'use client'

import type { MetricBreakdown as Breakdown } from '@/lib/vitalscan/derive'
import { BADGE_COLOR, badgeLabel } from '@/lib/vitalscan/metrics'
import { rgba, FONT_MONO } from '@/lib/vitalscan/tokens'

interface MetricBreakdownProps {
  breakdown: Breakdown
  accent: string
}

export default function MetricBreakdown({ breakdown, accent }: MetricBreakdownProps) {
  const mono = (size: number, color: string): React.CSSProperties => ({
    fontFamily: FONT_MONO,
    fontSize: size,
    color,
  })

  return (
    <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#e8eaf2', lineHeight: 1.4, textWrap: 'pretty' }}>
        {breakdown.headline}
      </div>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: 'rgba(232,234,242,.62)',
          margin: '10px 0 0',
          maxWidth: 680,
          textWrap: 'pretty',
        }}
      >
        {breakdown.why}
      </p>

      {breakdown.stats.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 16,
          }}
        >
          {breakdown.stats.map((s) => (
            <div
              key={s.label}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,.08)',
                background: 'rgba(255,255,255,.025)',
                minWidth: 120,
              }}
            >
              <div style={{ ...mono(9, 'rgba(232,234,242,.38)'), letterSpacing: '.12em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ ...mono(12, '#e8eaf2'), marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {breakdown.activeDecision && (
        <div
          style={{
            marginTop: 16,
            padding: '14px 16px',
            borderRadius: 12,
            border: `1px solid ${rgba(BADGE_COLOR[breakdown.activeDecision.badge], 0.35)}`,
            background: rgba(BADGE_COLOR[breakdown.activeDecision.badge], 0.07),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ ...mono(9, BADGE_COLOR[breakdown.activeDecision.badge]), letterSpacing: '.1em' }}>
              {badgeLabel(breakdown.activeDecision.badge)}
            </span>
            <span style={mono(10, 'rgba(232,234,242,.38)')}>{breakdown.activeDecision.date}</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(232,234,242,.82)', marginTop: 8, lineHeight: 1.45 }}>
            {breakdown.activeDecision.title}
          </div>
        </div>
      )}

      {breakdown.detailLines.length > 0 && (
        <div
          style={{
            ...mono(11.5, 'rgba(232,234,242,.55)'),
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(0,0,0,.22)',
            border: '1px solid rgba(255,255,255,.06)',
          }}
        >
          {breakdown.detailLines.map((ln, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(90px, 120px) 1fr',
                gap: 10,
                padding: '3px 0',
                borderTop: i > 0 ? '1px solid rgba(255,255,255,.05)' : undefined,
                paddingTop: i > 0 ? 8 : 3,
              }}
            >
              <span style={{ color: rgba(accent, 0.65), textTransform: 'capitalize' }}>{ln.k}</span>
              <span style={{ color: 'rgba(232,234,242,.72)' }}>{ln.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
