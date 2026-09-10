import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PracticeExamsClient } from '@/components/practice/practice-exams-client'

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ topicId?: string; taskId?: string; count?: string; testType?: string; examId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  // Topic drills still go straight to a session
  if (params.topicId) {
    const query = new URLSearchParams({
      topicId: params.topicId,
      count: params.count ?? '10',
    })
    if (params.testType) query.set('testType', params.testType)
    if (params.taskId) query.set('taskId', params.taskId)
    redirect(`/practice/session?${query.toString()}`)
  }

  if (params.examId) {
    redirect(`/practice/session?examId=${params.examId}&mode=exam&timed=1`)
  }

  return <PracticeExamsClient />
}
