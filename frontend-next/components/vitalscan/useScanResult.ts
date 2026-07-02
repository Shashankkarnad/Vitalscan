'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadResult } from '@/lib/store'
import type { VitalScanResult } from '@/lib/types'

/**
 * Loads the analysis result from sessionStorage on the client.
 * Redirects to / (upload) when no result is present.
 */
export function useScanResult(): { result: VitalScanResult | null; ready: boolean } {
  const router = useRouter()
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

  return { result, ready }
}
