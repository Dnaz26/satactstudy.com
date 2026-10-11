import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RefreshClient } from './refresh-client'
import { examFocus } from '@/lib/schema'

export default async function RefreshPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('test_preference').eq('id', user.id).single()
  return <RefreshClient examFocus={examFocus(profile?.test_preference)} />
}
