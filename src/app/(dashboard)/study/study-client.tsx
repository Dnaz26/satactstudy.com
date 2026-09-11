'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BookOpen, Check, Dumbbell, Lock, Star, X } from 'lucide-react'
import { ENGLISH_LEVELS, MATH_LEVELS, getLevel, isLevelOpen, type StudyTrack } from '@/lib/study/levels'

type Row = { track: string; level_index: number; status: string }

type PathNode =
  | { kind: 'lesson'; levelIndex: number; title: string; category: string }
  | { kind: 'chest'; id: string; afterIndex: number }
  | { kind: 'practice'; id: string; category: string }

function buildPath(track: StudyTrack) {
  const levels = track === 'math' ? MATH_LEVELS : ENGLISH_LEVELS
  const categories = Array.from(new Set(levels.map((level) => level.category)))
  const nodes: PathNode[] = []
  for (const category of categories) {
    const group = levels.filter((level) => level.category === category)
    group.forEach((level, i) => {
      nodes.push({ kind: 'lesson', levelIndex: level.index, title: level.title, category })
      if ((i + 1) % 4 === 0 && i !== group.length - 1) {
        nodes.push({ kind: 'chest', id: `${category}-chest-${i}`, afterIndex: level.index })
      }
    })
    nodes.push({ kind: 'practice', id: `${category}-practice`, category })
  }
  return { levels, nodes }
}

const ZIG = [0, 96, 0, -96, 0, 96, 0, -96] as const

export function StudyClient() {
  const router = useRouter()
  const [track, setTrack] = React.useState<StudyTrack>('math')
  const [rows, setRows] = React.useState<Row[]>([])
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null)

  React.useEffect(() => {
    void fetch('/api/study/progress')
      .then((res) => res.json() as Promise<{ rows?: Row[] }>)
      .then((data) => setRows(data.rows ?? []))
      .catch(() => undefined)
  }, [])

  const { levels, nodes } = React.useMemo(() => buildPath(track), [track])
  const byIndex = new Map(rows.filter((row) => row.track === track).map((row) => [row.level_index, row.status]))
  const finished = levels.filter((level) => byIndex.get(level.index) === 'completed').length
  const pct = Math.round((finished / Math.max(1, levels.length)) * 100)

  const currentIndex = levels.find((level) => isLevelOpen(track, level.index, byIndex) && byIndex.get(level.index) !== 'completed')?.index
    ?? levels.find((level) => isLevelOpen(track, level.index, byIndex))?.index
    ?? null

  const preview = previewIndex != null ? getLevel(track, previewIndex) : null

  return (
    <div className="relative mx-auto min-h-[80vh] w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f4fffc_40%,#e8fff2_100%)] pb-24 pt-4 shadow-[0_28px_0_rgba(0,0,0,0.06),0_40px_80px_rgba(0,0,0,0.1)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 8%, rgba(46,196,182,0.22), transparent 42%), radial-gradient(circle at 85% 5%, rgba(184,242,200,0.45), transparent 38%), radial-gradient(circle at 50% 100%, rgba(46,196,182,0.12), transparent 45%)',
        }}
      />

      <div className="sticky top-0 z-20 mx-4 mb-6 rounded-[1.75rem] border border-black/8 bg-white/95 px-4 pb-4 pt-3 shadow-[0_14px_0_rgba(0,0,0,0.06)] backdrop-blur sm:mx-6 sm:px-5">
        <p className="mb-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#9a9a9a]">
          Tutoring path
        </p>
        <div className="flex gap-3">
          {(['math', 'english'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTrack(value)
                setPreviewIndex(null)
              }}
              className={cn(
                'flex-1 rounded-[1.35rem] py-4 text-base font-extrabold uppercase tracking-wide transition-transform active:translate-y-1',
                track === value
                  ? 'bg-[#2ec4b6] text-white shadow-[0_10px_0_#0f766e]'
                  : 'bg-[#efefef] text-[#777] shadow-[0_8px_0_#cfcfcf]',
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-black/[0.06] shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]">
          <div
            className="h-full rounded-full bg-[#7ed99a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-center text-sm font-extrabold text-[#5a5a5a]">
          {finished}/{levels.length} levels cleared · {pct}%
        </p>
      </div>

      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-11 px-4 py-8 sm:max-w-2xl sm:gap-12">
        <div
          aria-hidden
          className="absolute bottom-8 top-12 w-5 rounded-full bg-[linear-gradient(180deg,#2ec4b6,#2ec4b6,#7ed99a)] opacity-35 shadow-[0_0_24px_rgba(46,196,182,0.25)]"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />

        {nodes.map((node, i) => {
          const offset = ZIG[i % ZIG.length]
          if (node.kind === 'chest') {
            const unlocked = Boolean(
              currentIndex != null
                ? node.afterIndex < currentIndex || byIndex.get(node.afterIndex) === 'completed'
                : byIndex.get(node.afterIndex) === 'completed',
            )
            return (
              <div key={node.id} className="relative z-10" style={{ transform: `translateX(${offset}px)` }}>
                <div
                  className={cn(
                    'flex h-20 w-24 items-end justify-center drop-shadow-[0_14px_0_rgba(0,0,0,0.1)]',
                    unlocked ? 'opacity-100' : 'opacity-40 grayscale',
                  )}
                  aria-hidden
                >
                  <svg width="80" height="68" viewBox="0 0 56 48" fill="none">
                    <rect x="6" y="18" width="44" height="26" rx="6" fill={unlocked ? '#2ec4b6' : '#d9d9d9'} />
                    <rect x="6" y="18" width="44" height="10" fill={unlocked ? '#0f766e' : '#cfcfcf'} />
                    <rect x="18" y="8" width="20" height="12" rx="3" fill={unlocked ? '#7ed99a' : '#d0d0d0'} />
                    <circle cx="28" cy="30" r="4.5" fill={unlocked ? '#134e4a' : '#bdbdbd'} />
                  </svg>
                </div>
              </div>
            )
          }

          if (node.kind === 'practice') {
            const group = levels.filter((level) => level.category === node.category)
            const allDone = group.every((level) => byIndex.get(level.index) === 'completed')
            const firstOpen = group.find((level) => isLevelOpen(track, level.index, byIndex))
            return (
              <div key={node.id} className="relative z-10" style={{ transform: `translateX(${offset}px)` }}>
                <button
                  type="button"
                  disabled={!firstOpen}
                  onClick={() => firstOpen && router.push(`/study/${track}/${firstOpen.index}`)}
                  className={cn(
                    'flex h-[108px] w-[108px] items-center justify-center rounded-[2rem] border-[7px] border-white transition-transform active:translate-y-1 sm:h-[120px] sm:w-[120px]',
                    allDone
                      ? 'bg-[#7ed99a] text-white shadow-[0_14px_0_#5fc480]'
                      : firstOpen
                        ? 'bg-[#2ec4b6] text-white shadow-[0_14px_0_#0f766e]'
                        : 'bg-[#ececec] text-[#b0b0b0] shadow-[0_14px_0_#d0d0d0]',
                  )}
                  aria-label={`${node.category} practice`}
                >
                  <Dumbbell className="h-11 w-11 sm:h-12 sm:w-12" strokeWidth={2.5} />
                </button>
                <p className="mt-3 max-w-[9rem] text-center text-xs font-extrabold uppercase tracking-wide text-[#7a7a7a]">
                  {node.category}
                </p>
              </div>
            )
          }

          const done = byIndex.get(node.levelIndex) === 'completed'
          const open = isLevelOpen(track, node.levelIndex, byIndex)
          const isCurrent = open && !done && node.levelIndex === currentIndex
          const locked = !open && !done

          const circle = (
            <div className="relative z-10" style={{ transform: `translateX(${offset}px)` }}>
              {isCurrent && (
                <div className="absolute -top-12 left-1/2 z-10 -translate-x-1/2">
                  <div className="relative rounded-2xl bg-[#2ec4b6] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-[0_6px_0_#0f766e]">
                    Now
                    <span className="absolute left-1/2 top-full -mt-px -translate-x-1/2 border-x-8 border-t-[9px] border-x-transparent border-t-[#2ec4b6]" />
                  </div>
                </div>
              )}
              <div
                className={cn(
                  'flex h-[108px] w-[108px] items-center justify-center rounded-full border-[7px] border-white transition-transform sm:h-[120px] sm:w-[120px]',
                  isCurrent && 'bg-[#2ec4b6] text-white shadow-[0_14px_0_#0f766e] ring-[10px] ring-[rgba(46,196,182,0.25)]',
                  done && !isCurrent && 'bg-[#7ed99a] text-white shadow-[0_14px_0_#5fc480]',
                  open && !done && !isCurrent && 'bg-[#3dd4c6] text-white shadow-[0_14px_0_#0f766e]',
                  locked && 'bg-[#e8e8e8] text-[#9a9a9a] shadow-[0_14px_0_#c8c8c8]',
                )}
              >
                {isCurrent ? (
                  <Star className="h-12 w-12 fill-white text-white sm:h-14 sm:w-14" />
                ) : done ? (
                  <Check className="h-12 w-12 sm:h-14 sm:w-14" strokeWidth={3} />
                ) : locked ? (
                  <Lock className="h-11 w-11 sm:h-12 sm:w-12" strokeWidth={2.5} />
                ) : (
                  <BookOpen className="h-11 w-11 sm:h-12 sm:w-12" strokeWidth={2.5} />
                )}
              </div>
              <p className="mt-3 max-w-[11rem] text-center text-sm font-extrabold leading-tight text-[#3a3a3a]">
                {node.title}
              </p>
            </div>
          )

          if (locked) {
            return (
              <button
                key={node.levelIndex}
                type="button"
                className="block"
                onClick={() => setPreviewIndex(node.levelIndex)}
                aria-label={`Preview ${node.title}`}
              >
                {circle}
              </button>
            )
          }

          return (
            <Link
              key={node.levelIndex}
              href={`/study/${track}/${node.levelIndex}`}
              className="block active:translate-y-1"
              aria-label={node.title}
            >
              {circle}
            </Link>
          )
        })}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_28px_0_rgba(0,0,0,0.14)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9a9a9a]">Locked preview</p>
                <h2 className="mt-1 font-display text-3xl text-paper">{preview.title}</h2>
                <p className="mt-1 text-sm font-bold text-[#2ec4b6]">{preview.category}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                className="rounded-full bg-black/[0.05] p-2.5 text-fog"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-base leading-relaxed text-fog">{preview.example}</p>
            {preview.teach[0] && (
              <p className="mt-4 rounded-2xl bg-black/[0.03] px-4 py-3 text-base text-paper">
                {preview.teach[0]}
              </p>
            )}
            <p className="mt-4 text-sm text-fog">Finish earlier levels to unlock this lesson.</p>
            <button
              type="button"
              onClick={() => setPreviewIndex(null)}
              className="mt-5 w-full rounded-[1.35rem] bg-[#2ec4b6] py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_8px_0_#0f766e] active:translate-y-1"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
