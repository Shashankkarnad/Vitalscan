'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MilestoneList, { type Milestone } from '@/components/processing/MilestoneList'
import FactCarousel from '@/components/processing/FactCarousel'
import { retrieveFile } from '@/lib/db'
import { saveResult } from '@/lib/store'
import { API_URL } from '@/lib/utils'

const MILESTONE_LABELS = [
  'Reading your Apple Health export',
  'Parsing heart rate & HRV trends',
  'Analysing sleep architecture',
  'Reviewing SpO₂ and respiratory data',
  'Scoring vitals against clinical benchmarks',
  'Generating your personalised report',
]

const STEP_DURATION_MS = 8_000

export default function ProcessingPage() {
  const router = useRouter()
  const [milestones, setMilestones] = useState<Milestone[]>(
    MILESTONE_LABELS.map((label, i) => ({ label, status: i === 0 ? 'active' : 'pending' })),
  )
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    let step = 0

    const advanceMilestone = () => {
      if (doneRef.current) return
      step++
      if (step >= MILESTONE_LABELS.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        return
      }
      setMilestones((prev) =>
        prev.map((m, i) => ({
          ...m,
          status: i < step ? 'done' : i === step ? 'active' : 'pending',
        })),
      )
    }

    intervalRef.current = setInterval(advanceMilestone, STEP_DURATION_MS)

    const run = async () => {
      const file = await retrieveFile()
      if (!file) {
        router.replace('/')
        return
      }

      const timeoutMs = Math.min(90_000 + (file.size / (1024 * 1024)) * 500, 600_000)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`${API_URL}/analyze`, {
          method: 'POST',
          body: form,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
          const text = await res.text().catch(() => `HTTP ${res.status}`)
          throw new Error(text)
        }

        const data = await res.json()
        doneRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)

        setMilestones(MILESTONE_LABELS.map((label) => ({ label, status: 'done' })))

        saveResult(data)
        setTimeout(() => router.push('/home'), 600)
      } catch (err) {
        clearTimeout(timeoutId)
        if (intervalRef.current) clearInterval(intervalRef.current)
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(
          controller.signal.aborted
            ? 'Analysis timed out — your export may be very large. Try again.'
            : `Analysis failed: ${msg}`,
        )
      }
    }

    run()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [router])

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 65%)',
            animation: 'pulseGlow 3s ease-in-out infinite',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8 animate-[fadeUp_0.5s_ease_both]">
        {/* Spinner ring */}
        {!error && (
          <div className="relative flex items-center justify-center">
            <svg
              className="animate-spin-slow"
              width="72"
              height="72"
              viewBox="0 0 72 72"
              fill="none"
            >
              <circle cx="36" cy="36" r="30" stroke="#E4E7EB" strokeWidth="4" />
              <path
                d="M36 6a30 30 0 0 1 30 30"
                stroke="#0D9488"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <svg
              className="absolute"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </div>
        )}

        {error ? (
          <div className="w-full bg-critical-tint border border-clinical-red/20 rounded-xl p-5 text-center">
            <p className="text-sm font-semibold text-critical mb-1">Something went wrong</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <a
              href="/"
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Try again
            </a>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">Analysing your data</h1>
              <p className="text-sm text-muted-foreground mt-1">
                This usually takes 30–90 seconds for a full export.
              </p>
            </div>

            <div className="w-full bg-card border border-border rounded-2xl p-5">
              <MilestoneList milestones={milestones} />
            </div>

            <FactCarousel />
          </>
        )}
      </div>
    </main>
  )
}
