'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  GraduationCap,
  BookOpen,
  LayoutGrid,
  RotateCcw,
  Gamepad2,
  Zap,
  MessageCircle,
  BarChart2,
  Settings,
  Shield,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const DOCK = [
  { href: '/dashboard', label: 'Home', icon: Home, color: '#58cc02' },
  { href: '/study', label: 'Learn', icon: GraduationCap, color: '#1cb0f6' },
  { href: '/practice', label: 'Practice', icon: BookOpen, color: '#ff9600' },
  { href: '/refresh', label: 'Review', icon: RotateCcw, color: '#ff4b4b' },
  { href: '/simulator', label: 'Rapid Fire', icon: Zap, color: '#ce82ff' },
  { href: '/chat', label: 'Chat', icon: MessageCircle, color: '#1cb0f6' },
] as const

const MORE = [
  { href: '/game', label: 'Play', hint: 'Games with questions', icon: Gamepad2, color: '#ce82ff' },
  { href: '/analytics', label: 'My scores', hint: 'How you did', icon: BarChart2, color: '#58cc02' },
  { href: '/customize', label: 'Customize', hint: 'Goals and study time', icon: Settings, color: '#ce82ff' },
  { href: '/settings', label: 'Settings', hint: 'Your account', icon: Settings, color: '#777' },
]

function screenTitle(pathname: string) {
  const routes: Array<[string, string]> = [
    ['/dashboard', 'Home'],
    ['/study', 'Learn'],
    ['/practice', 'Practice'],
    ['/refresh', 'Review'],
    ['/simulator', 'Rapid Fire'],
    ['/chat', 'Chat'],
    ['/game', 'Play'],
    ['/analytics', 'My scores'],
    ['/customize', 'Customize'],
    ['/settings', 'Settings'],
    ['/mistakes', 'Review'],
    ['/study-plan', 'Home'],
    ['/vocabulary', 'Learn'],
    ['/math', 'Learn'],
    ['/reading-writing', 'Learn'],
  ]
  return routes.find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[1] ?? null
}

function activeDock(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function KidShell({
  children,
  firstName: _firstName,
  isAdmin,
}: {
  children: React.ReactNode
  firstName: string
  isAdmin?: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const focusedExam = pathname === '/practice/session' && searchParams.get('mode') === 'exam'
  const embeddedChat = pathname === '/chat' && searchParams.get('embedded') === '1'
  const playingGame = pathname === '/game' && Boolean(searchParams.get('play'))
  const fitScreen = pathname === '/dashboard' || pathname === '/chat'
  const title = focusedExam || embeddedChat || playingGame ? null : screenTitle(pathname)
  const [more, setMore] = React.useState(false)
  const [studyNudge, setStudyNudge] = React.useState(false)
  const moreActive = MORE.some((item) => activeDock(pathname, item.href))
  React.useEffect(() => {
    const refresh = () => setStudyNudge(window.localStorage.getItem('prep:study-nudge') === '1' && window.localStorage.getItem('prep:chat-viewed') !== '1')
    refresh()
    window.addEventListener('prep:study-nudge', refresh)
    window.addEventListener('prep:chat-viewed', refresh)
    return () => { window.removeEventListener('prep:study-nudge', refresh); window.removeEventListener('prep:chat-viewed', refresh) }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-white">
      <main className={cn("flex-1 bg-white", focusedExam || embeddedChat || playingGame || fitScreen ? "overflow-hidden" : "overflow-y-auto", fitScreen ? "flex flex-col px-3 pt-3 pb-[5.25rem] sm:px-5" : !focusedExam && !embeddedChat && !playingGame ? "overflow-y-auto px-3 pt-4 pb-28 sm:px-6" : "")}>
        {title && (
          <div className={cn("mx-auto flex w-full items-center justify-between gap-3", fitScreen ? "mb-2 max-w-[1440px]" : "mb-4 max-w-6xl")}>
            <h1 className="font-display text-3xl text-[#3c3c3c]">{title}</h1>
            {pathname === '/dashboard' ? <div id="dash-streak" /> : null}
          </div>
        )}
        {children}
      </main>

      {!focusedExam && !embeddedChat && !playingGame && <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-[#e5e5e5] bg-white px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-7 gap-1">
          {DOCK.map((item) => {
            const Icon = item.icon
            const on = activeDock(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-extrabold transition active:translate-y-0.5',
                  on ? 'text-white' : 'text-[#afafaf]',
                  item.href === '/chat' && studyNudge && 'animate-bounce ring-4 ring-[#ff9600]/40',
                )}
                style={on ? { background: item.color, boxShadow: `0 4px 0 ${item.color}99` } : undefined}
              >
                <Icon className="h-6 w-6" />
                {item.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMore(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-extrabold active:translate-y-0.5',
              more || moreActive ? 'bg-[#4b4b4b] text-white shadow-[0_4px_0_#2b2b2b]' : 'text-[#afafaf]',
            )}
          >
            <LayoutGrid className="h-6 w-6" />
            More
          </button>
        </div>
      </nav>}

      <AnimatePresence>
        {more && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMore(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="w-full max-w-lg rounded-[2rem] border-4 border-[#e5e5e5] bg-white p-4 shadow-[0_12px_0_#e5e5e5]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-2xl text-[#3c3c3c]">More stuff</p>
                <button
                  type="button"
                  onClick={() => setMore(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f7f7f7] text-[#777]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {MORE.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMore(false)}
                      className="flex items-center gap-3 rounded-2xl border-2 border-[#eee] bg-white p-3 shadow-[0_5px_0_#e5e5e5] active:translate-y-1 active:shadow-none"
                    >
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                        style={{ background: item.color }}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span>
                        <span className="block font-display text-lg leading-none text-[#3c3c3c]">{item.label}</span>
                        <span className="mt-1 block text-xs font-bold text-[#afafaf]">{item.hint}</span>
                      </span>
                    </Link>
                  )
                })}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMore(false)}
                    className="flex items-center gap-3 rounded-2xl border-2 border-[#eee] bg-white p-3 shadow-[0_5px_0_#e5e5e5]"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3c3c3c] text-white">
                      <Shield className="h-6 w-6" />
                    </span>
                    <span className="font-display text-lg text-[#3c3c3c]">Admin</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
