import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recalculateMastery } from '@/lib/practice/recalculate-mastery'
import { dbId } from '@/lib/schema'
import { z } from 'zod'

const bodySchema = z.object({
  topicId: dbId().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json())
    const topicId = parsed.success ? parsed.data.topicId : undefined

    const updated = await recalculateMastery(supabase, user.id, topicId)
    return Response.json({ success: true, updated })

  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
