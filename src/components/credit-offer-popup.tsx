'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { dollarsFromCents } from '@/lib/economy/earnings'

const BARS = [
  { name: 'Free', lessons: 1, questions: 36 },
  { name: 'Core', lessons: 7, questions: 252 },
  { name: 'Plus', lessons: 21, questions: 756 },
]

export function CreditOfferPopup({ cents }: { cents: number }) {
  const pathname = usePathname()
  const hidden = pathname === '/practice/session'
  const [open, setOpen] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const maxQuestions = Math.max(...BARS.map((bar) => bar.questions))

  async function useAsCredits() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/stripe/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Credits are unavailable right now.')
      window.location.assign('/settings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credits are unavailable right now.')
      setBusy(false)
    }
  }

  return (
    <Dialog open={open && !hidden} onOpenChange={setOpen}>
      <DialogContent className="z-[80] max-w-[520px] border-0 bg-white p-0 shadow-[0_22px_0_#c94424]">
        <div className="px-6 pb-6 pt-7">
          <DialogTitle className="font-display text-3xl text-[#3c3c3c]">Use as credits</DialogTitle>
          <DialogDescription className="mt-2 text-base leading-7 text-[#3c3c3c]">
            You have ${dollarsFromCents(cents)} ready. Use as credits and each cent becomes one extra question.
          </DialogDescription>
          <button
            type="button"
            onClick={() => void useAsCredits()}
            disabled={busy}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#ff5c39] text-base font-extrabold text-white shadow-[0_6px_0_#c94424] disabled:opacity-60"
          >
            {busy ? 'Adding credits…' : 'Use as credits'}
          </button>
          {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
          <div className="mt-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#777]">What each plan can finish in a week</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {BARS.map((bar) => (
                <div key={bar.name} className="text-center">
                  <div className="flex h-36 items-end justify-center gap-1">
                    <div className="w-5 rounded-t-lg bg-[#1cb0f6]" style={{ height: `${Math.max(8, (bar.lessons / 21) * 100)}%` }} title={`${bar.lessons} lessons`} />
                    <div className="w-5 rounded-t-lg bg-[#58cc02]" style={{ height: `${Math.max(8, (bar.questions / maxQuestions) * 100)}%` }} title={`${bar.questions} questions`} />
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-[#3c3c3c]">{bar.name}</p>
                  <p className="text-[11px] font-bold leading-4 text-[#777]">{bar.lessons} lessons</p>
                  <p className="text-[11px] font-bold leading-4 text-[#777]">{bar.questions} questions</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-[#777]">Blue is lessons. Green is questions. Core and Plus also include practice exams. Free does not.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
