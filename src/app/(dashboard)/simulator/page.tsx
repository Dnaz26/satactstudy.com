import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { examFocus } from '@/lib/schema'
import { SimulatorClient } from './simulator-client'

export default async function SimulatorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('test_preference, target_score, test_date')
    .eq('id', user.id)
    .single()

  return <SimulatorClient examFocus={examFocus(profile?.test_preference)} />
}
