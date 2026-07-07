'use client'

// Compact segmented control for picking which wearable instrument source
// feeds the analysis (Auto / a single source / Combine-all). Swapping the
// mode re-derives daily/bands/decisions/etc. everywhere via useScanResult.

import { useScanResult } from '@/components/vitalscan/useScanResult'
import { useSourceMode } from '@/components/vitalscan/SourceModeContext'
import { COLOR, rgba, FONT_MONO } from '@/lib/vitalscan/tokens'

export default function SourcePicker() {
  const { result } = useScanResult()
  const { mode, setMode } = useSourceMode()

  const options = result?.source_modes ?? []
  if (options.length < 2) return null

  return (
    <div style={{ marginTop: 22 }}>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'rgba(232,234,242,.4)',
          marginBottom: 8,
        }}
      >
        Instrument source
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: 4,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,.08)',
          background: 'rgba(255,255,255,.03)',
          width: 'fit-content',
        }}
      >
        {options.map((o) => {
          const active = o.key === mode
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setMode(o.key)}
              aria-pressed={active}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: '.06em',
                padding: '6px 12px',
                borderRadius: 9,
                border: `1px solid ${active ? rgba(COLOR.teal, 0.5) : 'transparent'}`,
                background: active ? rgba(COLOR.teal, 0.14) : 'transparent',
                color: active ? COLOR.teal : 'rgba(232,234,242,.55)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color .15s ease, background .15s ease, border-color .15s ease',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
