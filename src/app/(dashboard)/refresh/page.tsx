import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RefreshClient } from './refresh-client'

export default async function RefreshPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <RefreshClient />
}
