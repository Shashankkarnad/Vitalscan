// Demo fixture for portfolio screenshots — satisfies hasContract() so
// /home, /instruments, /evidence, /signal, and /dashboard render without a
// real upload. Two real sources only (Apple Watch reference + Amazfit Helio
// Ring secondary); no invented devices. Series are generated with a tiny
// deterministic seeded-noise helper rather than hand-written day-by-day.
// No on-screen "sample"/"dummy" labels — this file is the only place that
// says "fixture".

import type {
  VitalScanResult,
  DailyData,
  Bands,
  MetricBand,
  Source,
  Decision,
  Weekly,
  ModeBlocks,
  SourceModeOption,
  BandStatus,
  ZSeries,
  Combo,
  SleepSegment,
  SleepNight,
} from '@/lib/types'

// ── deterministic PRNG + series generator ─────────────────────────────────

function makeRng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const N_DAYS = 90
const END_DATE = '2026-08-24'

function buildDates(): string[] {
  const end = new Date(`${END_DATE}T00:00:00Z`)
  const out: string[] = []
  for (let i = N_DAYS - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setUTCDate(d.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

const DATES = buildDates()

interface SeriesSpec {
  base: number
  amp: number
  noise: number
  seed: number
  decimals?: number
  nullDays?: Set<number>
  overrides?: Map<number, number>
}

function genSeries(spec: SeriesSpec): (number | null)[] {
  const rng = makeRng(spec.seed)
  const p = Math.pow(10, spec.decimals ?? 0)
  return DATES.map((_, i) => {
    if (spec.nullDays?.has(i)) return null
    const wave = Math.sin(i / 9 + spec.seed) * spec.amp
    const jitter = (rng() - 0.5) * 2 * spec.noise
    const v = spec.base + wave + jitter + (spec.overrides?.get(i) ?? 0)
    return Math.round(v * p) / p
  })
}

/** Interior run of null days (e.g. watch unworn for a stretch mid-window) — not a trailing gap. */
function interiorNulls(start: number, count: number): Set<number> {
  return new Set(Array.from({ length: count }, (_, k) => start + k))
}

/** Rolling personal-normal band, held constant for this fixture, + the derived status/z/gap for the last sample. */
function buildBand(values: (number | null)[], lo: number, hi: number): MetricBand {
  const loArr = values.map(() => lo)
  const hiArr = values.map(() => hi)
  let lastIdx = -1
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] != null) {
      lastIdx = i
      break
    }
  }
  if (lastIdx === -1) {
    return { lo: loArr, hi: hiArr, current: null, z: null, status: 'no_data', gap_days: 0, last_sample: null }
  }
  const gapDays = values.length - 1 - lastIdx
  const current = values[lastIdx]!
  const mid = (lo + hi) / 2
  const sd = (hi - lo) / 4
  const z = sd > 0 ? (current - mid) / sd : 0
  let status: BandStatus
  if (gapDays >= 3) status = 'data_gap'
  else if (current < lo || current > hi) status = 'watching'
  else status = 'in_range'
  return { lo: loArr, hi: hiArr, current, z, status, gap_days: gapDays, last_sample: DATES[lastIdx] }
}

function zSeriesFor(values: (number | null)[], lo: number, hi: number): (number | null)[] {
  const mid = (lo + hi) / 2
  const sd = (hi - lo) / 4
  return values.map((v) => (v == null || sd <= 0 ? null : (v - mid) / sd))
}

// ── daily series (90 days ending 2026-08-24) ───────────────────────────────

// rhr/hrv were already dense at their original amps (sine wave dominates z relative to
// band width), so only sleep/steps get a small bump here — enough for more heatmap cells
// to clear the |z| >= 0.4 neutral midpoint without saturating every row solid.
const rhr = genSeries({ base: 62, amp: 3, noise: 1.4, seed: 1, overrides: new Map([[18, 12], [46, -13], [71, 11]]) })
const hrv = genSeries({ base: 42, amp: 4, noise: 2.2, seed: 2 })
const sleepHours = genSeries({
  base: 7.15,
  amp: 0.32,
  noise: 0.22,
  seed: 3,
  decimals: 2,
  nullDays: interiorNulls(50, 6),
  overrides: new Map([[24, -2.1], [58, -1.9], [85, -2.05]]),
})
const steps = genSeries({
  base: 9200,
  amp: 1600,
  noise: 700,
  seed: 4,
  overrides: new Map(Array.from({ length: 7 }, (_, k) => [N_DAYS - 1 - k, -4300] as const)),
})
const meanHr = genSeries({ base: 75, amp: 4, noise: 2, seed: 5 })
const spo2 = genSeries({ base: 97.2, amp: 0.7, noise: 0.4, seed: 6, decimals: 1, nullDays: new Set([40, 41, 42]) })
const breathing = genSeries({
  base: 14.6,
  amp: 1.1,
  noise: 0.45,
  seed: 7,
  decimals: 1,
  nullDays: new Set([12, 13, 55, 56]),
})

const RHR_BAND = { lo: 58, hi: 68 }
const HRV_BAND = { lo: 34, hi: 50 }
const SLEEP_BAND = { lo: 6.2, hi: 7.9 }
const STEPS_BAND = { lo: 7000, hi: 12500 }
const MEAN_HR_BAND = { lo: 68, hi: 84 }
const SPO2_BAND = { lo: 95, hi: 99 }
const BREATHING_BAND = { lo: 12, hi: 18 }

const daily: DailyData = {
  dates: DATES,
  rhr,
  mean_hr: meanHr,
  hrv,
  steps,
  sleep_hours: sleepHours,
  spo2,
  breathing,
  mean_hr_min: meanHr.map((v) => (v == null ? null : Math.round(v - 6))),
  mean_hr_max: meanHr.map((v) => (v == null ? null : Math.round(v + 9))),
  spo2_min: spo2.map((v) => (v == null ? null : Math.round((v - 0.8) * 10) / 10)),
}

const bands: Bands = {
  rhr: buildBand(rhr, RHR_BAND.lo, RHR_BAND.hi),
  hrv: buildBand(hrv, HRV_BAND.lo, HRV_BAND.hi),
  sleep_hours: buildBand(sleepHours, SLEEP_BAND.lo, SLEEP_BAND.hi),
  steps: buildBand(steps, STEPS_BAND.lo, STEPS_BAND.hi),
  mean_hr: buildBand(meanHr, MEAN_HR_BAND.lo, MEAN_HR_BAND.hi),
  spo2: buildBand(spo2, SPO2_BAND.lo, SPO2_BAND.hi),
  breathing: buildBand(breathing, BREATHING_BAND.lo, BREATHING_BAND.hi),
}

const z_series: ZSeries = {
  rhr: zSeriesFor(rhr, RHR_BAND.lo, RHR_BAND.hi),
  hrv: zSeriesFor(hrv, HRV_BAND.lo, HRV_BAND.hi),
  sleep_hours: zSeriesFor(sleepHours, SLEEP_BAND.lo, SLEEP_BAND.hi),
  steps: zSeriesFor(steps, STEPS_BAND.lo, STEPS_BAND.hi),
  mean_hr: zSeriesFor(meanHr, MEAN_HR_BAND.lo, MEAN_HR_BAND.hi),
  spo2: zSeriesFor(spo2, SPO2_BAND.lo, SPO2_BAND.hi),
  breathing: zSeriesFor(breathing, BREATHING_BAND.lo, BREATHING_BAND.hi),
}

// Two multivariate episodes: a two-day strain stretch (rhr up, hrv down — reduced
// recovery, not exertion) and a one-day rhr spike that lines up with the existing
// rhr override at index 71. cutoff is the self-calibrated per-person distance
// threshold, held constant at 3.2 for this fixture.
const COMBO_CUTOFF = 3.2
const EP_A_START = 17
const EP_A_END = 18
const EP_B_DAY = 71

const combo: Combo = {
  dist: DATES.map((_, i) => {
    if (i === EP_A_START) return 4.1
    if (i === EP_A_END) return 4.4
    if (i === EP_B_DAY) return 3.8
    return null
  }),
  cutoff: DATES.map((_, i) => (i === EP_A_START || i === EP_A_END || i === EP_B_DAY ? COMBO_CUTOFF : null)),
  alert: DATES.map((_, i) => i === EP_A_START || i === EP_A_END || i === EP_B_DAY),
  alerts: [
    {
      date: DATES[EP_A_START],
      dist: 4.1,
      cutoff: COMBO_CUTOFF,
      gate: ['rhr', 'hrv'],
      contributors: [
        { metric: 'rhr', z: 3.0, share: 0.5 },
        { metric: 'hrv', z: -2.3, share: 0.35 },
        { metric: 'mean_hr', z: 1.9, share: 0.15 },
      ],
    },
    {
      date: DATES[EP_A_END],
      dist: 4.4,
      cutoff: COMBO_CUTOFF,
      gate: ['rhr', 'hrv'],
      contributors: [
        { metric: 'rhr', z: 3.2, share: 0.5 },
        { metric: 'hrv', z: -2.6, share: 0.35 },
        { metric: 'mean_hr', z: 2.1, share: 0.15 },
      ],
    },
    {
      date: DATES[EP_B_DAY],
      dist: 3.8,
      cutoff: COMBO_CUTOFF,
      gate: ['rhr'],
      contributors: [
        { metric: 'rhr', z: 3.4, share: 0.78 },
        { metric: 'mean_hr', z: 1.2, share: 0.22 },
      ],
    },
  ],
  episodes: [
    {
      start: DATES[EP_A_START],
      end: DATES[EP_A_END],
      days: 2,
      peak_date: DATES[EP_A_END],
      peak_dist: 4.4,
      gate: ['rhr', 'hrv'],
      contributors: [
        { metric: 'rhr', z: 3.2, share: 0.5 },
        { metric: 'hrv', z: -2.6, share: 0.35 },
        { metric: 'mean_hr', z: 2.1, share: 0.15 },
      ],
    },
    {
      start: DATES[EP_B_DAY],
      end: DATES[EP_B_DAY],
      days: 1,
      peak_date: DATES[EP_B_DAY],
      peak_dist: 3.8,
      gate: ['rhr'],
      contributors: [
        { metric: 'rhr', z: 3.4, share: 0.78 },
        { metric: 'mean_hr', z: 1.2, share: 0.22 },
      ],
    },
  ],
}

// ── sources / instrument trust ──────────────────────────────────────────

const sources: Source[] = [
  {
    name: 'Apple Watch',
    role: 'reference',
    metrics: [
      { metric: 'rhr', coverage_pct: 99, shared_days: 90, r: null, grade: 'TRUSTED', note: 'Reference — sets the baseline for this metric.' },
      { metric: 'hrv', coverage_pct: 97, shared_days: 90, r: null, grade: 'TRUSTED', note: 'Reference — sets the baseline for this metric.' },
      { metric: 'sleep_hours', coverage_pct: 94, shared_days: 85, r: null, grade: 'TRUSTED', note: 'Reference — sets the baseline for this metric.' },
      { metric: 'steps', coverage_pct: 98, shared_days: 90, r: null, grade: 'TRUSTED', note: 'Reference — sets the baseline for this metric.' },
      { metric: 'mean_hr', coverage_pct: 96, shared_days: 90, r: null, grade: 'TRUSTED', note: 'Reference — sets the baseline for this metric.' },
      { metric: 'spo2', coverage_pct: 90, shared_days: 87, r: null, grade: 'TRUSTED', note: 'Reference — sets the baseline for this metric.' },
      { metric: 'breathing', coverage_pct: 93, shared_days: 86, r: null, grade: 'TRUSTED', note: 'Reference — sets the baseline for this metric.' },
    ],
  },
  {
    name: 'Amazfit Helio Ring',
    role: 'secondary',
    metrics: [
      { metric: 'rhr', coverage_pct: 88, shared_days: 84, r: -0.26, grade: 'DISTRUST', note: 'Disagrees with Apple Watch — excluded from the resting-HR band.' },
      { metric: 'hrv', coverage_pct: 74, shared_days: 71, r: 0.52, grade: 'PARTIAL', note: 'Moderate agreement — included with lower weight.' },
      { metric: 'sleep_hours', coverage_pct: 69, shared_days: 66, r: 0.48, grade: 'PARTIAL', note: 'Moderate agreement — included with lower weight.' },
      { metric: 'steps', coverage_pct: 91, shared_days: 88, r: 0.81, grade: 'TRUSTED', note: 'Strong agreement with the reference device.' },
      { metric: 'mean_hr', coverage_pct: 72, shared_days: 68, r: 0.31, grade: 'DISTRUST', note: 'Disagrees with Apple Watch on daily load — excluded from the mean-HR band.' },
    ],
  },
]

// ── decisions (findings on Home) ─────────────────────────────────────────
// Built after `bands` so the reading lines quote the actual current/z rather
// than hand-typed numbers that could drift from the generated series.

function fmtZ(z: number): string {
  return `${z >= 0 ? '+' : '−'}${Math.abs(z).toFixed(1)}`
}

const stepsBand = bands.steps!
const stepsReading = `${Math.round(stepsBand.current!).toLocaleString('en-US')} steps · band ${STEPS_BAND.lo.toLocaleString('en-US')}–${STEPS_BAND.hi.toLocaleString('en-US')} · z ${fmtZ(stepsBand.z!)}`

const sleepMid = (SLEEP_BAND.lo + SLEEP_BAND.hi) / 2
const sleepSd = (SLEEP_BAND.hi - SLEEP_BAND.lo) / 4
const shortNightValue = sleepHours[85]!
const shortNightZ = (shortNightValue - sleepMid) / sleepSd
const shortNightReading = `${shortNightValue.toFixed(2)} h · band ${SLEEP_BAND.lo.toFixed(2)}–${SLEEP_BAND.hi.toFixed(2)} h · z ${fmtZ(shortNightZ)}`

const decisions: Decision[] = [
  {
    date: DATES[N_DAYS - 1],
    signal: 'Steps',
    metric: 'steps',
    title: 'Steps fell below your normal range this week.',
    badge: 'WATCHING',
    suppressed: false,
    lines: [
      { k: 'Reading', v: stepsReading },
      { k: 'Corroboration', v: 'Mean heart rate stayed inside your band the same days — reads as lower activity, not strain.' },
    ],
  },
  {
    date: DATES[85],
    signal: 'Sleep',
    metric: 'sleep_hours',
    title: 'Sleep ran about two hours short one night this week.',
    badge: 'ATTENTION',
    suppressed: false,
    lines: [
      { k: 'Reading', v: shortNightReading },
      { k: 'Corroboration', v: 'HRV and resting heart rate stayed in band the next morning — one short night, not a trend.' },
    ],
  },
]

// ── weekly summary ────────────────────────────────────────────────────────

const weekly: Weekly = {
  label: 'Week of 18–24 Aug 2026',
  records_read: 48213,
  in_band: ['rhr', 'hrv', 'mean_hr', 'spo2', 'sleep_hours', 'breathing'],
  watching: ['steps'],
  gaps: [],
  no_data: [],
}

// ── one small night of hypnogram data (kept short, per the brief) ────────

function fmtSegTime(ms: number): string {
  const d = new Date(ms)
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)} +0000`
}

function buildNightSegments(bedDate: string): SleepSegment[] {
  const plan: { stage: SleepSegment['stage']; minutes: number }[] = [
    { stage: 'awake', minutes: 8 },
    { stage: 'core', minutes: 70 },
    { stage: 'deep', minutes: 55 },
    { stage: 'core', minutes: 60 },
    { stage: 'rem', minutes: 40 },
    { stage: 'core', minutes: 65 },
    { stage: 'deep', minutes: 35 },
    { stage: 'rem', minutes: 45 },
    { stage: 'core', minutes: 50 },
    { stage: 'awake', minutes: 5 },
  ]
  let cursor = new Date(`${bedDate}T23:00:00Z`).getTime()
  return plan.map((p) => {
    const start = cursor
    cursor += p.minutes * 60_000
    return { start: fmtSegTime(start), end: fmtSegTime(cursor), stage: p.stage }
  })
}

const NIGHT_WAKE_DATE = DATES[N_DAYS - 1]
const NIGHT_BED_DATE = DATES[N_DAYS - 2]
const nightSegments = buildNightSegments(NIGHT_BED_DATE)
const nightTotals = nightSegments.reduce(
  (acc, seg) => {
    const mins = (new Date(`${seg.end.slice(0, 19).replace(' ', 'T')}Z`).getTime() - new Date(`${seg.start.slice(0, 19).replace(' ', 'T')}Z`).getTime()) / 60_000
    acc[seg.stage] += mins
    return acc
  },
  { deep: 0, rem: 0, core: 0, awake: 0 },
)
const sleepNightEntry: SleepNight = {
  asleep: Math.round(((nightTotals.deep + nightTotals.rem + nightTotals.core) / 60) * 100) / 100,
  deep: Math.round((nightTotals.deep / 60) * 100) / 100,
  rem: Math.round((nightTotals.rem / 60) * 100) / 100,
  core: Math.round((nightTotals.core / 60) * 100) / 100,
  awake: Math.round((nightTotals.awake / 60) * 100) / 100,
}

// ── source-mode picker (Auto / Apple Watch / Amazfit Helio Ring / Combine all) ──
// All four keys reuse the same computed blocks — reads fine in the picker
// without a second data model to generate.

const modeBlocks: ModeBlocks = { daily, bands, sources, decisions, weekly, z_series, combo }

const source_modes: SourceModeOption[] = [
  { key: 'auto', label: 'Auto', kind: 'auto' },
  { key: 'apple_watch', label: 'Apple Watch', kind: 'source' },
  { key: 'amazfit_helio_ring', label: 'Amazfit Helio Ring', kind: 'source' },
  { key: 'combine_all', label: 'Combine all', kind: 'all' },
]

const modes: Record<string, ModeBlocks> = {
  auto: modeBlocks,
  apple_watch: modeBlocks,
  amazfit_helio_ring: modeBlocks,
  combine_all: modeBlocks,
}

// ── stub 0.2 fields VitalScanResult still requires (unused by the 0.3 screens) ──

export const FIXTURE_RESULT: VitalScanResult = {
  version: '0.3-fixture',
  profile: { age: null, sex: null, height_cm: null, weight_kg: null, bmi: null, name: null },
  months: [],
  months_short: [],
  hr_avg: [],
  rhr_avg: [],
  hrv_avg: [],
  hrv_dates: [],
  hrv_values: [],
  steps_month: [],
  active_cal: [],
  sleep_deep_month: [],
  sleep_rem_month: [],
  hr_by_hour: [],
  spo2_avg_month: [],
  spo2_min_month: [],
  spo2_low_count: [],
  recent_sleep: { dates: [], total: [], deep: [], rem: [], core: [], awake: [] },
  sleep_nights: { [NIGHT_WAKE_DATE]: sleepNightEntry },
  sleep_timeline: { [NIGHT_WAKE_DATE]: nightSegments },
  weight_trend: [],
  vo2_trend: [],
  findings: [],

  daily,
  bands,
  sources,
  decisions,
  weekly,
  z_series,
  combo,

  modes,
  source_modes,
}
