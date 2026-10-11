import { createCreditCheckout } from '@/lib/economy/credits'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('full_name, stripe_customer_id').eq('id', user.id).maybeSingle()
    const url = await createCreditCheckout({
      supabase,
      userId: user.id,
      email: user.email ?? null,
      name: profile?.full_name ?? null,
      customerId: profile?.stripe_customer_id ?? null,
    })
    return Response.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Credits checkout is unavailable right now.'
    return Response.json({ error: message }, { status: 400 })
  }
}
