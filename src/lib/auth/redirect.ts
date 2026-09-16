import { CANONICAL_SITE_URL } from '@/lib/utils'

/**
 * Canonical production origin for OAuth / email / share redirects.
 * Never emit localhost in user-facing URLs — always prepsatact.com.
 */
export function authAppOrigin(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '')
  if (configured && !/localhost|127\.0\.0\.1/i.test(configured)) return configured

  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/$/, '')
    if (!/localhost|127\.0\.0\.1/i.test(origin)) return origin
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

/** Prefer production host when a request somehow arrives on localhost. */
export function resolveRequestOrigin(requestUrl: string): string {
  const { origin } = new URL(requestUrl)
  if (!/localhost|127\.0\.0\.1/i.test(origin)) return origin.replace(/\/$/, '')

  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '')
  if (configured && !/localhost|127\.0\.0\.1/i.test(configured)) return configured

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!/localhost|127\.0\.0\.1/i.test(host)) return `https://${host}`
  }

  return CANONICAL_SITE_URL
}
