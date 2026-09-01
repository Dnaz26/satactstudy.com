import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAnswerQuestion } from '@/lib/entitlements'
import { asDifficulty, questionChoices, toDbDifficulty } from '@/lib/schema'
import { z } from 'zod'

const querySchema = z.object({
  testType: z.enum(['SAT', 'ACT']).optional(),
  topicId: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional().default('mixed'),
  count: z.coerce.number().min(1).max(50).optional().default(10),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      testType: searchParams.get('testType') ?? undefined,
      topicId: searchParams.get('topicId') ?? undefined,
      difficulty: searchParams.get('difficulty') ?? undefined,
      count: searchParams.get('count') ?? undefined,
    })

    if (!parsed.success) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const { testType, topicId, difficulty, count } = parsed.data
    const entitlement = await canAnswerQuestion(user.id)
    const actualCount = Math.min(count, Math.max(0, entitlement.limit - entitlement.used))

    if (actualCount <= 0) {
      return Response.json({
        error: "You've used today's questions. They reset tomorrow.",
        limitReached: true,
      }, { status: 403 })
    }

    let query = supabase
      .from('questions')
      .select('id, question_text, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, difficulty, topic_id, topic_name, official_explanation, ai_explanation')
      .eq('approved', true)
      .eq('active', true)

    if (testType) query = query.eq('test_type', testType)
    if (topicId) query = query.eq('topic_id', topicId)
    if (difficulty && difficulty !== 'mixed') {
      query = query.eq('difficulty', toDbDifficulty(difficulty))
    }

    const { data: questions, error } = await query.limit(actualCount * 3)

    if (error) {
      return Response.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    const shuffled = (questions ?? []).sort(() => Math.random() - 0.5).slice(0, actualCount).map((q) => ({
      ...q,
      difficulty: asDifficulty(q.difficulty),
      choices: questionChoices(q),
    }))

    const { data: session } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        test_type: testType ?? null,
        topic_id: topicId || null,
        is_timed: false,
        total_questions: shuffled.length,
        completed_questions: 0,
        correct_count: 0,
        time_spent_seconds: 0,
        status: 'in_progress',
        session_type: 'practice',
      })
      .select('id')
      .single()

    return Response.json({
      questions: shuffled,
      sessionId: session?.id ?? null,
      questionsRemaining: entitlement.limit - entitlement.used - shuffled.length,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
