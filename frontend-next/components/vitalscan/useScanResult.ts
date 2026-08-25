'use client'

import { useEffect, useState } from 'react'
import { loadResult } from '@/lib/store'
import { useSourceMode } from '@/components/vitalscan/SourceModeContext'
import { FIXTURE_RESULT } from '@/lib/vitalscan/fixture'
import { hasContract } from '@/lib/vitalscan/derive'
import type { VitalScanResult } from '@/lib/types'

/**
 * Loads the analysis result from sessionStorage on the client, swapping in
 * the daily/bands/sources/decisions/weekly/z_series/combo blocks for the
 * active instrument source mode (see SourceModeContext) when available.
 * Falls back to the bundled fixture when sessionStorage is empty or
 * predates the 0.3 contract. No upload funnel.
 */
export function useScanResult(): { result: VitalScanResult | null; ready: boolean } {
  const { mode } = useSourceMode()
  const [result, setResult] = useState<VitalScanResult | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = loadResult()
    setResult(stored && hasContract(stored) ? stored : FIXTURE_RESULT)
    setReady(true)
  }, [])

  const active = result?.modes?.[mode] ? { ...result, ...result.modes[mode] } : result

  return { result: active, ready }
}
