'use client'

export type MilestoneStatus = 'pending' | 'active' | 'done'

export interface Milestone {
  label: string
  status: MilestoneStatus
}

interface Props {
  milestones: Milestone[]
}

function CheckIcon({ done }: { done: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle
        cx="10"
        cy="10"
        r="9"
        stroke={done ? '#059669' : '#E4E7EB'}
        strokeWidth="1.5"
        className="transition-all duration-300"
      />
      <path
        d="M5.5 10.5l3 3 6-6"
        stroke={done ? '#059669' : 'transparent'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="14"
        strokeDashoffset={done ? '0' : '14'}
        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.2s ease' }}
      />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin-slow" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="#E4E7EB" strokeWidth="1.5" />
      <path
        d="M10 1a9 9 0 0 1 9 9"
        stroke="#0D9488"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function MilestoneList({ milestones }: Props) {
  return (
    <ol className="flex flex-col gap-3">
      {milestones.map((m, i) => (
        <li
          key={i}
          className={[
            'flex items-center gap-3 text-sm transition-all duration-300',
            m.status === 'done'
              ? 'text-foreground'
              : m.status === 'active'
                ? 'text-foreground font-medium'
                : 'text-muted-foreground',
          ].join(' ')}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {m.status === 'active' ? (
            <SpinnerIcon />
          ) : (
            <CheckIcon done={m.status === 'done'} />
          )}
          {m.label}
        </li>
      ))}
    </ol>
  )
}
