import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { asDifficulty, questionChoices } from '@/lib/schema'
import { ensureTopicQuestionCount } from '@/lib/questions/expand-topic'
import { cleanQuestionText } from '@/lib/questions/clean-text'
import { getLevel, matchTopicId, type StudyLevel } from '@/lib/study/levels'
import { belowProductFloor, isChallengeQuestion, pickHardest } from '@/lib/practice/complexity'
import { refreshProblems } from '@/lib/study/refresh'
import { MIN_TOPIC_QUESTIONS } from '@/lib/constants'
import { z } from 'zod'

const bodySchema = z.object({
  track: z.enum(['math', 'english']),
  level: z.number().int().min(0),
  count: z.number().int().min(1).max(40).optional().default(20),
  round: z.number().int().min(1).max(50).optional().default(1),
  /** Question IDs already used in earlier rounds — never repeat them. */
  excludeIds: z.array(z.string()).max(500).optional().default([]),
  /** Revisit a stored round: fetch exactly these IDs in order. */
  roundIds: z.array(z.string()).max(40).optional().default([]),
})

const QUESTION_FIELDS = 'id, question_text, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, difficulty, difficulty_score, topic_id, topic_name, section_name, category_name, test_type, official_explanation, ai_explanation, calculator_config, calculator_allowed, desmos_useful, desmos_mode, question_type, reasoning_type, image_url, passage_id, exam_name, passages(title, content)'

const ANCHOR_STOP = new Set(['and', 'the', 'for', 'with', 'from', 'that', 'this', 'are', 'you', 'your', 'what', 'which', 'how', 'does', 'following', 'best', 'each', 'into', 'when', 'then', 'than', 'such', 'only', 'just', 'over', 'more', 'most', 'U003f'])

function anchorTokens(level: StudyLevel): Set<string> {
  const authored = refreshProblems(level).flatMap((p) => [p.prompt, ...p.choices.map((c) => c.text)])
  const raw = [level.title, level.category, ...level.topicMatch, ...level.teach, ...level.tricks, ...authored].join(' ')
  const toks = (raw.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3 && !ANCHOR_STOP.has(w))
  return new Set(toks)
}

function anchorHits(anchors: Set<string>, text: string): number {
  const lower = text.toLowerCase()
  let hits = 0
  for (const w of anchors) if (lower.includes(w)) hits += 1
  return hits
}

/**
 * Refresh rounds: 20 questions per round, same topic, never repeated across
 * rounds. Each round = topically-anchored bank questions (same skill family
 * as the lesson's own examples — classification stays classification. No practice
 * session is created and no daily usage is consumed.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })
    const { track, level: levelIndex, count, round, excludeIds, roundIds } = parsed.data

    const level = getLevel(track, levelIndex)
    if (!level) return Response.json({ error: 'Unknown level' }, { status: 404 })

    // Revisit a previously saved round, including legacy generated items.
    if (roundIds.length) {
      const { data: rows } = await supabase
        .from('questions')
        .select(QUESTION_FIELDS)
        .in('id', roundIds)
      const byId = new Map((rows ?? []).map((r) => [r.id, r]))
      const ordered = roundIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r))
      return Response.json({ questions: ordered.map(toClient), round, stored: true })
    }

    const { data: topicRows } = await supabase.from('topics').select('id, name, category_id').limit(500)
    const topicId = matchTopicId(level, topicRows ?? [])
    const authored = refreshProblems(level).map((problem, index) => ({
      id: `lesson-${level.track}-${level.index}-${index}`,
      question_text: problem.prompt,
      choices: problem.choices,
      correct_answer: problem.answer,
      difficulty: problem.difficulty ?? 'hard',
      topic_id: topicId,
      topic_name: level.title,
      section_name: level.category,
      test_type: level.sat && !level.act ? 'SAT' : 'ACT',
      question_type: 'multiple_choice',
      passage_title: null,
      passage_content: null,
      official_explanation: problem.explain,
    }))
    if (!topicId) {
      return Response.json({ questions: authored.slice(0, count), round, stored: false })
    }

    await ensureTopicQuestionCount(supabase, topicId, MIN_TOPIC_QUESTIONS)

    const testType = level.sat && !level.act ? 'SAT' : !level.sat && level.act ? 'ACT' : null
    let query = supabase
      .from('questions')
      .select(QUESTION_FIELDS)
      .eq('approved', true)
      .eq('active', true)
      .eq('topic_id', topicId)
    if (testType) query = query.eq('test_type', testType)
    const { data: questions, error } = await query
      .order('difficulty_score', { ascending: false, nullsFirst: false })
      .limit(400)
    if (error) return Response.json({ error: 'Failed to fetch questions' }, { status: 500 })

    const anchors = anchorTokens(level)
    const excluded = new Set(excludeIds)
    const pool = (questions ?? []).filter((q) => !excluded.has(q.id) && !belowProductFloor(q.question_text ?? ''))
    const textOf = (q: (typeof pool)[number]) => `${q.question_text ?? ''} ${q.choice_a ?? ''} ${q.choice_b ?? ''} ${q.choice_c ?? ''} ${q.choice_d ?? ''}`
    const challenge = pool.filter((q) => {
      const rel = Array.isArray(q.passages) ? q.passages[0] : q.passages
      return isChallengeQuestion({ ...q, passage_content: rel?.content ?? null })
    })
    const aligned = challenge.filter((q) => anchorHits(anchors, textOf(q)) >= 1)
    const ranked = pickHardest(aligned.length ? aligned : challenge, 400, 1)
    const harder = ranked.length
      ? ranked
      : [...pool].sort((a, b) => Number(b.difficulty_score ?? 0) - Number(a.difficulty_score ?? 0))
    const picked = harder.slice(0, count)
    const questionsOut = picked.length
      ? picked.map((q) => toClient(q as { [key: string]: unknown }))
      : authored.slice(0, count)
    return Response.json({
      questions: questionsOut,
      round,
      stored: false,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function toClient(q: Record<string, unknown>) {
  const passageRel = q.passages as { title?: string | null; content?: string | null } | { title?: string | null; content?: string | null }[] | null | undefined
  const passage = Array.isArray(passageRel) ? passageRel[0] : passageRel
  const generatedChoices = q.choices
  const choices = Array.isArray(generatedChoices) && generatedChoices.length
    ? generatedChoices as Array<{ key: string; text: string }>
    : questionChoices(q as { id?: string | null; choice_a?: string | null; choice_b?: string | null; choice_c?: string | null; choice_d?: string | null; choice_e?: string | null })
  return {
    ...q,
    question_text: cleanQuestionText(String(q.question_text ?? '')),
    passages: undefined,
    passage_title: passage?.title ?? (q.passage_title as string | null) ?? null,
    passage_content: passage?.content ?? (q.passage_content as string | null) ?? null,
    difficulty: asDifficulty(q.difficulty as string | null | undefined),
    choices,
  }
}
