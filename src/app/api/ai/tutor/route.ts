import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { canAskAI, recordAIChat } from '@/lib/entitlements'
import { PAYWALL_MESSAGE } from '@/lib/access'
import { runTutorAgent, runTutorAgentStream } from '@/lib/tutor/agent'
import { TUTOR_TRIGGERS } from '@/lib/tutor/types'
import { dbId } from '@/lib/schema'

export const dynamic = 'force-dynamic'

const contextSchema = z.object({
  questionId: dbId().optional(),
  questionText: z.string().optional(),
  topicId: dbId().optional().nullable(),
  topicName: z.string().optional(),
  sectionName: z.string().optional(),
  selectedAnswer: z.string().optional(),
  correctAnswer: z.string().optional(),
  choices: z.array(z.object({ key: z.string(), text: z.string() })).max(6).optional(),
  officialExplanation: z.string().max(600).optional().nullable(),
  submitted: z.boolean().optional(),
  isCorrect: z.boolean().optional(),
  desmosAvailable: z.boolean().optional(),
  desmosSummary: z.string().optional(),
})

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).max(50).default([]),
  trigger: z.enum(TUTOR_TRIGGERS).optional(),
  stream: z.boolean().optional(),
  imageDataUrl: z.string().max(2_500_000).optional(),
  context: contextSchema.optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

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

    const imageDataUrl = parsed.data.imageDataUrl?.startsWith('data:image/')
      ? parsed.data.imageDataUrl
      : undefined

    const agentParams = {
      userId: user.id,
      messages: parsed.data.messages,
      request: {
        ...parsed.data.context,
        trigger: parsed.data.trigger,
        imageDataUrl,
      },
    }

    void recordAIChat(user.id)

    if (parsed.data.stream === false) {
      const output = await runTutorAgent(agentParams)
      return Response.json({
        message: output.message,
        strategy: output.strategy,
        misconception: output.misconception,
        understanding_check: output.understanding_check,
        desmosActions: output.desmosActions,
        next_action: output.next_action,
      })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of runTutorAgentStream(agentParams)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: "I hit a snag just now. You can keep working the question, and I'll try again whenever you're ready." })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch {
    return Response.json({
      message: "I hit a snag just now. You can keep working the question, and I'll try again whenever you're ready.",
    }, { status: 200 })
  }
}
