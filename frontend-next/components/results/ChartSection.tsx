'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
  note?: string
}

export default function ChartSection({ title, subtitle, children, note }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Fire immediately if already in viewport (first-paint sections)
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px 80px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className={[
        'bg-card border border-border rounded-2xl p-5 transition-all duration-500',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      ].join(' ')}
    >
      <div className="mb-4">
        <h2 className="font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
      {note && (
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed border-t border-border pt-3">
          {note}
        </p>
      )}
    </section>
  )
}
