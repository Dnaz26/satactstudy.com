import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { closerTest } from '@/lib/schema'

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ topicId?: string; taskId?: string; count?: string; testType?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const { data: profile } = await supabase
    .from('profiles')
    .select('test_preference, target_score, test_date')
    .eq('id', user.id)
    .single()

  const testType = params.testType === 'SAT' || params.testType === 'ACT'
    ? params.testType
    : closerTest({
      preference: profile?.test_preference,
      targetScore: profile?.target_score,
      testDate: profile?.test_date,
    })

  const query = new URLSearchParams({ testType })
  if (params.topicId) {
    query.set('topicId', params.topicId)
    query.set('count', params.count ?? '10')
  } else {
    query.set('count', '60')
  }
  if (params.taskId) query.set('taskId', params.taskId)
  redirect(`/practice/session?${query.toString()}`)
}
