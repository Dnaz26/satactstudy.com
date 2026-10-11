import { NextRequest } from 'next/server'
import { z } from 'zod'
import { isUiLanguage } from '@/lib/i18n'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const bodySchema = z.object({ language: z.string() })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || !isUiLanguage(parsed.data.language)) {
    return Response.json({ error: 'Choose a language' }, { status: 400 })
  }
  const admin = await createServiceClient()
  const { error } = await admin.from('profiles').update({
    ui_language: parsed.data.language,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id)
  if (error) return Response.json({ error: 'Could not save the language' }, { status: 400 })
  return Response.json({ language: parsed.data.language })
}
