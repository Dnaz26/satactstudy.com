import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { callAI } from '@/lib/ai'
import { getLevel, tagDifficulties, type StudyProblem } from '@/lib/study/levels'
import { asSteps } from '@/lib/study/highlight'
import { z } from 'zod'

const bodySchema = z.object({
  track: z.enum(['math', 'english']),
  level: z.number().int().min(0),
  extra: z.boolean().optional(),
})

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

  try {
    const raw = await callAI({
      model: 'flash',
      userId: user.id,
      requestType: 'study_lesson',
      speed: 'interactive',
      maxTokens: 700,
      json: true,
      messages: [
        {
          role: 'system',
          content: 'You teach SAT/ACT topics to a beginner. Reply JSON only: {"example":"one short example","teach":[{"text":"one short sentence","highlight":"exact snippet from the example"}],"tricks":[{"text":"one hack","highlight":"snippet"}],"problems":[{"difficulty":"easy","prompt":"...","choices":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"answer":"A","explain":"one sentence"}]}. Give 3 to 5 teach bullets and exactly 3 problems. Problem 1 difficulty easy, problem 2 medium, problem 3 hard. All three must use ONLY the same concept as the example. Do not add a new idea, formula, or rule. Harder only means more steps or bigger numbers of the same move. highlight must be copied from the example. Easy words. No LaTeX.',
        },
        {
          role: 'user',
          content: parsed.data.extra
            ? `More practice for ${level.title}. Same concept only. Example they already saw: ${level.example}. Give 3 new problems: easy, then medium, then hard. More steps is fine. No new concept.`
            : `Teach ${level.title}. Starting example: ${level.example}. Then 3 problems on that exact idea: easy, medium, hard.`,
        },
      ],
    })
    const parsedAi = JSON.parse(raw) as {
      example?: string
      teach?: unknown
      tricks?: unknown
      problems?: StudyProblem[]
    }
    const problems = (parsedAi.problems ?? []).filter((item) => item?.prompt && item?.answer && item?.choices?.length >= 2)
    return Response.json({
      title: level.title,
      example: parsedAi.example || level.example,
      teach: asSteps(parsedAi.teach, level.teach),
      tricks: asSteps(parsedAi.tricks, level.tricks),
      problems: tagDifficulties(problems.length >= 3 ? problems.slice(0, 3) : level.problems),
    })
  } catch {
    return Response.json({
      title: level.title,
      example: level.example,
      teach: asSteps(level.teach, level.teach),
      tricks: asSteps(level.tricks, level.tricks),
      problems: tagDifficulties(level.problems),
    })
  }
}
