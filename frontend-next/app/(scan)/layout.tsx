'use client'

// Shared shell for the three artefact screens: /home, /evidence, /instruments.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { loadResult } from '@/lib/store'
import { SourceModeProvider } from '@/components/vitalscan/SourceModeContext'
import { FIXTURE_RESULT } from '@/lib/vitalscan/fixture'
import { FONT_SANS, SURFACE, INK } from '@/lib/vitalscan/tokens'

const NAV = [
  { href: '/home', label: 'Home' },
  { href: '/evidence', label: 'Evidence' },
  { href: '/instruments', label: 'Instruments' },
]

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [recordsLine, setRecordsLine] = useState<string | null>(null)

  useEffect(() => {
    const r = loadResult() ?? FIXTURE_RESULT
    if (r?.weekly?.records_read != null) {
      setRecordsLine(`${r.weekly.records_read.toLocaleString('en-US')} records read`)
    }
  }, [])

  return (
    <div
      className="vs-shell"
      style={{
        minHeight: '100vh',
        width: '100%',
        background: SURFACE,
        color: INK,
        fontFamily: FONT_SANS,
        position: 'relative',
        overflowX: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1060, margin: '0 auto', padding: '0 24px 64px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 26,
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: 17, letterSpacing: '.005em' }}>
            VitalScan
          </div>
          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {NAV.map((n) => {
              const active = pathname === n.href
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="vs-nav-link"
                  aria-current={active ? 'page' : undefined}
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: active ? 500 : 400,
                    fontSize: 13,
                    letterSpacing: '.005em',
                    padding: '8px 14px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    border: `1px solid ${active ? 'rgba(234,234,234,.14)' : 'transparent'}`,
                    background: active ? 'rgba(234,234,234,.08)' : 'transparent',
                    color: active ? '#eaeaea' : 'rgba(234,234,234,.48)',
                    transition: 'color .15s ease, background .15s ease',
                  }}
                >
                  {n.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <SourceModeProvider>{children}</SourceModeProvider>

        <footer
          style={{
            marginTop: 72,
            paddingTop: 22,
            borderTop: '1px solid rgba(234,234,234,.07)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            fontFamily: FONT_SANS,
            fontWeight: 400,
            fontSize: 12,
            color: 'rgba(234,234,234,.35)',
          }}
        >
          <div>VitalScan &middot; organises evidence, not a diagnosis</div>
          <div>{recordsLine ?? 'analysed in your browser session'}</div>
        </footer>
      </div>
    </div>
  )
}
