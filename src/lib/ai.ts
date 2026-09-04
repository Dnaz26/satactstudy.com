import { createClient } from './supabase/server'

export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export type MessageContent = string | MessageContentPart[]

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: MessageContent
}

export type DeepSeekModelKind = 'pro' | 'flash' | 'vision'

interface AICallParams {
  model: DeepSeekModelKind
  messages: Message[]
  userId?: string
  requestType: string
  json?: boolean
  maxTokens?: number
  speed?: 'interactive' | 'background'
}

const INTERACTIVE_MAX_TOKENS = 280
const BACKGROUND_MAX_TOKENS = 1200
const FLASH_PEAK_INPUT_PER_1K = 0.00044
const FLASH_PEAK_OUTPUT_PER_1K = 0.00132

function isReasoningName(modelName: string): boolean {
  return /v4-flash/i.test(modelName) && !/chat|fast/i.test(modelName)
}

export function getDeepSeekModelName(model: DeepSeekModelKind, speed: 'interactive' | 'background' = 'interactive'): string {
  if (model === 'vision') {
    return process.env.DEEPSEEK_VISION_MODEL ?? 'deepseek-v4-flash-vision-exp'
  }
  if (speed === 'interactive' || model === 'flash') {
    const named = process.env.DEEPSEEK_FAST_MODEL || process.env.DEEPSEEK_FLASH_MODEL || 'deepseek-chat'
    return isReasoningName(named) ? 'deepseek-chat' : named
  }
  return process.env.DEEPSEEK_PRO_MODEL ?? 'deepseek-chat'
}

function getApiKey(): string {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not configured')
  return apiKey
}

function logUsage(
  userId: string,
  requestType: string,
  modelName: string,
  promptTokens: number,
  completionTokens: number
) {
  void (async () => {
    try {
      const supabase = await createClient()
      const cost =
        (promptTokens / 1000) * FLASH_PEAK_INPUT_PER_1K +
        (completionTokens / 1000) * FLASH_PEAK_OUTPUT_PER_1K
      await supabase.from('ai_usage').insert({
        user_id: userId,
        request_type: requestType,
        model: modelName,
        input_tokens: promptTokens,
        output_tokens: completionTokens,
        estimated_cost_usd: cost,
      })
    } catch {
      // Non-critical
    }
  })()
}

function tokenBudget(params: AICallParams): number {
  if (params.maxTokens) return params.maxTokens
  return (params.speed ?? 'interactive') === 'background' ? BACKGROUND_MAX_TOKENS : INTERACTIVE_MAX_TOKENS
}

export async function callAI(params: AICallParams): Promise<string> {
  const speed = params.speed ?? 'interactive'
  const modelName = getDeepSeekModelName(params.model, speed)
  const budget = tokenBudget(params)
  const attempts = speed === 'interactive' ? 2 : 3

  let lastError: Error | null = null
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: params.messages,
          response_format: params.json ? { type: 'json_object' } : undefined,
          temperature: 0.3,
          max_tokens: budget,
          stream: false,
        }),
      })

      if (!response.ok) {
        await response.text()
        throw new Error(`DeepSeek API error ${response.status}`)
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage?: { prompt_tokens: number; completion_tokens: number }
      }
      const content = data.choices[0]?.message?.content ?? ''
      if (!content.trim()) throw new Error('DeepSeek returned empty content')
      if (params.userId && data.usage) {
        logUsage(params.userId, params.requestType, modelName, data.usage.prompt_tokens, data.usage.completion_tokens)
      }
      return content
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError ?? new Error('AI call failed')
}

export async function* callAIStream(params: AICallParams): AsyncGenerator<string> {
  const modelName = getDeepSeekModelName(params.model, 'interactive')
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: params.messages,
      temperature: 0.3,
      max_tokens: tokenBudget({ ...params, speed: 'interactive' }),
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    await response.text().catch(() => '')
    throw new Error(`DeepSeek API error ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let promptTokens = 0
  let completionTokens = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') {
        if (params.userId) logUsage(params.userId, params.requestType, modelName, promptTokens, completionTokens)
        return
      }
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>
          usage?: { prompt_tokens?: number; completion_tokens?: number }
        }
        if (json.usage) {
          promptTokens = json.usage.prompt_tokens ?? promptTokens
          completionTokens = json.usage.completion_tokens ?? completionTokens
        }
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // ignore keepalives
      }
    }
  }
}

export interface ExplanationResult {
  why: string
  steps: string[]
  answer: string
  common_trap: string
}

export async function generateExplanation(
  questionText: string,
  correctAnswer: string,
  topic: string,
  userId?: string
): Promise<ExplanationResult> {
  const response = await callAI({
    model: 'flash',
    userId,
    requestType: 'explanation',
    speed: 'interactive',
    maxTokens: 220,
    messages: [
      {
        role: 'system',
        content: 'SAT/ACT tutor for a 13-year-old. Reply JSON only: {"why":"one easy sentence","steps":["tiny step","tiny step","tiny step"],"answer":"letter or value","common_trap":"1 short phrase"}. Each step is one short sentence in plain words. No LaTeX or dollar signs. Show math like 2(9)-6=12.',
      },
      {
        role: 'user',
        content: `Q: ${questionText.slice(0, 400)}\nAnswer: ${correctAnswer}\nTopic: ${topic}`,
      },
    ],
    json: true,
  })

  try {
    return JSON.parse(response) as ExplanationResult
  } catch {
    return {
      why: response.slice(0, 220) || 'This tests the core skill in the stem.',
      steps: [],
      answer: correctAnswer,
      common_trap: '',
    }
  }
}
