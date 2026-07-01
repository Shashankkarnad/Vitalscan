'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VitalScanResult } from '@/lib/types'
import { loadResult } from '@/lib/store'
import { healthScore, avg, nn, formatHours } from '@/lib/utils'
import ScoreRing from '@/components/verdict/ScoreRing'
import FindingCard from '@/components/verdict/FindingCard'
import MetricTile from '@/components/verdict/MetricTile'
import PaywallGate from '@/components/verdict/PaywallGate'
import AlertBanner from '@/components/verdict/AlertBanner'

const VISIBLE_COUNT = 3

export default function VerdictPage() {
  const router = useRouter()
  const [data, setData] = useState<VitalScanResult | null>(null)

  useEffect(() => {
    const result = loadResult()
    if (!result) {
      router.replace('/')
      return
    }
    setData(result)
  }, [router])

  if (!data) return null

  const score = healthScore(data.findings)
  const visibleFindings = data.findings.slice(0, VISIBLE_COUNT)
  const lockedFindings = data.findings.slice(VISIBLE_COUNT)

  const hasCritical = data.findings.some((f) => f.severity === 'critical')
  const hasElevated = data.findings.some((f) => f.severity === 'elevated')

  const latestRhr = data.rhr_avg.filter(nn).at(-1)
  const latestHrv = data.hrv_avg.filter(nn).at(-1)
  const latestSpo2 = data.spo2_avg_month.filter(nn).at(-1)
  const avgSleep = avg(data.recent_sleep.total)

  const rhrSeverity = latestRhr
    ? latestRhr > 100 ? 'critical' : latestRhr > 80 ? 'elevated' : latestRhr > 70 ? 'moderate' : 'good'
    : 'good'
  const hrvSeverity = latestHrv
    ? latestHrv < 20 ? 'critical' : latestHrv < 35 ? 'elevated' : latestHrv < 50 ? 'moderate' : 'good'
    : 'good'
  const spo2Severity = latestSpo2
    ? latestSpo2 < 88 ? 'critical' : latestSpo2 < 92 ? 'elevated' : latestSpo2 < 95 ? 'moderate' : 'good'
    : 'good'
  const sleepSeverity = avgSleep
    ? avgSleep < 5 ? 'critical' : avgSleep < 6 ? 'elevated' : avgSleep < 7 ? 'moderate' : 'good'
    : 'good'

  return (
    <main className="min-h-screen bg-background px-4 py-8 pb-safe">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-[fadeUp_0.4s_ease_both]">
          <span className="text-xs font-semibold uppercase tracking-widest text-teal">Your Report</span>
          <h1 className="text-2xl font-bold text-foreground mt-2">
            {data.profile.name ? `${data.profile.name}'s Health Verdict` : 'Health Verdict'}
          </h1>
          {data.profile.age && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.profile.age}-year-old {data.profile.sex ?? ''} · {data.months_short?.at(-1) ?? ''} analysis
            </p>
          )}
        </div>

        {/* Score ring */}
        <div
          className="flex flex-col items-center gap-4 mb-8 animate-[fadeUp_0.4s_ease_both]"
          style={{ animationDelay: '80ms' }}
        >
          <ScoreRing score={score} />
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Based on {data.findings.length} clinical finding{data.findings.length !== 1 ? 's' : ''} across{' '}
            {data.months?.length ?? '—'} months of data.
          </p>
        </div>

        {/* Alert banners */}
        {(hasCritical || hasElevated) && (
          <div
            className="flex flex-col gap-2 mb-6 animate-[fadeUp_0.4s_ease_both]"
            style={{ animationDelay: '120ms' }}
          >
            {hasCritical && (
              <AlertBanner
                type="emergency"
                message="One or more critical findings detected. Please discuss these results with a qualified healthcare provider."
              />
            )}
            {!hasCritical && hasElevated && (
              <AlertBanner
                type="warning"
                message="Elevated findings detected. Monitor these trends and consider speaking with your doctor."
              />
            )}
          </div>
        )}

        {/* Metric tiles */}
        <div
          className="grid grid-cols-2 gap-3 mb-8 animate-[fadeUp_0.4s_ease_both]"
          style={{ animationDelay: '160ms' }}
        >
          {latestRhr != null && (
            <MetricTile
              label="Resting HR"
              value={Math.round(latestRhr).toString()}
              unit="bpm"
              severity={rhrSeverity}
              sub="Latest monthly avg"
            />
          )}
          {latestHrv != null && (
            <MetricTile
              label="HRV"
              value={Math.round(latestHrv).toString()}
              unit="ms SDNN"
              severity={hrvSeverity}
              sub="Latest monthly avg"
            />
          )}
          {latestSpo2 != null && (
            <MetricTile
              label="SpO₂"
              value={latestSpo2.toFixed(1)}
              unit="%"
              severity={spo2Severity}
              sub="Monthly average"
            />
          )}
          {avgSleep != null && (
            <MetricTile
              label="Avg Sleep"
              value={formatHours(avgSleep / 60)}
              severity={sleepSeverity}
              sub="Last 7 nights"
            />
          )}
        </div>

        {/* Findings */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Clinical Findings
          </h2>
          <div className="flex flex-col gap-3">
            {visibleFindings.map((f, i) => (
              <FindingCard key={f.key} finding={f} index={i} />
            ))}
          </div>
        </div>

        {/* Paywall */}
        {lockedFindings.length > 0 && (
          <div className="mb-8">
            <PaywallGate findings={lockedFindings} />
          </div>
        )}

        {/* CTA to full report */}
        <div
          className="text-center animate-[fadeUp_0.4s_ease_both]"
          style={{ animationDelay: '300ms' }}
        >
          <button
            onClick={() => router.push('/results')}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 h-12 px-8 rounded-xl bg-teal text-white font-semibold text-sm hover:bg-teal/90 transition-colors shadow-sm"
          >
            View full report
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <p className="text-xs text-muted-foreground mt-3">
            Detailed charts, trends, and sleep analysis inside.
          </p>
        </div>
      </div>
    </main>
  )
}
