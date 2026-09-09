import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { hasProductAccess } from '@/lib/access'
import { asPlan } from '@/lib/schema'

const AUTH_ONLY = ['/login', '/signup', '/forgot-password']
const APP_PREFIXES = [
  '/dashboard',
  '/practice',
  '/admin',
  '/onboarding',
  '/analytics',
  '/mistakes',
  '/history',
  '/study-plan',
  '/vocabulary',
  '/math',
  '/reading-writing',
  '/tips',
  '/settings',
  '/review',
  '/customize',
  '/study',
  '/desmos',
  '/pay',
  '/simulator',
  '/reference',
]
const OPEN_WITHOUT_PLAN = ['/pricing', '/pay', '/onboarding']
const ONBOARDING_PREVIEW = ['/onboarding', '/practice']

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  function redirectTo(path: string) {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!user) {
    const isApp = startsWithAny(pathname, APP_PREFIXES)
    if (isApp) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan, role, onboarding_completed, trial_ends_at, billing_promo')
    .eq('id', user.id)
    .maybeSingle()

  const onboarded = Boolean(profile?.onboarding_completed)
  const product = hasProductAccess({
    plan: asPlan(profile?.subscription_plan),
    role: profile?.role,
    trialEndsAt: profile?.trial_ends_at,
  })

  if (pathname === '/' || AUTH_ONLY.includes(pathname)) {
    if (!onboarded) return redirectTo('/onboarding')
    return redirectTo(product ? '/dashboard' : '/pricing')
  }

  if (!onboarded) {
    if (startsWithAny(pathname, ONBOARDING_PREVIEW) || pathname.startsWith('/api/')) {
      return supabaseResponse
    }
    if (startsWithAny(pathname, APP_PREFIXES) || pathname.startsWith('/pricing')) {
      return redirectTo('/onboarding')
    }
    return supabaseResponse
  }

  if (onboarded && !product && startsWithAny(pathname, APP_PREFIXES) && !startsWithAny(pathname, OPEN_WITHOUT_PLAN)) {
    return redirectTo('/pricing')
  }

  if (onboarded && product && (pathname === '/pricing' || pathname === '/onboarding')) {
    return redirectTo('/dashboard')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
