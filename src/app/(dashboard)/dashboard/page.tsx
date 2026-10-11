import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { closerTest, todayISO } from '@/lib/schema'
import { DashboardHome } from './dashboard-home'
import { dailyTargets } from '@/lib/dashboard/pacing'
import { MATH_LEVELS, ENGLISH_LEVELS } from '@/lib/study/levels'
import { asDifficulty } from '@/lib/schema'
import { isQuarantinedExam } from '@/app/api/practice/exams/route'
import { hasProductAccess } from '@/lib/access'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; session_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  if (params.session_id) {
    const { fulfillCheckoutSession } = await import('@/lib/stripe-fulfill')
    await fulfillCheckoutSession(user.id, params.session_id).catch(() => undefined)
  }

  const today = todayISO()
  const dayStart = `${today}T00:00:00.000Z`
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 70)
  const since = sixtyDaysAgo.toISOString()

  const [
    { data: profile },
    { data: todayAttempts },
    { data: todayUsage },
    { data: recentAttempts },
    { data: windowAttempts },
    { data: prediction },
    { data: snapshots },
    { data: lessonProgress },
    { data: examProgress },
    { data: examCatalog },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, test_preference, target_score, test_date, study_minutes_per_day, study_start_time, study_days, current_estimated_score, subscription_plan, role, trial_ends_at, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('attempts')
      .select('time_spent_seconds, correct')
      .eq('user_id', user.id)
      .gte('created_at', dayStart),
    supabase
      .from('user_usage_daily')
      .select('study_minutes')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle(),
    supabase
      .from('attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(400),
    supabase
      .from('attempts')
      .select('created_at, correct, questions(difficulty, section_name)')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .limit(2000),
    supabase
      .from('score_predictions')
      .select('predicted_total, ovr_score, score_low, score_high, confidence')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('performance_snapshots')
      .select('snapshot_date, predicted_total, ovr_score, total_questions, total_correct, study_minutes')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(90),
    supabase
      .from('study_level_progress')
      .select('track, level_index, status, completed_at')
      .eq('user_id', user.id),
    supabase
      .from('user_practice_exams')
      .select('exam_id, status, completed_questions, correct_count, total_questions, completed_at')
      .eq('user_id', user.id),
    supabase
      .from('practice_exams')
      .select('id, exam_number, title, test_type')
      .order('exam_number', { ascending: true }),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const testType = closerTest({
    preference: profile?.test_preference,
    targetScore: profile?.target_score,
    testDate: profile?.test_date,
  })

  const attemptMinutes = Math.round(((todayAttempts ?? []).reduce((sum, row) => sum + (row.time_spent_seconds ?? 0), 0)) / 60)
  const todayMinutes = Math.max(attemptMinutes, todayUsage?.study_minutes ?? 0)
  const todayPracticeDone = (todayAttempts ?? []).length

  const lessonsDone = (lessonProgress ?? []).filter((row) => row.status === 'completed').length
  const todayLessonsDone = (lessonProgress ?? []).filter((row) => {
    if (row.status !== 'completed' || !row.completed_at) return false
    return row.completed_at.slice(0, 10) === today
  }).length
  const practiceDoneLifetime = (examProgress ?? []).reduce((sum, row) => {
    if (row.status === 'completed') return sum + (row.completed_questions ?? row.total_questions ?? 98)
    return sum + (row.completed_questions ?? 0)
  }, 0)
  const practiceExamsDone = (examProgress ?? []).filter((row) => row.status === 'completed').length
  const doneLessons = new Set(
    (lessonProgress ?? [])
      .filter((row) => row.status === 'completed')
      .map((row) => `${row.track}:${row.level_index}`),
  )
  const lessonCatalogs = testType === 'ACT'
    ? [['english', ENGLISH_LEVELS] as const, ['math', MATH_LEVELS] as const]
    : [['math', MATH_LEVELS] as const, ['english', ENGLISH_LEVELS] as const]
  let masterHref = '/study'
  let nextLessonTitle = 'every lesson is finished'
  for (const [track, levels] of lessonCatalogs) {
    const next = levels.find((level) => !doneLessons.has(`${track}:${level.index}`))
    if (next) {
      masterHref = `/study/${track}/${next.index}`
      nextLessonTitle = next.title
      break
    }
  }
  const examStatus = new Map((examProgress ?? []).map((row) => [row.exam_id, row.status]))
  const preferredKind = testType === 'ACT' ? 'ACT' : 'SAT'
  const listedExams = (examCatalog ?? []).filter((exam) => !isQuarantinedExam(exam))
  const ranked = [...listedExams].sort((a, b) => {
    const kind = (exam: { test_type: string | null; title: string }) => exam.test_type === 'SAT' ? 'SAT' : /science/i.test(exam.title) ? 'ACT Science' : 'ACT'
    if (kind(a) === preferredKind && kind(b) !== preferredKind) return -1
    if (kind(b) === preferredKind && kind(a) !== preferredKind) return 1
    return a.exam_number - b.exam_number
  })
  const groups = new Map<string, typeof ranked>()
  for (const exam of ranked) {
    const kind = exam.test_type === 'SAT' ? 'SAT' : /science/i.test(exam.title) ? 'ACT Science' : 'ACT'
    const group = groups.get(kind) ?? []
    group.push(exam)
    groups.set(kind, group)
  }
  let examHref = '/practice'
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => a.exam_number - b.exam_number)
    let open = true
    for (const exam of ordered) {
      const status = examStatus.get(exam.id) ?? 'available'
      if ((open || status === 'in_progress') && status !== 'completed') {
        examHref = `/practice/session?examId=${exam.id}&mode=exam&timed=1`
        open = false
        break
      }
      if (status !== 'completed') open = false
    }
    if (examHref !== '/practice') break
  }

  const pacing = dailyTargets({
    testDate: profile?.test_date,
    studyDays: profile?.study_days,
    studyMinutesPerDay: profile?.study_minutes_per_day,
    practiceDone: practiceDoneLifetime,
    lessonsDone,
    today,
  })

  const practiceDays = new Set((recentAttempts ?? []).map((row) => (row.created_at ?? today).slice(0, 10)))
  let streak = 0
  const cursor = new Date()
  if (!practiceDays.has(today)) cursor.setDate(cursor.getDate() - 1)
  while (practiceDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  const growthPoints = (windowAttempts ?? []).map((row) => {
    const q = row.questions as { difficulty?: string | null; section_name?: string | null } | { difficulty?: string | null }[] | null
    const one = Array.isArray(q) ? q[0] : q
    return {
      at: row.created_at ?? since,
      correct: Boolean(row.correct),
      difficulty: asDifficulty(one?.difficulty),
    }
  })

  const readyRate = prediction?.ovr_score
    ?? (snapshots?.[0]?.ovr_score ?? null)
  const expectedScore = prediction?.predicted_total
    ?? profile?.current_estimated_score
    ?? null

  const horizon = new Date()
  horizon.setDate(horizon.getDate() + 45)
  const { data: plans } = await supabase.from('study_plans')
    .select('id, plan_date, ai_explanation')
    .eq('user_id', user.id)
    .gte('plan_date', today)
    .lte('plan_date', horizon.toISOString().slice(0, 10))
    .order('plan_date')
  const planIds = (plans ?? []).map((plan) => plan.id)
  const { data: tasks } = planIds.length
    ? await supabase.from('study_plan_tasks').select('id, plan_id, task_type, title, target_minutes, target_questions, status, topic_id').in('plan_id', planIds).order('sort_order')
    : { data: [] as never[] }
  const planDates = new Map((plans ?? []).map((plan) => [plan.id, plan.plan_date]))
  const todayTask = (tasks ?? []).find((task) => (planDates.get(task.plan_id) ?? today) === today && task.title)
  const todayTitle = todayTask?.title?.replace(/\s+·.*$/, '').trim()
  const limitedPlan = !hasProductAccess({ plan: profile?.subscription_plan, role: profile?.role, trialEndsAt: profile?.trial_ends_at })
  if (todayTask?.task_type === 'rapid_fire') {
    masterHref = '/simulator'
  } else if (todayTask?.task_type === 'game') {
    masterHref = '/game'
  } else if (todayTask?.task_type === 'mistake_review') {
    masterHref = '/mistakes'
  } else if (todayTask?.topic_id && /practice/i.test(todayTask.task_type ?? '')) {
    const params = new URLSearchParams({
      topicId: todayTask.topic_id,
      count: String(todayTask.target_questions ?? 10),
      testType,
    })
    if ((todayTask.task_type ?? '').includes('timed')) params.set('timed', '1')
    masterHref = `/practice/session?${params.toString()}`
  } else if (todayTitle) {
    for (const [track, levels] of [['english', ENGLISH_LEVELS], ['math', MATH_LEVELS]] as const) {
      const needle = todayTitle.toLowerCase()
      const matches = levels.filter((level) => {
        const title = level.title.toLowerCase()
        return title === needle || title.startsWith(`${needle}:`) || title.startsWith(`${needle} `)
      })
      const open = matches.find((level) => !doneLessons.has(`${track}:${level.index}`)) ?? matches[0]
      if (open) {
        masterHref = `/study/${track}/${open.index}`
        break
      }
    }
  }

  return (
    <DashboardHome
      firstName={firstName}
      testType={testType}
      studyStart={profile?.study_start_time ?? '19:00'}
      dailyMinutes={profile?.study_minutes_per_day ?? 30}
      todayMinutes={todayMinutes}
      streak={streak}
      testDate={profile?.test_date ?? null}
      targetScore={profile?.target_score ?? null}
      readyRate={readyRate}
      expectedScore={expectedScore}
      scoreLow={prediction?.score_low ?? null}
      scoreHigh={prediction?.score_high ?? null}
      baselineScore={profile?.current_estimated_score ?? null}
      pacing={pacing}
      todayPracticeDone={todayPracticeDone}
      todayLessonsDone={todayLessonsDone}
      lessonsDone={lessonsDone}
      lessonsTotal={MATH_LEVELS.length + ENGLISH_LEVELS.length}
      growthPoints={growthPoints}
      snapshots={(snapshots ?? []).map((s) => ({
        date: s.snapshot_date,
        ovr: s.ovr_score,
        predicted: s.predicted_total,
        correct: s.total_correct,
        total: s.total_questions,
      }))}
      scheduleTasks={(tasks ?? []).map((task) => ({
        id: task.id,
        date: planDates.get(task.plan_id) ?? today,
        task_type: task.task_type,
        topic_name: task.title,
        duration_minutes: task.target_minutes,
        question_count: task.target_questions,
        completed: task.status === 'completed',
        topic_id: task.topic_id,
      }))}
      practiceExamsDone={practiceExamsDone}
      nextLessonTitle={nextLessonTitle}
      studyDays={profile?.study_days ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']}
      createdAt={profile?.created_at ?? null}
      masterHref={masterHref}
      examHref={examHref}
      limitedPlan={limitedPlan}
      planInput={limitedPlan ? {
        testDate: profile?.test_date ?? today,
        testType,
        targetScore: profile?.target_score ?? (testType === 'ACT' ? 30 : 1400),
        baselineScore: profile?.current_estimated_score ?? null,
        dailyMinutes: Math.max(30, profile?.study_minutes_per_day ?? 30),
        availableDays: profile?.study_days?.length ? profile.study_days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      } : null}
    />
  )
}
