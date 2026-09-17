import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { awardCoins } from '@/lib/economy/wallet'
import { dbId } from '@/lib/schema'
import { z } from 'zod'
import { recalculateMastery } from '@/lib/practice/recalculate-mastery'

const saveSchema = z.object({
  usage: z.object({ tutorUsed: z.record(z.string(), z.boolean()), desmosUsed: z.record(z.string(), z.boolean()) }).optional(),
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
  usage: z.object({ hintUsed: z.record(z.string(), z.boolean()), tutorUsed: z.record(z.string(), z.boolean()), desmosUsed: z.record(z.string(), z.boolean()) }).optional(),
  examId: dbId(),
  correctCount: z.number().int().min(0).optional(),
  answers: z.record(z.string(), z.string()).optional(),
  completedQuestions: z.number().int().min(0).optional(),
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
    const { data: prior } = await supabase.from('user_practice_exams').select('*').eq('user_id', user.id).eq('exam_id', data.examId).single()
    if (!prior || prior.status !== 'in_progress') return Response.json({ error: 'No active exam' }, { status: 409 })
    if (prior.format_version === 2) {
      if (prior.break_until && Date.parse(prior.break_until) > Date.now()) return Response.json({ success: true, breakUntil: prior.break_until })
      if (data.moduleIndex !== prior.module_index) return Response.json({ error: 'Stale module progress' }, { status: 409 })
      const start = [0, 27, 54, 76][prior.module_index]
      const end = [27, 54, 76, 98][prior.module_index]
      const accepted = Object.fromEntries(prior.assigned_question_ids.slice(start, end).map(id => [id, data.answers?.[id] ?? '']))
      const { data: saved, error } = await supabase.from('user_practice_exams').update({
        answers: { ...(prior.answers as Record<string, string>), ...accepted },
        focused_id: prior.assigned_question_ids.slice(start, end).includes(data.focusedId ?? '') ? data.focusedId : prior.focused_id,
        module_seconds_left: Math.min(prior.module_seconds_left ?? [1920,1920,2100,2100][prior.module_index], data.moduleSecondsLeft ?? 0),
        completed_questions: Object.values({ ...(prior.answers as Record<string, string>), ...accepted }).filter(Boolean).length,
        usage: data.usage ?? prior.usage,
        hint_used: { ...(prior.hint_used as Record<string, boolean>), ...Object.fromEntries(prior.assigned_question_ids.slice(start,end).map(id => [id, Boolean(data.hintUsed?.[id])])) },
        elapsed_seconds: Math.max(prior.elapsed_seconds, data.elapsed ?? 0), updated_at: new Date().toISOString(),
      }).eq('id', prior.id).eq('status', 'in_progress').eq('module_index', prior.module_index).select('id')
      if (error || !saved?.length) return Response.json({ error: 'Could not save current module' }, { status: 409 })
      return Response.json({ success: true })
    }
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

    const { examId, timeSpentSeconds, sessionId } = parsed.data
    const { data: state } = await supabase.from('user_practice_exams').select('format_version, total_questions').eq('user_id', user.id).eq('exam_id', examId).single()
    if (!state) return Response.json({ error: 'Exam not started' }, { status: 409 })
    if (state.format_version === 2) {
      const { data: result, error } = await supabase.rpc('complete_sat_exam', {
        p_exam_id: examId, p_answers: parsed.data.answers ?? {}, p_seconds: timeSpentSeconds ?? 0, p_usage: parsed.data.usage ?? {},
      })
      if (error) return Response.json({ error: 'Could not complete exam. Your progress is saved; try again.' }, { status: 409 })
      const score = result as { correctCount: number; total: number; alreadyCompleted: boolean }
      if (!score.alreadyCompleted) {
        await recalculateMastery(supabase, user.id).catch(err => console.error('Exam mastery update failed', err))
      }
      if (!score.alreadyCompleted) await awardCoins(supabase, user.id, 'practice_test', { examId, correctCount: score.correctCount, completedQuestions: score.total })
      return Response.json({ success: true, ...score })
    }
    const correctCount = Math.min(state.total_questions ?? 100, parsed.data.correctCount ?? 0)
    const completedQuestions = Math.min(state.total_questions ?? 100, parsed.data.completedQuestions ?? 0)

    const { data: priorExam } = await supabase
      .from('user_practice_exams')
      .select('status')
      .eq('user_id', user.id)
      .eq('exam_id', examId)
      .maybeSingle()

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

    let coinsAwarded = 0
    let balance = 0
    if (priorExam?.status !== 'completed') {
      const coin = await awardCoins(supabase, user.id, 'practice_test', {
        examId,
        correctCount,
        completedQuestions,
      })
      coinsAwarded = coin.awarded
      balance = coin.balance
    }

    return Response.json({ success: true, coinsAwarded, balance })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
