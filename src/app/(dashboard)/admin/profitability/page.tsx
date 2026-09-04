/* eslint-disable react-hooks/purity */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DEEPSEEK_FLASH_PEAK, PLAN_LIMITS, PLAN_PRICES, STRIPE_FEE } from '@/lib/constants'
import { DollarSign, TrendingUp, Brain, Users } from 'lucide-react'

export default async function ProfitabilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { data: planCounts },
    { data: aiCosts30d },
    { data: aiCostsAll },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('subscription_plan'),
    supabase.from('ai_usage').select('estimated_cost_usd').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from('ai_usage').select('estimated_cost_usd'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const planDist = (planCounts ?? []).reduce((acc: Record<string, number>, p) => {
    const key = p.subscription_plan ?? 'free'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const mrr =
    (planDist.lite ?? 0) * PLAN_PRICES.lite +
    (planDist.starter ?? 0) * PLAN_PRICES.starter +
    (planDist.core ?? 0) * PLAN_PRICES.core +
    (planDist.plus ?? 0) * PLAN_PRICES.plus +
    (planDist.pro ?? 0) * PLAN_PRICES.pro +
    (planDist.elite ?? 0) * PLAN_PRICES.elite

  const aiCost30 = (aiCosts30d ?? []).reduce((s, r) => s + Number(r.estimated_cost_usd ?? 0), 0)
  const aiCostAll = (aiCostsAll ?? []).reduce((s, r) => s + Number(r.estimated_cost_usd ?? 0), 0)
  const paidUsers =
    (planDist.lite ?? 0) +
    (planDist.starter ?? 0) +
    (planDist.core ?? 0) +
    (planDist.plus ?? 0) +
    (planDist.pro ?? 0) +
    (planDist.elite ?? 0)
  const liteStripeFee = PLAN_PRICES.lite * STRIPE_FEE.percent + STRIPE_FEE.fixed
  const liteWorstChat = (12000 / 1_000_000) * DEEPSEEK_FLASH_PEAK.input_per_million + (2000 / 1_000_000) * DEEPSEEK_FLASH_PEAK.output_per_million
  const liteAiCap = PLAN_LIMITS.lite.ai_chats_per_day * 31 * liteWorstChat
  const liteProfit = PLAN_PRICES.lite - liteStripeFee - liteAiCap
  const grossMargin = mrr > 0 ? Math.max(0, ((mrr - aiCost30) / mrr) * 100) : 0
  const aiCostPerUser = totalUsers ? aiCost30 / totalUsers : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-paper">Profitability Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Est. MRR', value: `$${mrr.toFixed(0)}`, icon: DollarSign, color: 'text-ok' },
          { label: 'AI Cost (30d)', value: `$${aiCost30.toFixed(2)}`, icon: Brain, color: 'text-bad' },
          { label: 'Gross Margin', value: `${grossMargin.toFixed(1)}%`, icon: TrendingUp, color: 'text-signal' },
          { label: 'Paid Users', value: paidUsers, icon: Users, color: 'text-yellow-400' },
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
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['lite', 'starter', 'core', 'plus', 'pro', 'elite'] as const).map((plan) => {
              const count = planDist[plan] ?? 0
              const revenue = count * PLAN_PRICES[plan]
              return (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={plan === 'elite' ? 'warning' : plan === 'pro' ? 'default' : plan === 'lite' ? 'secondary' : 'info'} className="capitalize">
                      {plan}
                    </Badge>
                    <span className="text-sm text-fog">{count} users × ${PLAN_PRICES[plan]}</span>
                  </div>
                  <span className="text-sm font-semibold text-paper">${revenue}/mo</span>
                </div>
              )
            })}
            <div className="pt-2 border-t border-transparent flex justify-between">
              <span className="text-sm font-semibold text-paper">Total MRR</span>
              <span className="text-sm font-bold text-ok">${mrr}/mo</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Cost (last 30 days)', value: `$${aiCost30.toFixed(4)}` },
              { label: 'Total AI cost', value: `$${aiCostAll.toFixed(4)}` },
              { label: 'Cost per user (30d)', value: `$${aiCostPerUser.toFixed(4)}` },
              { label: 'AI cost vs MRR', value: `${mrr > 0 ? ((aiCost30 / mrr) * 100).toFixed(1) : 0}%` },
              { label: 'Lite Stripe fee', value: `$${liteStripeFee.toFixed(2)}` },
              { label: 'Lite AI cap (31d peak)', value: `$${liteAiCap.toFixed(2)}` },
              { label: 'Lite worst-case profit', value: `$${liteProfit.toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-sm text-fog">{label}</span>
                <span className="text-sm text-paper font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
