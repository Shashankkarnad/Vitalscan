'use client'

import { COLOR, rgba } from '@/lib/vitalscan/tokens'

const steps = [
  {
    num: 1,
    title: 'Open Health app',
    detail: 'Tap your profile photo in the top-right corner.',
  },
  {
    num: 2,
    title: 'Export all health data',
    detail: 'Scroll down → "Export All Health Data" → Share the .zip.',
  },
  {
    num: 3,
    title: 'Drop the file here',
    detail: 'The file stays on your device — nothing is uploaded to a server.',
  },
]

export default function ExportSteps() {
  return (
    <ol style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13.5 }}>
      {steps.map((s) => (
        <li key={s.num} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span
            style={{
              flexShrink: 0,
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 11.5,
              color: COLOR.teal,
              background: rgba(COLOR.teal, 0.12),
              border: `1px solid ${rgba(COLOR.teal, 0.3)}`,
            }}
          >
            {s.num}
          </span>
          <div>
            <p style={{ fontWeight: 500, color: '#edeae2' }}>{s.title}</p>
            <p style={{ color: 'rgba(237,234,226,.5)', lineHeight: 1.5, marginTop: 2 }}>{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
