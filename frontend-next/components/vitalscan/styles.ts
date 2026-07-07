import type { CSSProperties } from 'react'
import { CARD_BG, CARD_BORDER, CARD_SHADOW, FONT_DISPLAY, FONT_MONO } from '@/lib/vitalscan/tokens'

export const card = (radius = 16): CSSProperties => ({
  borderRadius: radius,
  border: `1px solid ${CARD_BORDER}`,
  background: CARD_BG,
  boxShadow: CARD_SHADOW,
})

export const kicker: CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  color: 'rgba(234,234,234,.42)',
  animation: 'rise .5s cubic-bezier(.2,.7,.3,1) both',
}

export const h1 = (size = 36): CSSProperties => ({
  fontFamily: FONT_DISPLAY,
  fontWeight: 300,
  fontSize: size,
  lineHeight: 1.15,
  letterSpacing: '-0.005em',
  margin: '16px 0 0',
  animation: 'rise .55s cubic-bezier(.2,.7,.3,1) .06s both',
})

export const lede: CSSProperties = {
  fontSize: 15.5,
  color: 'rgba(234,234,234,.58)',
  maxWidth: 640,
  margin: '12px 0 0',
  lineHeight: 1.55,
  animation: 'rise .55s cubic-bezier(.2,.7,.3,1) .12s both',
}

export const sectionLabel: CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10.5,
  letterSpacing: '.18em',
  color: 'rgba(234,234,234,.4)',
}

export const pill = (color: string, bd: string, bg: string): CSSProperties => ({
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: '.1em',
  padding: '3px 8px',
  borderRadius: 999,
  color,
  border: `1px solid ${bd}`,
  background: bg,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
})

export const rise = (delay: number, dur = 0.5): CSSProperties => ({
  animation: `rise ${dur}s cubic-bezier(.2,.7,.3,1) both`,
  animationDelay: `${delay.toFixed(2)}s`,
})
