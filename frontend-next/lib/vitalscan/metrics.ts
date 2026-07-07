import type { MetricKey, BandStatus, DecisionBadge } from '@/lib/types'
import { COLOR } from './tokens'
import { formatHours } from '@/lib/utils'

export interface MetricMeta {
  key: MetricKey
  name: string
  shortName: string
  unit: string
  color: string
  /** Format a raw value for display (current value / axis labels). */
  fmt: (v: number) => string
  /**
   * Chart form for this metric's timeline: 'bar' for discrete daily totals
   * (steps, sleep duration), 'line' for continuously-varying physiological
   * signals (heart rate, HRV, SpO2, breathing) where a line-in-band reads
   * change over time more naturally than discrete bars.
   */
  chartKind: 'line' | 'bar'
  /**
   * Richer main-chart form when this metric is selected on the dashboard.
   * 'stage' = stacked sleep stages, 'range' = daily min→max band + mean,
   * 'dip' = daily-minimum line (emphasize lows). Absent → use chartKind.
   */
  richChart?: 'stage' | 'range' | 'dip'
  /** 24x24 stroke icon path from the VitalScan.dc.html design. */
  iconPath: string
}

export const METRICS: MetricMeta[] = [
  {
    key: 'rhr',
    iconPath: 'M2 12h3.5l2-5.5 3.5 11 2.5-7 1.5 3H21',
    name: 'Resting heart rate',
    shortName: 'Resting HR',
    unit: 'bpm',
    color: COLOR.coral,
    fmt: (v) => String(Math.round(v)),
    chartKind: 'line',
  },
  {
    key: 'hrv',
    iconPath: 'M5 21c-1-8 3-15 15-16 1 11-6 16-13 15zm2-2c2-5 5-8 9-10',
    name: 'Morning HRV',
    shortName: 'HRV',
    unit: 'ms',
    color: COLOR.teal,
    fmt: (v) => String(Math.round(v)),
    chartKind: 'line',
  },
  {
    key: 'sleep_hours',
    iconPath: 'M20.5 15A8.5 8.5 0 0 1 9 3.5 8.5 8.5 0 1 0 20.5 15z',
    name: 'Sleep',
    shortName: 'Sleep',
    unit: '',
    color: COLOR.blue,
    fmt: (v) => formatHours(v),
    chartKind: 'bar',
    richChart: 'stage',
  },
  {
    key: 'steps',
    iconPath: 'M13 2 4 14h6l-1 8 9-12h-6z',
    name: 'Steps',
    shortName: 'Steps',
    unit: 'steps',
    color: COLOR.amber,
    fmt: (v) => Math.round(v).toLocaleString('en-US'),
    chartKind: 'bar',
  },
  {
    key: 'mean_hr',
    iconPath: 'M12 20s-7-4.4-9.3-8.5C1 8.4 2.5 5 6 5c2.1 0 3.4 1.2 6 3.8C14.6 6.2 15.9 5 18 5c3.5 0 5 3.4 3.3 6.5C19 15.6 12 20 12 20z',
    name: 'Mean heart rate',
    shortName: 'Mean HR',
    unit: 'bpm',
    color: COLOR.coral,
    fmt: (v) => String(Math.round(v)),
    chartKind: 'line',
    richChart: 'range',
  },
  {
    key: 'breathing',
    iconPath: 'M3 8h9a3 3 0 1 0-3-3M3 16h6a3 3 0 1 1-3 3M3 12h15a3 3 0 1 0-3-3',
    name: 'Breathing rate',
    shortName: 'Breathing',
    unit: '/min',
    color: COLOR.teal,
    fmt: (v) => v.toFixed(1),
    chartKind: 'line',
  },
  {
    key: 'spo2',
    iconPath: 'M12 3s6.5 6.8 6.5 11.5A6.5 6.5 0 1 1 5.5 14.5C5.5 9.8 12 3 12 3z',
    name: 'Blood oxygen',
    shortName: 'SpO₂',
    unit: '%',
    color: COLOR.teal,
    fmt: (v) => v.toFixed(1),
    chartKind: 'line',
    richChart: 'dip',
  },
]

export const METRIC_BY_KEY: Record<MetricKey, MetricMeta> = Object.fromEntries(
  METRICS.map((m) => [m.key, m]),
) as Record<MetricKey, MetricMeta>

/** Compact "k" formatting for step counts on charts, e.g. 11500 -> "11.5k". */
export function formatStepsK(v: number): string {
  return (v / 1000).toFixed(1).replace('.0', '') + 'k'
}

export const STATUS_WORD: Record<BandStatus, string> = {
  in_range: 'In range',
  watching: 'Watching',
  data_gap: 'Data gap',
  no_data: 'No data',
}

export const STATUS_COLOR: Record<BandStatus, string> = {
  in_range: COLOR.teal,
  watching: COLOR.amber,
  data_gap: COLOR.slate,
  no_data: COLOR.slate,
}

/**
 * Aggregate several metric statuses into one category status.
 * Watching and data gaps always surface; "No data" only when the whole
 * category lacks data (a category with in-range metrics is not "No data").
 */
export function worstStatus(statuses: BandStatus[]): BandStatus {
  if (statuses.includes('watching')) return 'watching'
  if (statuses.includes('data_gap')) return 'data_gap'
  if (statuses.length > 0 && statuses.every((s) => s === 'no_data')) return 'no_data'
  return 'in_range'
}

export const BADGE_COLOR: Record<DecisionBadge, string> = {
  WATCHING: COLOR.amber,
  ATTENTION: COLOR.coral,
  DATA_GAP: COLOR.slate,
  SUPPRESSED: COLOR.slate,
  RESOLVED: COLOR.teal,
  SOURCE_DISTRUSTED: COLOR.coral,
  COMBO: COLOR.coral,
}

export function badgeLabel(b: DecisionBadge): string {
  return b.replace(/_/g, ' ')
}

export const GRADE_COLOR: Record<string, string> = {
  TRUSTED: COLOR.teal,
  PARTIAL: COLOR.amber,
  DISTRUST: COLOR.coral,
  UNGRADED: COLOR.slate,
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

export function numberWord(n: number): string {
  if (n >= 0 && n < NUMBER_WORDS.length) return NUMBER_WORDS[n]
  return String(n)
}

export function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
