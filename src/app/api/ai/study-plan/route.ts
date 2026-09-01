import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callAI } from '@/lib/ai'
import { z } from 'zod'

const bodySchema = z.object({
  testType: z.string(),
  targetScore: z.number(),
  currentScore: z.number().nullable().optional(),
  daysRemaining: z.number(),
  weakTopics: z.array(z.string()).optional(),
  dailyMinutes: z.number(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as unknown
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { testType, targetScore, currentScore, daysRemaining, weakTopics, dailyMinutes } = parsed.data

    const explanation = await callAI({
      model: 'flash',
      userId: user.id,
      requestType: 'study_plan',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SAT/ACT study coach. Write motivating, personalized study plan explanations in 2-3 sentences.',
        },
        {
          role: 'user',
          content: `Create a brief, motivating explanation for this study plan:
Test: ${testType}
Target: ${targetScore}
Current: ${currentScore ?? 'Unknown'}
Days remaining: ${daysRemaining}
Daily study time: ${dailyMinutes} minutes
Weak areas: ${weakTopics?.join(', ') || 'None identified yet'}

Be encouraging and specific about why this plan will help them reach their goal.`,
        },
      ],
    })

    return Response.json({ explanation })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed to generate explanation' }, { status: 500 })
  }
}
