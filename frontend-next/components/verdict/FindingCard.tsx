'use client'

import type { Finding } from '@/lib/types'
import { severityBorderClass, severityBgClass, severityTextClass } from '@/lib/utils'

interface Props {
  finding: Finding
  index?: number
  blurred?: boolean
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  elevated: 'Elevated',
  moderate: 'Moderate',
  good: 'Good',
}

export default function FindingCard({ finding: f, index = 0, blurred = false }: Props) {
  return (
    <div
      className={[
        'rounded-xl border border-border border-l-4 p-4 flex gap-4',
        'animate-[fadeUp_0.5s_ease_both]',
        severityBorderClass(f.severity),
        severityBgClass(f.severity),
        blurred ? 'blur-sm pointer-events-none select-none' : '',
      ].join(' ')}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex-shrink-0 text-right min-w-[56px]">
        <span className={`text-xl sm:text-2xl font-bold tabular-nums ${severityTextClass(f.severity)}`}>
          {f.stat_value}
        </span>
        <span className="block text-xs text-muted-foreground leading-tight">{f.stat_unit}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 mb-1 flex-wrap">
          <span className="font-semibold text-sm text-foreground">{f.title}</span>
          <span
            className={[
              'flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full mt-0.5',
              severityTextClass(f.severity),
              severityBgClass(f.severity),
            ].join(' ')}
          >
            {SEVERITY_LABEL[f.severity]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{f.description}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 uppercase tracking-wide">
          Source: {f.source}
        </p>
      </div>
    </div>
  )
}
