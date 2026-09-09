import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('profiles').update({
    diagnostic_completed: true,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id)

  return Response.json({ ok: true })
}
