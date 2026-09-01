import { createClient } from './supabase/server'
import { PLAN_LIMITS } from './constants'
import { asPlan, todayISO } from './schema'

export type UserPlan = 'free' | 'starter' | 'pro' | 'elite' | 'access_code'

export interface EntitlementResult {
  allowed: boolean
  used: number
  limit: number
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', userId)
    .single()

  return asPlan(data?.subscription_plan)
}

async function getDailyUsage(userId: string) {
  const supabase = await createClient()
  const today = todayISO()

  const { data } = await supabase
    .from('user_usage_daily')
    .select('questions_answered, ai_chats_used')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single()

  return {
    questions_answered: data?.questions_answered ?? 0,
    ai_chats_used: data?.ai_chats_used ?? 0,
  }
}

export async function canAnswerQuestion(userId: string): Promise<EntitlementResult> {
  const plan = await getUserPlan(userId)
  const limits = PLAN_LIMITS[plan]
  const usage = await getDailyUsage(userId)

  return {
    allowed: usage.questions_answered < limits.questions_per_day,
    used: usage.questions_answered,
    limit: limits.questions_per_day,
  }
}

export async function canAskAI(userId: string): Promise<EntitlementResult> {
  const plan = await getUserPlan(userId)
  const limits = PLAN_LIMITS[plan]
  const usage = await getDailyUsage(userId)

  return {
    allowed: usage.ai_chats_used < limits.ai_chats_per_day,
    used: usage.ai_chats_used,
    limit: limits.ai_chats_per_day,
  }
}

export async function recordQuestionAnswered(userId: string): Promise<void> {
  const supabase = await createClient()
  const today = todayISO()

  const { data: existing } = await supabase
    .from('user_usage_daily')
    .select('id, questions_answered')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single()

  if (existing) {
    await supabase
      .from('user_usage_daily')
      .update({ questions_answered: (existing.questions_answered ?? 0) + 1 })
      .eq('id', existing.id)
  } else {
    await supabase.from('user_usage_daily').insert({
      user_id: userId,
      usage_date: today,
      questions_answered: 1,
      ai_chats_used: 0,
    })
  }
}

export async function recordAIChat(userId: string): Promise<void> {
  const supabase = await createClient()
  const today = todayISO()

  const { data: existing } = await supabase
    .from('user_usage_daily')
    .select('id, ai_chats_used')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single()

  if (existing) {
    await supabase
      .from('user_usage_daily')
      .update({ ai_chats_used: (existing.ai_chats_used ?? 0) + 1 })
      .eq('id', existing.id)
  } else {
    await supabase.from('user_usage_daily').insert({
      user_id: userId,
      usage_date: today,
      questions_answered: 0,
      ai_chats_used: 1,
    })
  }
}
