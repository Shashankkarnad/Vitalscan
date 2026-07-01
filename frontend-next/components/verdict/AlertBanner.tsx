'use client'

interface Props {
  type: 'emergency' | 'warning'
  message: string
}

const CONFIG = {
  emergency: {
    bg: 'bg-critical-tint border-clinical-red/30',
    icon: 'text-critical',
    textColor: 'text-critical',
    path: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  },
  warning: {
    bg: 'bg-elevated-tint border-clinical-orange/30',
    icon: 'text-elevated',
    textColor: 'text-elevated',
    path: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  },
}

export default function AlertBanner({ type, message }: Props) {
  const c = CONFIG[type]
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${c.bg}`}>
      <svg
        className={`flex-shrink-0 mt-0.5 ${c.icon}`}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {c.path.split(' M').map((d, i) => (
          <path key={i} d={i === 0 ? d : 'M' + d} />
        ))}
      </svg>
      <p className={`text-xs leading-relaxed font-medium ${c.textColor}`}>{message}</p>
    </div>
  )
}
