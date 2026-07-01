'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import DropZone from '@/components/upload/DropZone'
import ExportSteps from '@/components/upload/ExportSteps'
import PrivacyStrip from '@/components/upload/PrivacyStrip'
import { storeFile } from '@/lib/db'
import { API_URL } from '@/lib/utils'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const shimmerRef = useRef<HTMLButtonElement>(null)

  // Warm backend on mount
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => {})
  }, [])

  // Shimmer follow-mouse effect
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = shimmerRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    btn.style.setProperty('--shimmer-x', `${x}%`)
    btn.style.setProperty('--shimmer-y', `${y}%`)
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
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-4 py-10 sm:py-16">
      {/* Aura blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute w-[480px] h-[480px] -top-20 -left-20 rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(13,148,136,0.35) 0%, transparent 70%)',
            animation: 'blobA 6s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute w-[380px] h-[380px] top-1/3 -right-16 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
            animation: 'blobB 7s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute w-[320px] h-[320px] bottom-0 left-1/3 rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(5,150,105,0.3) 0%, transparent 70%)',
            animation: 'blobC 5s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute w-[260px] h-[260px] -bottom-10 -right-10 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(13,148,136,0.25) 0%, transparent 70%)',
            animation: 'blobD 8.5s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-lg animate-[fadeUp_0.5s_ease_both]"
        style={{ animationDelay: '80ms' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-teal mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
            VitalScan
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            Your health,{' '}
            <span className="text-teal">decoded.</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Drop your Apple Health export below for a clinician-grade breakdown of your vitals,
            sleep architecture, and long-term trends.
          </p>
        </div>

        {/* Drop zone card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-5">
          <DropZone onFile={setFile} />

          <button
            ref={shimmerRef}
            disabled={!file || loading}
            onClick={handleAnalyze}
            onMouseMove={onMouseMove}
            className={[
              'relative w-full h-12 rounded-xl font-semibold text-sm overflow-hidden',
              'transition-all duration-200 select-none',
              !file || loading
                ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                : [
                    'bg-foreground text-background',
                    'before:absolute before:inset-0 before:rounded-xl',
                    'before:bg-[radial-gradient(circle_at_var(--shimmer-x,50%)_var(--shimmer-y,50%),rgba(255,255,255,0.18)_0%,transparent_60%)]',
                    'before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300',
                    'hover:scale-[1.01] active:scale-[0.99]',
                  ].join(' '),
            ].join(' ')}
            style={{ '--shimmer-x': '50%', '--shimmer-y': '50%' } as React.CSSProperties}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Preparing…
              </span>
            ) : (
              'Analyze my health data'
            )}
          </button>

          <PrivacyStrip />
        </div>

        {/* Export steps below card */}
        <div className="mt-6 bg-card rounded-2xl border border-border shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            How to export from Apple Health
          </p>
          <ExportSteps />
        </div>
      </div>
    </main>
  )
}
