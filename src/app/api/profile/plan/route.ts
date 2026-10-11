import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

const bodySchema = z.object({
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyMinutes: z.number().int().min(30).max(240),
  studyDays: z.array(z.enum(DAYS)).min(5),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Study time is at least 30 minutes, on at least 5 days a week.' }, { status: 400 })
  }
  const admin = await createServiceClient()
  const { error } = await admin.from('profiles').update({
    test_date: parsed.data.testDate,
    study_minutes_per_day: parsed.data.dailyMinutes,
    study_days: parsed.data.studyDays,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id)
  if (error) return Response.json({ error: 'Could not save the plan' }, { status: 400 })
  return Response.json({ ok: true })
}
