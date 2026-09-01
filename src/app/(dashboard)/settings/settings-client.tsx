'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, daysUntil } from '@/lib/utils'
import { Settings, CreditCard, CheckCircle } from 'lucide-react'

interface Profile {
  full_name: string | null
  subscription_plan: string | null
  test_preference: string | null
  target_score: number | null
  test_date: string | null
  study_minutes_per_day: number | null
}

interface Subscription {
  plan: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean | null
}

interface SettingsClientProps {
  profile: Profile | null
  subscription: Subscription | null
  email: string
}

export function SettingsClient({ profile, subscription, email }: SettingsClientProps) {
  const router = useRouter()
  const [name, setName] = React.useState(profile?.full_name ?? '')
  const [targetTest, setTargetTest] = React.useState(profile?.test_preference ?? 'SAT')
  const [targetScore, setTargetScore] = React.useState(profile?.target_score?.toString() ?? '')
  const [testDate, setTestDate] = React.useState(profile?.test_date ?? '')
  const [dailyMinutes, setDailyMinutes] = React.useState(profile?.study_minutes_per_day?.toString() ?? '30')
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [billingLoading, setBillingLoading] = React.useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      full_name: name,
      test_preference: targetTest === 'both' ? 'Both' : targetTest,
      target_score: targetScore ? Number(targetScore) : null,
      test_date: testDate || null,
      study_minutes_per_day: dailyMinutes ? Number(dailyMinutes) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function handleBilling() {
    setBillingLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json() as { url?: string }
    if (data.url) window.location.href = data.url
    setBillingLoading(false)
  }

  const planBadgeVariant =
    profile?.subscription_plan === 'elite' ? 'warning' :
    profile?.subscription_plan === 'pro' ? 'default' :
    profile?.subscription_plan === 'starter' || profile?.subscription_plan === 'access_code' ? 'info' : 'secondary'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-paper mb-1 flex items-center gap-2">
          <Settings className="w-6 h-6 text-fog" />
          Settings
        </h1>
        <p className="text-fog">Manage your account and study preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-fog">Email</label>
            <div className="h-10 rounded-xl border border-transparent neu-inset px-3 flex items-center text-sm text-fog">
              {email}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Study Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-fog block mb-2">Target Test</label>
            <Select value={targetTest} onValueChange={setTargetTest}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAT">SAT</SelectItem>
                <SelectItem value="ACT">ACT</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            label="Target Score"
            type="number"
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            placeholder={targetTest === 'ACT' ? '1–36' : '400–1600'}
          />

          <div>
            <label className="text-sm font-medium text-fog block mb-2">Test Date</label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="w-full h-10 rounded-xl border border-transparent neu-inset px-3 text-paper focus:outline-none focus:ring-2 focus:ring-signal/40"
            />
            {testDate && (
              <p className="text-xs text-fog mt-1">{daysUntil(testDate)} days away</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-fog block mb-2">Daily Study Time</label>
            <Select value={dailyMinutes} onValueChange={setDailyMinutes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 90, 120].map((m) => (
                  <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} loading={saving} className="w-full">
            {saved ? (
              <><CheckCircle className="w-4 h-4 mr-2" />Saved!</>
            ) : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fog">Current Plan</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={planBadgeVariant} className="capitalize text-sm">
                  {profile?.subscription_plan ?? 'free'}
                </Badge>
              </div>
            </div>
            {subscription?.current_period_end && (
              <div className="text-right">
                <p className="text-sm text-fog">
                  {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} {formatDate(subscription.current_period_end)}
                </p>
              </div>
            )}
          </div>

          {(!profile?.subscription_plan || profile.subscription_plan === 'free') && (
            <div className="rounded-2xl neu-sm p-4">
              <p className="text-sm text-signal mb-3">Upgrade to unlock unlimited practice and AI tutoring.</p>
              <a href="/pricing">
                <Button className="w-full">View Plans</Button>
              </a>
            </div>
          )}

          {subscription && (
            <Button variant="secondary" onClick={handleBilling} loading={billingLoading} className="w-full">
              Manage Billing
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
