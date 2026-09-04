import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasPaidAccess } from '@/lib/access'
import { asPlan } from '@/lib/schema'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Could not sign in with Google`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=Could not sign in with Google`)
  }

  const fullName =
    (user.user_metadata.full_name as string | undefined) ??
    (user.user_metadata.name as string | undefined) ??
    null

  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    updated_at: new Date().toISOString(),
  })

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, subscription_plan, role')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }
  if (!hasPaidAccess(asPlan(profile.subscription_plan), profile.role)) {
    return NextResponse.redirect(`${origin}/pricing`)
  }

  const safeNext = next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(`${origin}${safeNext === '/onboarding' ? '/dashboard' : safeNext}`)
}
