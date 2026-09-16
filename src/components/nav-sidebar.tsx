'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/brand'
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Calendar,
  GraduationCap,
  Settings,
  Shield,
  Sparkles,
  Zap,
  Gamepad2,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const PRIMARY: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Practice', href: '/practice', icon: BookOpen },
  { label: 'Plan', href: '/study-plan', icon: Calendar },
  { label: 'Tutoring', href: '/study', icon: GraduationCap },
  { label: 'Rapid fire', href: '/simulator', icon: Zap },
  { label: 'Game', href: '/game', icon: Gamepad2 },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Customize', href: '/customize', icon: Sparkles },
  { label: 'Settings', href: '/settings', icon: Settings },
]

const ADMIN: NavItem[] = [
  { label: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const closeTimer = React.useRef<number | null>(null)

  function openPanel() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpen(true)
  }

  function scheduleClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 180)
  }

  React.useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  const items = [...PRIMARY, ...ADMIN.filter((item) => isAdmin)]

  return (
    <>
      {/* Left-edge hover target — move cursor here to reveal panel */}
      <div
        className="fixed inset-y-0 left-0 z-[60] w-3"
        onMouseEnter={openPanel}
        aria-hidden
      />

      <aside
        className={cn(
          'app-sidebar fixed inset-y-0 left-0 z-[61] flex w-56 flex-col p-3 shadow-[12px_0_40px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
        aria-hidden={!open}
      >
        <div className="flex items-center p-3">
          <BrandMark href="/dashboard" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-1" aria-label="Main">
          {items.map((item) => {
            const Icon = item.icon
            const active =
              isActivePath(pathname, item.href) ||
              (item.href === '/study' && pathname.startsWith('/desmos'))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-signal/15 font-semibold text-paper'
                    : 'text-fog hover:bg-white/70 hover:text-paper'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <p className="px-3 pb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-fog/70">
          Hover left edge to open
        </p>
      </aside>
    </>
  )
}
