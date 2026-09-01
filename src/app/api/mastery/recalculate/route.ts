import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateTopicMastery, type AttemptData } from '@/lib/mastery'
import { asDifficulty } from '@/lib/schema'
import { z } from 'zod'

const bodySchema = z.object({
  topicId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json())
    const topicId = parsed.success ? parsed.data.topicId : undefined

    let query = supabase
      .from('attempts')
      .select('correct, time_spent_seconds, created_at, questions!inner(topic_id, difficulty)')
      .eq('user_id', user.id)

    if (topicId) query = query.eq('questions.topic_id', topicId)

    const { data: attempts } = await query
    if (!attempts?.length) return Response.json({ success: true, updated: 0 })

    const byTopic: Record<string, AttemptData[]> = {}
    for (const a of attempts) {
      const q = a.questions as { topic_id?: string; difficulty?: string | null } | null
      const tid = q?.topic_id
      if (!tid) continue
      if (!byTopic[tid]) byTopic[tid] = []
      byTopic[tid].push({
        is_correct: Boolean(a.correct),
        time_seconds: a.time_spent_seconds ?? 0,
        difficulty: asDifficulty(q?.difficulty),
        created_at: a.created_at ?? new Date().toISOString(),
      })
    }

    const topicIds = Object.keys(byTopic)
    const { data: topics } = await supabase
      .from('topics')
      .select('id, target_time_seconds')
      .in('id', topicIds)

    const topicMap: Record<string, number> = {}
    for (const t of topics ?? []) topicMap[t.id] = t.target_time_seconds ?? 90

    const updates = Object.entries(byTopic).map(([tid, tattempts]) => {
      const result = calculateTopicMastery(tattempts, topicMap[tid] ?? 90)
      return {
        user_id: user.id,
        topic_id: tid,
        knowledge_mastery: result.knowledge_mastery,
        speed_mastery: result.speed_mastery,
        overall_mastery: result.overall_mastery,
        total_attempts: result.total_attempts,
        correct_attempts: result.correct_attempts,
        total_time_seconds: tattempts.reduce((s, a) => s + a.time_seconds, 0),
        trend: result.trend,
        last_practiced_at: tattempts[tattempts.length - 1]?.created_at ?? null,
        updated_at: new Date().toISOString(),
      }
    })

    await supabase.from('topic_mastery').upsert(updates, { onConflict: 'user_id,topic_id' })
    return Response.json({ success: true, updated: updates.length })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
