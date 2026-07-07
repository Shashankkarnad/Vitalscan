export type Severity = 'critical' | 'elevated' | 'moderate' | 'good'

export interface Finding {
  key: string
  severity: Severity
  title: string
  stat_value: string
  stat_unit: string
  description: string
  source: string
}

export interface Profile {
  age: number | null
  sex: 'male' | 'female' | null
  height_cm: number | null
  weight_kg: number | null
  bmi: number | null
  name: string | null
}

export interface RecentSleep {
  dates: string[]
  total: number[]
  deep: number[]
  rem: number[]
  core: number[]
  awake: number[]
}

export interface SleepNight {
  asleep: number
  deep: number
  rem: number
  core: number
  awake: number
}

export interface SleepSegment {
  start: string
  end: string
  stage: 'deep' | 'rem' | 'core' | 'awake'
}

// ── 0.3 contract (all optional — old cached 0.2 results in sessionStorage lack these) ──

/** Per-day arrays, last 90 calendar days ending at the last day with any data. Every array aligned to `dates`; null = no samples that day. */
export interface DailyData {
  dates: string[]
  rhr: (number | null)[]
  mean_hr: (number | null)[]
  hrv: (number | null)[]
  steps: (number | null)[]
  sleep_hours: (number | null)[]
  spo2: (number | null)[]
  breathing: (number | null)[]
  // Range extras for richer charts (optional — absent on old cached results).
  mean_hr_min?: (number | null)[]
  mean_hr_max?: (number | null)[]
  spo2_min?: (number | null)[]
}

export type MetricKey = 'rhr' | 'mean_hr' | 'hrv' | 'steps' | 'sleep_hours' | 'spo2' | 'breathing'

export type BandStatus = 'in_range' | 'watching' | 'data_gap' | 'no_data'

/** Personal-normal band for one metric: rolling 60-day median ± 2 robust SD (MAD-based), aligned to daily.dates. */
export interface MetricBand {
  lo: (number | null)[]
  hi: (number | null)[]
  current: number | null
  z: number | null
  status: BandStatus
  gap_days: number
  last_sample: string | null
}

export type Bands = Partial<Record<MetricKey, MetricBand>>

export type SourceRole = 'reference' | 'secondary'
export type SourceGrade = 'TRUSTED' | 'PARTIAL' | 'DISTRUST' | 'UNGRADED'

export interface SourceMetric {
  metric: string
  coverage_pct: number
  shared_days: number
  r: number | null
  grade: SourceGrade
  note: string
}

export interface Source {
  name: string
  role: SourceRole
  metrics: SourceMetric[]
}

export type DecisionBadge =
  | 'WATCHING'
  | 'ATTENTION'
  | 'DATA_GAP'
  | 'SUPPRESSED'
  | 'RESOLVED'
  | 'SOURCE_DISTRUSTED'
  | 'COMBO'

export interface DecisionLine {
  k: string
  v: string
}

export interface Decision {
  date: string
  signal: string
  metric: string
  title: string
  badge: DecisionBadge
  suppressed: boolean
  lines: DecisionLine[]
}

// ── Multivariate combo detector (anomaly.py) ──

/** Per-metric rolling robust-z series, aligned to daily.dates. null = no z (missing value or too little baseline). */
export type ZSeries = Partial<Record<MetricKey, (number | null)[]>>

export interface ComboContributor {
  metric: MetricKey
  z: number
  /** Fraction of the Mahalanobis distance this metric accounts for. */
  share: number
}

/** One combo alert day: distance beyond the self-calibrated personal cutoff, with a concerning-direction gate. */
export interface ComboAlert {
  date: string
  dist: number
  cutoff: number
  gate: MetricKey[]
  contributors: ComboContributor[]
}

/** A sustained deviation: alert days <= 3 calendar days apart merged into one event. */
export interface ComboEpisode {
  start: string
  end: string
  days: number
  peak_date: string
  peak_dist: number
  gate: MetricKey[]
  contributors: ComboContributor[]
}

/** Combo detector output within the 90-day window (arrays aligned to daily.dates). */
export interface Combo {
  dist: (number | null)[]
  cutoff: (number | null)[]
  alert: boolean[]
  alerts: ComboAlert[]
  episodes: ComboEpisode[]
}

export interface Weekly {
  label: string
  records_read: number
  in_band: string[]
  watching: string[]
  gaps: string[]
  no_data: string[]
}

export interface VitalScanResult {
  version: string
  profile: Profile
  months: string[]
  months_short: string[]
  hr_avg: (number | null)[]
  rhr_avg: (number | null)[]
  hrv_avg: (number | null)[]
  hrv_dates: string[]
  hrv_values: number[]
  steps_month: number[]
  active_cal: number[]
  sleep_deep_month: (number | null)[]
  sleep_rem_month: (number | null)[]
  sleep_core_month?: (number | null)[]
  hr_by_hour: (number | null)[]
  spo2_avg_month: (number | null)[]
  spo2_min_month: (number | null)[]
  spo2_low_count: number[]
  recent_sleep: RecentSleep
  sleep_nights: Record<string, SleepNight>
  sleep_timeline?: Record<string, SleepSegment[]>
  steps_daily?: Record<string, number>
  weight_trend: [string, number][]
  vo2_trend: [string, number][]
  findings: Finding[]

  // 0.3 contract — optional, absent on old cached (0.2) results
  daily?: DailyData
  bands?: Bands
  sources?: Source[]
  decisions?: Decision[]
  weekly?: Weekly
  z_series?: ZSeries
  combo?: Combo

  // Wearable instrument source picker — optional, absent on old cached results
  modes?: Record<string, ModeBlocks>
  source_modes?: SourceModeOption[]
}

/** Recompute of the daily/bands/decisions/etc. blocks for one instrument source mode. */
export interface ModeBlocks {
  daily: DailyData
  bands: Bands
  sources: Source[]
  decisions: Decision[]
  weekly: Weekly
  z_series: ZSeries
  combo: Combo
}

export interface SourceModeOption {
  key: string
  label: string
  kind: 'auto' | 'source' | 'all'
}
