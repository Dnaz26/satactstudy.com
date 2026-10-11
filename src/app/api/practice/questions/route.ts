import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAnswerQuestion } from '@/lib/entitlements'
import { PAYWALL_MESSAGE } from '@/lib/access'
import { asDifficulty, questionChoices, toDbDifficulty } from '@/lib/schema'
import { MIN_TOPIC_QUESTIONS } from '@/lib/constants'
import { ensureTopicQuestionCount } from '@/lib/questions/expand-topic'
import { getUsedQuestionIds } from '@/lib/practice/used-questions'
import { cleanQuestionText } from '@/lib/questions/clean-text'
import { isChallengeQuestion, pickHardest } from '@/lib/practice/complexity'
import { z } from 'zod'

const querySchema = z.object({
  testType: z.enum(['SAT', 'ACT']).optional(),
  topicId: z.string().optional(),
  topicName: z.string().trim().min(2).max(120).optional(),
  sectionName: z.string().optional(),
  categoryName: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional().default('mixed'),
  count: z.coerce.number().min(1).max(200).optional().default(MIN_TOPIC_QUESTIONS),
  mode: z.enum(['full', 'topic', 'exam', 'rapid', 'chat']).optional(),
})

const QUESTION_FIELDS = 'id, question_text, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, difficulty, difficulty_score, topic_id, topic_name, section_name, category_name, test_type, official_explanation, ai_explanation, calculator_config, calculator_allowed, desmos_useful, desmos_mode, question_type, reasoning_type, image_url, passage_id, source_rights_status, source_type, exam_name, passages(title, content)'

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
      topicName: searchParams.get('topicName') ?? undefined,
      sectionName: searchParams.get('sectionName') ?? undefined,
      categoryName: searchParams.get('categoryName') ?? undefined,
      difficulty: searchParams.get('difficulty') ?? undefined,
      count: searchParams.get('count') ?? undefined,
      mode: searchParams.get('mode') ?? undefined,
    })

    if (!parsed.success) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const { testType, topicId, topicName, sectionName, categoryName, difficulty, count, mode } = parsed.data
    const entitlement = await canAnswerQuestion(user.id)
    if (entitlement.paywall) {
      return Response.json({ error: PAYWALL_MESSAGE, paywall: true }, { status: 403 })
    }
    if (!entitlement.allowed) {
      return Response.json({ error: PAYWALL_MESSAGE, paywall: true }, { status: 403 })
    }

    const actualCount = Math.min(count, 200)

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
    if (topicName) query = query.ilike('topic_name', `%${topicName}%`)
    if (sectionName) query = query.eq('section_name', sectionName)
    if (categoryName) query = query.eq('category_name', categoryName)
    // All independent practice modes train on challenge items. Teaching uses
    // its separate easy-to-hard lesson flow.
    query = query.eq('difficulty', toDbDifficulty('hard'))

    const broadRapid = mode === 'rapid' && !topicId && !testType && !sectionName && !categoryName
    const results = broadRapid
      ? await Promise.all(([
          ['SAT', 'Math'], ['SAT', 'Reading and Writing'],
          ['ACT', 'Math'], ['ACT', 'English'], ['ACT', 'Reading'],
        ] as const).map(([exam, section]) => supabase.from('questions')
          .select(QUESTION_FIELDS)
          .eq('approved', true).eq('active', true).eq('difficulty', 'Hard')
          .eq('test_type', exam).eq('section_name', section)
          .order('difficulty_score', { ascending: false, nullsFirst: false })
          .limit(450)))
      : [await query
          .order('difficulty_score', { ascending: false, nullsFirst: false })
          .limit(1500)]
    const error = results.find((result) => result.error)?.error
    const questions = results.flatMap((result) => result.data ?? [])
    if (error) {
      return Response.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    const usedIds = await getUsedQuestionIds(user.id)
    const eligible = (questions ?? []).filter((q) => {
      const rel = Array.isArray(q.passages) ? q.passages[0] : q.passages
      return isChallengeQuestion({ ...q, passage_content: rel?.content ?? null })
    })
    let fresh = eligible.filter((q) => !usedIds.has(q.id))
    // Rapid Fire is an endless drill, not an exam: when everything has been
    // seen, loop the bank (spaced repetition) instead of dead-ending.
    // Every other mode keeps strict freshness.
    const repeating = mode === 'rapid' && fresh.length === 0 && eligible.length > 0
    if (repeating) fresh = eligible
    if (fresh.length === 0) {
      return Response.json({
        error: 'No reviewed challenge questions remain for this selection. Try another topic while we expand this bank.',
      }, { status: 404 })
    }

    const prepared = fresh.map((q) => {
      const rel = Array.isArray(q.passages) ? q.passages[0] : q.passages
      return { ...q, passage_content: rel?.content ?? null }
    })
    const ranked = pickHardest(prepared, Math.max(actualCount, prepared.length), 1)
    let selected = ranked.slice(0, actualCount)
    if (broadRapid) {
      const buckets = new Map<string, typeof ranked>()
      for (const item of ranked) {
        const key = `${item.test_type}:${item.section_name}`
        buckets.set(key, [...(buckets.get(key) ?? []), item])
      }
      selected = []
      const keys = [...buckets.keys()].sort(() => Math.random() - 0.5)
      while (selected.length < actualCount && keys.some((key) => (buckets.get(key)?.length ?? 0) > 0)) {
        for (const key of keys) {
          const next = buckets.get(key)?.shift()
          if (next) selected.push(next)
          if (selected.length >= actualCount) break
        }
      }
    }
    const shuffled = selected
      .map((q) => {
        const passageRel = q.passages as { title?: string | null; content?: string | null } | { title?: string | null; content?: string | null }[] | null
        const passage = Array.isArray(passageRel) ? passageRel[0] : passageRel
        return {
          ...q,
          question_text: cleanQuestionText(q.question_text),
          passages: undefined,
          passage_title: passage?.title ?? null,
          passage_content: passage?.content ?? null,
          difficulty: asDifficulty(q.difficulty),
          choices: questionChoices(q),
        }
      })

    if (mode === 'chat') return Response.json({ questions: shuffled, sessionId: null })

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
      questionsRemaining: Math.max(0, entitlement.limit - shuffled.length),
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
