'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CheckCircle, Zap } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: 0,
    id: 'free',
    features: { 'Questions/day': '5', 'AI Chats/day': '1', 'Study plan': false, 'Analytics': 'Basic', 'Vocabulary': false, 'Adaptive difficulty': false },
    cta: 'Start Free',
    href: '/signup',
    popular: false,
  },
  {
    name: 'Starter',
    price: 5,
    id: 'starter',
    features: { 'Questions/day': '10', 'AI Chats/day': '3', 'Study plan': true, 'Analytics': 'Full', 'Vocabulary': true, 'Adaptive difficulty': false },
    cta: 'Get Starter',
    href: '/signup?plan=starter',
    popular: false,
  },
  {
    name: 'Pro',
    price: 20,
    id: 'pro',
    features: { 'Questions/day': '50', 'AI Chats/day': '15', 'Study plan': true, 'Analytics': 'Full', 'Vocabulary': true, 'Adaptive difficulty': true },
    cta: 'Get Pro',
    href: '/signup?plan=pro',
    popular: true,
  },
  {
    name: 'Elite',
    price: 100,
    id: 'elite',
    features: { 'Questions/day': '∞', 'AI Chats/day': '∞', 'Study plan': true, 'Analytics': 'Full + AI', 'Vocabulary': true, 'Adaptive difficulty': true },
    cta: 'Get Elite',
    href: '/signup?plan=elite',
    popular: false,
  },
]

const FEATURE_ROWS = ['Questions/day', 'AI Chats/day', 'Study plan', 'Analytics', 'Vocabulary', 'Adaptive difficulty']

const FAQS = [
  { q: 'Can I cancel anytime?', a: 'Yes! Cancel anytime from your settings with no penalties. Your access continues through the end of your billing period.' },
  { q: 'Is the free plan really free?', a: 'Yes. The free plan includes 5 questions and 1 AI chat per day, forever. No credit card required.' },
  { q: 'What is an access code?', a: 'Access codes are given out for promotions, school programs, or partnerships. They grant Elite-level access for free.' },
  { q: 'Do you offer student discounts?', a: 'We\'re working on it! Follow us for updates. In the meantime, our Starter plan at $5/month is already very affordable.' },
  { q: 'What if I take both SAT and ACT?', a: 'All plans support both tests simultaneously. Switch between SAT and ACT practice modes at any time.' },
]

export default function PricingPage() {
  const [accessCode, setAccessCode] = React.useState('')
  const [redeemLoading, setRedeemLoading] = React.useState(false)
  const [redeemMsg, setRedeemMsg] = React.useState('')
  const [redeemError, setRedeemError] = React.useState('')

  async function handleRedeem() {
    setRedeemLoading(true)
    setRedeemMsg('')
    setRedeemError('')

    const res = await fetch('/api/access-code/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: accessCode }),
    })

    const data = await res.json() as { success?: boolean; plan?: string; error?: string }

    if (data.success) {
      setRedeemMsg(`Success! You now have ${data.plan} access. Refresh the page to see your updated plan.`)
    } else {
      setRedeemError(data.error ?? 'Invalid code')
    }
    setRedeemLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 text-fog hover:text-paper transition-colors">
            <Zap className="w-4 h-4 text-signal" />
            <span className="font-bold">SAT ACT AI</span>
          </Link>
          <h1 className="text-4xl font-bold text-paper mb-3">Simple, transparent pricing</h1>
          <p className="text-fog text-lg">Start free. Upgrade when you&apos;re ready to accelerate.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative neu p-6 flex flex-col ${plan.popular ? 'ring-2 ring-signal/40' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="text-xs">Most Popular</Badge>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-paper mb-2">{plan.name}</h3>
                <div>
                  {plan.price === 0 ? (
                    <span className="text-3xl font-black text-paper">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-paper">${plan.price}</span>
                      <span className="text-fog">/mo</span>
                    </>
                  )}
                </div>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {FEATURE_ROWS.map((feature) => {
                  const value = plan.features[feature as keyof typeof plan.features]
                  return (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      {value === false ? (
                        <span className="text-fog line-through">{feature}</span>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-ok flex-shrink-0" />
                          <span className="text-fog">
                            {feature}: <span className="text-paper">{String(value)}</span>
                          </span>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
              <Link href={plan.href}>
                <Button variant={plan.popular ? 'default' : 'secondary'} className="w-full">
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div className="max-w-md mx-auto mb-16">
          <div className="rounded-2xl border border-transparent neu p-6">
            <h3 className="font-semibold text-paper mb-1">Have an access code?</h3>
            <p className="text-sm text-fog mb-4">Enter your code to unlock premium access.</p>
            <div className="flex gap-3">
              <Input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter code"
                className="flex-1"
              />
              <Button onClick={handleRedeem} loading={redeemLoading} disabled={!accessCode.trim()}>
                Redeem
              </Button>
            </div>
            {redeemMsg && <p className="text-sm text-ok mt-3">{redeemMsg}</p>}
            {redeemError && <p className="text-sm text-bad mt-3">{redeemError}</p>}
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-paper text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-transparent neu p-5">
                <h4 className="font-semibold text-paper mb-2">{q}</h4>
                <p className="text-sm text-fog leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
