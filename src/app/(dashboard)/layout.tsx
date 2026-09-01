import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavSidebar } from '@/components/nav-sidebar'
import { Badge } from '@/components/ui/badge'
import { Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'
import { asPlan } from '@/lib/schema'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_plan, role, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const plan = asPlan(profile?.subscription_plan)
  const planBadgeVariant =
    plan === 'elite' ? 'warning' :
    plan === 'pro' ? 'default' :
    plan === 'starter' || plan === 'access_code' ? 'info' :
    'secondary'

  return (
    <div className="flex h-screen overflow-hidden bg-ink">
      <NavSidebar isAdmin={profile?.role === 'admin'} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">Live session</p>
          <div className="flex items-center gap-3">
            <Badge variant={planBadgeVariant}>{plan}</Badge>
            <Link href="/settings" className="neu-sm flex h-10 w-10 items-center justify-center text-fog hover:text-paper" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="neu-sm flex h-10 w-10 items-center justify-center text-fog hover:text-paper" title="Sign out" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl neu-raised font-mono text-[10px] text-white">
              {profile?.full_name ? getInitials(profile.full_name) : user.email?.[0]?.toUpperCase() ?? '?'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
