import type { SupabaseClient } from '@supabase/supabase-js'
import { type CoinReason } from '@/lib/economy/catalog'

type AwardResult = {
  awarded: number
  balance: number
  reason: CoinReason
}

/** Coins / store paused — wallets stay readable but awards do nothing. */
export async function ensureWallet(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ balance: number; lifetime_earned: number }> {
  const { data: existing } = await supabase
    .from('user_wallets')
    .select('balance, lifetime_earned')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return {
      balance: existing.balance ?? 0,
      lifetime_earned: existing.lifetime_earned ?? 0,
    }
  }

  return { balance: 0, lifetime_earned: 0 }
}

export async function awardCoins(
  _supabase: SupabaseClient,
  _userId: string,
  reason: CoinReason,
  _meta: Record<string, unknown> = {},
): Promise<AwardResult> {
  return { awarded: 0, balance: 0, reason }
}

export async function spendCoins(
  _supabase: SupabaseClient,
  _userId: string,
  _amount: number,
  _reason: string,
  _meta: Record<string, unknown> = {},
): Promise<{ ok: true; balance: number } | { ok: false; error: string; balance: number }> {
  return { ok: false, error: 'Store is paused for now', balance: 0 }
}
