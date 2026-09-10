import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { dbId } from '@/lib/schema'
import { z } from 'zod'

const saveSchema = z.object({
  examId: dbId(),
  answers: z.record(z.string(), z.string()).optional(),
  marks: z.record(z.string(), z.any()).optional(),
  focusedId: z.string().nullable().optional(),
  moduleIndex: z.number().int().min(0).optional(),
  moduleSecondsLeft: z.number().int().min(0).nullable().optional(),
  elapsed: z.number().int().min(0).optional(),
  hintUsed: z.record(z.string(), z.boolean()).optional(),
  sessionId: dbId().nullable().optional(),
})

const completeSchema = z.object({
  examId: dbId(),
  correctCount: z.number().int().min(0),
  completedQuestions: z.number().int().min(0),
  timeSpentSeconds: z.number().int().min(0).optional(),
  sessionId: dbId().nullable().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await denyIfUnpaid(user.id)
    if (blocked) return blocked

    const parsed = saveSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: 'Invalid body' }, { status: 400 })
    }

    const data = parsed.data
    const { error } = await supabase
      .from('user_practice_exams')
      .update({
        answers: data.answers ?? {},
        marks: data.marks ?? {},
        focused_id: data.focusedId ?? null,
        module_index: data.moduleIndex ?? 0,
        module_seconds_left: data.moduleSecondsLeft ?? null,
        elapsed_seconds: data.elapsed ?? 0,
        hint_used: data.hintUsed ?? {},
        session_id: data.sessionId ?? null,
        updated_at: new Date().toISOString(),
        status: 'in_progress',
      })
      .eq('user_id', user.id)
      .eq('exam_id', data.examId)
      .eq('status', 'in_progress')

    if (error) {
      return Response.json({ error: 'Could not save progress' }, { status: 500 })
    }

    return Response.json({ success: true })
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

    const parsed = completeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { examId, correctCount, completedQuestions, timeSpentSeconds, sessionId } = parsed.data

    // Score only — clear in-progress question state
    const { error } = await supabase
      .from('user_practice_exams')
      .update({
        status: 'completed',
        correct_count: correctCount,
        completed_questions: completedQuestions,
        time_spent_seconds: timeSpentSeconds ?? 0,
        answers: {},
        marks: {},
        hint_used: {},
        focused_id: null,
        module_index: 0,
        module_seconds_left: null,
        elapsed_seconds: 0,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('exam_id', examId)

    if (error) {
      return Response.json({ error: 'Could not complete exam' }, { status: 500 })
    }

    if (sessionId) {
      await supabase
        .from('practice_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          correct_count: correctCount,
          completed_questions: completedQuestions,
          time_spent_seconds: timeSpentSeconds ?? 0,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
