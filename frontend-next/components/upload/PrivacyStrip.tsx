'use client'

export default function PrivacyStrip() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-secondary px-4 py-3 text-xs text-muted-foreground">
      <svg
        className="flex-shrink-0 mt-0.5 text-teal"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <p>
        <strong className="font-semibold text-foreground">100% on-device processing.</strong>{' '}
        Your export is parsed locally — raw health data is never stored, logged, or transmitted
        beyond this analysis session.
      </p>
    </div>
  )
}
