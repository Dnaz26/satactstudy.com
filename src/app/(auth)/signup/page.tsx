'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionKicker } from '@/components/brand'
import { redeemPromoCode } from '@/lib/promo'
import { GoogleButton } from '@/components/auth/google-button'

export default function SignupPage() {
  const router = useRouter()

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [promoCode, setPromoCode] = React.useState('')
  const [agreed, setAgreed] = React.useState(false)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [needsEmail, setNeedsEmail] = React.useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) {
      setError('Agree to the terms to continue.')
      return
    }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user && (data.user.identities?.length ?? 1) === 0) {
      setError('An account with this email already exists. Log in instead.')
      setLoading(false)
      return
    }

    let session = data.session
    if (data.user && !session) {
      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError || !signedIn.session) {
        if (promoCode.trim()) {
          sessionStorage.setItem('pending_promo', promoCode.trim())
        }
        setNeedsEmail(true)
        setLoading(false)
        return
      }
      session = signedIn.session
    }

    if (data.user && session) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email ?? email.trim(),
        full_name: name.trim(),
      })

      if (promoCode.trim()) {
        const redeemed = await redeemPromoCode(promoCode)
        if (!redeemed.ok && redeemed.error && redeemed.error !== 'pending') {
          setError(`Account created, but promo code did not apply: ${redeemed.error}`)
        }
      }

      router.push('/onboarding')
      router.refresh()
      return
    }

    setError('Could not create your account. Try logging in.')
    setLoading(false)
  }

  if (needsEmail) {
    return (
      <div className="text-center">
        <SectionKicker>Check your inbox</SectionKicker>
        <h2 className="mt-2 font-display text-2xl text-paper">Confirm your email</h2>
        <p className="mt-3 text-sm text-fog">
          We sent a confirmation link to <strong className="text-paper">{email}</strong>. Open it, then log in to start studying.
        </p>
        <Link href="/login" className="mt-6 inline-block text-signal hover:underline">
          Go to log in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <SectionKicker>New student</SectionKicker>
      <h2 className="mt-2 font-display text-2xl text-paper">Create account</h2>
      <p className="mb-8 mt-1 text-sm text-fog">A code skips payment. Otherwise you pay next.</p>

      <GoogleButton next="/onboarding" label="Continue with Google" />
      <p className="my-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-fog">or email</p>

      <form onSubmit={handleSignup} className="space-y-4">
        <Input label="Name" type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Input
            label="Promo code"
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Optional"
            autoComplete="off"
            helperText="RHS: 2 weeks free and 60% off. Access codes skip payment."
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#ff6b57]"
          />
          <span className="text-sm text-fog">
            I agree to the{' '}
            <Link href="/terms" className="text-signal">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-signal">Privacy Policy</Link>.
          </span>
        </label>

        {error && <div className="neu-inset px-4 py-3 text-sm text-bad">{error}</div>}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Continue
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fog">
        Already have an account?{' '}
        <Link href="/login" className="text-signal hover:underline">Log in</Link>
      </p>
    </div>
  )
}
