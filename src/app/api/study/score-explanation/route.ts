import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { callAI } from '@/lib/ai'
import { getLevel } from '@/lib/study/levels'
import { buildGuidedLesson, EXPLAIN_PASS_SCORE } from '@/lib/study/lesson-flow'
import { gradeExplanationLocally } from '@/lib/study/copilot'

const bodySchema = z.object({
  track: z.enum(['math', 'english']),
  level: z.number().int().min(0),
  answer: z.string().min(8).max(2000),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await denyIfUnpaid(user.id)
  if (blocked) return blocked

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Write a fuller explanation first.' }, { status: 400 })

  const level = getLevel(parsed.data.track, parsed.data.level)
  if (!level) return Response.json({ error: 'Unknown level' }, { status: 404 })
  const lesson = buildGuidedLesson(level)
  const local = gradeExplanationLocally(parsed.data.answer, lesson)

  try {
    const raw = await callAI({
      model: 'flash',
      userId: user.id,
      requestType: 'study_score_explanation',
      speed: 'interactive',
      maxTokens: 400,
      json: true,
      messages: [
        {
          role: 'system',
          content:
            'Score a student explanation of an SAT/ACT topic. Reply JSON only: {"score":0-100,"feedback":"one short sentence","missed":["what they forgot"],"liveExample":"one concrete example with why"}. Be fair. Easy words. If they capture the core idea in their own words, score 85+. Never paste the official definition word-for-word as feedback.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            topic: lesson.title,
            ideal: lesson.whatItIs,
            breakdown: lesson.breakdown,
            studentAnswer: parsed.data.answer,
            goodExample: lesson.examples.yes[0],
          }),
        },
      ],
    })
    const ai = JSON.parse(raw) as {
      score?: number
      feedback?: string
      missed?: string[]
      liveExample?: string
    }
    const score = Math.max(0, Math.min(100, Math.round(Number(ai.score) || local.score)))
    return Response.json({
      score,
      passed: score >= EXPLAIN_PASS_SCORE,
      feedback: ai.feedback?.trim() || local.feedback,
      missed: Array.isArray(ai.missed) && ai.missed.length ? ai.missed.slice(0, 3) : local.missed,
      liveExample: ai.liveExample?.trim() || local.liveExample,
    })
  } catch {
    return Response.json(local)
  }
}
