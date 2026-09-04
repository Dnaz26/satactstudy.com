import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAskAI, recordAIChat } from '@/lib/entitlements'
import { PAYWALL_MESSAGE } from '@/lib/access'
import { runTutorAgent } from '@/lib/tutor/agent'
import { z } from 'zod'
import { dbId } from '@/lib/schema'

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).min(1).max(50),
  trigger: z.enum(['chat', 'hint', 'help', 'explain', 'wrong_answer', 'correct_answer']).optional(),
  context: z.object({
    questionId: dbId().optional(),
    questionText: z.string().optional(),
    topicId: dbId().optional().nullable(),
    topicName: z.string().optional(),
    mastery: z.number().optional(),
    sectionName: z.string().optional(),
    selectedAnswer: z.string().optional(),
    correctAnswer: z.string().optional(),
    submitted: z.boolean().optional(),
    isCorrect: z.boolean().optional(),
    questionType: z.string().optional(),
    desmosAvailable: z.boolean().optional(),
    desmosSummary: z.string().optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const entitlement = await canAskAI(user.id)
    if (!entitlement.allowed) {
      return Response.json({
        error: entitlement.paywall ? PAYWALL_MESSAGE : 'Daily AI chat limit reached. Upgrade your plan for more AI assistance.',
        limitReached: true,
        paywall: entitlement.paywall ?? false,
      }, { status: 403 })
    }

    const output = await runTutorAgent({
      userId: user.id,
      messages: parsed.data.messages,
      request: {
        ...parsed.data.context,
        trigger: parsed.data.trigger ?? 'chat',
      },
    })

    void recordAIChat(user.id)

    return Response.json({
      message: output.message,
      strategy: output.strategy,
      desmosActions: output.desmosActions,
    })
  } catch {
    return Response.json({
      message: "I hit a snag just now. You can keep working the question, and I'll try again whenever you're ready.",
    })
  }
}
