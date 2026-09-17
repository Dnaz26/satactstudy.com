import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { QUESTION_FIELDS, examQuestion } from '@/lib/practice/exam-questions'

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
  const byId = new Map(progress.data.map(p => [p.exam_id, p]))
  const highestCompleted = Math.max(0, ...catalog.data.filter(e => byId.get(e.id)?.status === 'completed').map(e => e.exam_number))
  return Response.json({ highestCompleted, exams: catalog.data.map(e => {
    const p = byId.get(e.id)
    const unlocked = e.exam_number <= highestCompleted + 1
    return { id: e.id, examNumber: e.exam_number, title: e.title, totalQuestions: p?.total_questions ?? e.total_questions,
      readingWritingCount: e.format_version === 2 ? 54 : e.reading_ids.length + e.english_ids.length,
      readingCount: e.reading_ids.length, englishCount: e.english_ids.length, mathCount: e.math_ids.length,
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
    const { data: catalog } = await db.from('practice_exams').select('id, exam_number')
    const completed = new Set(allProgress?.filter(p => p.status === 'completed').map(p => p.exam_id))
    const highest = Math.max(0, ...(catalog ?? []).filter(e => completed.has(e.id)).map(e => e.exam_number))
    if (exam.exam_number > highest + 1) return Response.json({ error: 'Complete the previous exam first.' }, { status: 403 })
    if (existing?.status === 'completed') return Response.json({ error: 'This exam is already completed.', completed: true, correctCount: existing.correct_count }, { status: 409 })
    if (!existing) {
      const { data, error } = await db.rpc('begin_sat_exam', { p_exam_id: exam.id })
      if (error) throw error
      existing = data as unknown as NonNullable<typeof existing>
    }
    if (!existing) throw new Error('Exam start failed')
    const ids = existing.assigned_question_ids
    const readingIds = existing.assigned_reading_ids
    const englishIds = existing.assigned_english_ids
    const rw = new Set([...readingIds, ...englishIds])
    const mathIds = ids.filter(id => !rw.has(id))
    const { data: rows, error } = await db.from('questions').select(QUESTION_FIELDS).in('id', ids)
    if (error || !rows || rows.length !== ids.length) throw new Error('Incomplete exam question records')
    const byId = new Map(rows.map(q => [q.id, q]))
    return Response.json({ exam: { id: exam.id, examNumber: exam.exam_number, title: exam.title, readingIds, englishIds, mathIds,
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
