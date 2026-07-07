'use client'

// The per-metric chart picker, shared by the dashboard and the signal deep dive.
// Chooses the richer form per metric (stacked sleep stages / HR min-max range /
// SpO2 daily-minimum) and overlays the 7-day trend + combo-alert markers.

import BandChart from './BandChart'
import StageBars from './StageBars'
import { getSeries, buildSleepStages, rollingAvg } from '@/lib/vitalscan/derive'
import { METRIC_BY_KEY, formatStepsK } from '@/lib/vitalscan/metrics'
import { SLEEP_STAGE, FONT_MONO } from '@/lib/vitalscan/tokens'
import type { VitalScanResult, MetricKey } from '@/lib/types'

export default function MetricChart({ result, metricKey, height = 210 }: { result: VitalScanResult; metricKey: MetricKey; height?: number }) {
  const meta = METRIC_BY_KEY[metricKey]
  const series = getSeries(result, metricKey)
  const band = series.band
  const alerts = result.combo?.alert ?? []
  const trend = metricKey === 'hrv' || metricKey === 'steps' ? rollingAvg(series.values) : undefined
  const fmtAxis = metricKey === 'steps' ? formatStepsK : meta.fmt

  if (meta.richChart === 'stage') {
    return (
      <>
        <StageBars {...buildSleepStages(result)} alerts={alerts} width={940} height={height} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
          {(['deep', 'core', 'rem', 'awake'] as const).map((s) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 10, borderRadius: 2, background: SLEEP_STAGE[s] }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(234,234,234,.5)', textTransform: 'capitalize' }}>{s}</span>
            </span>
          ))}
        </div>
      </>
    )
  }
  if (meta.richChart === 'range') {
    return (
      <BandChart
        values={series.values}
        dates={series.dates}
        lo={result.daily?.mean_hr_min ?? []}
        hi={result.daily?.mean_hr_max ?? []}
        color={meta.color}
        width={940}
        height={height}
        fmt={meta.fmt}
        unit="bpm"
        variant="range"
        alerts={alerts}
        refLine={band?.current != null ? { value: result.bands?.rhr?.current ?? band.current, label: 'resting' } : undefined}
        label="Mean heart rate — daily low to high with the mean, over 90 days"
      />
    )
  }
  if (meta.richChart === 'dip') {
    return (
      <BandChart
        values={result.daily?.spo2_min ?? []}
        dates={series.dates}
        lo={[]}
        hi={[]}
        color={meta.color}
        width={940}
        height={height}
        fmt={meta.fmt}
        unit="%"
        variant="line"
        alerts={alerts}
        refLine={{ value: 95, label: '95% reference' }}
        label="Blood oxygen — daily minimum over 90 days"
      />
    )
  }
  return (
    <BandChart
      values={series.values}
      dates={series.dates}
      lo={series.lo}
      hi={series.hi}
      color={meta.color}
      width={940}
      height={height}
      fmt={fmtAxis}
      unit={meta.unit || (metricKey === 'sleep_hours' ? 'h' : '')}
      variant={meta.chartKind}
      trend={trend}
      alerts={alerts}
      label={`${meta.name} — 90 days against your personal band`}
    />
  )
}
