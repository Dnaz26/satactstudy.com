import { createClient } from './supabase/server'
import { sleep } from './utils'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AICallParams {
  model: 'pro' | 'flash'
  messages: Message[]
  userId?: string
  requestType: string
  json?: boolean
}

const COST_PER_1K_TOKENS = {
  'deepseek-chat': 0.00014,
}

function getModelName(model: 'pro' | 'flash'): string {
  return model === 'pro'
    ? (process.env.DEEPSEEK_PRO_MODEL ?? 'deepseek-chat')
    : (process.env.DEEPSEEK_FLASH_MODEL ?? 'deepseek-chat')
}

async function logUsage(
  userId: string,
  requestType: string,
  modelName: string,
  promptTokens: number,
  completionTokens: number
) {
  try {
    const supabase = await createClient()
    const totalTokens = promptTokens + completionTokens
    const costRate = COST_PER_1K_TOKENS['deepseek-chat'] ?? 0.00014
    const cost = (totalTokens / 1000) * costRate

    await supabase.from('ai_usage').insert({
      user_id: userId,
      request_type: requestType,
      model: modelName,
      input_tokens: promptTokens,
      output_tokens: completionTokens,
      estimated_cost_usd: cost,
    })
  } catch {
    // Non-critical — don't throw
  }
}

export async function callAI(params: AICallParams): Promise<string> {
  const { model, messages, userId, requestType, json } = params
  const modelName = getModelName(model)
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured')
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1000 * attempt)

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          response_format: json ? { type: 'json_object' } : undefined,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`DeepSeek API error ${response.status}: ${error}`)
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage?: { prompt_tokens: number; completion_tokens: number }
      }

      const content = data.choices[0]?.message?.content ?? ''

      if (userId && data.usage) {
        await logUsage(
          userId,
          requestType,
          modelName,
          data.usage.prompt_tokens,
          data.usage.completion_tokens
        )
      }

      return content
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError ?? new Error('AI call failed after 3 attempts')
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
    json: true,
    messages: [
      {
        role: 'system',
        content: `You are an expert SAT/ACT tutor. Explain questions clearly and pedagogically. 
Return JSON with: { "why": string, "steps": string[], "answer": string, "common_trap": string }`,
      },
      {
        role: 'user',
        content: `Question: ${questionText}\n\nCorrect Answer: ${correctAnswer}\nTopic: ${topic}\n\nExplain this question step by step.`,
      },
    ],
  })

  try {
    return JSON.parse(response) as ExplanationResult
  } catch {
    return {
      why: 'This question tests your understanding of the concept.',
      steps: [response],
      answer: correctAnswer,
      common_trap: 'Read carefully to avoid common mistakes.',
    }
  }
}
