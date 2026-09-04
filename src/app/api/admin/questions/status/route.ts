import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbId } from '@/lib/schema'
import { z } from 'zod'

const bodySchema = z.object({
  questionId: dbId(),
  approved: z.boolean(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const { error } = await supabase.from('questions').update({
    approved: parsed.data.approved,
    active: parsed.data.approved,
    review_status: parsed.data.approved ? 'approved' : 'rejected',
  }).eq('id', parsed.data.questionId)

  if (error) return Response.json({ error: 'Update failed' }, { status: 500 })
  return Response.json({ success: true })
}
