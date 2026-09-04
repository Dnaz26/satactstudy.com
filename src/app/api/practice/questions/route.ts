import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAnswerQuestion } from '@/lib/entitlements'
import { PAYWALL_MESSAGE } from '@/lib/access'
import { asDifficulty, questionChoices, toDbDifficulty } from '@/lib/schema'
import { MIN_TOPIC_QUESTIONS } from '@/lib/constants'
import { ensureTopicQuestionCount } from '@/lib/questions/expand-topic'
import { z } from 'zod'

const querySchema = z.object({
  testType: z.enum(['SAT', 'ACT']).optional(),
  topicId: z.string().optional(),
  sectionName: z.string().optional(),
  categoryName: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional().default('mixed'),
  count: z.coerce.number().min(1).max(60).optional().default(MIN_TOPIC_QUESTIONS),
})

const QUESTION_FIELDS = 'id, question_text, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, difficulty, difficulty_score, topic_id, topic_name, section_name, category_name, test_type, official_explanation, ai_explanation, calculator_config, calculator_allowed, desmos_useful, desmos_mode, question_type, reasoning_type, image_url, passage_id, source_rights_status, source_type, passages(title, content)'

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
      sectionName: searchParams.get('sectionName') ?? undefined,
      categoryName: searchParams.get('categoryName') ?? undefined,
      difficulty: searchParams.get('difficulty') ?? undefined,
      count: searchParams.get('count') ?? undefined,
    })

    if (!parsed.success) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const { testType, topicId, sectionName, categoryName, difficulty, count } = parsed.data
    const entitlement = await canAnswerQuestion(user.id)
    if (entitlement.paywall) {
      return Response.json({ error: PAYWALL_MESSAGE, paywall: true }, { status: 403 })
    }
    const actualCount = Math.min(count, Math.max(0, entitlement.limit - entitlement.used))

    if (actualCount <= 0) {
      return Response.json({
        error: "You've used today's questions. They reset tomorrow.",
        limitReached: true,
      }, { status: 403 })
    }

    if (topicId) {
      await ensureTopicQuestionCount(supabase, topicId, MIN_TOPIC_QUESTIONS)
    }

    let query = supabase
      .from('questions')
      .select(QUESTION_FIELDS)
      .eq('approved', true)
      .eq('active', true)

    if (testType) query = query.eq('test_type', testType)
    if (topicId) query = query.eq('topic_id', topicId)
    if (sectionName) query = query.eq('section_name', sectionName)
    if (categoryName) query = query.eq('category_name', categoryName)
    if (difficulty && difficulty !== 'mixed') {
      query = query.eq('difficulty', toDbDifficulty(difficulty))
    }

    const { data: questions, error } = await query
      .order('topic_id', { ascending: true })
      .order('difficulty_score', { ascending: true, nullsFirst: false })
      .limit(800)

    if (error) {
      return Response.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    const { data: seenRows } = await supabase
      .from('attempts')
      .select('question_id')
      .eq('user_id', user.id)
    const seenIds = new Set((seenRows ?? []).map((row) => row.question_id))
    const pool = questions ?? []
    const fresh = pool.filter((q) => !seenIds.has(q.id))
    const used = pool.filter((q) => seenIds.has(q.id))
    const source = fresh.length > 0 ? fresh : used
    const shuffled = [...source].sort(() => Math.random() - 0.5).slice(0, actualCount).map((q) => {
      const passageRel = q.passages as { title?: string | null; content?: string | null } | { title?: string | null; content?: string | null }[] | null
      const passage = Array.isArray(passageRel) ? passageRel[0] : passageRel
      return {
        ...q,
        passages: undefined,
        passage_title: passage?.title ?? null,
        passage_content: passage?.content ?? null,
        difficulty: asDifficulty(q.difficulty),
        choices: questionChoices(q),
      }
    })

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
