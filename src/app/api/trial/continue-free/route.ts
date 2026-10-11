import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await supabase.from('profiles').update({ trial_ends_at: null, subscription_plan: 'free', updated_at: new Date().toISOString() }).eq('id', user.id)
  if (error) return Response.json({ error: 'Could not continue on free plan' }, { status: 500 })
  return Response.json({ ok: true })
}
