// Design tokens for the VitalScan redesign (docs/design/VitalScan.dc.html).
// Fixed palette — do not restyle. Every chart is single-series with a direct
// label; never encode identity by color alone (status words always accompany
// status dots/badges).

export const COLOR = {
  coral: '#e2654f', // cardiac — terracotta
  teal: '#3bb58c', // recovery / good — sage
  amber: '#ce8f2e', // activity / watching — gold
  blue: '#7b8fd4', // sleep — periwinkle
  slate: '#9a978e', // neutral / data-gap / suppressed — warm gray
} as const

export const SURFACE = '#0c0b09'
export const INK = '#edeae2'

// Apple Health sleep-stage palette (indigo → blue → cyan → orange), so the
// stacked bars and the hypnogram read the way users already know sleep stages.
export const SLEEP_STAGE = {
  deep: '#3a3d9e',
  core: '#3e74e8',
  rem: '#4fc3e8',
  awake: '#e9964a',
} as const

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const FONT_DISPLAY = "'Fraunces', var(--font-fraunces), Georgia, serif"
export const FONT_SANS = "'IBM Plex Sans', var(--font-ibm-plex-sans), sans-serif"
export const FONT_MONO = "'IBM Plex Mono', var(--font-ibm-plex-mono), monospace"

export const CARD_SHADOW = '0 12px 32px -22px rgba(0,0,0,.55), inset 0 1px 0 rgba(237,234,226,.06)'
export const CARD_BORDER = 'rgba(237,234,226,.09)'
export const CARD_BG = 'rgba(237,234,226,.035)'
