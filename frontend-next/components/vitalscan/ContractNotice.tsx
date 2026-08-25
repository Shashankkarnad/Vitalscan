import { FONT_SANS } from '@/lib/vitalscan/tokens'

/**
 * Shown only if a result is present but missing daily/bands/weekly.
 * No upload CTA — the product is Home / Instruments / Evidence.
 */
export default function ContractNotice() {
  return (
    <div style={{ marginTop: 48, maxWidth: 560 }}>
      <h2
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 500,
          fontSize: 19,
          letterSpacing: '-.01em',
          color: '#eaeaea',
          margin: 0,
        }}
      >
        This session has no band data.
      </h2>
      <p
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: 15,
          lineHeight: 1.6,
          color: 'rgba(234,234,234,.66)',
          margin: '10px 0 0',
        }}
      >
        Open Home again — VitalScan will load the session fixture.
      </p>
    </div>
  )
}
