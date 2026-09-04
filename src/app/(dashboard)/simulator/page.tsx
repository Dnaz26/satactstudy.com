import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { closerTest } from '@/lib/schema'
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

  const testType = closerTest({
    preference: profile?.test_preference,
    targetScore: profile?.target_score,
    testDate: profile?.test_date,
  })

  return <SimulatorClient testType={testType} />
}
