'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const ARRIVED = 'prep:site-arrived'
const DISMISSED = 'prep:trial-offer-dismissed'
const DELAY_MS = 10_000

function readStore(key: string) {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStore(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    /* Private browsing can block storage. The offer still shows for this view. */
  }
}

function hiddenPath(pathname: string) {
  return pathname.startsWith('/signup') || pathname.startsWith('/onboarding') || pathname.startsWith('/practice/session')
}

export function TrialOfferPopup() {
  const pathname = usePathname()
  const hidden = hiddenPath(pathname)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (hidden || readStore(DISMISSED) === '1') {
      setOpen(false)
      return
    }
    const now = Date.now()
    const started = Number(readStore(ARRIVED) || 0) || now
    if (!readStore(ARRIVED)) writeStore(ARRIVED, String(now))
    const wait = Math.max(0, DELAY_MS - (Date.now() - started))
    const timer = window.setTimeout(() => setOpen(true), wait)
    return () => window.clearTimeout(timer)
  }, [hidden, pathname])

  function dismiss() {
    writeStore(DISMISSED, '1')
    setOpen(false)
  }

  return (
    <Dialog open={open && !hidden} onOpenChange={(next) => { if (!next) dismiss() }}>
      <DialogContent className="z-[80] max-w-[440px] overflow-visible border-0 bg-transparent p-0 shadow-none [&>button]:rounded-full [&>button]:bg-white/20 [&>button]:p-1 [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/30 [&>button]:hover:text-white">
        <div className="trial-offer-card relative overflow-hidden rounded-[2.15rem] p-[3px] shadow-[0_22px_0_#c94424,0_40px_80px_rgba(40,24,12,0.28)]">
          <div className="trial-offer-ring pointer-events-none absolute left-1/2 top-1/2 h-[160%] w-[160%] bg-[conic-gradient(from_90deg,#ff5c39,#ffd56a,#58cc02,#1cb0f6,#ff5c39)]" aria-hidden />
          <div className="relative overflow-hidden rounded-[2rem] bg-white">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#ff5c39_0%,#ff8a3d_48%,#ff5c39_100%)] px-6 pb-8 pt-8 text-white">
              <div className="trial-offer-glow pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/30 blur-2xl" aria-hidden />
              <div className="trial-offer-glow pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-[#ffd56a]/40 blur-2xl" aria-hidden />
              <p className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/90">
                <Sparkles className="h-4 w-4" aria-hidden />
                Free trial
              </p>
              <p className="relative mt-3 font-display text-7xl leading-none tracking-tight">7</p>
              <p className="relative text-sm font-extrabold uppercase tracking-[0.18em]">days on the house</p>
            </div>
            <div className="px-6 pb-6 pt-5 text-center">
              <DialogTitle className="sr-only">Try the product for 7 days for free</DialogTitle>
              <DialogDescription className="!text-base !font-bold !leading-7 !text-[#3c3c3c]">
                Try the product for 7 days for free and then decide if you want to pay or remain a free user.
              </DialogDescription>
              <Link
                href="/signup?trial=1"
                onClick={dismiss}
                className="relative mt-6 flex h-14 w-full items-center justify-center overflow-hidden rounded-full bg-[#ff5c39] text-base font-extrabold text-white shadow-[0_6px_0_#c94424] transition active:translate-y-1 active:shadow-none"
              >
                <span className="trial-offer-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
                Enable Now
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
