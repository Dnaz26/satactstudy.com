import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { z } from 'zod'
import { dbId } from '@/lib/schema'
import { markDayFromTasks } from '@/lib/schedule-days'
import { awardCoins } from '@/lib/economy/wallet'

const bodySchema = z.object({
  taskId: dbId(),
  minutes: z.number().int().min(0).max(480).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const blocked = await denyIfUnpaid(user.id)
    if (blocked) return blocked

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

    const { data: task } = await supabase
      .from('study_plan_tasks')
      .select('id, plan_id, target_minutes, status, study_plans(user_id)')
      .eq('id', parsed.data.taskId)
      .single()

    const plan = task?.study_plans as { user_id?: string } | null
    if (!task || plan?.user_id !== user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const wasDone = task.status === 'completed'

    await supabase
      .from('study_plan_tasks')
      .update({
        status: 'completed',
        completed_minutes: parsed.data.minutes ?? task.target_minutes ?? 0,
      })
      .eq('id', parsed.data.taskId)

    await markDayFromTasks(supabase, user.id, task.plan_id)

    let coinsAwarded = 0
    let balance = 0
    if (!wasDone) {
      const coin = await awardCoins(supabase, user.id, 'daily_task', { taskId: parsed.data.taskId })
      coinsAwarded = coin.awarded
      balance = coin.balance
    }

    return Response.json({ success: true, coinsAwarded, balance })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
