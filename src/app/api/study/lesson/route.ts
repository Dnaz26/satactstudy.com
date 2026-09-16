import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { callAI } from '@/lib/ai'
import { getLevel, tagDifficulties, type StudyProblem } from '@/lib/study/levels'
import { buildGuidedLesson } from '@/lib/study/lesson-flow'
import type { LessonExampleSet } from '@/lib/study/examples'
import { z } from 'zod'

const bodySchema = z.object({
  track: z.enum(['math', 'english']),
  level: z.number().int().min(0),
  extra: z.boolean().optional(),
})

type AiLessonPayload = Partial<{
  whatItIs: string
  breakdown: string
  translateExample: string
  examples: Partial<LessonExampleSet>
  problems: StudyProblem[]
}>

function sanitizeExamples(raw: unknown): Partial<LessonExampleSet> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const data = raw as Record<string, unknown>
  const mapList = (value: unknown) => {
    if (!Array.isArray(value)) return []
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Record<string, unknown>
        const label = typeof row.label === 'string' ? row.label.trim() : ''
        const why = typeof row.why === 'string' ? row.why.trim() : ''
        if (!label || !why || /\?$/.test(label)) return null
        return { label, why }
      })
      .filter((item): item is { label: string; why: string } => Boolean(item))
  }
  const yes = mapList(data.yes)
  const no = mapList(data.no)
  if (yes.length < 2 && no.length < 2) return undefined
  return {
    yesTitle: typeof data.yesTitle === 'string' ? data.yesTitle : undefined,
    noTitle: typeof data.noTitle === 'string' ? data.noTitle : undefined,
    yes,
    no,
  }
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

  const fallback = buildGuidedLesson(level)
  const topicHints = [
    `Title: ${level.title}`,
    `Category: ${level.category}`,
    `Teach: ${level.teach.join(' | ')}`,
    `Tricks: ${level.tricks.join(' | ')}`,
    `Seed problems: ${level.problems.map((p) => {
      const correct = p.choices.find((c) => c.key === p.answer)?.text ?? p.answer
      return `${p.prompt} → correct: ${correct}`
    }).join(' || ')}`,
  ].join('\n')

  try {
    const raw = await callAI({
      model: 'flash',
      userId: user.id,
      requestType: 'study_lesson',
      speed: 'interactive',
      maxTokens: 1100,
      json: true,
      messages: [
        {
          role: 'system',
          content:
            'You teach SAT/ACT topics for a copilot lesson. Reply JSON only with this shape: '
            + '{"whatItIs":"1-2 short sentences defining the topic",'
            + '"breakdown":"one short breakdown",'
            + '"translateExample":"one short live correct example of the topic (NOT a question)",'
            + '"examples":{"yesTitle":"short","noTitle":"short",'
            + '"yes":[{"label":"short concrete correct example","why":"one sentence why correct"}],'
            + '"no":[{"label":"short concrete incorrect example","why":"one sentence why incorrect"}]},'
            + '"problems":[{"difficulty":"easy"|"medium"|"hard","prompt":"...","choices":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"answer":"A","explain":"one sentence"}]}'
            + ' Rules: Create examples from the topic the student is learning. Do NOT pull from a database. '
            + 'examples.yes must have 4-5 CORRECT portrayals of the topic (numbers, equations, or short sentences). '
            + 'examples.no must have 4-5 INCORRECT portrayals / traps. '
            + 'labels must be the example itself — never a quiz prompt like "Which is…?". '
            + 'Exactly 5 problems: easy, easy, medium, medium, hard. Easy words. No LaTeX.',
        },
        {
          role: 'user',
          content: parsed.data.extra
            ? `Five more practice questions for ${level.title}.\n${topicHints}`
            : `Create a full copilot lesson for this topic. Invent fresh correct and incorrect board examples from the topic itself.\n${topicHints}`,
        },
      ],
    })
    const parsedAi = JSON.parse(raw) as AiLessonPayload
    const problems = (parsedAi.problems ?? []).filter(
      (item) => item?.prompt && item?.answer && item?.choices?.length >= 2,
    )
    const examples = sanitizeExamples(parsedAi.examples)
    const guided = buildGuidedLesson(level, {
      whatItIs: parsedAi.whatItIs,
      breakdown: parsedAi.breakdown,
      translateExample: parsedAi.translateExample,
      examples,
      problems: problems.length >= 3 ? tagDifficulties(problems, 5) : fallback.problems,
    })
    return Response.json(guided)
  } catch {
    return Response.json(fallback)
  }
}
