import { rgba } from '@/lib/vitalscan/tokens'

// Rounded-square icon chip from the VitalScan.dc.html design — a tinted 24x24
// stroke glyph, used on category cards, metric tiles, and metric headers.
export default function IconChip({ path, color, size = 34 }: { path: string; color: string; size?: number }) {
  const icon = Math.round(size * 0.5)
  return (
    <span
      style={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.29),
        background: rgba(color, 0.1),
        border: `1px solid ${rgba(color, 0.28)}`,
      }}
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </span>
  )
}
