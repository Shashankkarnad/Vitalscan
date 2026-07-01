'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VitalScanResult } from '@/lib/types'
import { loadResult } from '@/lib/store'
import { avg, nn, formatK } from '@/lib/utils'
import ChartSection from '@/components/results/ChartSection'
import HrvChart from '@/components/results/charts/HrvChart'
import RhrChart from '@/components/results/charts/RhrChart'
import Spo2Chart from '@/components/results/charts/Spo2Chart'
import SleepChart from '@/components/results/charts/SleepChart'
import SleepHypnogram from '@/components/results/charts/SleepHypnogram'
import StepsChart from '@/components/results/charts/StepsChart'

export default function ResultsPage() {
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

  const avgHrv = avg(data.hrv_values)
  const avgRhr = avg(data.rhr_avg.filter(nn))
  const latestSteps = data.steps_month.at(-1)
  const spo2LowNights = data.spo2_low_count.reduce((a, b) => a + b, 0)

  const hasHypnogram = !!data.sleep_timeline && Object.keys(data.sleep_timeline).length > 0

  return (
    <main className="min-h-screen bg-background px-4 py-8 pb-safe">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="animate-[fadeUp_0.4s_ease_both]">
          <button
            onClick={() => router.push('/verdict')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to verdict
          </button>
          <h1 className="text-2xl font-bold text-foreground">Full Health Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.months?.length} months of data · {data.profile.name ?? 'Your'} Apple Health export
          </p>
        </div>

        {/* HRV */}
        {data.hrv_values.length > 0 && (
          <ChartSection
            title="Heart Rate Variability (HRV)"
            subtitle={avgHrv != null ? `Daily avg · Overall avg ${Math.round(avgHrv)} ms` : 'Daily readings'}
            note="HRV below 35 ms is associated with elevated cardiovascular risk and poor autonomic recovery. Target: >50 ms."
          >
            <HrvChart dates={data.hrv_dates} values={data.hrv_values} />
          </ChartSection>
        )}

        {/* RHR */}
        {data.rhr_avg.some(nn) && (
          <ChartSection
            title="Resting Heart Rate"
            subtitle={avgRhr != null ? `Monthly avg · Overall ${Math.round(avgRhr)} bpm` : 'Monthly averages'}
            note="Target resting heart rate: <70 bpm. Persistent elevation above 80 bpm is linked to increased cardiac risk."
          >
            <RhrChart months={data.months} values={data.rhr_avg} />
          </ChartSection>
        )}

        {/* SpO2 */}
        {data.spo2_avg_month.some(nn) && (
          <ChartSection
            title="Blood Oxygen (SpO₂)"
            subtitle={spo2LowNights > 0 ? `${spo2LowNights} nights below 88% detected` : 'Monthly averages'}
            note="SpO₂ below 95% may indicate respiratory issues. Values below 88% during sleep suggest possible sleep apnea — consult a physician."
          >
            <Spo2Chart
              months={data.months}
              avg={data.spo2_avg_month}
              min={data.spo2_min_month}
            />
          </ChartSection>
        )}

        {/* Sleep */}
        {(data.sleep_deep_month.some(nn) || data.sleep_rem_month.some(nn)) && (
          <ChartSection
            title="Sleep Architecture"
            subtitle="Monthly averages by stage"
          >
            {hasHypnogram && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Nightly Hypnogram
                </h3>
                <SleepHypnogram
                  timeline={data.sleep_timeline!}
                  nights={data.sleep_nights}
                />
              </div>
            )}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Monthly Stage Averages
            </h3>
            <SleepChart
              months={data.months}
              deep={data.sleep_deep_month}
              rem={data.sleep_rem_month}
              core={data.sleep_core_month}
            />
          </ChartSection>
        )}

        {/* Steps */}
        {data.steps_month.length > 0 && (
          <ChartSection
            title="Monthly Steps"
            subtitle={latestSteps != null ? `Latest: ${formatK(latestSteps)} steps` : 'Monthly totals'}
            note="Consistent 8,000–10,000 daily steps correlates with significantly reduced all-cause mortality risk."
          >
            <StepsChart months={data.months} values={data.steps_month} />
          </ChartSection>
        )}

        {/* Weight & VO2 */}
        {(data.weight_trend?.length > 0 || data.vo2_trend?.length > 0) && (
          <ChartSection
            title="Body Composition & Fitness"
            subtitle="Weight trend and estimated VO₂ max"
          >
            <div className="flex flex-col gap-4">
              {data.weight_trend?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Weight (kg)</p>
                  <div className="flex gap-2 flex-wrap">
                    {data.weight_trend.slice(-6).map(([date, w]) => (
                      <div key={date} className="flex flex-col items-center bg-secondary rounded-lg px-3 py-2">
                        <span className="text-sm font-bold text-foreground">{w.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.vo2_trend?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Estimated VO₂ max (ml/kg/min)</p>
                  <div className="flex gap-2 flex-wrap">
                    {data.vo2_trend.slice(-6).map(([date, v]) => (
                      <div key={date} className="flex flex-col items-center bg-teal/5 border border-teal/15 rounded-lg px-3 py-2">
                        <span className="text-sm font-bold text-teal">{v.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ChartSection>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed pb-4">
          VitalScan is for informational purposes only and does not constitute medical advice.
          Always consult a qualified healthcare provider for diagnosis and treatment.
        </p>
      </div>
    </main>
  )
}
