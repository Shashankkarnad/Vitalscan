'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadResult } from '@/lib/store'
import { useSourceMode } from '@/components/vitalscan/SourceModeContext'
import type { VitalScanResult } from '@/lib/types'

/**
 * Loads the analysis result from sessionStorage on the client, swapping in
 * the daily/bands/sources/decisions/weekly/z_series/combo blocks for the
 * active instrument source mode (see SourceModeContext) when available.
 * Redirects to / (upload) when no result is present.
 */
export function useScanResult(): { result: VitalScanResult | null; ready: boolean } {
  const router = useRouter()
  const { mode } = useSourceMode()
  const [result, setResult] = useState<VitalScanResult | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const r = loadResult()
    if (!r) {
      router.replace('/')
      return
    }
    setResult(r)
    setReady(true)
  }, [router])

  const active = result?.modes?.[mode] ? { ...result, ...result.modes[mode] } : result

  return { result: active, ready }
}
