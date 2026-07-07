'use client'

import { COLOR, rgba } from '@/lib/vitalscan/tokens'

export default function PrivacyStrip() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        borderRadius: 10,
        background: 'rgba(237,234,226,.04)',
        border: '1px solid rgba(237,234,226,.06)',
        padding: '12px 14px',
        fontSize: 12,
        color: 'rgba(237,234,226,.55)',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 2, color: rgba(COLOR.teal, 0.85) }}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <p>
        <strong style={{ fontWeight: 600, color: '#edeae2' }}>100% on-device processing.</strong>{' '}
        Your export is parsed locally — raw health data stays on this device.
      </p>
    </div>
  )
}
