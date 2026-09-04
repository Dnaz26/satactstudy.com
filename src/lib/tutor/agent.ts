import { callAI, callAIStream, type Message } from '@/lib/ai'
import { buildFastTutorContext, recentConversation } from './context'
import { bumpMethodScore, getTutorPreferences, recordMisconception, recordTutorInteraction } from './memory'
import { parseTutorOutput, studentSafeError } from './output'
import { buildTutorSystemPrompt } from './prompt'
import { DEFAULT_TUTOR_PREFERENCES, type TutorOutput, type TutorRequestContext } from './types'

async function tutorMessages(userId: string, messages: Message[], request: TutorRequestContext): Promise<Message[]> {
  const preferences = await getTutorPreferences(userId).catch(() => ({ ...DEFAULT_TUTOR_PREFERENCES, user_id: userId }))
  const ctx = buildFastTutorContext(userId, request, preferences)
  const hasImage = Boolean(request.imageDataUrl)
  const conversation = recentConversation(messages)
  const lastUser = conversation.filter((m) => m.role === 'user').at(-1)
  const imageMessage: Message | null = hasImage && request.imageDataUrl
    ? {
        role: 'user',
        content: [
          { type: 'text', text: typeof lastUser?.content === 'string' ? lastUser.content : 'Look at this image from my work.' },
          { type: 'image_url', image_url: { url: request.imageDataUrl } },
        ],
      }
    : null

  return [
    {
      role: 'system',
      content: buildTutorSystemPrompt({
        preferences: ctx.preferences,
        trigger: ctx.trigger,
        desmosAvailable: Boolean(request.desmosAvailable),
        submitted: Boolean(request.submitted),
        isCorrect: request.isCorrect,
      }),
    },
    {
      role: 'user',
      content: ctx.compactPrompt,
    },
    ...conversation,
    ...(imageMessage ? [imageMessage] : []),
  ]
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
    const raw = await callAI({
      model: params.request.imageDataUrl ? 'vision' : 'flash',
      userId: params.userId,
      requestType: `tutor_${params.request.trigger ?? 'chat'}`,
      speed: 'interactive',
      maxTokens: 420,
      messages: await tutorMessages(params.userId, params.messages, params.request),
    })
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
    const packed = await tutorMessages(params.userId, params.messages, params.request)
    for await (const delta of callAIStream({
      model: params.request.imageDataUrl ? 'vision' : 'flash',
      userId: params.userId,
      requestType: `tutor_${params.request.trigger ?? 'chat'}`,
      speed: 'interactive',
      maxTokens: 420,
      messages: packed,
    })) {
      raw += delta
      yield delta
    }
    persistInBackground({ ...params, raw, started })
  } catch {
    const fallback = studentSafeError().message
    if (!raw) yield fallback
  }
}
