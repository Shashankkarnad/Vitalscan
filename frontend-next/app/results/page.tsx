import { redirect } from 'next/navigation'

/** Skip the legacy results funnel. */
export default function ResultsPage() {
  redirect('/home')
}
