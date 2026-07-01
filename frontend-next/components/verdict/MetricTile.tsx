'use client'

import type { Severity } from '@/lib/types'

interface Props {
  label: string
  value: string
  unit?: string
  severity?: Severity
  sub?: string
}

const TOP_BORDER: Record<string, string> = {
  critical: 'border-t-clinical-red',
  elevated: 'border-t-clinical-orange',
  moderate: 'border-t-clinical-yellow',
  good: 'border-t-clinical-green',
}

export default function MetricTile({ label, value, unit, severity = 'good', sub }: Props) {
  return (
    <div
      className={[
        'bg-card rounded-xl border border-border border-t-2 p-4',
        TOP_BORDER[severity],
      ].join(' ')}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{value}</span>
        {unit && <span className="text-[11px] text-muted-foreground leading-tight">{unit}</span>}
      </div>
      {sub && <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{sub}</p>}
    </div>
  )
}
