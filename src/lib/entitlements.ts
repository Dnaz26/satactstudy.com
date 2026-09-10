import { createClient } from './supabase/server'
import { PLAN_LIMITS, PLAN_LIMITS_PROMO } from './constants'
import { ONBOARDING_TRIAL, hasActiveTrial, hasPaidAccess, hasProductAccess, PAYWALL_MESSAGE } from './access'
import { isRhsBillingPromo } from './plans'
import { asPlan, todayISO } from './schema'

export type UserPlan = 'free' | 'lite' | 'starter' | 'core' | 'plus' | 'pro' | 'elite' | 'access_code'

export interface EntitlementResult {
  allowed: boolean
  used: number
  limit: number
  paywall?: boolean
}

type DailyLimits = { questions_per_day: number; ai_chats_per_day: number }

export type AccessProfile = {
  plan: UserPlan
  role: string
  allowed: boolean
  billingPromo: string | null
  onboardingCompleted: boolean
  trialEndsAt: string | null
  trialStartedAt: string | null
  trialQuestionsUsed: number
  trialAiChatsUsed: number
  diagnosticCompleted: boolean
}

function limitsForPlan(plan: UserPlan, billingPromo: string | null | undefined): DailyLimits {
  if (isRhsBillingPromo(billingPromo) && (plan === 'core' || plan === 'plus')) {
    return PLAN_LIMITS_PROMO[plan]
  }
  return PLAN_LIMITS[plan]
}

export async function getAccessProfile(userId: string): Promise<AccessProfile> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      'subscription_plan, role, billing_promo, onboarding_completed, trial_ends_at, trial_started_at, trial_questions_used, trial_ai_chats_used, diagnostic_completed',
    )
    .eq('id', userId)
    .single()

  const plan = asPlan(data?.subscription_plan)
  const role = data?.role ?? 'student'
  const billingPromo = data?.billing_promo ?? null
  const trialEndsAt = data?.trial_ends_at ?? null
  const onboardingCompleted = Boolean(data?.onboarding_completed)
  const allowed = hasProductAccess({ plan, role, trialEndsAt }) || !onboardingCompleted

  return {
    plan,
    role,
    allowed,
    billingPromo,
    onboardingCompleted,
    trialEndsAt,
    trialStartedAt: data?.trial_started_at ?? null,
    trialQuestionsUsed: data?.trial_questions_used ?? 0,
    trialAiChatsUsed: data?.trial_ai_chats_used ?? 0,
    diagnosticCompleted: Boolean(data?.diagnostic_completed),
  }
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

  if (access.role === 'admin') {
    return { allowed: true, used: usage.questions_answered, limit: 999999 }
  }

  // No daily question caps — practice exams are 100 Q and must never hit a soft wall.
  if (!access.onboardingCompleted || hasProductAccess({
    plan: access.plan,
    role: access.role,
    trialEndsAt: access.trialEndsAt,
  })) {
    return { allowed: true, used: usage.questions_answered, limit: 999999 }
  }

  return { allowed: false, used: usage.questions_answered, limit: 0, paywall: true }
}

export async function canAskAI(userId: string): Promise<EntitlementResult> {
  const access = await getAccessProfile(userId)
  const usage = await getDailyUsage(userId)

  if (access.role === 'admin') {
    return { allowed: true, used: usage.ai_chats_used, limit: 999999 }
  }

  if (!access.onboardingCompleted) {
    return {
      allowed: access.trialAiChatsUsed < ONBOARDING_TRIAL.aiChats,
      used: access.trialAiChatsUsed,
      limit: ONBOARDING_TRIAL.aiChats,
    }
  }

  if (!hasProductAccess({ plan: access.plan, role: access.role, trialEndsAt: access.trialEndsAt })) {
    return { allowed: false, used: usage.ai_chats_used, limit: 0, paywall: true }
  }

  if (hasActiveTrial(access.trialEndsAt) && !hasPaidAccess(access.plan, access.role)) {
    const limits = PLAN_LIMITS.core
    return {
      allowed: usage.ai_chats_used < limits.ai_chats_per_day,
      used: usage.ai_chats_used,
      limit: limits.ai_chats_per_day,
    }
  }

  const limits = limitsForPlan(access.plan, access.billingPromo)
  return {
    allowed: usage.ai_chats_used < limits.ai_chats_per_day,
    used: usage.ai_chats_used,
    limit: limits.ai_chats_per_day,
  }
}

export async function recordQuestionAnswered(userId: string): Promise<void> {
  const supabase = await createClient()
  const today = todayISO()
  const access = await getAccessProfile(userId)

  if (!access.onboardingCompleted) {
    await supabase
      .from('profiles')
      .update({
        trial_questions_used: access.trialQuestionsUsed + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

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
  const access = await getAccessProfile(userId)

  if (!access.onboardingCompleted) {
    await supabase
      .from('profiles')
      .update({
        trial_ai_chats_used: access.trialAiChatsUsed + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

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
