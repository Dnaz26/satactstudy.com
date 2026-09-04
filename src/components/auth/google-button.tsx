'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { signInWithGoogle } from '@/lib/auth/google'

export function GoogleButton({
  next = '/onboarding',
  label = 'Continue with Google',
}: {
  next?: string
  label?: string
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  async function start() {
    setError('')
    setLoading(true)
    const result = await signInWithGoogle(next)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" size="lg" loading={loading} onClick={() => void start()}>
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.7z" />
          <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z" />
          <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4V6.5H1.4C.5 8.4 0 10.1 0 12s.5 3.6 1.4 5.5l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z" />
        </svg>
        {label}
      </Button>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  )
}
