'use client'

import * as React from 'react'
import { Companion } from '@/components/ui/companion'
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
  { id: 'tips', label: 'Tips' },
  { id: 'desmos', label: 'Desmos' },
  { id: 'vocab', label: 'Vocabulary' },
  { id: 'formulas', label: 'Formulas' },
  { id: 'hard', label: 'Hard questions' },
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
  const videos = VIDEOS[section]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pt-2 pb-10">
      <h1 className="font-display text-2xl">Reference</h1>
      <Companion
        compact
        mode="studying"
        message="Tap a preview to watch me work the move — Desmos graphs, word splits, and formulas."
      />

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={cn(
              'rounded-2xl px-3 py-2 text-sm font-semibold',
              section === item.id ? 'neu-raised text-white' : 'neu-sm text-paper'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <VideoGrid videos={videos} />
    </div>
  )
}
