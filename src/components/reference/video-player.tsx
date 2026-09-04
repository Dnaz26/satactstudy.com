'use client'

import * as React from 'react'
import Link from 'next/link'
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { Companion } from '@/components/ui/companion'
import { PreviewPhoto } from '@/components/reference/preview-photo'
import { cn } from '@/lib/utils'
import { formatDuration, type ReferenceVideo, type VideoBeat } from '@/lib/reference/videos'

function beatSeconds(beat: VideoBeat): number {
  return Math.max(4000, Math.ceil(beat.say.length / 18) * 1000)
}

function GraphSketch({ lines }: { lines: string[] }) {
  const crossing = lines.length >= 2
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      <rect width="220" height="120" fill="#0b1220" />
      <path d="M20 60 H200 M110 12 V108" stroke="#3d4f6d" strokeWidth="1" />
      {lines[0] && <path d="M28 96 L190 28" stroke="#7dd3fc" strokeWidth="2.4" fill="none" />}
      {lines[1] && <path d="M28 24 L190 92" stroke="#fb923c" strokeWidth="2.4" fill="none" />}
      {crossing && <circle cx="110" cy="60" r="5" fill="#ff6b57" />}
      {lines.slice(0, 2).map((line, index) => (
        <text key={`${index}-${line}`} x="26" y={18 + index * 14} fill={index === 0 ? '#7dd3fc' : '#fb923c'} fontSize="9">
          {line}
        </text>
      ))}
    </svg>
  )
}

function Stage({ video, beat, typed }: { video: ReferenceVideo; beat: VideoBeat; typed: string }) {
  if (video.kind === 'desmos') {
    return (
      <div className="grid h-full grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2 p-3">
        <div className="overflow-hidden rounded-xl bg-[#101826] p-3 font-mono text-[11px] leading-5 text-sky-100">
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-sky-300/70">Desmos</p>
          {(beat.lines.length ? beat.lines : [' ']).map((line, index) => (
            <p key={`${line}-${index}`} className="truncate">
              <span className="mr-2 text-sky-500">{index + 1}</span>
              {index === beat.lines.length - 1 ? typed || line : line}
            </p>
          ))}
          {!beat.lines.length && <p className="text-sky-200/70">{typed || 'Ready. Watch me type.'}</p>}
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <GraphSketch lines={beat.lines} />
        </div>
      </div>
    )
  }

  if (video.kind === 'vocab' && beat.parts?.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6">
        <p className="text-3xl font-semibold tracking-wide text-white">{beat.parts.map((part) => part.text).join('')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {beat.parts.map((part) => (
            <div key={part.text} className="min-w-[4.5rem] rounded-2xl bg-white/10 px-3 py-2 text-center">
              <p className="font-mono text-lg text-white">{part.text}</p>
              <p className="text-[11px] text-sky-200/80">{part.meaning}</p>
            </div>
          ))}
        </div>
        <p className="max-w-md text-center text-sm text-sky-100/90">{typed || beat.headline}</p>
      </div>
    )
  }

  if (video.kind === 'formula') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-300/80">{video.rule}</p>
        <p className="font-mono text-2xl text-white sm:text-3xl">{beat.lines[0] || typed || video.title}</p>
        {beat.lines[1] && <p className="max-w-md text-sm text-sky-100/80">{beat.lines[1]}</p>}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-sky-300/80">{beat.headline}</p>
      <ol className="space-y-2">
        {beat.lines.map((line, index) => (
          <li key={line} className={cn('text-sm', index === beat.lines.length - 1 ? 'text-white' : 'text-sky-100/70')}>
            <span className="mr-2 font-mono text-[11px] text-signal">{String(index + 1).padStart(2, '0')}</span>
            {index === beat.lines.length - 1 ? typed || line : line}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function VideoThumbnail({
  video,
  onPlay,
}: {
  video: ReferenceVideo
  onPlay: (video: ReferenceVideo) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPlay(video)}
      className="group w-full text-left"
    >
      <div className="relative overflow-hidden rounded-xl">
        <div className="aspect-square overflow-hidden bg-[#101826] transition duration-200 group-hover:opacity-95">
          <PreviewPhoto video={video} />
        </div>
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-white">
          <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
            <rect x="1" y="4" width="10" height="8" rx="1.4" fill="currentColor" />
            <path d="M12 6.2 L15 4.6 V11.4 L12 9.8 Z" fill="currentColor" />
          </svg>
          <span className="font-mono text-[10px]">{formatDuration(video.durationSec)}</span>
        </span>
      </div>
      <div className="mt-2 space-y-0.5 px-0.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-paper">{video.title}</p>
        <p className="line-clamp-2 text-xs leading-snug text-fog">{video.blurb}</p>
      </div>
    </button>
  )
}

export function VideoPlayerModal({
  video,
  onClose,
}: {
  video: ReferenceVideo
  onClose: () => void
}) {
  const [index, setIndex] = React.useState(0)
  const [playing, setPlaying] = React.useState(true)
  const beat = video.beats[index] ?? video.beats[0]
  const [typed, setTyped] = React.useState('')

  React.useEffect(() => {
    setIndex(0)
    setPlaying(true)
  }, [video.id])

  React.useEffect(() => {
    const target = beat?.lines[beat.lines.length - 1] || beat?.headline || ''
    setTyped('')
    if (!target) return
    let i = 0
    const timer = window.setInterval(() => {
      i += 1
      setTyped(target.slice(0, i))
      if (i >= target.length) window.clearInterval(timer)
    }, 18)
    return () => window.clearInterval(timer)
  }, [beat])

  React.useEffect(() => {
    if (!playing || !beat) return
    const last = index >= video.beats.length - 1
    const timer = window.setTimeout(() => {
      if (last) setPlaying(false)
      else setIndex((current) => current + 1)
    }, beatSeconds(beat))
    return () => window.clearTimeout(timer)
  }, [playing, beat, index, video.beats.length])

  if (!beat) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1220]/70 p-4">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#0f1728] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-sky-300/70">{video.kind} lesson</p>
            <h2 className="text-sm font-semibold text-white">{video.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-sky-100 hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="aspect-video bg-[#0b1220]">
          <Stage video={video} beat={beat} typed={typed} />
        </div>

        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-signal transition-all"
            style={{ width: `${((index + 1) / video.beats.length) * 100}%` }}
          />
        </div>

        <div className="space-y-3 px-4 py-4">
          <Companion compact mode="studying" message={beat.say} />
          <div className="flex items-center justify-center gap-3">
            <button type="button" className="rounded-full p-2 text-white hover:bg-white/10" onClick={() => setIndex((current) => Math.max(0, current - 1))} aria-label="Previous step">
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-paper"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>
            <button type="button" className="rounded-full p-2 text-white hover:bg-white/10" onClick={() => setIndex((current) => Math.min(video.beats.length - 1, current + 1))} aria-label="Next step">
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          {video.href && (
            <Link href={video.href} className="block text-center text-xs font-semibold text-signal hover:text-white">
              Open the live Desmos walkthrough
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export function VideoGrid({ videos }: { videos: ReferenceVideo[] }) {
  const [active, setActive] = React.useState<ReferenceVideo | null>(null)
  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {videos.map((video) => (
          <VideoThumbnail key={video.id} video={video} onPlay={setActive} />
        ))}
      </div>
      {active && <VideoPlayerModal video={active} onClose={() => setActive(null)} />}
    </>
  )
}
