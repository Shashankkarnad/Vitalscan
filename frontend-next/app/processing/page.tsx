import { redirect } from 'next/navigation'

/** Skip the analysing/loading funnel. */
export default function ProcessingPage() {
  redirect('/home')
}
