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
