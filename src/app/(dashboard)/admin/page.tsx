/* eslint-disable react-hooks/purity */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLAN_PRICES } from '@/lib/constants'
import { Users, BookOpen, Brain, DollarSign, Shield } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const [
    { count: totalUsers },
    { count: totalQuestions },
    { count: pendingQuestions },
    { data: planCounts },
    { data: aiCosts },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }).eq('approved', false),
    supabase.from('profiles').select('subscription_plan'),
    supabase.from('ai_usage').select('estimated_cost_usd').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ])

  const planDistribution = (planCounts ?? []).reduce((acc: Record<string, number>, p) => {
    const key = p.subscription_plan ?? 'free'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const totalAiCost = (aiCosts ?? []).reduce((sum, r) => sum + Number(r.estimated_cost_usd ?? 0), 0)

  const paidUsers =
    (planDistribution.lite ?? 0) +
    (planDistribution.starter ?? 0) +
    (planDistribution.core ?? 0) +
    (planDistribution.plus ?? 0) +
    (planDistribution.pro ?? 0) +
    (planDistribution.elite ?? 0)
  const estimatedMRR =
    (planDistribution.lite ?? 0) * PLAN_PRICES.lite +
    (planDistribution.starter ?? 0) * PLAN_PRICES.starter +
    (planDistribution.core ?? 0) * PLAN_PRICES.core +
    (planDistribution.plus ?? 0) * PLAN_PRICES.plus +
    (planDistribution.pro ?? 0) * PLAN_PRICES.pro +
    (planDistribution.elite ?? 0) * PLAN_PRICES.elite

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-yellow-400" />
        <h1 className="text-2xl font-bold text-paper">Admin Dashboard</h1>
        <Badge variant="warning">Admin</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: totalUsers ?? 0, icon: Users, color: 'text-signal' },
          { label: 'Questions', value: totalQuestions ?? 0, icon: BookOpen, color: 'text-ok' },
          { label: 'AI Cost (30d)', value: `$${totalAiCost.toFixed(2)}`, icon: Brain, color: 'text-violet-400' },
          { label: 'Est. MRR', value: `$${estimatedMRR}`, icon: DollarSign, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold text-paper">{value}</p>
                <p className="text-xs text-fog">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['free', 'lite', 'starter', 'core', 'plus', 'pro', 'elite', 'access_code'].map((plan) => {
              const count = planDistribution[plan] ?? 0
              const pct = totalUsers ? Math.round((count / totalUsers) * 100) : 0
              return (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={plan === 'elite' ? 'warning' : plan === 'pro' ? 'default' : plan === 'starter' || plan === 'lite' ? 'info' : 'secondary'}
                      className="capitalize"
                    >
                      {plan}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-panel-2 rounded-full overflow-hidden">
                      <div className="h-full bg-signal rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-paper w-8 text-right">{count}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Question Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Total Questions', value: totalQuestions ?? 0, variant: 'secondary' as const },
              { label: 'Pending Review', value: pendingQuestions ?? 0, variant: 'warning' as const },
              { label: 'Approved', value: (totalQuestions ?? 0) - (pendingQuestions ?? 0), variant: 'success' as const },
            ].map(({ label, value, variant }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-fog">{label}</span>
                <Badge variant={variant}>{value}</Badge>
              </div>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <a href="/admin/questions" className="text-sm text-signal hover:text-signal">
                Manage questions →
              </a>
              <a href="/admin/sources" className="text-sm text-signal hover:text-signal">
                Exam sources →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
