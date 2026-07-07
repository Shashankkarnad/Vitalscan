'use client'

// The one-glance morning answer (Primed / Steady / Strained) with linkable
// drivers and yesterday's load — WHOOP's recovery loop, transparent.

import Link from 'next/link'
import { buildReadiness } from '@/lib/vitalscan/derive'
import { formatShortDate } from '@/lib/vitalscan/metrics'
import { rgba, FONT_MONO } from '@/lib/vitalscan/tokens'
import { card, rise } from '@/components/vitalscan/styles'
import type { VitalScanResult } from '@/lib/types'

const mono = (size: number, color: string): React.CSSProperties => ({ fontFamily: FONT_MONO, fontSize: size, color })

export default function ReadinessCard({ result }: { result: VitalScanResult }) {
  const r = buildReadiness(result)
  return (
    <div style={{ ...card(16), borderColor: rgba(r.color, 0.35), padding: '20px 24px', marginTop: 24, ...rise(0.1, 0.5) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 22, letterSpacing: '.06em', textTransform: 'uppercase', color: r.color }}>
          {r.word}
        </span>
        <span style={{ fontSize: 14.5, color: 'rgba(237,234,226,.7)' }}>{r.headline}</span>
        {r.asOf && <span style={mono(10, 'rgba(237,234,226,.35)')}>as of {formatShortDate(r.asOf)}</span>}
      </div>
      {(r.drivers.length > 0 || r.load) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: 10 }}>
          {r.drivers.map((d) => (
            <Link key={d.key + d.text} href={`/signal?m=${d.key}`} style={{ ...mono(11, d.concerning ? r.color : 'rgba(237,234,226,.55)'), textDecoration: 'none' }}>
              • {d.text} →
            </Link>
          ))}
          {r.load && <span style={mono(11, 'rgba(237,234,226,.5)')}>• {r.load}</span>}
        </div>
      )}
      <div style={{ ...mono(9.5, 'rgba(237,234,226,.32)'), letterSpacing: '.08em', marginTop: 10 }}>
        FROM YOUR OWN BASELINES — NOT A SCORE, EVERY DRIVER OPENS ITS EVIDENCE
      </div>
    </div>
  )
}
