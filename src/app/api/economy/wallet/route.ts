import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { ensureWallet } from '@/lib/economy/wallet'
import { STORE_ITEMS } from '@/lib/economy/catalog'
import { z } from 'zod'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await denyIfUnpaid(user.id)
    if (blocked) return blocked

    const wallet = await ensureWallet(supabase, user.id)
    const { data: inventory } = await supabase
      .from('user_inventory')
      .select('item_id, qty, equipped, purchased_at')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false })

    const ownedIds = new Set((inventory ?? []).map((row) => row.item_id))
    const owned = (inventory ?? []).map((row) => {
      const item = STORE_ITEMS.find((s) => s.id === row.item_id)
      return {
        ...row,
        item: item ?? null,
      }
    })

    return Response.json({
      balance: wallet.balance,
      lifetimeEarned: wallet.lifetime_earned,
      inventory: owned,
      ownedIds: [...ownedIds],
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed to load wallet' }, { status: 500 })
  }
}

const equipSchema = z.object({
  itemId: z.string().min(1),
  equipped: z.boolean(),
})

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await denyIfUnpaid(user.id)
    if (blocked) return blocked

    const parsed = equipSchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400 })

    const item = STORE_ITEMS.find((s) => s.id === parsed.data.itemId)
    if (!item) return Response.json({ error: 'Unknown item' }, { status: 404 })

    const { data: row } = await supabase
      .from('user_inventory')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_id', parsed.data.itemId)
      .maybeSingle()

    if (!row) return Response.json({ error: 'Not owned' }, { status: 404 })

    // Unequip other items that apply to the same games when equipping
    if (parsed.data.equipped) {
      const { data: allOwned } = await supabase
        .from('user_inventory')
        .select('item_id')
        .eq('user_id', user.id)
        .eq('equipped', true)

      for (const owned of allOwned ?? []) {
        const other = STORE_ITEMS.find((s) => s.id === owned.item_id)
        if (!other || other.id === item.id) continue
        const overlap = other.appliesTo.some((a) => item.appliesTo.includes(a))
        if (overlap) {
          await supabase
            .from('user_inventory')
            .update({ equipped: false })
            .eq('user_id', user.id)
            .eq('item_id', other.id)
        }
      }
    }

    await supabase
      .from('user_inventory')
      .update({ equipped: parsed.data.equipped })
      .eq('user_id', user.id)
      .eq('item_id', parsed.data.itemId)

    return Response.json({ success: true })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed to update' }, { status: 500 })
  }
}
