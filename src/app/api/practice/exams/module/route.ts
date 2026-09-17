import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { QUESTION_FIELDS, examQuestion } from '@/lib/practice/exam-questions'
import { z } from 'zod'
const bodySchema = z.object({ examId: z.string().uuid(), fromModule: z.number().int().min(0).max(2), answers: z.record(z.string(), z.string()) })
export async function POST(request: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const blocked = await denyIfUnpaid(user.id)
  if (blocked) return blocked
  const body = bodySchema.safeParse(await request.json())
  if (!body.success) return Response.json({ error: 'Invalid module submission' }, { status: 400 })
  const { data, error } = await db.rpc('transition_sat_exam', { p_exam_id: body.data.examId, p_answers: body.data.answers, p_from: body.data.fromModule })
  if (error) return Response.json({ error: 'Could not submit module. Reload to resume your saved exam.' }, { status: 409 })
  const result = data as { mathPath: string | null; questionIds: string[]; moduleIndex: number }
  const mathIds = result.questionIds.slice(54)
  const { data: rows, error: loadError } = await db.from('questions').select(QUESTION_FIELDS).in('id', mathIds)
  if (loadError || rows?.length !== 44) return Response.json({ error: 'Module saved, but questions could not load. Reload to resume.' }, { status: 500 })
  const byId = new Map(rows.map(q => [q.id, q]))
  return Response.json({ ...result, serverNow: new Date().toISOString(), mathIds, questions: mathIds.map(id => examQuestion(byId.get(id)!)) })
}
