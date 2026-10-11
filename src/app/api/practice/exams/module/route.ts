import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { denyIfUnpaid } from '@/lib/entitlements'
import { QUESTION_FIELDS, examQuestion } from '@/lib/practice/exam-questions'
import type { Json } from '@/types/database'
import { answersMatch } from '@/lib/practice/answers'
import {
  module2ScoreBand,
  pickModule2Questions,
  routeSatModule2,
  type Module2Candidate,
  type SatModule2Path,
} from '@/lib/assessment/sat-scale'

const bodySchema = z.object({
  examId: z.string().uuid(),
  fromModule: z.number().int().min(0).max(2),
  answers: z.record(z.string(), z.string()),
})

async function poolFor(section: string, path: SatModule2Path): Promise<Module2Candidate[]> {
  const service = createAdminClient()
  const band = module2ScoreBand(path)
  const rows: Module2Candidate[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await service
      .from('questions')
      .select('id, topic_name, difficulty_score')
      .eq('test_type', 'SAT')
      .eq('section_name', section)
      .eq('active', true)
      .eq('approved', true)
      .gte('difficulty_score', band.min)
      .lte('difficulty_score', band.max)
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    for (const row of data ?? []) {
      rows.push({
        id: row.id,
        topic_name: row.topic_name,
        difficulty_score: Number(row.difficulty_score) || 0,
      })
    }
    if (!data || data.length < 1000) break
  }
  return rows
}

export async function POST(request: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const blocked = await denyIfUnpaid(user.id)
  if (blocked) return blocked
  const body = bodySchema.safeParse(await request.json())
  if (!body.success) return Response.json({ error: 'Invalid module submission' }, { status: 400 })

  const service = createAdminClient()
  const { data: row, error: rowError } = await service
    .from('user_practice_exams')
    .select('*')
    .eq('user_id', user.id)
    .eq('exam_id', body.data.examId)
    .maybeSingle()
  if (rowError || !row || row.status !== 'in_progress' || row.format_version !== 2) {
    return Response.json({ error: 'No active Digital SAT exam' }, { status: 409 })
  }
  if (row.break_until && Date.parse(row.break_until) > Date.now()) {
    return Response.json({ error: 'Scheduled break is still active' }, { status: 409 })
  }
  if (row.module_index !== body.data.fromModule || row.assigned_question_ids.length !== 98) {
    return Response.json({ error: 'Module transition conflict' }, { status: 409 })
  }

  const from = body.data.fromModule
  const ids = row.assigned_question_ids
  const start = from === 0 ? 0 : from === 1 ? 27 : 54
  const end = from === 0 ? 27 : from === 1 ? 54 : 76
  const moduleIds = ids.slice(start, end)
  const accepted: Record<string, string> = {}
  for (const id of moduleIds) accepted[id] = body.data.answers[id] ?? ''
  const prior = row.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)
    ? row.answers as Record<string, string>
    : {}
  const merged = { ...prior, ...accepted }

  let nextIds = [...ids]
  let mathPath = row.math_path
  let rwPath: SatModule2Path | null = null
  let swapped: string[] = []

  if (from === 0 || from === 2) {
    const { data: keys, error: keyError } = await service
      .from('questions')
      .select('id, correct_answer')
      .in('id', moduleIds)
    if (keyError || !keys || keys.length !== moduleIds.length) {
      return Response.json({ error: 'Could not score this module' }, { status: 500 })
    }
    const keyById = new Map(keys.map((question) => [question.id, question.correct_answer ?? '']))
    const correct = moduleIds.filter((id) => answersMatch(accepted[id] ?? '', keyById.get(id) ?? '')).length
    const path = routeSatModule2(correct, moduleIds.length)
    const section = from === 0 ? 'Reading and Writing' : 'Math'
    const used = new Set(from === 0 ? [...ids.slice(0, 27), ...ids.slice(54)] : ids.slice(0, 76))
    const pool = await poolFor(section, path)
    swapped = pickModule2Questions(pool, moduleIds.length, used)
    if (swapped.length !== moduleIds.length) {
      return Response.json({ error: 'Not enough questions for the next module' }, { status: 500 })
    }
    if (from === 0) {
      nextIds = [...ids.slice(0, 27), ...swapped, ...ids.slice(54)]
      rwPath = path
    } else {
      nextIds = [...ids.slice(0, 76), ...swapped]
      mathPath = path
    }
  }

  const usage = row.usage && typeof row.usage === 'object' && !Array.isArray(row.usage)
    ? { ...(row.usage as Record<string, unknown>) }
    : {}
  if (rwPath) usage.rwModule2Path = rwPath
  if (from === 2 && mathPath) usage.mathModule2Path = mathPath

  const breakUntil = from === 1 ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : row.break_until
  const focusIndex = from === 0 ? 27 : from === 1 ? 54 : 76
  const filled = Object.values(merged).filter((value) => value !== '').length
  const { data: saved, error: updateError } = await service
    .from('user_practice_exams')
    .update({
      answers: merged,
      assigned_question_ids: nextIds,
      assigned_english_ids: nextIds.slice(27, 54),
      math_path: mathPath === 'medium' ? 'easier' : mathPath,
      module_index: from + 1,
      break_until: breakUntil,
      completed_questions: filled,
      module_seconds_left: from === 0 ? 32 * 60 : 35 * 60,
      focused_id: nextIds[focusIndex] ?? null,
      usage: usage as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('module_index', from)
    .select('id')
  if (updateError || !saved?.length) {
    return Response.json({ error: 'Could not submit module. Reload to resume your saved exam.' }, { status: 409 })
  }

  let questions: ReturnType<typeof examQuestion>[] = []
  if (swapped.length) {
    const { data: qrows, error: loadError } = await service.from('questions').select(QUESTION_FIELDS).in('id', swapped)
    if (loadError || qrows?.length !== swapped.length) {
      return Response.json({ error: 'Module saved, but questions could not load. Reload to resume.' }, { status: 500 })
    }
    const byId = new Map(qrows.map((question) => [question.id, question]))
    questions = swapped.map((id) => examQuestion(byId.get(id)!))
  }

  return Response.json({
    mathPath,
    rwPath,
    questionIds: nextIds,
    readingIds: nextIds.slice(0, 27),
    englishIds: nextIds.slice(27, 54),
    mathIds: nextIds.slice(54),
    moduleIndex: from + 1,
    breakUntil: from === 1 ? breakUntil : row.break_until,
    serverNow: new Date().toISOString(),
    questions,
  })
}
