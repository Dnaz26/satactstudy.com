import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAskAI, recordAIChat } from '@/lib/entitlements'
import { callAI } from '@/lib/ai'
import { z } from 'zod'

const bodySchema = z.object({
  questionId: z.string().uuid(),
  questionText: z.string().min(1),
  correctAnswer: z.string().min(1),
  topicName: z.string().min(1),
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

    const { questionId, questionText, correctAnswer, topicName } = parsed.data

    const { data: question } = await supabase
      .from('questions')
      .select('ai_explanation')
      .eq('id', questionId)
      .single()

    if (question?.ai_explanation) {
      try {
        const cached = JSON.parse(question.ai_explanation) as { why: string; steps: string[]; answer: string; common_trap: string }
        return Response.json({ explanation: cached })
      } catch {
        return Response.json({
          explanation: {
            why: question.ai_explanation,
            steps: [],
            answer: correctAnswer,
            common_trap: '',
          },
        })
      }
    }

    const entitlement = await canAskAI(user.id)
    if (!entitlement.allowed) {
      return Response.json({
        error: 'Daily AI chat limit reached.',
        limitReached: true,
      }, { status: 403 })
    }

    const response = await callAI({
      model: 'flash',
      userId: user.id,
      requestType: 'explanation',
      json: true,
      messages: [
        {
          role: 'system',
          content: `You are an expert SAT/ACT tutor. Provide clear, step-by-step explanations.
Return valid JSON: { "why": "string", "steps": ["string"], "answer": "string", "common_trap": "string" }`,
        },
        {
          role: 'user',
          content: `Question: ${questionText}\nCorrect Answer: ${correctAnswer}\nTopic: ${topicName}\n\nExplain this question thoroughly.`,
        },
      ],
    })

    let explanation
    try {
      explanation = JSON.parse(response) as { why: string; steps: string[]; answer: string; common_trap: string }
    } catch {
      explanation = {
        why: 'This question tests core concepts in ' + topicName,
        steps: [response],
        answer: correctAnswer,
        common_trap: 'Read all answer choices carefully before selecting.',
      }
    }

    await supabase
      .from('questions')
      .update({ ai_explanation: JSON.stringify(explanation) })
      .eq('id', questionId)

    await recordAIChat(user.id)

    return Response.json({ explanation })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed to generate explanation' }, { status: 500 })
  }
}
