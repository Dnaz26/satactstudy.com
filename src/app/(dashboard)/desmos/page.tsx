import { redirect } from 'next/navigation'

export default function DesmosRedirect() {
  redirect('/study?view=desmos&section=Math')
}
