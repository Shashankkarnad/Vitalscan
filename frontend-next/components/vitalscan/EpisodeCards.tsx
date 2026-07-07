'use client'

// Clickable episode list: tap an episode to see what moved, why, and what you
// could do — plain language, no z-scores. The deviation heatmap is the evidence
// behind these; this is the narrative.

import { useState } from 'react'
import type { ComboEpisode } from '@/lib/types'
import { buildEpisodeExplainer } from '@/lib/vitalscan/derive'
import { COLOR, rgba, FONT_MONO } from '@/lib/vitalscan/tokens'
import { formatShortDate } from '@/lib/vitalscan/metrics'

export default function EpisodeCards({ episodes }: { episodes: ComboEpisode[] }) {
  const [open, setOpen] = useState<number | null>(null) // collapsed — the intro says "tap one"
  if (!episodes.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {episodes.map((ep, i) => {
        const x = buildEpisodeExplainer(ep)
        const tone = x.benign ? COLOR.teal : COLOR.coral
        const isOpen = open === i
        const range =
          x.days === 1 ? formatShortDate(x.start) : `${formatShortDate(x.start)} – ${formatShortDate(x.end)}`
        return (
          <div
            key={i}
            style={{ borderRadius: 12, border: `1px solid ${rgba(tone, 0.28)}`, background: rgba(tone, 0.05), overflow: 'hidden' }}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '13px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: '#eaeaea',
              }}
              aria-expanded={isOpen}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone, flexShrink: 0 }} />
                <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: 'rgba(234,234,234,.55)', whiteSpace: 'nowrap' }}>{range}</span>
                <span style={{ fontSize: 13.5, color: 'rgba(234,234,234,.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {x.benign ? 'Looks like exertion — ' : ''}
                  {x.summary}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: rgba(tone, 0.9), letterSpacing: '.08em' }}>
                  {x.days === 1 ? '1 DAY' : `${x.days} DAYS`}
                </span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: 'rgba(234,234,234,.4)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
                  ›
                </span>
              </span>
            </button>

            {isOpen && (
              <div style={{ padding: '2px 16px 16px 34px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {x.signals.map((s, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ color: s.concerning ? tone : 'rgba(234,234,234,.4)', fontSize: 13 }}>•</span>
                      <span style={{ fontSize: 13.5, color: 'rgba(234,234,234,.8)', lineHeight: 1.45 }}>{s.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13.5, color: 'rgba(234,234,234,.7)', lineHeight: 1.5, textWrap: 'pretty' }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '.12em', color: 'rgba(234,234,234,.4)', textTransform: 'uppercase' }}>Why</span>
                  <div style={{ marginTop: 2 }}>{x.meaning}</div>
                </div>
                <div style={{ fontSize: 13.5, color: 'rgba(234,234,234,.7)', lineHeight: 1.5, textWrap: 'pretty' }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '.12em', color: 'rgba(234,234,234,.4)', textTransform: 'uppercase' }}>What you could do</span>
                  <div style={{ marginTop: 2 }}>{x.action}</div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
