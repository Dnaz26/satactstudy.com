import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { PLANS, planCadence, type PaidPlanId } from '@/lib/stripe'

interface SettingsClientProps {
  name: string
  email: string
  plan: string
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
}

const PLAN_RANK: Record<string, number> = {
  free: 0,
  access_code: 1,
  lite: 1,
  starter: 2,
  core: 3,
  pro: 3,
  plus: 4,
  elite: 5,
}

function planLabel(plan: string): string {
  if (plan === 'access_code') return 'Access code'
  if (plan === 'free' || !plan) return 'Free'
  if (plan === 'core') return 'Core'
  if (plan === 'plus') return 'Plus'
  return plan
}

function planAction(current: string, next: PaidPlanId): 'upgrade' | 'downgrade' {
  return (PLAN_RANK[next] ?? 0) > (PLAN_RANK[current] ?? 0) ? 'upgrade' : 'downgrade'
}

export function SettingsClient({ name, email, plan, periodEnd, cancelAtPeriodEnd }: SettingsClientProps) {
  const current = (plan || 'free').toLowerCase()
  const badgeVariant =
    current === 'elite' ? 'warning' :
    current === 'pro' ? 'default' :
    current === 'starter' || current === 'lite' || current === 'core' || current === 'plus' || current === 'access_code' ? 'info' : 'secondary'

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 pt-2 pb-12">
      <h1 className="font-display text-2xl">Settings</h1>

      <section className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">You</p>
        <div className="space-y-2 rounded-2xl neu-sm px-4 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Name</p>
            <p className="text-sm text-paper">{name || '—'}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Email</p>
            <p className="text-sm text-paper">{email || '—'}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Plan</p>
        <div className="flex items-center justify-between rounded-2xl neu-sm px-4 py-3">
          <Badge variant={badgeVariant} className="capitalize">{planLabel(current)}</Badge>
          {periodEnd && (
            <p className="text-xs text-fog">
              {cancelAtPeriodEnd ? 'Ends' : 'Renews'} {formatDate(periodEnd)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {PLANS.map((item) => {
            const currentPlan = item.id === current
            const action = planAction(current, item.id)
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl neu-sm px-4 py-3">
                <div>
                  <p className="text-sm text-paper">{item.name}</p>
                  <p className="text-xs text-fog">${item.price} {planCadence(item)} · {item.line}</p>
                </div>
                {currentPlan ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">Current</span>
                ) : (
                  <Button asChild size="sm" variant={action === 'upgrade' ? 'default' : 'secondary'}>
                    <Link href={`/pay?plan=${item.id}`}>
                      {action === 'upgrade' ? 'Upgrade' : 'Downgrade'}
                    </Link>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
