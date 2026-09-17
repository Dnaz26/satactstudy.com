import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { calculateTopicMastery, type AttemptData } from '@/lib/mastery'
import { asDifficulty } from '@/lib/schema'

export async function recalculateMastery(supabase: SupabaseClient<Database>, userId: string, topicId?: string): Promise<number> {
    let query = supabase
      .from('attempts')
      .select('correct, time_spent_seconds, created_at, questions!inner(topic_id, difficulty)')
      .eq('user_id', userId)

    if (topicId) query = query.eq('questions.topic_id', topicId)

    const { data: attempts } = await query
    if (!attempts?.length) return 0

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
        user_id: userId,
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

    const { error } = await supabase.from('topic_mastery').upsert(updates, { onConflict: 'user_id,topic_id' })
    if (error) throw error

    return updates.length
}
