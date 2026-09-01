import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordQuestionAnswered } from '@/lib/entitlements'
import { calculateTopicMastery, type AttemptData } from '@/lib/mastery'
import { asDifficulty } from '@/lib/schema'
import { z } from 'zod'

const bodySchema = z.object({
  questionId: z.string().uuid(),
  topicId: z.string().uuid().nullable().optional(),
  sessionId: z.string().uuid().nullable().optional(),
  selectedAnswer: z.string().min(1),
  isCorrect: z.boolean(),
  timeSeconds: z.number().min(0),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  mistakeTag: z.enum(['didnt_know', 'careless', 'misread', 'ran_out_of_time', 'guessed']).optional(),
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
      return Response.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 })
    }

    const { questionId, topicId, sessionId, selectedAnswer, isCorrect, timeSeconds, difficulty, mistakeTag } = parsed.data

    const { data: question } = await supabase
      .from('questions')
      .select('topic_id, difficulty')
      .eq('id', questionId)
      .single()

    const resolvedTopicId = topicId ?? question?.topic_id ?? null

    await supabase.from('attempts').insert({
      user_id: user.id,
      session_id: sessionId ?? null,
      question_id: questionId,
      selected_answer: selectedAnswer,
      correct: isCorrect,
      time_spent_seconds: timeSeconds,
      mistake_type: mistakeTag ?? null,
    })

    await recordQuestionAnswered(user.id)

    if (resolvedTopicId) {
      const { data: allAttempts } = await supabase
        .from('attempts')
        .select('correct, time_spent_seconds, created_at, questions(difficulty)')
        .eq('user_id', user.id)
        .eq('question_id', questionId)

      const { data: topicAttempts } = await supabase
        .from('attempts')
        .select('correct, time_spent_seconds, created_at, questions!inner(topic_id, difficulty)')
        .eq('user_id', user.id)
        .eq('questions.topic_id', resolvedTopicId)
        .order('created_at', { ascending: true })

      const mapped: AttemptData[] = (topicAttempts ?? allAttempts ?? []).map((a) => {
        const q = a.questions as { difficulty?: string | null } | { difficulty?: string | null }[] | null
        const diff = Array.isArray(q) ? q[0]?.difficulty : q?.difficulty
        return {
          is_correct: Boolean(a.correct),
          time_seconds: a.time_spent_seconds ?? 0,
          difficulty: asDifficulty(diff ?? difficulty),
          created_at: a.created_at ?? new Date().toISOString(),
        }
      })

      const { data: topic } = await supabase
        .from('topics')
        .select('target_time_seconds')
        .eq('id', resolvedTopicId)
        .single()

      const { data: previousMastery } = await supabase
        .from('topic_mastery')
        .select('overall_mastery')
        .eq('user_id', user.id)
        .eq('topic_id', resolvedTopicId)
        .single()

      const masteryResult = calculateTopicMastery(
        mapped,
        topic?.target_time_seconds ?? 90,
        previousMastery?.overall_mastery ?? undefined
      )

      await supabase.from('topic_mastery').upsert({
        user_id: user.id,
        topic_id: resolvedTopicId,
        knowledge_mastery: masteryResult.knowledge_mastery,
        speed_mastery: masteryResult.speed_mastery,
        overall_mastery: masteryResult.overall_mastery,
        total_attempts: masteryResult.total_attempts,
        correct_attempts: masteryResult.correct_attempts,
        total_time_seconds: mapped.reduce((s, a) => s + a.time_seconds, 0),
        trend: masteryResult.trend,
        last_practiced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,topic_id' })
    }

    if (sessionId) {
      const { data: session } = await supabase
        .from('practice_sessions')
        .select('completed_questions, correct_count, time_spent_seconds')
        .eq('id', sessionId)
        .single()
      if (session) {
        await supabase.from('practice_sessions').update({
          completed_questions: (session.completed_questions ?? 0) + 1,
          correct_count: (session.correct_count ?? 0) + (isCorrect ? 1 : 0),
          time_spent_seconds: (session.time_spent_seconds ?? 0) + timeSeconds,
        }).eq('id', sessionId)
      }
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
