'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DropZone from '@/components/upload/DropZone'
import ExportSteps from '@/components/upload/ExportSteps'
import PrivacyStrip from '@/components/upload/PrivacyStrip'
import { storeFile } from '@/lib/db'
import { API_URL } from '@/lib/utils'
import { SURFACE, INK, FONT_SANS, FONT_MONO, COLOR, rgba } from '@/lib/vitalscan/tokens'
import { card, kicker, h1, lede, sectionLabel, rise } from '@/components/vitalscan/styles'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  // Warm backend on mount
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => {})
  }, [])

  const handleAnalyze = async () => {
    if (!file || loading) return
    setLoading(true)
    try {
      await storeFile(file)
      router.push('/processing')
    } catch {
      setLoading(false)
    }
  }

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
      {/* Aura blobs */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            width: 480,
            height: 480,
            top: -80,
            left: -80,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${rgba(COLOR.teal, 0.16)} 0%, transparent 70%)`,
            animation: 'blobA 6s ease-in-out infinite alternate',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 380,
            height: 380,
            top: '33%',
            right: -64,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${rgba(COLOR.blue, 0.14)} 0%, transparent 70%)`,
            animation: 'blobB 7s ease-in-out infinite alternate',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 320,
            height: 320,
            bottom: 0,
            left: '33%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${rgba(COLOR.coral, 0.12)} 0%, transparent 70%)`,
            animation: 'blobC 5s ease-in-out infinite alternate',
          }}
        />
      </div>

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
        }}
      >
        <div style={{ maxWidth: 480, width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...kicker, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(234,234,234,.42)' }}>
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
              </svg>
              VitalScan · Apple Health export
            </div>
            <h1 style={{ ...h1(30), textAlign: 'center' }}>Bring your export. We&rsquo;ll organise the evidence.</h1>
            <p style={{ ...lede, textAlign: 'center', margin: '12px auto 0', maxWidth: 380 }}>
              Drop your Apple Health export below — vitals, sleep, and long-term trends, checked against your own
              baseline.
            </p>
          </div>

          {/* Drop zone card */}
          <div style={{ ...card(16), padding: 24, display: 'flex', flexDirection: 'column', gap: 20, ...rise(0.18) }}>
            <DropZone onFile={setFile} />

            <button
              disabled={!file || loading}
              onClick={handleAnalyze}
              className="vs-upload-cta"
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                textAlign: 'center',
                borderRadius: 9,
                padding: '13px 16px',
                border: `1px solid ${!file || loading ? 'rgba(234,234,234,.08)' : 'rgba(234,234,234,.14)'}`,
                background: !file || loading ? 'rgba(234,234,234,.02)' : 'rgba(234,234,234,.06)',
                color: !file || loading ? 'rgba(234,234,234,.32)' : INK,
                cursor: !file || loading ? 'not-allowed' : 'pointer',
                transition: 'background .15s ease, border-color .15s ease',
              }}
            >
              {loading ? 'Preparing…' : 'Analyse my export'}
            </button>

            <PrivacyStrip />
          </div>

          {/* Export steps below card */}
          <div style={{ ...card(16), padding: '20px 22px', marginTop: 14, ...rise(0.28) }}>
            <p style={{ ...sectionLabel, textTransform: 'uppercase' }}>How to export from Apple Health</p>
            <div style={{ marginTop: 14 }}>
              <ExportSteps />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
