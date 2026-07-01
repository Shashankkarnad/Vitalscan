import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Severity } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function formatK(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return Math.round(n / 1_000) + 'K'
  return String(n)
}

export function formatHours(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatMonth(m: string): string {
  const [year, mon] = m.split('-')
  return `${MONTH_NAMES[parseInt(mon)]} '${year.slice(2)}`
}

export function nn<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined
}

export function avg(arr: (number | null | undefined)[]): number | null {
  const vals = arr.filter(nn) as number[]
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export function severityColor(s: Severity): string {
  return { critical: '#DC2626', elevated: '#EA580C', moderate: '#D97706', good: '#059669' }[s]
}

export function severityBorderClass(s: Severity): string {
  return { critical: 'border-l-critical', elevated: 'border-l-elevated', moderate: 'border-l-moderate', good: 'border-l-good' }[s]
}

export function severityTextClass(s: Severity): string {
  return { critical: 'text-critical', elevated: 'text-elevated', moderate: 'text-moderate', good: 'text-good' }[s]
}

export function severityBgClass(s: Severity): string {
  return { critical: 'bg-critical-tint', elevated: 'bg-elevated-tint', moderate: 'bg-moderate-tint', good: 'bg-good-tint' }[s]
}

export function healthScore(findings: { severity: Severity }[]): number {
  const deductions = findings.reduce((sum, f) => {
    return sum + ({ critical: 25, elevated: 15, moderate: 7, good: 0 }[f.severity] ?? 0)
  }, 0)
  return Math.max(0, 100 - deductions)
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#059669'
  if (score >= 60) return '#D97706'
  if (score >= 40) return '#EA580C'
  return '#DC2626'
}

export const API_URL = 'https://vitalscan-production.up.railway.app'
