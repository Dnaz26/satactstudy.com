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
  Bookmark,
  Zap,
  DoorClosed,
  DoorOpen,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

const PRIMARY: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Practice', href: '/practice', icon: BookOpen },
  { label: 'Plan', href: '/study-plan', icon: Calendar },
  { label: 'Study', href: '/study', icon: GraduationCap },
  { label: 'Reference', href: '/reference', icon: Bookmark },
  { label: 'Rapid fire', href: '/simulator', icon: Zap },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Customize', href: '/customize', icon: Sparkles },
  { label: 'Settings', href: '/settings', icon: Settings },
]

const ADMIN: NavItem[] = [
  { label: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
]

const NAV_KEY = 'satact-nav-open'

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const active = isActivePath(pathname, item.href) || (item.href === '/study' && pathname.startsWith('/desmos'))
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all',
        active ? 'neu-sm font-semibold text-signal' : 'text-fog hover:text-paper'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export function NavSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(true)

  React.useEffect(() => {
    const saved = window.localStorage.getItem(NAV_KEY)
    if (saved === '0') setOpen(false)
  }, [])

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      window.localStorage.setItem(NAV_KEY, next ? '1' : '0')
      return next
    })
  }

  if (!open) {
    return (
      <div className="w-0 shrink-0 overflow-visible">
        <button
          type="button"
          onClick={toggle}
          className="fixed bottom-4 left-3 z-50 flex h-11 w-11 items-center justify-center rounded-2xl neu-raised text-white"
          aria-label="Open side panel"
          title="Open menu"
        >
          <DoorOpen className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <aside className="flex h-full w-56 flex-col bg-ink p-3">
      <div className="flex items-center p-3">
        <BrandMark href="/dashboard" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-1">
        {PRIMARY.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="space-y-1 p-1">
        {ADMIN.filter((item) => isAdmin).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm text-fog hover:text-paper"
          aria-label="Close side panel"
        >
          <DoorClosed className="h-4 w-4 shrink-0" />
          <span>Close</span>
        </button>
      </div>
    </aside>
  )
}
