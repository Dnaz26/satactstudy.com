import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PracticeSetup } from './practice-setup'
import { asPlan, asPrimaryTest, todayISO } from '@/lib/schema'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: topics },
    { data: profile },
    { data: usage },
  ] = await Promise.all([
    supabase
      .from('topics')
      .select('id, name, category_id, categories(name, sections(name, tests(name)))')
      .order('name'),
    supabase
      .from('profiles')
      .select('subscription_plan, test_preference')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_usage_daily')
      .select('questions_answered')
      .eq('user_id', user.id)
      .eq('usage_date', todayISO())
      .maybeSingle(),
  ])

  return (
    <PracticeSetup
      topics={(topics ?? []) as never}
      plan={asPlan(profile?.subscription_plan)}
      questionsUsedToday={usage?.questions_answered ?? 0}
      defaultTestType={asPrimaryTest(profile?.test_preference)}
    />
  )
}
