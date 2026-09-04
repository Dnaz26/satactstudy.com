'use client'

import * as React from 'react'
import Link from 'next/link'
import { Companion } from '@/components/ui/companion'
import { cn } from '@/lib/utils'
import { Lock, Check } from 'lucide-react'
import { ENGLISH_LEVELS, MATH_LEVELS, isLevelOpen, type StudyTrack } from '@/lib/study/levels'

type Row = { track: string; level_index: number; status: string }

export function StudyClient() {
  const [track, setTrack] = React.useState<StudyTrack>('math')
  const [rows, setRows] = React.useState<Row[]>([])

  React.useEffect(() => {
    void fetch('/api/study/progress')
      .then((res) => res.json() as Promise<{ rows?: Row[] }>)
      .then((data) => setRows(data.rows ?? []))
      .catch(() => undefined)
  }, [])

  const levels = track === 'math' ? MATH_LEVELS : ENGLISH_LEVELS
  const byIndex = new Map(rows.filter((row) => row.track === track).map((row) => [row.level_index, row.status]))
  const categories = Array.from(new Set(levels.map((level) => level.category)))
  const finished = levels.filter((level) => byIndex.get(level.index) === 'completed').length

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pt-2 pb-10">
      <h1 className="font-display text-2xl">Study</h1>
      <Companion
        mode="studying"
        message={
          track === 'math'
            ? `${MATH_LEVELS.length} SAT and ACT math topics, grouped the way the tests group them. Green means you finished.`
            : `${ENGLISH_LEVELS.length} SAT Reading and Writing plus ACT English, Reading, and Science figure topics.`
        }
      />

      <div className="flex gap-2">
        {(['math', 'english'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTrack(value)}
            className={cn('flex-1 rounded-2xl py-3 text-sm font-semibold capitalize', track === value ? 'neu-raised text-white' : 'neu-sm text-paper')}
          >
            {value}
          </button>
        ))}
      </div>

      <p className="text-xs text-fog">
        {finished} of {levels.length} levels finished. The first topic in each group is open. Finish one to unlock the next in that group.
      </p>

      {categories.map((category) => {
        const group = levels.filter((level) => level.category === category)
        const groupDone = group.filter((level) => byIndex.get(level.index) === 'completed').length
        return (
          <section key={category} className="space-y-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-sm font-semibold text-paper">{category}</h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog">
                {groupDone}/{group.length}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.map((level) => {
                const status = byIndex.get(level.index)
                const done = status === 'completed'
                const open = isLevelOpen(track, level.index, byIndex)
                const inner = (
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-2xl px-4 py-4',
                      done ? 'bg-ok/20 text-paper' : open ? 'neu-sm text-paper' : 'neu-sm text-fog'
                    )}
                  >
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Level {level.index}</p>
                      <p className="text-sm">{level.title}</p>
                    </div>
                    {done ? <Check className="h-4 w-4 text-ok" /> : open ? null : <Lock className="h-4 w-4" />}
                  </div>
                )
                if (!open) return <div key={level.index}>{inner}</div>
                return (
                  <Link key={level.index} href={`/study/${track}/${level.index}`}>
                    {inner}
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
