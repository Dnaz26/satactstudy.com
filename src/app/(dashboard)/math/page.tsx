import { redirect } from 'next/navigation'

export default function MathRedirect() {
  redirect('/study?test=SAT&section=Math')
}
