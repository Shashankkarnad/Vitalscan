'use client'

// Which wearable instrument source feeds the analysis (Auto / a single source /
// Combine-all). Persisted in sessionStorage so it survives navigation between
// screens, same pattern as lib/store.ts for the scan result itself.

import { createContext, useContext, useState } from 'react'

const KEY = 'vitalscan_source_mode'

// Lazy-init only: SourcePicker (the only mode-dependent consumer) renders
// null until useScanResult's effect loads a result, so reading sessionStorage
// here can't cause a hydration mismatch — no need for an effect + setState.
function initialMode(): string {
  if (typeof window === 'undefined') return 'auto'
  try {
    return sessionStorage.getItem(KEY) || 'auto'
  } catch {
    return 'auto'
  }
}

interface SourceModeContextValue {
  mode: string
  setMode: (m: string) => void
}

const SourceModeContext = createContext<SourceModeContextValue>({
  mode: 'auto',
  setMode: () => {},
})

export function SourceModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState(initialMode)

  const setMode = (m: string) => {
    setModeState(m)
    try {
      sessionStorage.setItem(KEY, m)
    } catch {
      // ignore — persistence is best-effort
    }
  }

  return <SourceModeContext.Provider value={{ mode, setMode }}>{children}</SourceModeContext.Provider>
}

export function useSourceMode(): SourceModeContextValue {
  return useContext(SourceModeContext)
}
