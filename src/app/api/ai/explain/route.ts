import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAskAI, recordAIChat } from '@/lib/entitlements'
import { PAYWALL_MESSAGE } from '@/lib/access'
import { generateExplanation } from '@/lib/ai'
import { parseAgentActions } from '@/lib/desmos/actions'
import { z } from 'zod'
import { dbId } from '@/lib/schema'

const bodySchema = z.object({
  questionId: dbId(),
  questionText: z.string().min(1),
  correctAnswer: z.string().min(1),
  topicName: z.string().min(1),
  sectionName: z.string().optional(),
  desmosAvailable: z.boolean().optional(),
  desmosSummary: z.string().optional(),
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
        const cached = JSON.parse(question.ai_explanation) as {
          why: string
          steps: string[]
          answer: string
          common_trap: string
          desmosActions?: unknown
        }
        return Response.json({
          explanation: {
            ...cached,
            desmosActions: parseAgentActions(cached.desmosActions),
          },
        })
      } catch {
        return Response.json({
          explanation: {
            why: question.ai_explanation,
            steps: [],
            answer: correctAnswer,
            common_trap: '',
            desmosActions: [],
          },
        })
      }
    }

    const entitlement = await canAskAI(user.id)
    if (!entitlement.allowed) {
      return Response.json({
        error: entitlement.paywall ? PAYWALL_MESSAGE : 'Daily AI chat limit reached.',
        limitReached: true,
        paywall: entitlement.paywall ?? false,
      }, { status: 403 })
    }

    const generated = await generateExplanation(questionText.slice(0, 400), correctAnswer, topicName, user.id)
    const explanation = {
      ...generated,
      desmosActions: parseAgentActions([]),
    }

    void supabase
      .from('questions')
      .update({ ai_explanation: JSON.stringify(explanation) })
      .eq('id', questionId)

    void recordAIChat(user.id)

    return Response.json({ explanation })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed to generate explanation' }, { status: 500 })
  }
}
