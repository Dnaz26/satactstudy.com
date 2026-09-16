import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { awardCoins, ensureWallet } from '@/lib/economy/wallet'
import { z } from 'zod'

const bodySchema = z.object({
  reason: z.enum(['game_win']),
  meta: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await denyIfUnpaid(user.id)
    if (blocked) return blocked

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400 })

    // Soft anti-spam: max one game_win award per 45s
    if (parsed.data.reason === 'game_win') {
      const since = new Date(Date.now() - 45_000).toISOString()
      const { data: recent } = await supabase
        .from('coin_ledger')
        .select('id')
        .eq('user_id', user.id)
        .eq('reason', 'game_win')
        .gte('created_at', since)
        .limit(1)
      if (recent && recent.length > 0) {
        const wallet = await ensureWallet(supabase, user.id)
        return Response.json({
          success: true,
          awarded: 0,
          balance: wallet.balance,
          reason: 'game_win',
          skipped: true,
        })
      }
    }

    const result = await awardCoins(supabase, user.id, parsed.data.reason, parsed.data.meta ?? {})
    return Response.json({ success: true, ...result })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Award failed' }, { status: 500 })
  }
}
