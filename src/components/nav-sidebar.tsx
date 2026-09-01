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
  AlertCircle,
  History,
  Calendar,
  BookMarked,
  Calculator,
  PenLine,
  Lightbulb,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Practice', href: '/practice', icon: BookOpen },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Mistakes', href: '/mistakes', icon: AlertCircle },
  { label: 'History', href: '/history', icon: History },
  { label: 'Study Plan', href: '/study-plan', icon: Calendar },
  { label: 'Vocabulary', href: '/vocabulary', icon: BookMarked },
  { label: 'SAT Math', href: '/math', icon: Calculator },
  { label: 'Reading & Writing', href: '/reading-writing', icon: PenLine },
  { label: 'Tips', href: '/tips', icon: Lightbulb },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
]

export function NavSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-ink transition-all duration-200 p-3',
        collapsed ? 'w-20' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between p-3">
        <BrandMark compact={collapsed} href="/dashboard" />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="neu-sm flex h-8 w-8 items-center justify-center text-fog hover:text-paper"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all',
                isActive ? 'neu-sm text-signal font-semibold' : 'text-fog hover:text-paper',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
