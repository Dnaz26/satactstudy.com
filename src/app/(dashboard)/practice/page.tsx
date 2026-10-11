import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PracticeExamsClient, type PracticeExamCard } from '@/components/practice/practice-exams-client'
import { isQuarantinedExam } from '@/app/api/practice/exams/route'
import { getAccessProfile } from '@/lib/entitlements'
import { hasActiveTrial, hasPaidAccess } from '@/lib/access'
import { examFocus } from '@/lib/schema'

function kindOf(exam: { test_type: string | null; title: string }): PracticeExamCard['kind'] {
  if (exam.test_type === 'SAT') return 'SAT'
  if (/science/i.test(exam.title)) return 'ACT Science'
  return 'ACT'
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ topicId?: string; taskId?: string; count?: string; testType?: string; examId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const access = await getAccessProfile(user.id)

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

  if (!hasPaidAccess(access.plan, access.role) && !hasActiveTrial(access.trialEndsAt)) redirect('/pricing?reason=practice-exams')

  if (params.examId) {
    redirect(`/practice/session?examId=${params.examId}&mode=exam&timed=1`)
  }

  const [{ data: exams }, { data: progress }, { data: profile }] = await Promise.all([
    supabase
      .from('practice_exams')
      .select('id, exam_number, title, test_type, total_questions')
      .order('exam_number', { ascending: true }),
    supabase
      .from('user_practice_exams')
      .select('exam_id, status')
      .eq('user_id', user.id),
    supabase.from('profiles').select('test_preference').eq('id', user.id).single(),
  ])

  const byExam = new Map((progress ?? []).map((row) => [row.exam_id, row.status]))
  const listed = (exams ?? []).filter((exam) => !isQuarantinedExam(exam))
  const byKind = new Map<PracticeExamCard['kind'], typeof listed>()
  for (const exam of listed) {
    const kind = kindOf(exam)
    const group = byKind.get(kind) ?? []
    group.push(exam)
    byKind.set(kind, group)
  }

  const cards: PracticeExamCard[] = []
  for (const group of byKind.values()) {
    const ordered = [...group].sort((a, b) => a.exam_number - b.exam_number)
    let nextOpen = true
    for (const exam of ordered) {
      const status = byExam.get(exam.id) ?? 'available'
      const unlocked = nextOpen || status === 'in_progress' || status === 'completed'
      cards.push({
        id: exam.id,
        examNumber: exam.exam_number,
        title: exam.title,
        totalQuestions: exam.total_questions,
        status: unlocked ? status : 'locked',
        unlocked,
        kind: kindOf(exam),
      })
      if (status !== 'completed') nextOpen = false
    }
  }

  const focus = examFocus(profile?.test_preference)
  if (focus === 'SAT' || focus === 'ACT') {
    const forms = cards.filter((exam) => exam.kind === focus && exam.unlocked)
    const target = forms.find((exam) => exam.status === 'in_progress')
      ?? forms.find((exam) => exam.status !== 'completed')
    if (target) redirect(`/practice/session?examId=${target.id}&mode=exam&timed=1`)
  }

  return <PracticeExamsClient exams={cards} examFocus={focus} />
}
