import type {
  VitalScanResult,
  MetricKey,
  MetricBand,
  Decision,
  Source,
  BandStatus,
} from '@/lib/types'
import {
  METRICS,
  METRIC_BY_KEY,
  STATUS_WORD,
  STATUS_COLOR,
  worstStatus,
  BADGE_COLOR,
  badgeLabel,
  GRADE_COLOR,
  numberWord,
  capitalize,
  formatShortDate,
} from './metrics'
import { COLOR } from './tokens'

/** True once the export carries the 0.3 contract fields the new screens need. */
export function hasContract(result: VitalScanResult | null | undefined): boolean {
  return !!(result && result.daily && result.bands && result.weekly)
}

export interface MetricSeries {
  key: MetricKey
  dates: string[]
  values: (number | null)[]
  lo: (number | null)[]
  hi: (number | null)[]
  band: MetricBand | undefined
}

export function getSeries(result: VitalScanResult, key: MetricKey): MetricSeries {
  const dates = result.daily?.dates ?? []
  const values = (result.daily?.[key] ?? []) as (number | null)[]
  const band = result.bands?.[key]
  return {
    key,
    dates,
    values,
    lo: band?.lo ?? [],
    hi: band?.hi ?? [],
    band,
  }
}

// ── Categories (Home) ────────────────────────────────────────────────────

export interface CategoryMeta {
  key: string
  label: string
  metricKeys: MetricKey[]
  color: string
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'cardiac', label: 'CARDIAC', metricKeys: ['rhr', 'mean_hr'], color: COLOR.coral },
  { key: 'recovery', label: 'RECOVERY', metricKeys: ['hrv', 'breathing', 'spo2'], color: COLOR.teal },
  { key: 'activity', label: 'ACTIVITY', metricKeys: ['steps'], color: COLOR.amber },
  { key: 'sleep', label: 'SLEEP', metricKeys: ['sleep_hours'], color: COLOR.blue },
]

export interface CategoryCard {
  key: string
  label: string
  status: BandStatus
  statusWord: string
  statusColor: string
  metrics: { name: string; cur: string }[]
  series: MetricSeries
  color: string
  chartKind: 'line' | 'bar'
}

export function buildCategories(result: VitalScanResult): CategoryCard[] {
  return CATEGORIES.map((cat) => {
    const statuses = cat.metricKeys.map((k) => result.bands?.[k]?.status ?? 'no_data')
    const status = worstStatus(statuses)
    const metrics = cat.metricKeys.map((k) => {
      const meta = METRIC_BY_KEY[k]
      const band = result.bands?.[k]
      // Design rule: a gapped metric shows no stale "current" value.
      const cur =
        band?.status === 'data_gap'
          ? `— no data · ${band.gap_days} d`
          : band?.current != null
            ? meta.fmt(band.current) + (meta.unit ? ' ' + meta.unit : '')
            : '—'
      return { name: meta.name, cur }
    })
    return {
      key: cat.key,
      label: cat.label,
      status,
      statusWord: STATUS_WORD[status],
      statusColor: STATUS_COLOR[status],
      metrics,
      series: getSeries(result, cat.metricKeys[0]),
      color: cat.color,
      chartKind: METRIC_BY_KEY[cat.metricKeys[0]].chartKind,
    }
  })
}

// ── Verdict / steady line (Home) ─────────────────────────────────────────

function namesOf(keys: string[]): string {
  const names = keys.map((k) => METRIC_BY_KEY[k as MetricKey]?.shortName ?? k)
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

export interface Verdict {
  weekLabel: string
  verdict: string
  verdictSub: string
  steady: string
  nextNote: string
  hasFindings: boolean
}

export function buildVerdict(result: VitalScanResult): Verdict {
  const weekly = result.weekly!
  const total = weekly.in_band.length + weekly.watching.length + weekly.gaps.length + weekly.no_data.length
  const allGood = weekly.watching.length === 0 && weekly.gaps.length === 0 && weekly.no_data.length === 0
  const recordsTxt = weekly.records_read.toLocaleString('en-US')

  let verdict: string
  let verdictSub: string

  if (allGood) {
    verdict = 'All signals in your normal range.'
    verdictSub = `Nothing needs your attention. VitalScan read ${recordsTxt} new records this week and found nothing worth your time — that is the product working.`
  } else {
    verdict = `${capitalize(numberWord(weekly.in_band.length))} of ${numberWord(total)} signals stayed inside your band.`
    const parts: string[] = []
    if (weekly.watching.length)
      parts.push(`${namesOf(weekly.watching)} ${weekly.watching.length > 1 ? 'are' : 'is'} being watched`)
    if (weekly.gaps.length)
      parts.push(`${namesOf(weekly.gaps)} ${weekly.gaps.length > 1 ? 'have' : 'has'} a data gap`)
    if (weekly.no_data.length)
      parts.push(`${namesOf(weekly.no_data)} ${weekly.no_data.length > 1 ? 'have' : 'has'} no data yet`)
    verdictSub = parts.length
      ? capitalize(parts.join('; ')) + '. Neither is urgent.'
      : 'Nothing needs your attention this week.'
  }

  let steady: string
  if (weekly.in_band.length === 0) {
    steady = 'No signals settled inside your band this week.'
  } else {
    const bits = weekly.in_band.map((k) => {
      const meta = METRIC_BY_KEY[k as MetricKey]
      const band = result.bands?.[k as MetricKey]
      if (!meta) return k
      if (band?.current == null) return meta.shortName
      return `${meta.shortName} ${meta.fmt(band.current)}${meta.unit ? ' ' + meta.unit : ''}`
    })
    steady = allGood
      ? `${bits.join(', ')} — inside your band all week. Nothing to say about them.`
      : `${bits.join(', ')} — steady, inside your band this week.`
  }

  return {
    weekLabel: weekly.label,
    verdict,
    verdictSub,
    steady,
    nextNote: "Next note Sunday 06:00 — you'll hear sooner only if two signals agree.",
    hasFindings: !allGood,
  }
}

// ── Findings (Home) — active, non-suppressed decisions with an open card ──

export interface Finding {
  decision: Decision
  meta: (typeof METRICS)[number] | undefined
  level: string
  color: string
  date: string
  title: string
  body: string
  series: MetricSeries
}

export function buildFindings(result: VitalScanResult): Finding[] {
  const decisions = [...(result.decisions ?? [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const newestByMetric = new Map<string, Decision>()
  for (const d of decisions) {
    if (!newestByMetric.has(d.metric)) newestByMetric.set(d.metric, d)
  }
  const active = [...newestByMetric.values()].filter(
    (d) => !d.suppressed && (d.badge === 'WATCHING' || d.badge === 'ATTENTION' || d.badge === 'DATA_GAP'),
  )
  // Preserve newest-first overall order
  active.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  return active.map((d) => {
    const meta = METRIC_BY_KEY[d.metric as MetricKey]
    const bodyLine =
      d.lines.find((l) => l.k.toLowerCase() === 'corroboration')?.v ??
      d.lines.find((l) => l.k.toLowerCase() !== 'value')?.v ??
      ''
    const body = bodyLine ? capitalize(bodyLine) + (bodyLine.endsWith('.') ? '' : '.') : ''
    return {
      decision: d,
      meta,
      level: badgeLabel(d.badge),
      color: BADGE_COLOR[d.badge],
      date: formatShortDate(d.date).toUpperCase(),
      title: d.title,
      body,
      series: getSeries(result, d.metric as MetricKey),
    }
  })
}

// ── Dashboard tiles ───────────────────────────────────────────────────────

export interface DashboardTile {
  meta: (typeof METRICS)[number]
  cur: string
  statusWord: string
  statusColor: string
  zTxt: string
  series: MetricSeries
}

export function buildDashboardTiles(result: VitalScanResult): DashboardTile[] {
  return METRICS.map((meta) => {
    const series = getSeries(result, meta.key)
    const band = series.band
    const status = band?.status ?? 'no_data'
    // Design rule: a gapped metric shows "—" and its last-sample date, not a stale value/z.
    const gapped = status === 'data_gap'
    const cur = !gapped && band?.current != null ? meta.fmt(band.current) : '—'
    const zTxt =
      !gapped && band?.z != null
        ? `z ${band.z >= 0 ? '+' : '−'}${Math.abs(band.z).toFixed(1)} vs band`
        : band?.last_sample
          ? `last sample ${formatShortDate(band.last_sample)}`
          : 'no data'
    return {
      meta,
      cur,
      statusWord: STATUS_WORD[status],
      statusColor: STATUS_COLOR[status],
      zTxt,
      series,
    }
  })
}

// ── Metric breakdown (personal narrative per signal) ─────────────────────

export interface MetricStat {
  label: string
  value: string
}

export interface MetricBreakdown {
  headline: string
  why: string
  stats: MetricStat[]
  bandRange: string | null
  activeDecision: Decision | null
  detailLines: { k: string; v: string }[]
}

function countBandDays(series: MetricSeries): { inBand: number; withData: number; outBand: number } {
  let inBand = 0
  let withData = 0
  let outBand = 0
  for (let i = 0; i < series.values.length; i++) {
    const v = series.values[i]
    if (v == null) continue
    withData++
    const lo = series.lo[i]
    const hi = series.hi[i]
    if (lo != null && hi != null) {
      if (v >= lo && v <= hi) inBand++
      else outBand++
    }
  }
  return { inBand, withData, outBand }
}

function recentMean(values: (number | null)[], days: number): number | null {
  const nums: number[] = []
  for (let i = values.length - 1; i >= 0 && nums.length < days; i--) {
    if (values[i] != null) nums.push(values[i]!)
  }
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function streakInBand(series: MetricSeries): number {
  let streak = 0
  for (let i = series.values.length - 1; i >= 0; i--) {
    const v = series.values[i]
    if (v == null) continue
    const lo = series.lo[i]
    const hi = series.hi[i]
    if (lo == null || hi == null) break
    if (v >= lo && v <= hi) streak++
    else break
  }
  return streak
}

function latestBandEdges(series: MetricSeries): { lo: number; hi: number } | null {
  for (let i = series.dates.length - 1; i >= 0; i--) {
    if (series.lo[i] != null && series.hi[i] != null) {
      return { lo: series.lo[i]!, hi: series.hi[i]! }
    }
  }
  return null
}

function activeDecisionForMetric(decisions: Decision[], metric: MetricKey): Decision | null {
  const sorted = [...decisions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const newest = sorted.find((d) => d.metric === metric)
  if (!newest) return null
  if (newest.suppressed) return null
  if (newest.badge === 'RESOLVED') return null
  if (newest.badge === 'WATCHING' || newest.badge === 'ATTENTION' || newest.badge === 'DATA_GAP') {
    return newest
  }
  return null
}

function trendLabel(current: number, avg: number, meta: (typeof METRICS)[number]): string {
  const diff = current - avg
  const tol =
    meta.key === 'steps'
      ? 500
      : meta.key === 'sleep_hours'
        ? 0.25
        : meta.key === 'spo2'
          ? 0.3
          : meta.key === 'breathing'
            ? 0.5
            : 1
  if (Math.abs(diff) <= tol) return 'Steady vs 7-day avg'
  const dir = diff > 0 ? '↑' : '↓'
  const unit = meta.unit ? ` ${meta.unit}` : meta.key === 'sleep_hours' ? ' h' : ''
  return `${dir} ${meta.fmt(Math.abs(diff))}${unit} vs 7-day avg`
}

function formatBandRange(meta: (typeof METRICS)[number], lo: number, hi: number): string {
  const fmt = meta.key === 'steps' ? (v: number) => Math.round(v).toLocaleString('en-US') : meta.fmt
  const unit = meta.unit || (meta.key === 'sleep_hours' ? 'h' : '')
  const suffix = unit ? ` ${unit}` : ''
  return `your normal ${fmt(lo)}–${fmt(hi)}${suffix}`
}

/** Default hero metric: first watching signal, else first gap, else resting HR. */
export function defaultDashboardMetric(result: VitalScanResult): MetricKey {
  const weekly = result.weekly
  if (weekly?.watching.length) return weekly.watching[0] as MetricKey
  if (weekly?.gaps.length) return weekly.gaps[0] as MetricKey
  return 'rhr'
}

export function buildMetricBreakdown(result: VitalScanResult, key: MetricKey): MetricBreakdown {
  const meta = METRIC_BY_KEY[key]
  const series = getSeries(result, key)
  const band = series.band
  const status = band?.status ?? 'no_data'
  const decisions = result.decisions ?? []
  const active = activeDecisionForMetric(decisions, key)
  const edges = latestBandEdges(series)
  const bandRange = edges ? formatBandRange(meta, edges.lo, edges.hi) : null
  const { inBand, withData, outBand } = countBandDays(series)
  const streak = streakInBand(series)
  const avg7 = recentMean(series.values, 7)

  const stats: MetricStat[] = []
  if (withData > 0) {
    stats.push({
      label: 'In your band',
      value: edges ? `${inBand} of ${withData} days` : `${withData} days recorded`,
    })
  }
  if (outBand > 0) stats.push({ label: 'Outside band', value: `${outBand} day${outBand === 1 ? '' : 's'}` })
  if (streak > 1 && status === 'in_range') {
    stats.push({ label: 'Current streak', value: `${streak} days in band` })
  }
  if (band?.current != null && avg7 != null && status !== 'data_gap' && status !== 'no_data') {
    stats.push({ label: 'Recent trend', value: trendLabel(band.current, avg7, meta) })
  }
  if (band?.z != null && status === 'watching') {
    stats.push({
      label: 'Distance from normal',
      value: `z ${band.z >= 0 ? '+' : '−'}${Math.abs(band.z).toFixed(1)}`,
    })
  }

  let headline: string
  let why: string
  const detailLines: { k: string; v: string }[] = []

  if (status === 'no_data') {
    headline = `No ${meta.name.toLowerCase()} data in this export.`
    why = `VitalScan couldn't find ${meta.name.toLowerCase()} readings in your Apple Health export. The chart stays visible so you know this signal wasn't skipped.`
  } else if (status === 'data_gap') {
    const last = band?.last_sample ? formatShortDate(band.last_sample) : 'unknown'
    const gap = band?.gap_days ?? 0
    headline = `${meta.name} — no recent readings.`
    why = `Last sample ${last}. That's a ${gap}-day gap with no new data. VitalScan won't guess what happened during the silence — it waits for fresh readings.`
    if (active?.lines.length) detailLines.push(...active.lines)
  } else if (status === 'watching') {
    const dir = band!.z! < 0 ? 'below' : 'above'
    headline = `${meta.name} is outside your personal normal.`
    why = active
      ? active.title + (active.lines.find((l) => l.k.toLowerCase() === 'corroboration') ? ' Another signal moved the same day — see details below.' : '.')
      : `Today's reading sits ${dir} your rolling 60-day band${bandRange ? ` (${bandRange})` : ''}. Points outside the shaded band are what VitalScan watches.`
    if (active?.lines.length) detailLines.push(...active.lines)
    else if (band?.current != null && edges) {
      detailLines.push({
        k: 'Reading',
        v: `${meta.fmt(band.current)} · band ${meta.fmt(edges.lo)}–${meta.fmt(edges.hi)} · z = ${band.z!.toFixed(1)}`,
      })
    }
  } else {
    headline = `${meta.name} is in your personal normal.`
    const curTxt =
      band?.current != null ? `Today's ${meta.fmt(band.current)}${meta.unit ? ' ' + meta.unit : ''}` : 'Your latest reading'
    why =
      bandRange && withData > 0
        ? `${curTxt} sits inside ${bandRange} — your rolling 60-day median ± 2 robust SD, built from your own history, not population averages. ${inBand} of ${withData} recorded days stayed in band.`
        : `${curTxt} is within range. The shaded band on the chart is your personal normal, recalculated daily from the last 60 days of your data.`
    detailLines.push({
      k: 'Your band',
      v: 'Rolling 60-day median ± 2 robust SD — null until 14+ samples in the window.',
    })
  }

  return { headline, why, stats, bandRange, activeDecision: active, detailLines }
}

// ── Evidence notes ────────────────────────────────────────────────────────

export function evidenceNote(result: VitalScanResult, key: MetricKey): string {
  const band = result.bands?.[key]
  const meta = METRIC_BY_KEY[key]
  if (!band) return ''
  if (band.status === 'no_data') return `No ${meta.name.toLowerCase()} data found in this export.`
  if (band.status === 'data_gap') {
    const last = band.last_sample ? formatShortDate(band.last_sample) : 'unknown'
    return `Last sample ${last} — gap of ${band.gap_days} day${band.gap_days === 1 ? '' : 's'}. No inference is made from the silence.`
  }
  const decision = (result.decisions ?? []).find(
    (d) => d.metric === key && !d.suppressed && (d.badge === 'WATCHING' || d.badge === 'ATTENTION'),
  )
  return decision?.title ?? ''
}

// ── Instruments / trust ──────────────────────────────────────────────────

export interface TrustRow {
  metric: string
  color: string
  rText: string
  grade: string
  gradeColor: string
  dashed: boolean
  opacity: number
  note: string
}

export interface TrustGroup {
  source: string
  role: string
  rows: TrustRow[]
}

export function buildTrust(sources: Source[]): TrustGroup[] {
  return sources.map((s) => {
    const avgCoverage =
      s.metrics.length > 0
        ? Math.round(s.metrics.reduce((a, m) => a + (m.coverage_pct ?? 0), 0) / s.metrics.length)
        : 0
    const rows: TrustRow[] = s.metrics.map((m) => {
      const meta = METRIC_BY_KEY[m.metric as MetricKey]
      const rText =
        m.grade === 'UNGRADED'
          ? `n = ${m.shared_days} d overlap`
          : `r = ${m.r != null ? m.r.toFixed(2) : '—'} · n = ${m.shared_days} d`
      return {
        metric: meta?.name ?? m.metric,
        color: meta?.color ?? COLOR.slate,
        rText,
        grade: m.grade,
        gradeColor: GRADE_COLOR[m.grade] ?? COLOR.slate,
        dashed: m.grade === 'DISTRUST',
        opacity: m.grade === 'DISTRUST' ? 0.48 : m.grade === 'UNGRADED' ? 0.75 : 1,
        note: m.note,
      }
    })
    return {
      source: s.name,
      role: `${s.role === 'reference' ? 'reference instrument' : 'secondary source'} · avg coverage ${avgCoverage}%`,
      rows,
    }
  })
}

// ── Audit log ─────────────────────────────────────────────────────────────

export interface AuditEntry {
  decision: Decision
  color: string
  badgeColor: string
  badgeText: string
  date: string
}

export function buildAudit(decisions: Decision[], showSuppressed: boolean): AuditEntry[] {
  const filtered = showSuppressed ? decisions : decisions.filter((d) => !d.suppressed)
  return filtered.map((d) => ({
    decision: d,
    color: METRIC_BY_KEY[d.metric as MetricKey]?.color ?? COLOR.slate,
    badgeColor: BADGE_COLOR[d.badge],
    badgeText: badgeLabel(d.badge),
    date: d.date,
  }))
}

// ── Z-score deviation heatmap (multivariate detector) ─────────────────────

/**
 * Per-metric concern direction: +1 = high is concerning (RHR, mean HR,
 * breathing), -1 = low is concerning (HRV, SpO2, sleep), 0 = contextual only
 * (steps — neither tail alarms). Cell hue keys off direction * z so a coral
 * cell always means "moved the concerning way", teal "the reassuring way".
 */
export const CONCERN_DIRECTION: Record<MetricKey, 1 | -1 | 0> = {
  rhr: 1,
  mean_hr: 1,
  breathing: 1,
  hrv: -1,
  spo2: -1,
  sleep_hours: -1,
  steps: 0,
}

export interface HeatmapRow {
  key: MetricKey
  label: string
  direction: 1 | -1 | 0
  z: (number | null)[]
}

export interface ZHeatmap {
  dates: string[]
  rows: HeatmapRow[]
  /** True where the multivariate combo fired that day (aligned to dates). */
  comboAlert: boolean[]
  hasData: boolean
}

/** Assemble the z-heatmap grid from result.z_series, keeping METRICS row order. */
export function buildZHeatmap(result: VitalScanResult): ZHeatmap {
  const dates = result.daily?.dates ?? []
  const zs = result.z_series ?? {}
  const rows: HeatmapRow[] = []
  for (const m of METRICS) {
    const z = zs[m.key]
    if (!z || z.length !== dates.length) continue
    if (!z.some((v) => v != null)) continue // no z anywhere — omit the row
    rows.push({ key: m.key, label: m.shortName ?? m.name, direction: CONCERN_DIRECTION[m.key], z })
  }
  const alert = result.combo?.alert ?? []
  const comboAlert = dates.map((_, i) => alert[i] === true)
  return { dates, rows, comboAlert, hasData: rows.length > 0 }
}
