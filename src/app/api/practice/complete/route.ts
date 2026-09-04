import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbId } from '@/lib/schema'
import { z } from 'zod'

const bodySchema = z.object({
  sessionId: dbId(),
  correctCount: z.number().int().min(0),
  completedQuestions: z.number().int().min(0),
  timeSpentSeconds: z.number().int().min(0).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { sessionId, correctCount, completedQuestions, timeSpentSeconds } = parsed.data
    const { error } = await supabase
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

    if (error) {
      return Response.json({ error: 'Could not complete session' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
