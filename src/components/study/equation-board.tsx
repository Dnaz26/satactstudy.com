'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { TutorRichText } from '@/components/practice/question-prompt'
import { cn } from '@/lib/utils'
import type { LessonExample, LessonExampleSet } from '@/lib/study/examples'
import type { LessonStepId } from '@/lib/study/lesson-flow'
import type { BoardExample } from '@/lib/study/teach-beats'

function sameLabel(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** Example board — locked to the example Nova is currently explaining. */
export function TeachingBoard({
  examples,
  focusLabel,
  focusSide,
  stepId,
  board,
  className,
}: {
  examples: LessonExampleSet
  focusLabel?: string
  focusSide?: 'yes' | 'no' | 'equation'
  stepId: LessonStepId
  /** Whiteboard example for the current beat — takes precedence over the pool. */
  board?: BoardExample | null
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

  if (!showBoard) return board?.lines?.length ? <Whiteboard board={board} className={className} /> : null

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Board math with Nova's current marks spotlighted (highlighter style). */
function HighlightedLine({ line, targets }: { line: string; targets?: string[] }) {
  const clean = (targets ?? []).map((t) => t.trim()).filter(Boolean).sort((a, b) => b.length - a.length)
  if (!clean.length) return <TutorRichText text={line} className="text-inherit" />
  const pattern = new RegExp(`(${clean.map(escapeRegExp).join('|')})`, 'g')
  const chunks = line.split(pattern)
  const targetSet = new Set(clean)
  return (
    <span>
      {chunks.map((chunk, i) =>
        targetSet.has(chunk) ? (
          <mark key={i} className="rounded-md bg-amber-300/90 px-1 text-[#1d4ed8] ring-2 ring-amber-500">
            {chunk}
          </mark>
        ) : (
          <span key={i}>{chunk}</span>
        ),
      )}
    </span>
  )
}

/**
 * Nova's whiteboard — ONE example with the ONE annotation she is making
 * right now. Her speech bubble lectures; this board shows the work, with
 * the exact symbols she is talking about spotlighted.
 */
function Whiteboard({ board, className }: { board: BoardExample; className?: string }) {
  const boardKey = `${board.lines.join(' | ')} || ${board.note ?? ''} || ${(board.highlight ?? []).join(',')}`
  const isProof = /✓/.test(board.note ?? '')
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.75rem] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-5 shadow-[0_18px_0_rgba(0,0,0,0.05)] sm:p-7',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5c39]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
          Whiteboard · Nova is writing
        </p>
      </div>
      <div
        className="rounded-[1.35rem] bg-white px-4 py-6 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] sm:px-6"
        style={{
          backgroundImage:
            'linear-gradient(rgba(29,78,216,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(29,78,216,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={boardKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="space-y-2 text-center">
              {board.lines.map((line) => (
                <p
                  key={line}
                  className="font-display text-3xl font-bold tracking-tight text-[#1d4ed8] sm:text-4xl"
                >
                  <HighlightedLine line={line} targets={board.highlight} />
                </p>
              ))}
            </div>
            {board.note && (
              <motion.div
                initial={{ opacity: 0, y: 8, rotate: -0.4 }}
                animate={{ opacity: 1, y: 0, rotate: 0.4 }}
                transition={{ duration: 0.25, delay: 0.35 }}
                className={cn(
                  'mx-auto max-w-md rounded-2xl border px-3.5 py-2.5 text-left text-[15px] font-medium leading-snug',
                  isProof
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-[#7c4a12]',
                )}
              >
                <TutorRichText text={board.note} className="text-inherit" />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mx-auto mt-3 flex h-2 w-40 items-center justify-center gap-1.5" aria-hidden>
        <span className="h-2 w-10 rounded-full bg-[#ff5c39]/70" />
        <span className="h-2 w-10 rounded-full bg-[#1d4ed8]/70" />
        <span className="h-2 w-10 rounded-full bg-[#059669]/70" />
        <span className="h-2 w-10 rounded-full bg-black/20" />
      </div>
    </div>
  )
}
