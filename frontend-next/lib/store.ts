import type { VitalScanResult } from './types'

const KEY = 'vitalscan_result'

export function saveResult(data: VitalScanResult): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    throw new Error('Result was too large to store. Try a smaller export.')
  }
}

export function loadResult(): VitalScanResult | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as VitalScanResult) : null
  } catch {
    return null
  }
}
