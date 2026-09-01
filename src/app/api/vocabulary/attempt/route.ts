import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  wordId: z.string().uuid(),
  knewIt: z.boolean(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as unknown
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { wordId, knewIt } = parsed.data

    const { data: existing } = await supabase
      .from('vocabulary_attempts')
      .select('interval_days, ease_factor')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let intervalDays = knewIt ? (existing?.interval_days ?? 1) * (knewIt ? 2 : 0.5) : 1
    intervalDays = Math.max(1, Math.min(365, Math.round(intervalDays)))

    const nextReview = new Date(Date.now() + intervalDays * 86400000).toISOString()

    await supabase.from('vocabulary_attempts').insert({
      user_id: user.id,
      word_id: wordId,
      correct: knewIt,
      next_review_at: nextReview,
      interval_days: intervalDays,
      ease_factor: existing?.ease_factor ?? 2.5,
    })

    return Response.json({ success: true, nextReview, intervalDays })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
