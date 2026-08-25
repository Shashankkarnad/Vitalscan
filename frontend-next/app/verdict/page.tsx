import { redirect } from 'next/navigation'

/** Skip the score-ring / paywall funnel. */
export default function VerdictPage() {
  redirect('/home')
}
