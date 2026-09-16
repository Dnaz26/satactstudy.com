import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { callAI } from '@/lib/ai'
import { getLevel, matchTopicId, type StudyProblem, type StudyRank } from '@/lib/study/levels'
import { buildGuidedLesson, PRACTICE_DIFFICULTY_LADDER } from '@/lib/study/lesson-flow'
import { asDifficulty, questionChoices } from '@/lib/schema'
import { cleanQuestionText } from '@/lib/questions/clean-text'

const bodySchema = z.object({
  track: z.enum(['math', 'english']),
  level: z.number().int().min(0),
})

function mapDbDifficulty(value: string | null | undefined): StudyRank {
  const d = asDifficulty(value)
  if (d === 'hard') return 'hard'
  if (d === 'easy') return 'easy'
  return 'medium'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await denyIfUnpaid(user.id)
  if (blocked) return blocked

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const level = getLevel(parsed.data.track, parsed.data.level)
  if (!level) return Response.json({ error: 'Unknown level' }, { status: 404 })
  const lesson = buildGuidedLesson(level)
  const pool: StudyProblem[] = [...lesson.problems]

  const { data: topics } = await supabase.from('topics').select('id, name').limit(400)
  const topicId = matchTopicId(level, topics ?? [])
  const testType = parsed.data.track === 'english' ? 'SAT' : 'SAT'

  let query = supabase
    .from('questions')
    .select('id, question_text, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, difficulty, official_explanation, ai_explanation')
    .eq('approved', true)
    .eq('active', true)
    .eq('test_type', testType)
    .limit(40)

  if (topicId) query = query.eq('topic_id', topicId)
  else if (level.topicMatch[0]) query = query.ilike('topic_name', `%${level.topicMatch[0]}%`)

  const { data: rows } = await query
  for (const row of rows ?? []) {
    const choices = questionChoices(row)
    if (choices.length < 2) continue
    pool.push({
      prompt: cleanQuestionText(row.question_text),
      choices,
      answer: row.correct_answer,
      explain: row.ai_explanation || row.official_explanation || 'Use the rule from this lesson.',
      difficulty: mapDbDifficulty(row.difficulty),
    })
  }

  try {
    const raw = await callAI({
      model: 'flash',
      userId: user.id,
      requestType: 'study_practice_pack',
      speed: 'interactive',
      maxTokens: 1100,
      json: true,
      messages: [
        {
          role: 'system',
          content:
            'Create SAT/ACT practice items for one topic. Reply JSON only: {"problems":[{"difficulty":"easy"|"medium"|"hard","prompt":"...","choices":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"answer":"A","explain":"one sentence"}]}. Make exactly 8 problems: 3 easy, 3 medium, 2 hard. Plain text math. No LaTeX.',
        },
        {
          role: 'user',
          content: `Topic: ${level.title}. Track: ${parsed.data.track}. Example: ${level.example}. Teach hint: ${level.teach[0] ?? level.title}`,
        },
      ],
    })
    const ai = JSON.parse(raw) as { problems?: StudyProblem[] }
    for (const item of ai.problems ?? []) {
      if (!item?.prompt || !item?.answer || !item?.choices?.length) continue
      pool.push({
        prompt: item.prompt,
        choices: item.choices,
        answer: item.answer,
        explain: item.explain || 'Apply the lesson rule.',
        difficulty: item.difficulty === 'hard' || item.difficulty === 'medium' ? item.difficulty : 'easy',
      })
    }
  } catch {
    // Local + DB pool is enough.
  }

  return Response.json({
    title: lesson.title,
    ladder: PRACTICE_DIFFICULTY_LADDER,
    problems: pool,
  })
}
