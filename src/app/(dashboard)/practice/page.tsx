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

  const [{ data: exams }, { data: progress }] = await Promise.all([
    supabase
      .from('practice_exams')
      .select('id, exam_number')
      .order('exam_number', { ascending: true }),
    supabase
      .from('user_practice_exams')
      .select('exam_id, status')
      .eq('user_id', user.id),
  ])

  const byExam = new Map((progress ?? []).map((row) => [row.exam_id, row.status]))
  let highestCompleted = 0
  for (const exam of exams ?? []) {
    if (byExam.get(exam.id) === 'completed') {
      highestCompleted = Math.max(highestCompleted, exam.exam_number)
    }
  }

  const inProgress = (exams ?? []).find((exam) => byExam.get(exam.id) === 'in_progress')
  if (inProgress) {
    redirect(`/practice/session?examId=${inProgress.id}&mode=exam&timed=1`)
  }

  const nextExam = (exams ?? []).find((exam) => {
    const unlocked = exam.exam_number === 1 || exam.exam_number <= highestCompleted + 1
    const status = byExam.get(exam.id)
    return unlocked && status !== 'completed'
  })
  if (nextExam) {
    redirect(`/practice/session?examId=${nextExam.id}&mode=exam&timed=1`)
  }

  // All exams completed — lightweight done state (no start list)
  return <PracticeExamsClient allComplete />
}
