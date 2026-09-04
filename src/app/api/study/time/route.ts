import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { recordStudySeconds } from '@/lib/study/time'

const bodySchema = z.object({
  seconds: z.number().int().min(1).max(3600),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await denyIfUnpaid(user.id)
  if (blocked) return blocked

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const total = await recordStudySeconds(user.id, parsed.data.seconds)
  return Response.json({ success: true, studyMinutes: total })
}
