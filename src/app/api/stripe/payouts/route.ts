import { NextRequest } from 'next/server'
import { z } from 'zod'
import { convertEarningsToCredits } from '@/lib/economy/credits'
import { collectStudyEarnings, payoutDashboardLink } from '@/lib/economy/payouts'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  action: z.enum(['collect', 'dashboard', 'convert']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    const admin = await createServiceClient()
    const action = parsed.data.action ?? 'collect'

    if (action === 'convert') {
      const result = await convertEarningsToCredits(admin, user.id)
      return Response.json(result)
    }

    if (action === 'dashboard') {
      const url = await payoutDashboardLink(admin, user.id)
      return Response.json({ url })
    }

    const result = await collectStudyEarnings(admin, user.id, user.email ?? null, profile?.full_name ?? null)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Collection is unavailable right now.'
    return Response.json({ error: message }, { status: 400 })
  }
}
