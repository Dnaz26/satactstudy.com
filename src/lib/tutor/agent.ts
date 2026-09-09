import { callAI, callAIStream, type Message } from '@/lib/ai'
import { buildEnrichedTutorContext, recentConversation } from './context'
import { bumpMethodScore, getTutorPreferences, recordMisconception, recordTutorInteraction } from './memory'
import { finishNovaTrace, novaUsageRequestType, startNovaTrace } from './observability'
import { parseTutorOutput, studentSafeError } from './output'
import { buildTutorSystemPrompt } from './prompt'
import { routeNovaModel } from './router'
import { injectionGuardrailNote, sanitizeStudentText, scopeTutorRequest, suspicionScore } from './security'
import { DEFAULT_TUTOR_PREFERENCES, type TutorOutput, type TutorRequestContext } from './types'

async function tutorMessages(
  userId: string,
  messages: Message[],
  request: TutorRequestContext,
  stream: boolean,
): Promise<{
  packed: Message[]
  route: ReturnType<typeof routeNovaModel>
  toolsUsed: string[]
  trigger: TutorRequestContext['trigger']
}> {
  const scoped = scopeTutorRequest(request)
  const preferences = await getTutorPreferences(userId).catch(() => ({
    ...DEFAULT_TUTOR_PREFERENCES,
    user_id: userId,
  }))
  const ctx = await buildEnrichedTutorContext(userId, scoped, preferences)
  const hasImage = Boolean(scoped.imageDataUrl)
  const conversation = recentConversation(messages).map((m) => {
    if (m.role === 'user' && typeof m.content === 'string') {
      return { ...m, content: sanitizeStudentText(m.content) }
    }
    return m
  })

  const lastUser = conversation.filter((m) => m.role === 'user').at(-1)
  const lastUserText = typeof lastUser?.content === 'string' ? lastUser.content : ''
  const suspicion = suspicionScore([lastUserText, scoped.questionText ?? ''].join('\n'))
  const securityNote = injectionGuardrailNote(suspicion)

  const route = routeNovaModel({
    trigger: ctx.trigger,
    hasImage,
    submitted: scoped.submitted,
    isCorrect: scoped.isCorrect,
    questionTextLength: scoped.questionText?.length,
    masteryOverall: ctx.masteryOverall,
    stream,
  })

  const imageMessage: Message | null = hasImage && scoped.imageDataUrl
    ? {
        role: 'user',
        content: [
          { type: 'text', text: lastUserText || 'Look at this image from my work.' },
          { type: 'image_url', image_url: { url: scoped.imageDataUrl } },
        ],
      }
    : null

  const packed: Message[] = [
    {
      role: 'system',
      content: buildTutorSystemPrompt({
        preferences: ctx.preferences,
        trigger: ctx.trigger,
        desmosAvailable: Boolean(scoped.desmosAvailable),
        submitted: Boolean(scoped.submitted),
        isCorrect: scoped.isCorrect,
        securityNote,
        studentMemoryLine: ctx.studentMemoryLine,
      }),
    },
    {
      role: 'user',
      content: ctx.compactPrompt,
    },
    ...conversation,
    ...(imageMessage ? [imageMessage] : []),
  ]

  return {
    packed,
    route,
    toolsUsed: ctx.toolsUsed,
    trigger: ctx.trigger,
  }
}

function persistInBackground(params: {
  userId: string
  request: TutorRequestContext
  messages: Message[]
  raw: string
  started: number
}) {
  const output = parseTutorOutput(params.raw)
  const hintsGiven = params.messages.filter((m) => m.role === 'assistant').length
  void recordTutorInteraction({
    userId: params.userId,
    questionId: params.request.questionId,
    topicId: params.request.topicId,
    trigger: params.request.trigger ?? 'chat',
    output,
    hintsGiven,
    latencyMs: Date.now() - params.started,
  }).catch(() => undefined)
  if (output.misconception) {
    void recordMisconception({
      userId: params.userId,
      topicId: params.request.topicId,
      category: output.misconception,
    }).catch(() => undefined)
  }
  if (output.confidence >= 0.7) {
    void bumpMethodScore(params.userId, output.strategy).catch(() => undefined)
  }
}

export async function runTutorAgent(params: {
  userId: string
  messages: Message[]
  request: TutorRequestContext
}): Promise<TutorOutput> {
  const started = Date.now()
  try {
    const { packed, route, toolsUsed, trigger } = await tutorMessages(
      params.userId,
      params.messages,
      params.request,
      false,
    )
    const trace = startNovaTrace({
      studentId: params.userId,
      trigger: trigger ?? 'chat',
      route,
      toolsUsed,
    })
    const raw = await callAI({
      model: route.model,
      userId: params.userId,
      requestType: novaUsageRequestType(trigger ?? 'chat', route),
      speed: route.speed,
      maxTokens: route.maxTokens,
      messages: packed,
    })
    finishNovaTrace(trace, 'ok')
    persistInBackground({ ...params, raw, started })
    return parseTutorOutput(raw)
  } catch {
    return studentSafeError()
  }
}

export async function* runTutorAgentStream(params: {
  userId: string
  messages: Message[]
  request: TutorRequestContext
}): AsyncGenerator<string> {
  const started = Date.now()
  let raw = ''
  try {
    const { packed, route, toolsUsed, trigger } = await tutorMessages(
      params.userId,
      params.messages,
      params.request,
      true,
    )
    const trace = startNovaTrace({
      studentId: params.userId,
      trigger: trigger ?? 'chat',
      route,
      toolsUsed,
    })
    for await (const delta of callAIStream({
      model: route.model,
      userId: params.userId,
      requestType: novaUsageRequestType(trigger ?? 'chat', route),
      speed: route.speed,
      maxTokens: route.maxTokens,
      messages: packed,
    })) {
      raw += delta
      yield delta
    }
    finishNovaTrace(trace, 'ok')
    persistInBackground({ ...params, raw, started })
  } catch {
    const fallback = studentSafeError().message
    if (!raw) yield fallback
  }
}
