'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { TutorRichText } from '@/components/practice/question-prompt'
import { cn } from '@/lib/utils'
import { ENGLISH_LEVELS, MATH_LEVELS, type StudyLevel, type StudyTrack } from '@/lib/study/levels'
import { examplesForLevel } from '@/lib/study/examples'
import { buildGuidedLesson } from '@/lib/study/lesson-flow'

type Bucket = 'math' | 'english' | 'reading'

type TopicCard = {
  id: string
  track: StudyTrack
  bucket: Bucket
  category: string
  title: string
  level: StudyLevel
}

function classifyEnglish(level: StudyLevel): Bucket {
  return level.category.toLowerCase().includes('reading') ? 'reading' : 'english'
}

const ALL_TOPICS: TopicCard[] = [
  ...MATH_LEVELS.map((level) => ({
    id: `math-${level.index}`,
    track: 'math' as const,
    bucket: 'math' as const,
    category: level.category,
    title: level.title,
    level,
  })),
  ...ENGLISH_LEVELS.map((level) => ({
    id: `english-${level.index}`,
    track: 'english' as const,
    bucket: classifyEnglish(level),
    category: level.category,
    title: level.title,
    level,
  })),
]

const BUCKETS: Array<{ id: Bucket | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'math', label: 'Math' },
  { id: 'english', label: 'English' },
  { id: 'reading', label: 'Reading' },
]

export function RefreshClient() {
  const [query, setQuery] = React.useState('')
  const [bucket, setBucket] = React.useState<Bucket | 'all'>('all')
  const [selectedId, setSelectedId] = React.useState<string | null>(ALL_TOPICS[0]?.id ?? null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_TOPICS.filter((topic) => {
      if (bucket !== 'all' && topic.bucket !== bucket) return false
      if (!q) return true
      return (
        topic.title.toLowerCase().includes(q)
        || topic.category.toLowerCase().includes(q)
        || topic.level.topicMatch.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [query, bucket])

  const selected = filtered.find((topic) => topic.id === selectedId) ?? filtered[0] ?? null

  React.useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id)
  }, [selected, selectedId])

  const lesson = selected ? buildGuidedLesson(selected.level) : null
  const examples = selected ? examplesForLevel(selected.level) : null

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-16 pt-4">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-fog">Refresh</p>
        <h1 className="font-display text-4xl tracking-tight text-paper">Practice a topic again</h1>
        <p className="max-w-2xl text-sm text-fog">
          Type a topic you want more practice on, or browse Math, English, and Reading. Open a topic to see simple examples.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fog" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a topic… e.g. whole numbers, commas, main idea"
          className="h-14 w-full rounded-[1.25rem] border border-line bg-white pl-11 pr-4 text-base text-paper outline-none focus:border-signal"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setBucket(item.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              bucket === item.id ? 'bg-signal text-white' : 'border border-line bg-white text-fog hover:text-paper',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-[1.5rem] border border-line bg-white p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-sm text-fog">No topics match that search.</p>
          )}
          {filtered.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setSelectedId(topic.id)}
              className={cn(
                'w-full rounded-xl px-3 py-3 text-left transition',
                selected?.id === topic.id ? 'bg-signal/12 text-paper' : 'hover:bg-panel-2 text-fog',
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog">{topic.category}</p>
              <p className="mt-1 text-sm font-semibold text-paper">{topic.title}</p>
            </button>
          ))}
        </div>

        {selected && lesson && examples ? (
          <div className="space-y-5 rounded-[1.75rem] border border-line bg-[linear-gradient(160deg,#fff_0%,#fff7f2_100%)] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">{selected.bucket}</p>
                <h2 className="mt-1 font-display text-3xl text-paper">{selected.title}</h2>
              </div>
              <Link
                href={`/study/${selected.track}/${selected.level.index}`}
                className="rounded-full bg-signal px-4 py-2 text-sm font-semibold text-white"
              >
                Open in tutoring
              </Link>
            </div>

            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Definition</p>
              <p className="text-lg leading-relaxed text-paper">{lesson.whatItIs}</p>
            </div>

            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Real-world example</p>
              <p className="text-lg leading-relaxed text-paper">{lesson.irlExample}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-700">{examples.yesTitle}</p>
                <ul className="mt-3 space-y-3">
                  {examples.yes.slice(0, 5).map((item) => (
                    <li key={item.label} className="text-sm text-paper">
                      <p className="font-semibold"><TutorRichText text={item.label} className="text-inherit" /></p>
                      <p className="mt-1 text-fog">{item.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose-700">{examples.noTitle}</p>
                <ul className="mt-3 space-y-3">
                  {examples.no.slice(0, 5).map((item) => (
                    <li key={item.label} className="text-sm text-paper">
                      <p className="font-semibold"><TutorRichText text={item.label} className="text-inherit" /></p>
                      <p className="mt-1 text-fog">{item.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
