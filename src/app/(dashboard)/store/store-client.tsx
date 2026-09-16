'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'
import {
  COIN_NAME,
  COIN_REWARDS,
  RARITY_STYLE,
  STORE_ITEMS,
  featuredItems,
  itemsByCategory,
  type StoreCategory,
  type StoreItem,
} from '@/lib/economy/catalog'
import { Coins, ShoppingBag, Sparkles } from 'lucide-react'

type WalletPayload = {
  balance: number
  lifetimeEarned: number
  ownedIds: string[]
}

const SECTIONS: { id: StoreCategory; title: string; subtitle: string }[] = [
  { id: 'featured', title: 'Atelier picks', subtitle: 'Curated drops for this week' },
  { id: 'valorant', title: 'Combat suite', subtitle: 'Precision tools for arcade runs' },
  { id: 'sports', title: 'Arena kit', subtitle: 'Edge for score streaks' },
  { id: 'edu', title: 'Study atelier', subtitle: 'Quiet helpers for SAT / ACT' },
]

const RARITY_LUX: Record<
  StoreItem['rarity'],
  { frame: string; wash: string; chip: string }
> = {
  common: {
    frame: 'border-[rgba(201,68,36,0.1)]',
    wash: 'from-[#fffaf7] to-white',
    chip: 'bg-[#fff5f0] text-fog',
  },
  uncommon: {
    frame: 'border-emerald-200/80',
    wash: 'from-emerald-50/80 to-white',
    chip: 'bg-emerald-50 text-emerald-700',
  },
  rare: {
    frame: 'border-sky-200/80',
    wash: 'from-sky-50/70 to-white',
    chip: 'bg-sky-50 text-sky-700',
  },
  epic: {
    frame: 'border-violet-200/80',
    wash: 'from-violet-50/70 to-white',
    chip: 'bg-violet-50 text-violet-700',
  },
  legendary: {
    frame: 'border-amber-300/90',
    wash: 'from-amber-50 to-white',
    chip: 'bg-amber-50 text-amber-800',
  },
}

function ItemTile({
  item,
  owned,
  balance,
  buying,
  featured,
  onBuy,
}: {
  item: StoreItem
  owned: boolean
  balance: number
  buying: string | null
  featured?: boolean
  onBuy: (id: string) => void
}) {
  const rarity = RARITY_STYLE[item.rarity]
  const lux = RARITY_LUX[item.rarity]
  const canBuy = !owned && balance >= item.price

  return (
    <motion.button
      type="button"
      layout
      whileHover={{ y: -3 }}
      onClick={() => {
        if (canBuy && buying !== item.id) onBuy(item.id)
      }}
      disabled={owned || !canBuy || buying === item.id}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[1.5rem] border text-left transition',
        'bg-gradient-to-b shadow-[0_18px_40px_rgba(40,24,12,0.06)]',
        lux.wash,
        lux.frame,
        featured ? 'min-h-[300px]' : 'min-h-[230px]',
        owned && 'ring-1 ring-emerald-300/60',
        !owned && !canBuy && 'opacity-70'
      )}
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#ffd4c8] to-transparent" />
      <div className="relative z-10 flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <span className={cn('rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]', lux.chip)}>
            {rarity.label}
          </span>
          {owned ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-700">
              Owned
            </span>
          ) : featured ? (
            <Sparkles className="h-4 w-4 text-signal" />
          ) : null}
        </div>

        <div className={cn('mt-8 flex flex-1 flex-col justify-end', featured && 'mt-12')}>
          <p className={cn('font-display tracking-tight text-paper', featured ? 'text-3xl' : 'text-2xl')}>
            {item.name}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-fog">{item.blurb}</p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
            {item.effect.label}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[rgba(201,68,36,0.1)] pt-4">
          <span className="inline-flex items-center gap-1.5 font-display text-xl text-paper">
            <Coins className="h-4 w-4 text-signal" />
            {item.price.toLocaleString()}
          </span>
          {!owned ? (
            <span className="text-xs text-fog">
              {buying === item.id ? 'Purchasing…' : canBuy ? 'Acquire' : 'Need more coins'}
            </span>
          ) : (
            <span className="text-xs text-emerald-700">In collection</span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

export function StoreClient() {
  const [wallet, setWallet] = React.useState<WalletPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [buying, setBuying] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/economy/wallet')
      const data = (await res.json()) as WalletPayload & { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Could not load store')
        return
      }
      setWallet({
        balance: data.balance,
        lifetimeEarned: data.lifetimeEarned,
        ownedIds: data.ownedIds ?? [],
      })
    } catch {
      setError('Could not load store')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  async function buy(itemId: string) {
    setBuying(itemId)
    setToast('')
    try {
      const res = await fetch('/api/economy/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      const data = (await res.json()) as { error?: string; balance?: number; item?: StoreItem }
      if (!res.ok) {
        setToast(data.error ?? 'Purchase failed')
        return
      }
      setWallet((prev) =>
        prev
          ? {
              ...prev,
              balance: data.balance ?? prev.balance,
              ownedIds: [...prev.ownedIds, itemId],
            }
          : prev
      )
      setToast(`Unlocked ${data.item?.name ?? 'item'}`)
    } catch {
      setToast('Purchase failed')
    } finally {
      setBuying(null)
    }
  }

  const owned = new Set(wallet?.ownedIds ?? [])
  const featured = featuredItems()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !wallet) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <p className="text-fog">{error || 'Store unavailable'}</p>
        <Button onClick={() => void load()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-12 pb-16 pt-2">
      <div className="relative overflow-hidden rounded-[2rem] border border-[rgba(201,68,36,0.12)] bg-gradient-to-br from-white via-[#fffaf7] to-[#ffd4c8]/50 px-6 py-8 shadow-[0_30px_80px_rgba(40,24,12,0.08)] sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-signal/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-[#ffd4c8]/80 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
              <ShoppingBag className="h-3.5 w-3.5" />
              Private boutique
            </p>
            <h1 className="mt-3 font-display text-4xl tracking-tight text-paper sm:text-5xl">The Shop</h1>
            <p className="mt-3 text-sm leading-relaxed text-fog sm:text-base">
              A quieter storefront for {COIN_NAME}. Collect tools that sharpen games and study — earned from real progress.
            </p>
          </div>
          <div className="min-w-[200px] rounded-[1.25rem] border border-amber-200/80 bg-white/90 px-5 py-4 shadow-[0_12px_30px_rgba(201,68,36,0.08)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{COIN_NAME}</p>
            <p className="mt-2 flex items-center gap-2 font-display text-4xl text-paper">
              <Coins className="h-7 w-7 text-signal" />
              {wallet.balance.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-fog">Lifetime {wallet.lifetimeEarned.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {toast ? (
        <p className="rounded-2xl border border-signal/20 bg-[#fff5f0] px-4 py-3 text-sm text-signal">{toast}</p>
      ) : null}

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl text-paper">Featured</h2>
            <p className="mt-1 text-sm text-fog">The pieces worth opening first</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              featured
              owned={owned.has(item.id)}
              balance={wallet.balance}
              buying={buying}
              onBuy={buy}
            />
          ))}
        </div>
      </section>

      {SECTIONS.filter((s) => s.id !== 'featured').map((section) => {
        const items = itemsByCategory(section.id)
        if (!items.length) return null
        return (
          <section key={section.id} className="space-y-5">
            <div>
              <h2 className="font-display text-3xl text-paper">{section.title}</h2>
              <p className="mt-1 text-sm text-fog">{section.subtitle}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  owned={owned.has(item.id)}
                  balance={wallet.balance}
                  buying={buying}
                  onBuy={buy}
                />
              ))}
            </div>
          </section>
        )
      })}

      <section className="rounded-[1.75rem] border border-[rgba(201,68,36,0.12)] bg-white px-6 py-6 shadow-[0_16px_40px_rgba(40,24,12,0.05)] sm:px-8">
        <h3 className="font-display text-2xl text-paper">How to earn {COIN_NAME}</h3>
        <ul className="mt-4 grid gap-3 text-sm text-fog sm:grid-cols-2">
          <li className="rounded-xl bg-[#fffaf7] px-4 py-3">Practice test — <span className="font-semibold text-paper">{COIN_REWARDS.practice_test}</span></li>
          <li className="rounded-xl bg-[#fffaf7] px-4 py-3">Improvement — <span className="font-semibold text-paper">{COIN_REWARDS.improvement}</span></li>
          <li className="rounded-xl bg-[#fffaf7] px-4 py-3">Daily plan task — <span className="font-semibold text-paper">{COIN_REWARDS.daily_task}</span></li>
          <li className="rounded-xl bg-[#fffaf7] px-4 py-3">Tutoring topic — <span className="font-semibold text-paper">{COIN_REWARDS.tutoring_level}</span></li>
          <li className="rounded-xl bg-[#fffaf7] px-4 py-3">Game win — <span className="font-semibold text-paper">{COIN_REWARDS.game_win}</span></li>
          <li className="rounded-xl bg-[#fffaf7] px-4 py-3">Correct answer — <span className="font-semibold text-paper">{COIN_REWARDS.correct_answer}</span></li>
        </ul>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
          {STORE_ITEMS.length} pieces in rotation
        </p>
      </section>
    </div>
  )
}
