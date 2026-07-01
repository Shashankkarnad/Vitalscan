'use client'

import { useEffect, useRef } from 'react'
import { scoreColor } from '@/lib/utils'

const R = 58
const C = 2 * Math.PI * R

interface Props {
  score: number
  size?: number
}

export default function ScoreRing({ score, size = 160 }: Props) {
  const circleRef = useRef<SVGCircleElement>(null)
  const color = scoreColor(score)

  useEffect(() => {
    const el = circleRef.current
    if (!el) return
    const target = C * (1 - score / 100)
    el.style.transition = 'none'
    el.style.strokeDashoffset = String(C)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)'
        el.style.strokeDashoffset = String(target)
      })
    })
  }, [score])

  const label =
    score >= 80 ? 'Great' : score >= 60 ? 'Fair' : score >= 40 ? 'Low' : 'Critical'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Pulse ring */}
      <div
        className="absolute inset-0 rounded-full opacity-30"
        style={{
          animation: 'ringPulse 2.5s ease-out infinite',
          border: `3px solid ${color}`,
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        className="absolute inset-0"
        fill="none"
      >
        {/* Track */}
        <circle
          cx="70"
          cy="70"
          r={R}
          stroke="#E4E7EB"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Progress */}
        <circle
          ref={circleRef}
          cx="70"
          cy="70"
          r={R}
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C}
          transform="rotate(-90 70 70)"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground leading-none">{score}</span>
        <span className="text-xs font-semibold uppercase tracking-widest mt-1" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  )
}
