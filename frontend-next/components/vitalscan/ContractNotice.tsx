import { COLOR, rgba, FONT_MONO, CARD_SHADOW } from '@/lib/vitalscan/tokens'

/**
 * Shown on the new screens when the cached result predates the 0.3 contract
 * (no daily/bands/weekly fields). Slate, factual, never crashes.
 */
export default function ContractNotice() {
  return (
    <div
      style={{
        marginTop: 48,
        borderRadius: 18,
        border: `1px solid ${rgba(COLOR.slate, 0.28)}`,
        background: 'rgba(234,234,234,.03)',
        boxShadow: CARD_SHADOW,
        padding: '28px 32px',
        animation: 'rise .5s cubic-bezier(.2,.7,.3,1) both',
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10.5,
          letterSpacing: '.14em',
          padding: '4px 11px',
          borderRadius: 999,
          color: COLOR.slate,
          border: `1px solid ${rgba(COLOR.slate, 0.4)}`,
          background: rgba(COLOR.slate, 0.09),
          textTransform: 'uppercase',
        }}
      >
        Older result
      </span>
      <h2 style={{ fontSize: 19, fontWeight: 600, margin: '16px 0 0', letterSpacing: '-.01em', color: '#eaeaea' }}>
        Re-upload your export to unlock the new dashboard.
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(234,234,234,.66)', margin: '10px 0 0', maxWidth: 640 }}>
        This result was analysed before per-day bands, source grading, and the decision log existed. Upload your Apple
        Health export again and VitalScan will compute them. Your previous report is still available under{' '}
        <a href="/results" style={{ color: 'rgba(234,234,234,.85)' }}>
          Results
        </a>
        .
      </p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          marginTop: 18,
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'rgba(234,234,234,.8)',
          border: '1px solid rgba(234,234,234,.14)',
          background: 'rgba(234,234,234,.06)',
          borderRadius: 9,
          padding: '9px 16px',
          textDecoration: 'none',
        }}
      >
        Upload again →
      </a>
    </div>
  )
}
