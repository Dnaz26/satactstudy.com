'use client'

import * as React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionKicker } from '@/components/brand'
import { CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-ok" />
        </div>
        <SectionKicker>Sent</SectionKicker>
        <h2 className="mt-2 text-xl font-display text-paper mb-2">Check your email</h2>
        <p className="text-fog text-sm mb-6">
          We sent a password reset link to <strong className="text-paper">{email}</strong>.
          Check your inbox and follow the instructions.
        </p>
        <Link href="/login" className="text-signal hover:underline text-sm">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <SectionKicker>Account</SectionKicker>
      <h2 className="mt-2 text-2xl font-display text-paper mb-1">Reset password</h2>
      <p className="text-fog mb-8 text-sm">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleReset} className="space-y-5">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />

        {error && (
          <div className="neu-inset px-4 py-3 text-sm text-bad">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Send Reset Link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fog">
        Remember your password?{' '}
        <Link href="/login" className="text-signal hover:underline font-medium">
          Log in
        </Link>
      </p>
    </div>
  )
}
