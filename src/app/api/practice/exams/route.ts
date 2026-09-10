import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { asDifficulty, questionChoices } from '@/lib/schema'
import { getUsedQuestionIds } from '@/lib/practice/used-questions'

const QUESTION_FIELDS =
  'id, question_text, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, difficulty, difficulty_score, topic_id, topic_name, section_name, category_name, test_type, official_explanation, ai_explanation, calculator_config, calculator_allowed, desmos_useful, desmos_mode, question_type, reasoning_type, image_url, passage_id, source_rights_status, source_type, passages(title, content)'

type ExamRow = {
  id: string
  exam_number: number
  title: string
  question_ids: string[]
  reading_ids: string[]
  english_ids: string[]
  math_ids: string[]
  total_questions: number
}

function bucketOf(section: string | null, category: string | null): 'reading' | 'english' | 'math' | null {
  const s = (section || '').toLowerCase()
  const c = (category || '').toLowerCase()
  if (s === 'math') return 'math'
  if (s === 'reading') return 'reading'
  if (s === 'english') return 'english'
  if (s === 'reading and writing') {
    if (c === 'standard english conventions' || c === 'expression of ideas') return 'english'
    return 'reading'
  }
  return null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await denyIfUnpaid(user.id)
    if (blocked) return blocked

    const [{ data: exams }, { data: progress }] = await Promise.all([
      supabase
        .from('practice_exams')
        .select('id, exam_number, title, total_questions, reading_ids, english_ids, math_ids')
        .order('exam_number', { ascending: true }),
      supabase
        .from('user_practice_exams')
        .select('exam_id, status, correct_count, completed_questions, time_spent_seconds, updated_at, completed_at')
        .eq('user_id', user.id),
    ])

    const byExam = new Map((progress ?? []).map((row) => [row.exam_id, row]))
    let highestCompleted = 0
    for (const exam of exams ?? []) {
      const row = byExam.get(exam.id)
      if (row?.status === 'completed') {
        highestCompleted = Math.max(highestCompleted, exam.exam_number)
      }
    }

    const list = (exams ?? []).map((exam) => {
      const row = byExam.get(exam.id)
      const unlocked = exam.exam_number === 1 || exam.exam_number <= highestCompleted + 1
      return {
        id: exam.id,
        examNumber: exam.exam_number,
        title: exam.title,
        totalQuestions: exam.total_questions ?? 100,
        readingCount: exam.reading_ids?.length ?? 25,
        englishCount: exam.english_ids?.length ?? 25,
        mathCount: exam.math_ids?.length ?? 50,
        status: row?.status ?? (unlocked ? 'available' : 'locked'),
        unlocked,
        correctCount: row?.correct_count ?? null,
        completedQuestions: row?.completed_questions ?? null,
        timeSpentSeconds: row?.time_spent_seconds ?? null,
        updatedAt: row?.updated_at ?? null,
        completedAt: row?.completed_at ?? null,
      }
    })

    return Response.json({ exams: list, highestCompleted })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await denyIfUnpaid(user.id)
    if (blocked) return blocked

    const body = await request.json() as { examId?: string }
    if (!body.examId) return Response.json({ error: 'examId required' }, { status: 400 })

    const { data: exam } = await supabase
      .from('practice_exams')
      .select('id, exam_number, title, question_ids, reading_ids, english_ids, math_ids, total_questions')
      .eq('id', body.examId)
      .single()

    if (!exam) return Response.json({ error: 'Exam not found' }, { status: 404 })

    const typedExam = exam as ExamRow

    const { data: allProgress } = await supabase
      .from('user_practice_exams')
      .select('exam_id, status, practice_exams(exam_number)')
      .eq('user_id', user.id)

    let highestCompleted = 0
    for (const row of allProgress ?? []) {
      const num = (row.practice_exams as { exam_number?: number } | null)?.exam_number ?? 0
      if (row.status === 'completed') highestCompleted = Math.max(highestCompleted, num)
    }

    if (typedExam.exam_number > 1 && typedExam.exam_number > highestCompleted + 1) {
      return Response.json({ error: 'Complete the previous exam first.' }, { status: 403 })
    }

    const { data: existing } = await supabase
      .from('user_practice_exams')
      .select('*')
      .eq('user_id', user.id)
      .eq('exam_id', typedExam.id)
      .maybeSingle()

    if (existing?.status === 'completed') {
      return Response.json({
        error: 'This exam is already completed. Score is saved — questions are not replayed.',
        completed: true,
        correctCount: existing.correct_count,
      }, { status: 409 })
    }

    const used = await getUsedQuestionIds(user.id)
    // Keep in-progress answers' questions even if already attempted mid-exam
    if (existing?.status === 'in_progress' && existing.answers) {
      // resume as-is below
    }

    let readingIds = [...(typedExam.reading_ids ?? [])]
    let englishIds = [...(typedExam.english_ids ?? [])]
    let mathIds = [...(typedExam.math_ids ?? [])]

    // On fresh start, swap out any globally used (tutor/practice) IDs.
    if (!existing) {
      const { data: pool } = await supabase
        .from('questions')
        .select('id, section_name, category_name')
        .eq('approved', true)
        .eq('active', true)
        .limit(4000)

      const unusedByBucket: Record<'reading' | 'english' | 'math', string[]> = {
        reading: [],
        english: [],
        math: [],
      }
      for (const q of pool ?? []) {
        if (used.has(q.id)) continue
        const bucket = bucketOf(q.section_name, q.category_name)
        if (!bucket) continue
        unusedByBucket[bucket].push(q.id)
      }

      function refill(ids: string[], bucket: 'reading' | 'english' | 'math', want: number): string[] {
        const keep = ids.filter((id) => !used.has(id))
        const need = Math.max(0, want - keep.length)
        const extras: string[] = []
        for (const id of unusedByBucket[bucket]) {
          if (keep.includes(id) || extras.includes(id)) continue
          extras.push(id)
          if (extras.length >= need) break
        }
        return [...keep, ...extras].slice(0, want)
      }

      readingIds = refill(readingIds, 'reading', 25)
      englishIds = refill(englishIds, 'english', 25)
      mathIds = refill(mathIds, 'math', 50)
    }

    const questionIds = [...readingIds, ...englishIds, ...mathIds]
    if (questionIds.length === 0) {
      return Response.json({ error: 'No unused questions left for this exam.' }, { status: 404 })
    }

    const { data: questions, error } = await supabase
      .from('questions')
      .select(QUESTION_FIELDS)
      .in('id', questionIds)

    if (error) {
      return Response.json({ error: 'Failed to load exam questions' }, { status: 500 })
    }

    const byId = new Map((questions ?? []).map((q) => [q.id, q]))
    const ordered = questionIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((q) => {
        const row = q!
        const passageRel = row.passages as { title?: string | null; content?: string | null } | { title?: string | null; content?: string | null }[] | null
        const passage = Array.isArray(passageRel) ? passageRel[0] : passageRel
        return {
          ...row,
          passages: undefined,
          passage_title: passage?.title ?? null,
          passage_content: passage?.content ?? null,
          difficulty: asDifficulty(row.difficulty),
          choices: questionChoices(row),
        }
      })

    let sessionId = existing?.session_id ?? null
    if (!sessionId) {
      const { data: session } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: user.id,
          test_type: null,
          topic_id: null,
          is_timed: true,
          total_questions: ordered.length,
          completed_questions: 0,
          correct_count: 0,
          time_spent_seconds: 0,
          status: 'in_progress',
          session_type: 'practice_test',
          section_name: typedExam.title,
        })
        .select('id')
        .single()
      sessionId = session?.id ?? null
    }

    if (!existing) {
      await supabase.from('user_practice_exams').insert({
        user_id: user.id,
        exam_id: typedExam.id,
        session_id: sessionId,
        status: 'in_progress',
        answers: {},
        marks: {},
        focused_id: ordered[0]?.id ?? null,
        module_index: 0,
        elapsed_seconds: 0,
      })
    }

    return Response.json({
      exam: {
        id: typedExam.id,
        examNumber: typedExam.exam_number,
        title: typedExam.title,
        readingIds,
        englishIds,
        mathIds,
      },
      sessionId,
      questions: ordered,
      progress: existing
        ? {
            answers: existing.answers ?? {},
            marks: existing.marks ?? {},
            focusedId: existing.focused_id,
            moduleIndex: existing.module_index ?? 0,
            moduleSecondsLeft: existing.module_seconds_left,
            elapsed: existing.elapsed_seconds ?? 0,
            hintUsed: existing.hint_used ?? {},
          }
        : null,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
