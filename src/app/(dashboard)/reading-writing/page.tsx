import { redirect } from 'next/navigation'

export default function ReadingRedirect() {
  redirect('/study?test=SAT&section=English')
}
