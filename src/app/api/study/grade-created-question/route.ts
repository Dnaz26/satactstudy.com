import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { callAI } from '@/lib/ai'
import { getLevel, matchTopicId } from '@/lib/study/levels'
import { buildGuidedLesson, CREATE_PASS_SCORE, CREATE_SAVE_SCORE } from '@/lib/study/lesson-flow'
import { gradeCreatedQuestionLocally } from '@/lib/study/copilot'

const bodySchema = z.object({
  track: z.enum(['math', 'english']),
  level: z.number().int().min(0),
  prompt: z.string().min(12).max(1200),
  choices: z.array(z.object({ key: z.string(), text: z.string().min(1) })).min(4).max(5),
  answer: z.string().min(1),
  explanation: z.string().max(800).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await denyIfUnpaid(user.id)
  if (blocked) return blocked

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Fill in the question, four choices, and the correct answer.' }, { status: 400 })

  const level = getLevel(parsed.data.track, parsed.data.level)
  if (!level) return Response.json({ error: 'Unknown level' }, { status: 404 })
  const lesson = buildGuidedLesson(level)

  const local = gradeCreatedQuestionLocally({
    lesson,
    prompt: parsed.data.prompt,
    choices: parsed.data.choices,
    answer: parsed.data.answer,
    explanation: parsed.data.explanation,
  })

  let score = local.score
  let feedback = local.feedback
  let strengths = local.strengths
  let gaps = local.gaps

  try {
    const raw = await callAI({
      model: 'flash',
      userId: user.id,
      requestType: 'study_grade_created_question',
      speed: 'interactive',
      maxTokens: 450,
      json: true,
      messages: [
        {
          role: 'system',
          content:
            'Grade a student-written SAT/ACT practice question. Reply JSON only: {"score":0-100,"feedback":"short","strengths":["..."],"gaps":["..."]}. Score for realism, clarity, on-topic fit, one correct answer, and plausible wrong choices. 95+ means bank-ready.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            topic: lesson.title,
            idealDefinition: lesson.whatItIs,
            studentItem: {
              prompt: parsed.data.prompt,
              choices: parsed.data.choices,
              answer: parsed.data.answer,
              explanation: parsed.data.explanation ?? '',
            },
          }),
        },
      ],
    })
    const ai = JSON.parse(raw) as {
      score?: number
      feedback?: string
      strengths?: string[]
      gaps?: string[]
    }
    score = Math.max(0, Math.min(100, Math.round(Number(ai.score) || local.score)))
    feedback = ai.feedback?.trim() || local.feedback
    strengths = Array.isArray(ai.strengths) && ai.strengths.length ? ai.strengths.slice(0, 4) : local.strengths
    gaps = Array.isArray(ai.gaps) && ai.gaps.length ? ai.gaps.slice(0, 4) : local.gaps
  } catch {
    // keep local
  }

  const passed = score >= CREATE_PASS_SCORE
  const saveWorthy = score >= CREATE_SAVE_SCORE
  let saved = false
  let questionId: string | null = null

  const byKey = Object.fromEntries(parsed.data.choices.map((c) => [c.key.toUpperCase(), c.text]))

  const { data: inserted, error: insertError } = await supabase
    .from('study_student_questions')
    .insert({
      user_id: user.id,
      track: parsed.data.track,
      level_index: parsed.data.level,
      topic_title: lesson.title,
      question_text: parsed.data.prompt,
      choice_a: byKey.A ?? null,
      choice_b: byKey.B ?? null,
      choice_c: byKey.C ?? null,
      choice_d: byKey.D ?? null,
      correct_answer: parsed.data.answer,
      explanation: parsed.data.explanation ?? null,
      score,
      promoted_to_questions: false,
    })
    .select('id')
    .single()

  if (!insertError && inserted?.id && saveWorthy) {
    const { data: topics } = await supabase.from('topics').select('id, name').limit(400)
    const topicId = matchTopicId(level, topics ?? [])
    const { data: promoted, error: promoteError } = await supabase
      .from('questions')
      .insert({
        test_type: 'SAT',
        section_name: parsed.data.track === 'math' ? 'Math' : 'Reading and Writing',
        category_name: level.category,
        topic_name: lesson.title,
        topic_id: topicId,
        difficulty: 'medium',
        question_text: parsed.data.prompt,
        choice_a: byKey.A ?? null,
        choice_b: byKey.B ?? null,
        choice_c: byKey.C ?? null,
        choice_d: byKey.D ?? null,
        correct_answer: parsed.data.answer,
        official_explanation: parsed.data.explanation ?? feedback,
        ai_explanation: parsed.data.explanation ?? feedback,
        source: 'student_copilot',
        source_type: 'student_generated',
        source_rights_status: 'original',
        approved: true,
        active: true,
        question_type: 'mcq',
        review_status: 'student_promoted',
      })
      .select('id')
      .single()

    if (!promoteError && promoted?.id) {
      questionId = promoted.id
      saved = true
      await supabase
        .from('study_student_questions')
        .update({ promoted_to_questions: true, question_id: promoted.id })
        .eq('id', inserted.id)
        .eq('user_id', user.id)
    }
  }

  return Response.json({
    score,
    passed,
    saveWorthy,
    saved,
    questionId,
    feedback,
    strengths,
    gaps,
  })
}
