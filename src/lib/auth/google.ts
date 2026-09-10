import { createClient } from '@/lib/supabase/client'
import { authCallbackUrl } from '@/lib/auth/redirect'

export async function signInWithGoogle(next = '/onboarding'): Promise<{ error?: string }> {
  const supabase = createClient()
  const redirectTo = authCallbackUrl(next)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'select_account' },
    },
  })
  if (error) return { error: error.message }
  return {}
}
