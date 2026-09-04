import { createClient } from '@/lib/supabase/server'
import { APPROVED_STRATEGIES, getStrategyById, getStrategyBySlug } from './catalog'
import type { DesmosClassification, DesmosStrategy, DesmosStrategyMastery } from './types'

export function compactStrategyLesson(strategy: DesmosStrategy): string {
  return [
    `Strategy: ${strategy.title}`,
    `Mode: ${strategy.mode}`,
    `What it does: ${strategy.description}`,
    `When: ${strategy.when_to_use}`,
    `Do not: ${strategy.when_not_to_use}`,
    `Recognition: ${strategy.recognition_rule}`,
    `Type: ${strategy.desmos_input_template.join(' | ') || 'none'}`,
    `Look for: ${strategy.what_to_look_for}`,
    `Why: ${strategy.why_it_works}`,
    `Example: ${strategy.example_problem} → ${strategy.example_result}`,
    `Fast path: type ${strategy.example_desmos_input.join(', ') || 'nothing'}; find ${strategy.what_to_look_for}.`,
  ].join('\n')
}

export async function getStrategyMastery(userId: string, strategyId: string): Promise<DesmosStrategyMastery | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('desmos_strategy_mastery')
    .select('strategy_id, times_shown, times_used, successful_uses, failed_uses, independent_uses, mastery_score, last_used_at, needs_review')
    .eq('user_id', userId)
    .eq('strategy_id', strategyId)
    .maybeSingle()
  return data
}

export async function recordStrategyEvent(params: {
  userId: string
  strategyId: string
  event: 'shown' | 'used' | 'success' | 'failed' | 'independent'
}): Promise<void> {
  const supabase = await createClient()
  const existing = await getStrategyMastery(params.userId, params.strategyId)
  const next = {
    user_id: params.userId,
    strategy_id: params.strategyId,
    times_shown: existing?.times_shown ?? 0,
    times_used: existing?.times_used ?? 0,
    successful_uses: existing?.successful_uses ?? 0,
    failed_uses: existing?.failed_uses ?? 0,
    independent_uses: existing?.independent_uses ?? 0,
    mastery_score: existing?.mastery_score ?? 0,
    last_used_at: new Date().toISOString(),
    needs_review: existing?.needs_review ?? false,
    updated_at: new Date().toISOString(),
  }

  if (params.event === 'shown') next.times_shown += 1
  if (params.event === 'used') next.times_used += 1
  if (params.event === 'success') next.successful_uses += 1
  if (params.event === 'failed') next.failed_uses += 1
  if (params.event === 'independent') next.independent_uses += 1

  const attempts = next.times_used + next.independent_uses + next.successful_uses + next.failed_uses
  const successRate = attempts === 0 ? 0 : (next.successful_uses + next.independent_uses) / Math.max(1, attempts)
  next.mastery_score = Math.max(0, Math.min(100, Math.round(100 * successRate)))
  next.needs_review = next.failed_uses >= 2 && next.successful_uses === 0

  await supabase.from('desmos_strategy_mastery').upsert(next)
}

export async function shouldOfferDesmosShortcut(params: {
  userId: string
  classification: DesmosClassification
  recentWrongCount: number
}): Promise<boolean> {
  if (!params.classification.desmos_useful || params.classification.mode === 'manual_first') return false
  if (params.recentWrongCount < 2) return false
  if (!params.classification.strategy_id) return false
  const mastery = await getStrategyMastery(params.userId, params.classification.strategy_id)
  return !mastery || mastery.mastery_score < 70
}

export function resolveStrategy(classification: DesmosClassification): DesmosStrategy | null {
  if (classification.strategy_id) return getStrategyById(classification.strategy_id) ?? null
  if (classification.strategy) return getStrategyBySlug(classification.strategy) ?? null
  return null
}

export function libraryStrategies(): DesmosStrategy[] {
  return APPROVED_STRATEGIES
}
