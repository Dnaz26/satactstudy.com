import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudyClient } from './study-client'

export default async function StudyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <StudyClient />
}
