import { redirect } from 'next/navigation'

/** App entry: skip the ZIP upload funnel and land on Home. */
export default function IndexPage() {
  redirect('/home')
}
