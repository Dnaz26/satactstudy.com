import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAskAI, recordAIChat } from '@/lib/entitlements'
import { callAI, Message } from '@/lib/ai'
import { z } from 'zod'

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).min(1).max(50),
  context: z.object({
    questionText: z.string().optional(),
    topicName: z.string().optional(),
    mastery: z.number().optional(),
  }).optional(),
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

    const { messages, context } = parsed.data

    const entitlement = await canAskAI(user.id)
    if (!entitlement.allowed) {
      return Response.json({
        error: 'Daily AI chat limit reached. Upgrade your plan for more AI assistance.',
        limitReached: true,
      }, { status: 403 })
    }

    const systemContent = [
      'You are Nova, an expert SAT/ACT AI tutor. You are encouraging, clear, and pedagogically effective.',
      'Your goal is to help students deeply understand concepts, not just get the right answer.',
      'Keep responses concise and actionable (2-4 paragraphs max).',
      context?.topicName ? `Current topic: ${context.topicName}` : '',
      context?.questionText ? `Current question: ${context.questionText}` : '',
      context?.mastery != null ? `Student mastery on this topic: ${Math.round(context.mastery)}%` : '',
    ].filter(Boolean).join('\n')

    const fullMessages: Message[] = [
      { role: 'system', content: systemContent },
      ...messages.filter((m) => m.role !== 'system'),
    ]

    const response = await callAI({
      model: 'pro',
      userId: user.id,
      requestType: 'tutor_chat',
      messages: fullMessages,
    })

    await recordAIChat(user.id)

    return Response.json({ message: response })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed to get AI response' }, { status: 500 })
  }
}
