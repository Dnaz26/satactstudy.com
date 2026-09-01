import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  taskId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

    const { data: task } = await supabase
      .from('study_plan_tasks')
      .select('id, plan_id, study_plans(user_id)')
      .eq('id', parsed.data.taskId)
      .single()

    const plan = task?.study_plans as { user_id?: string } | null
    if (!task || plan?.user_id !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    await supabase
      .from('study_plan_tasks')
      .update({ status: 'completed' })
      .eq('id', parsed.data.taskId)

    return Response.json({ success: true })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
