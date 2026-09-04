import { createClient } from './supabase/server'
import { PLAN_LIMITS } from './constants'
import { asPlan, todayISO } from './schema'
import { hasPaidAccess, PAYWALL_MESSAGE } from './access'

export type UserPlan = 'free' | 'lite' | 'starter' | 'core' | 'plus' | 'pro' | 'elite' | 'access_code'

export interface EntitlementResult {
  allowed: boolean
  used: number
  limit: number
  paywall?: boolean
}

export async function getAccessProfile(userId: string): Promise<{
  plan: UserPlan
  role: string
  allowed: boolean
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('subscription_plan, role')
    .eq('id', userId)
    .single()

  const plan = asPlan(data?.subscription_plan)
  const role = data?.role ?? 'student'
  return { plan, role, allowed: hasPaidAccess(plan, role) }
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const { plan } = await getAccessProfile(userId)
  return plan
}

export async function denyIfUnpaid(userId: string): Promise<Response | null> {
  const access = await getAccessProfile(userId)
  if (access.allowed) return null
  return Response.json({ error: PAYWALL_MESSAGE, paywall: true }, { status: 403 })
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
  const access = await getAccessProfile(userId)
  const usage = await getDailyUsage(userId)

  if (!access.allowed) {
    return { allowed: false, used: usage.questions_answered, limit: 0, paywall: true }
  }

  if (access.role === 'admin') {
    return { allowed: true, used: usage.questions_answered, limit: 999999 }
  }

  const limits = PLAN_LIMITS[access.plan]
  return {
    allowed: usage.questions_answered < limits.questions_per_day,
    used: usage.questions_answered,
    limit: limits.questions_per_day,
  }
}

export async function canAskAI(userId: string): Promise<EntitlementResult> {
  const access = await getAccessProfile(userId)
  const usage = await getDailyUsage(userId)

  if (!access.allowed) {
    return { allowed: false, used: usage.ai_chats_used, limit: 0, paywall: true }
  }

  if (access.role === 'admin') {
    return { allowed: true, used: usage.ai_chats_used, limit: 999999 }
  }

  const limits = PLAN_LIMITS[access.plan]
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
