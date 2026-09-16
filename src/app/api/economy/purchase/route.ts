import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { getStoreItem } from '@/lib/economy/catalog'
import { spendCoins, ensureWallet } from '@/lib/economy/wallet'
import { z } from 'zod'

const bodySchema = z.object({
  itemId: z.string().min(1),
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

    const item = getStoreItem(parsed.data.itemId)
    if (!item) return Response.json({ error: 'Unknown item' }, { status: 404 })

    const { data: existing } = await supabase
      .from('user_inventory')
      .select('item_id, qty')
      .eq('user_id', user.id)
      .eq('item_id', item.id)
      .maybeSingle()

    if (existing) {
      const wallet = await ensureWallet(supabase, user.id)
      return Response.json({ error: 'Already owned', balance: wallet.balance }, { status: 409 })
    }

    const spent = await spendCoins(supabase, user.id, item.price, 'purchase', { itemId: item.id })
    if (!spent.ok) {
      return Response.json({ error: spent.error, balance: spent.balance }, { status: 402 })
    }

    await supabase.from('user_inventory').insert({
      user_id: user.id,
      item_id: item.id,
      qty: 1,
      equipped: true,
    })

    return Response.json({
      success: true,
      balance: spent.balance,
      itemId: item.id,
      item,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Purchase failed' }, { status: 500 })
  }
}
