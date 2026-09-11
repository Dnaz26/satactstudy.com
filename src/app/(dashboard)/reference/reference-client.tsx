'use client'

import * as React from 'react'
import { VideoGrid } from '@/components/reference/video-player'
import { cn } from '@/lib/utils'
import {
  desmosVideos,
  formulaVideos,
  hardVideos,
  tipVideos,
  vocabVideos,
} from '@/lib/reference/videos'

const SECTIONS = [
  {
    id: 'tips',
    label: 'Tips',
    blurb: 'Core test moves — predict, eliminate, plug in, backsolve. Each video walks the full checklist.',
  },
  {
    id: 'desmos',
    label: 'Desmos',
    blurb: 'Line-by-line calculator lessons: what to type, what the graph means, and how to avoid mode mistakes.',
  },
  {
    id: 'vocab',
    label: 'Vocabulary',
    blurb: 'Break words into parts, test tone in context, and spot trap definitions.',
  },
  {
    id: 'formulas',
    label: 'Formulas',
    blurb: 'Write the formula, plug carefully, and check you answered the asked quantity.',
  },
  {
    id: 'hard',
    label: 'Hard questions',
    blurb: 'Patterns that stall most students — slower explanations with the trap called out.',
  },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const VIDEOS = {
  tips: tipVideos(),
  desmos: desmosVideos(),
  vocab: vocabVideos(),
  formulas: formulaVideos(),
  hard: hardVideos(),
}

export function ReferenceClient() {
  const [section, setSection] = React.useState<SectionId>('tips')
  const active = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0]
  const videos = VIDEOS[section]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-14 pt-4">
      <header className="border-b border-line pb-6">
        <h1 className="font-display text-4xl tracking-tight text-paper">Reference</h1>
        <p className="mt-2 max-w-2xl text-sm text-fog">
          Short guided lessons — not clips. Each one explains when to use the move, every step, the trap, and a takeaway.
        </p>
      </header>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line pb-3">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={cn(
              'pb-2 text-sm transition',
              section === item.id
                ? 'border-b-2 border-signal font-medium text-paper'
                : 'text-fog hover:text-paper',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-paper">{active.blurb}</p>
        <p className="text-xs text-fog">{videos.length} lessons</p>
      </div>

      <VideoGrid videos={videos} />
    </div>
  )
}
