// Design tokens for the VitalScan redesign (docs/design/VitalScan.dc.html).
// Fixed palette — do not restyle. Every chart is single-series with a direct
// label; never encode identity by color alone (status words always accompany
// status dots/badges).

export const COLOR = {
  coral: '#ff5b46', // cardiac
  teal: '#34d6c0', // recovery / good
  amber: '#f3b13e', // activity / watching
  blue: '#6c8cff', // sleep
  slate: '#98a2b8', // neutral / data-gap / suppressed
} as const

export const SURFACE = '#0a0a10'
export const INK = '#e8eaf2'

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const FONT_DISPLAY = "'Space Grotesk', var(--font-space-grotesk), 'IBM Plex Sans', sans-serif"
export const FONT_SANS = "'IBM Plex Sans', var(--font-ibm-plex-sans), sans-serif"
export const FONT_MONO = "'IBM Plex Mono', var(--font-ibm-plex-mono), monospace"

export const CARD_SHADOW = '0 12px 32px -22px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)'
export const CARD_BORDER = 'rgba(255,255,255,.08)'
export const CARD_BG = 'rgba(255,255,255,.03)'
