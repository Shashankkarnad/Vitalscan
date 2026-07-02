'use client'

// Shared shell for the redesign routes: /home, /dashboard, /evidence,
// /instruments, /audit. Dark #0a0a10 surface, mono nav buttons
// (design lines 25–35), footer (lines 352–355). Nav uses real routes.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { loadResult } from '@/lib/store'
import { FONT_DISPLAY, FONT_MONO, FONT_SANS, SURFACE, INK } from '@/lib/vitalscan/tokens'

const NAV = [
  { href: '/home', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/evidence', label: 'Evidence' },
  { href: '/instruments', label: 'Instruments' },
  { href: '/audit', label: 'Audit log' },
]

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [recordsLine, setRecordsLine] = useState<string | null>(null)

  useEffect(() => {
    const r = loadResult()
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 19, letterSpacing: '.01em' }}>
              VitalScan
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10.5,
                letterSpacing: '.18em',
                color: 'rgba(232,234,242,.36)',
                textTransform: 'uppercase',
              }}
            >
              Groundskeeper&rsquo;s log
            </div>
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
                    fontFamily: FONT_MONO,
                    fontSize: 11.5,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    padding: '8px 14px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    border: `1px solid ${active ? 'rgba(255,255,255,.14)' : 'transparent'}`,
                    background: active ? 'rgba(255,255,255,.08)' : 'transparent',
                    color: active ? '#e8eaf2' : 'rgba(232,234,242,.48)',
                    transition: 'color .15s ease, background .15s ease',
                  }}
                >
                  {n.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {children}

        <footer
          style={{
            marginTop: 72,
            paddingTop: 22,
            borderTop: '1px solid rgba(255,255,255,.07)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: 'rgba(232,234,242,.35)',
          }}
        >
          <div>VitalScan &middot; organises evidence, not a diagnosis</div>
          <div>{recordsLine ?? 'analysed in your browser session'}</div>
        </footer>
      </div>
    </div>
  )
}
