'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { TutorRichText } from '@/components/practice/question-prompt'
import { cn } from '@/lib/utils'
import type { LessonExample, LessonExampleSet } from '@/lib/study/examples'
import type { LessonStepId } from '@/lib/study/lesson-flow'

function sameLabel(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** Example board — locked to the example Nova is currently explaining. */
export function TeachingBoard({
  examples,
  focusLabel,
  focusSide,
  stepId,
  className,
}: {
  examples: LessonExampleSet
  focusLabel?: string
  focusSide?: 'yes' | 'no' | 'equation'
  stepId: LessonStepId
  className?: string
}) {
  const showBoard = stepId === 'yesExamples' || stepId === 'noExamples'

  const chipPool = React.useMemo(() => {
    if (!showBoard) return [] as LessonExample[]
    const raw = stepId === 'noExamples' ? examples.no : examples.yes
    if (!raw?.length) return [] as LessonExample[]
    const seen = new Set<string>()
    const unique: LessonExample[] = []
    for (const item of raw) {
      const key = item.label.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      unique.push(item)
    }
    return unique
  }, [examples.no, examples.yes, showBoard, stepId])

  const activeIndex = React.useMemo(() => {
    if (!chipPool.length) return 0
    if (focusLabel) {
      const hit = chipPool.findIndex((item) => sameLabel(item.label, focusLabel))
      if (hit >= 0) return hit
    }
    return 0
  }, [chipPool, focusLabel])

  if (!showBoard) return null

  const activeChip = chipPool[activeIndex] ?? null
  const crossed = stepId === 'noExamples'

  if (!activeChip) return null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.75rem] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f3_100%)] p-5 shadow-[0_18px_0_rgba(0,0,0,0.05)] sm:p-7',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-h-[9rem] flex-col items-center justify-center gap-3 rounded-[1.35rem] bg-white px-4 py-8 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]',
          focusSide === 'yes' && 'ring-2 ring-emerald-400/50',
          focusSide === 'no' && 'ring-2 ring-rose-400/50',
        )}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
          Example {activeIndex + 1} of {chipPool.length}
          {' · '}
          with Nova
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${stepId}-${activeChip.label}`}
            initial={{ opacity: 0, scale: 0.88, y: 10 }}
            animate={{ opacity: 1, scale: 1.06, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'relative rounded-2xl border px-6 py-4 font-display text-3xl tracking-tight text-paper sm:text-4xl',
              crossed
                ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-400/40'
                : 'border-signal bg-[rgba(255,92,57,0.12)] ring-2 ring-signal/40',
            )}
          >
            {crossed && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <X className="h-12 w-12 text-rose-500/40" strokeWidth={3} />
              </span>
            )}
            <span className="relative">
              <TutorRichText text={activeChip.label} className="text-inherit" />
            </span>
          </motion.div>
        </AnimatePresence>
        {chipPool.length > 1 && (
          <div className="flex gap-1.5">
            {chipPool.map((item, i) => (
              <span
                key={item.label}
                className={cn(
                  'h-1.5 w-4 rounded-full transition',
                  i === activeIndex ? 'bg-signal' : 'bg-black/10',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
