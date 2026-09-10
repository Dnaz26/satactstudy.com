/**
 * Canonical production origin for OAuth / email redirects.
 * Prefer the live browser host when it is not localhost; otherwise use the
 * configured public app URL (never leave users on localhost after Google).
 */
export function authAppOrigin(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '')
  const configuredIsLocal = !configured || /localhost|127\.0\.0\.1/i.test(configured)

  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/$/, '')
    const onLocal = /localhost|127\.0\.0\.1/i.test(origin)
    if (!onLocal) return origin
    if (!configuredIsLocal) return configured
    return origin
  }

  if (!configuredIsLocal) return configured
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  return configured || 'http://localhost:3000'
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
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`

  return origin.replace(/\/$/, '')
}
