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
  weight_trend: [string, number][]
  vo2_trend: [string, number][]
  findings: Finding[]
}
