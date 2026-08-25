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

export const SURFACE = '#0b0b0d'
export const INK = '#eaeaea'

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

// Craft pass: the three artefact screens (home/instruments/evidence) and the
// shared (scan) shell read as one typeface — IBM Plex Sans, weights 400/500
// only. FONT_DISPLAY now aliases FONT_SANS so shared h1()/kicker follow.
export const FONT_SANS = "'IBM Plex Sans', var(--font-ibm-plex-sans), sans-serif"
export const FONT_DISPLAY = FONT_SANS
export const FONT_MONO = "'IBM Plex Mono', var(--font-ibm-plex-mono), monospace"

// Border only — no inset top-highlight "raised glass".
export const CARD_SHADOW = 'none'
export const CARD_BORDER = 'rgba(234,234,234,.09)'
export const CARD_BG = 'rgba(234,234,234,.035)'
