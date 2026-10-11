'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function TrialEndedChoice() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  async function continueFree() {
    setLoading(true)
    await fetch('/api/trial/continue-free', { method: 'POST' })
    router.refresh()
  }
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-[2rem] border-4 border-[#e5e5e5] bg-white p-7 text-center shadow-2xl"><p className="font-display text-3xl text-[#3c3c3c]">Your premium trial ended</p><p className="mt-3 text-sm font-bold leading-6 text-[#777]">Keep a limited free account or unlock the complete product.</p><div className="mt-6 grid gap-3"><button onClick={continueFree} disabled={loading} className="rounded-2xl border-2 border-[#e5e5e5] bg-white px-5 py-4 font-extrabold text-[#3c3c3c] shadow-[0_4px_0_#e5e5e5]">{loading ? 'Saving…' : 'Continue as a free user'}</button><Link href="/pricing" className="rounded-2xl bg-[#58cc02] px-5 py-4 font-extrabold text-white shadow-[0_5px_0_#46a302]">Purchase premium</Link></div></div></div>
}
