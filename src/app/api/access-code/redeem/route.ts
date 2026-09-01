import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { createHash } from 'crypto'

const bodySchema = z.object({
  code: z.string().min(1),
})

function hashCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

    const codeHash = hashCode(parsed.data.code)

    const { data: accessCode, error: fetchError } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code_hash', codeHash)
      .eq('active', true)
      .single()

    if (fetchError || !accessCode) {
      return Response.json({ error: 'Invalid access code' }, { status: 404 })
    }

    if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
      return Response.json({ error: 'This access code has expired' }, { status: 410 })
    }

    if (accessCode.max_uses != null && (accessCode.current_uses ?? 0) >= accessCode.max_uses) {
      return Response.json({ error: 'This access code has reached its redemption limit' }, { status: 410 })
    }

    const { data: existing } = await supabase
      .from('access_code_redemptions')
      .select('id')
      .eq('code_hash', accessCode.code_hash)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return Response.json({ error: 'You have already used this access code' }, { status: 409 })
    }

    await supabase.from('access_code_redemptions').insert({
      code_hash: accessCode.code_hash,
      user_id: user.id,
      status: 'active',
    })

    await supabase.from('access_codes').update({
      current_uses: (accessCode.current_uses ?? 0) + 1,
    }).eq('id', accessCode.id)

    const planGranted = accessCode.plan_granted ?? 'elite'

    await supabase.from('profiles').update({
      subscription_plan: 'access_code',
      subscription_status: 'active',
      access_code_used: parsed.data.code.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    return Response.json({ success: true, plan: planGranted })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
