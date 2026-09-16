import { redirect } from 'next/navigation'

/** Store / coins paused — redirect away for now. */
export default function StorePage() {
  redirect('/customize')
}
