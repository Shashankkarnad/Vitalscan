'use client'

import { useState } from 'react'
import type { Finding } from '@/lib/types'
import FindingCard from './FindingCard'

interface Props {
  findings: Finding[]
}

export default function PaywallGate({ findings }: Props) {
  const [unlocked, setUnlocked] = useState(false)

  if (findings.length === 0) return null

  return (
    <div className="relative">
      {/* Blurred findings */}
      <div className={unlocked ? '' : 'pointer-events-none select-none'}>
        <div className={unlocked ? '' : 'blur-sm'}>
          <div className="flex flex-col gap-3">
            {findings.map((f, i) => (
              <FindingCard key={f.key} finding={f} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {!unlocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-background via-background/80 to-transparent rounded-xl px-6 py-8">
          <div className="bg-card border border-border rounded-2xl shadow-lg p-6 max-w-xs w-full text-center">
            <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-3">
              <svg
                className="text-teal"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="font-bold text-foreground text-sm mb-1">
              {findings.length} more finding{findings.length > 1 ? 's' : ''} found
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Unlock the complete analysis to see all clinical insights and recommendations.
            </p>
            <button
              onClick={() => setUnlocked(true)}
              className="w-full h-10 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Unlock full report (free)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
