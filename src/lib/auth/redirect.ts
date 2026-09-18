import { CANONICAL_SITE_URL } from '@/lib/utils'

/**
 * App origin for OAuth / email / share redirects.
 * Trusts the per-environment NEXT_PUBLIC_APP_URL first (localhost when
 * running locally, production when deployed) so local testing stays local.
 */
export function authAppOrigin(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '')
  if (configured) return configured

  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '')
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!/localhost|127\.0\.0\.1/i.test(host)) return `https://${host}`
  }

  return CANONICAL_SITE_URL
}

export function authCallbackUrl(next = '/onboarding'): string {
  const safeNext = next.startsWith('/') ? next : '/onboarding'
  return `${authAppOrigin()}/auth/callback?next=${encodeURIComponent(safeNext)}`
}

/**
 * Origin for post-auth redirects. Always answers on the same host the
 * request arrived on, so localhost testing stays on localhost and
 * production stays on production.
 */
export function resolveRequestOrigin(requestUrl: string): string {
  const { origin } = new URL(requestUrl)
  return origin.replace(/\/$/, '')
}
