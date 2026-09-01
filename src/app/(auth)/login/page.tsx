'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionKicker } from '@/components/brand'
import { redeemPendingPromo } from '@/lib/promo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectedFrom') ?? '/dashboard'
  const urlError = searchParams.get('error')

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState(urlError ?? '')
  const [loading, setLoading] = React.useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    await redeemPendingPromo()
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div>
      <SectionKicker>Session</SectionKicker>
      <h2 className="mt-2 font-display text-3xl text-paper">Welcome back</h2>
      <p className="mb-8 mt-1 text-sm text-fog">Pick up where you left off.</p>

      <form onSubmit={handleLogin} className="space-y-5">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu"
          required
          autoComplete="email"
        />
        <div className="flex flex-col gap-1.5">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <Link href="/forgot-password" className="self-end font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
            Forgot password
          </Link>
        </div>

        {error && (
          <div className="neu-inset px-4 py-3 text-sm text-bad">{error}</div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fog">
        New here?{' '}
        <Link href="/signup" className="text-signal hover:underline">
          Create account
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="text-sm text-fog">Loading…</div>}>
      <LoginForm />
    </React.Suspense>
  )
}
