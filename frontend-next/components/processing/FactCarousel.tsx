'use client'

import { useEffect, useState } from 'react'

const FACTS = [
  'A resting heart rate below 60 bpm is typical in well-trained athletes.',
  'HRV above 50 ms is associated with lower cardiovascular risk and better recovery.',
  'Adults need 7–9 hours of sleep; most chronic disease risk rises below 6 hours.',
  'SpO2 below 95% during sleep can indicate sleep-disordered breathing.',
  'VO₂ max is the single best predictor of long-term cardiovascular health.',
  'N3 (deep) sleep is when most physical repair and immune strengthening occurs.',
  'REM sleep consolidates emotional memory and supports creative problem-solving.',
  'Heart rate variability is controlled by the autonomic nervous system and reflects resilience.',
  'A 10,000-step daily average correlates with significantly lower all-cause mortality.',
  'BMI above 30 increases hypertension risk by roughly 65% vs. a healthy-weight baseline.',
]

export default function FactCarousel() {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % FACTS.length)
        setFade(true)
      }, 300)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <p
      className="text-sm text-muted-foreground text-center leading-relaxed max-w-xs mx-auto transition-opacity duration-300"
      style={{ opacity: fade ? 1 : 0 }}
    >
      <span className="text-teal font-semibold">Did you know? </span>
      {FACTS[idx]}
    </p>
  )
}
