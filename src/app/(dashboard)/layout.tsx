import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasPaidAccess } from '@/lib/access'
import { asPlan } from '@/lib/schema'
import { NavSidebar } from '@/components/nav-sidebar'
import { LogOut } from 'lucide-react'
import { getInitials } from '@/lib/utils'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_plan, role, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  if (!hasPaidAccess(asPlan(profile?.subscription_plan), profile?.role)) {
    redirect('/pricing')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink">
      <NavSidebar isAdmin={profile?.role === 'admin'} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 px-5">
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="neu-sm flex h-9 w-9 items-center justify-center text-fog hover:text-paper" title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl neu-raised font-mono text-[10px] text-white">
            {profile?.full_name ? getInitials(profile.full_name) : user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-8">{children}</main>
      </div>
    </div>
  )
}
