import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { denyIfUnpaid } from '@/lib/entitlements'
import { QUESTION_FIELDS, examQuestion } from '@/lib/practice/exam-questions'

type Db = Awaited<ReturnType<typeof createClient>>

/**
 * Quarantined catalog rows stay in the database (history + referential
 * integrity) but never list for fresh starts. In-progress rows on them can
 * still resume. Quarantine is a reversible title prefix, never a delete.
 */
export const QUARANTINED_PREFIX = '[QUARANTINED]'
export function isQuarantinedExam(e: { title?: string | null }): boolean {
  return (e.title ?? '').startsWith(QUARANTINED_PREFIX)
}

/**
 * Start a fixed-form exam (anything that is not the adaptive Digital SAT,
 * e.g. ACT): create a practice session plus the user's progress row with the
 * catalog's frozen question order. ACT core runs English, Math, then Reading.
 */
async function beginFixedFormExam(
  db: Db,
  userId: string,
  exam: {
    id: string
    title: string
    test_type: string | null
    format_version: number | null
    question_ids: string[]
    reading_ids: string[]
    english_ids: string[]
    total_questions: number | null
  },
) {
  const total = exam.total_questions ?? exam.question_ids.length
  const { data: session, error: sessionError } = await db
    .from('practice_sessions')
    .insert({
      user_id: userId,
      test_type: exam.test_type ?? 'ACT',
      is_timed: true,
      is_adaptive: false,
      total_questions: total,
      completed_questions: 0,
      correct_count: 0,
      time_spent_seconds: 0,
      status: 'in_progress',
      session_type: 'full_test',
      section_name: exam.title,
      time_limit_seconds: 7500,
    })
    .select('id')
    .single()
  if (sessionError || !session) throw sessionError ?? new Error('Exam session failed')
  const { data: row, error } = await db
    .from('user_practice_exams')
    .insert({
      user_id: userId,
      exam_id: exam.id,
      session_id: session.id,
      status: 'in_progress',
      assigned_question_ids: exam.question_ids,
      assigned_reading_ids: exam.reading_ids,
      assigned_english_ids: exam.english_ids,
      format_version: exam.format_version ?? 1,
      total_questions: total,
      focused_id: exam.english_ids[0] ?? exam.question_ids[0] ?? null,
      module_seconds_left: /science/i.test(exam.title) && exam.english_ids.length === 0 && exam.reading_ids.length === 0 ? 40 * 60 : 35 * 60,
      answers: {},
      marks: {},
      usage: {},
      hint_used: {},
    })
    .select('*')
    .single()
  if (error || !row) throw error ?? new Error('Exam start failed')
  return row
}

export async function GET() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const blocked = await denyIfUnpaid(user.id)
  if (blocked) return blocked
  const [catalog, progress] = await Promise.all([
    db.from('practice_exams').select('*').order('exam_number'),
    db.from('user_practice_exams').select('*').eq('user_id', user.id),
  ])
  if (catalog.error || progress.error) return Response.json({ error: 'Could not load exams' }, { status: 500 })
  const listed = catalog.data.filter(e => !isQuarantinedExam(e))
  const byId = new Map(progress.data.map(p => [p.exam_id, p]))
  // Unlock sequences run per test type: SAT exams keep their order,
  // and each other test type (e.g. ACT) unlocks its own first exam freely.
  const typeOf = (e: { test_type?: string | null; title?: string | null }) => {
    if ((e.title ?? '').toLowerCase().includes('science')) return 'ACT Science'
    return e.test_type ?? 'SAT'
  }
  const highestFor = (t: string) => {
    const nums = listed.filter(e => typeOf(e) === t).map(e => e.exam_number)
    if (!nums.length) return 0
    const done = listed
      .filter(e => typeOf(e) === t && byId.get(e.id)?.status === 'completed')
      .map(e => e.exam_number)
    return Math.max(Math.min(...nums) - 1, ...done)
  }
  const highestCompleted = Math.max(0, ...listed.filter(e => byId.get(e.id)?.status === 'completed').map(e => e.exam_number))
  return Response.json({ highestCompleted, exams: listed.map(e => {
    const p = byId.get(e.id)
    const unlocked = e.exam_number <= highestFor(typeOf(e)) + 1
    return { id: e.id, examNumber: e.exam_number, title: e.title, testType: typeOf(e), totalQuestions: p?.total_questions ?? e.total_questions,
      readingWritingCount: e.format_version === 2 ? 54 : e.reading_ids.length + e.english_ids.length,
      readingCount: e.reading_ids.length, englishCount: e.english_ids.length, mathCount: e.math_ids.length,
      scienceCount: e.format_version === 2 ? 0 : e.total_questions - e.reading_ids.length - e.english_ids.length - e.math_ids.length,
      status: p?.status ?? (unlocked ? 'available' : 'locked'), unlocked, correctCount: p?.correct_count ?? null,
      completedQuestions: p?.completed_questions ?? null, timeSpentSeconds: p?.time_spent_seconds ?? null,
      updatedAt: p?.updated_at ?? null, completedAt: p?.completed_at ?? null }
  }) })
}

export async function POST(request: NextRequest) {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const blocked = await denyIfUnpaid(user.id)
    if (blocked) return blocked
    const body = await request.json()
    if (typeof body.examId !== 'string') return Response.json({ error: 'examId required' }, { status: 400 })
    const { data: exam } = await db.from('practice_exams').select('*').eq('id', body.examId).single()
    if (!exam) return Response.json({ error: 'Exam not found' }, { status: 404 })
    const { data: allProgress, error: progressError } = await db.from('user_practice_exams').select('*').eq('user_id', user.id)
    if (progressError) throw progressError
    let existing = allProgress?.find(p => p.exam_id === exam.id)
    if (isQuarantinedExam(exam) && !existing) {
      return Response.json({ error: 'This exam form has been retired.', retired: true }, { status: 410 })
    }
    const { data: catalog } = await db.from('practice_exams').select('id, exam_number, test_type, title')
    const completed = new Set(allProgress?.filter(p => p.status === 'completed').map(p => p.exam_id))
    const examKind = (row: { test_type?: string | null; title?: string | null }) => (
      (row.title ?? '').toLowerCase().includes('science') ? 'ACT Science' : ((row.test_type as string | null) ?? 'SAT')
    )
    const sameType = (catalog ?? [])
      .filter(e => !isQuarantinedExam(e) && examKind(e) === examKind(exam))
    if (!sameType.length) throw new Error('Exam catalog unavailable')
    const typeHighest = Math.max(
      Math.min(...sameType.map(e => e.exam_number)) - 1,
      ...sameType.filter(e => completed.has(e.id)).map(e => e.exam_number),
    )
    if (exam.exam_number > typeHighest + 1) return Response.json({ error: 'Complete the previous exam first.' }, { status: 403 })
    if (existing?.status === 'completed') return Response.json({ error: 'This exam is already completed.', completed: true, correctCount: existing.correct_count }, { status: 409 })
    if (!existing) {
      if (exam.format_version === 2) {
        const { data, error } = await db.rpc('begin_sat_exam', { p_exam_id: exam.id })
        if (error) throw error
        existing = data as unknown as NonNullable<typeof existing>
      } else {
        existing = await beginFixedFormExam(db, user.id, exam)
      }
    }
    if (!existing) throw new Error('Exam start failed')
    const ids = existing.assigned_question_ids
    const readingIds = existing.assigned_reading_ids
    const englishIds = existing.assigned_english_ids
    const rw = new Set([...readingIds, ...englishIds])
    // Digital SAT pools swap at runtime, so Math is the remainder there.
    // Fixed-form exams (ACT) use the catalog's frozen Math array; anything
    // else left over is Science.
    const mathIds = existing.format_version === 2
      ? ids.filter(id => !rw.has(id))
      : (exam.math_ids ?? []).filter(id => ids.includes(id))
    const scienceIds = existing.format_version === 2
      ? []
      : ids.filter(id => !rw.has(id) && !new Set(mathIds).has(id))
    const service = createAdminClient()
    const rows = []
    for (let start = 0; start < ids.length; start += 40) {
      const slice = ids.slice(start, start + 40)
      const { data, error } = await service.from('questions').select(QUESTION_FIELDS).in('id', slice)
      if (error) throw error
      rows.push(...(data ?? []))
    }
    if (rows.length !== ids.length) throw new Error('Incomplete exam question records')
    const byId = new Map(rows.map(q => [q.id, q]))
    return Response.json({ exam: { id: exam.id, examNumber: exam.exam_number, title: exam.title, testType: exam.test_type ?? 'SAT', readingIds, englishIds, mathIds, scienceIds,
      formatVersion: existing.format_version, mathPath: existing.math_path, totalQuestions: existing.total_questions },
      sessionId: existing.session_id, questions: ids.map(id => examQuestion(byId.get(id)!)),
      progress: { answers: existing.answers, marks: existing.marks, focusedId: existing.focused_id,
        moduleIndex: existing.module_index, moduleSecondsLeft: existing.module_seconds_left, breakUntil: existing.break_until, serverNow: new Date().toISOString(),
        elapsed: existing.elapsed_seconds, hintUsed: existing.hint_used, usage: existing.usage } })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Could not load exam questions. Please try again.' }, { status: 500 })
  }
}
