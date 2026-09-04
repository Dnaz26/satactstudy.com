'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MasteryBar } from '@/components/ui/mastery-bar'
import { ChevronDown } from 'lucide-react'

export type BrowseCategory = {
  id: string
  name: string
  topics: Array<{ id: string; name: string }>
}

export function TopicBrowse({
  title,
  categories,
  mastery,
}: {
  title: string
  categories: BrowseCategory[]
  mastery: Map<string, number> | Record<string, number>
}) {
  const [openId, setOpenId] = React.useState<string | null>(null)
  const getMastery = (id: string) =>
    mastery instanceof Map ? (mastery.get(id) ?? 0) : (mastery[id] ?? 0)

  if (categories.length === 0) {
    return (
      <div className="mx-auto w-full max-w-xl pt-2">
        <h1 className="font-display text-2xl">{title}</h1>
        <p className="mt-4 text-sm text-fog">Nothing here yet.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-3 pt-2">
      <h1 className="font-display text-2xl">{title}</h1>
      {categories.map((category) => {
        const topics = category.topics ?? []
        const avg = topics.length
          ? topics.reduce((s, t) => s + getMastery(t.id), 0) / topics.length
          : 0
        const open = openId === category.id
        return (
          <div key={category.id} className="neu-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setOpenId(open ? null : category.id)}
              >
                <p className="truncate text-sm text-paper">{category.name}</p>
                <MasteryBar mastery={avg} showPercent={false} className="mt-2" />
              </button>
              <ChevronDown className={`h-4 w-4 shrink-0 text-fog transition-transform ${open ? 'rotate-180' : ''}`} />
              <Link href={`/practice?categoryId=${category.id}`}>
                <Button size="sm">Go</Button>
              </Link>
            </div>
            {open && (
              <div className="space-y-1 px-4 pb-3">
                {topics.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/practice?topicId=${topic.id}`}
                    className="flex items-center justify-between py-1.5 text-sm text-fog hover:text-paper"
                  >
                    <span className="truncate">{topic.name}</span>
                    <span className="font-mono text-xs">{Math.round(getMastery(topic.id))}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
