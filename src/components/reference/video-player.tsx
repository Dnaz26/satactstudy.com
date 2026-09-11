'use client'

import * as React from 'react'
import Link from 'next/link'
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { PreviewPhoto } from '@/components/reference/preview-photo'
import { cn } from '@/lib/utils'
import { formatDuration, type ReferenceVideo, type VideoBeat } from '@/lib/reference/videos'

function beatSeconds(beat: VideoBeat): number {
  return Math.max(5200, Math.ceil(beat.say.length / 14) * 1000)
}

function GraphSketch({ lines }: { lines: string[] }) {
  const crossing = lines.length >= 2
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="gbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#134e4a" />
        </linearGradient>
      </defs>
      <rect width="220" height="120" fill="url(#gbg)" />
      <path d="M20 60 H200 M110 12 V108" stroke="rgba(184,242,200,0.35)" strokeWidth="1" />
      {lines[0] && <path d="M28 96 L190 28" stroke="#b8f2c8" strokeWidth="2.6" fill="none" />}
      {lines[1] && <path d="M28 24 L190 92" stroke="#2ec4b6" strokeWidth="2.6" fill="none" />}
      {crossing && <circle cx="110" cy="60" r="6" fill="#ffffff" stroke="#b8f2c8" strokeWidth="2" />}
      {lines.slice(0, 2).map((line, index) => (
        <text key={`${index}-${line}`} x="26" y={18 + index * 14} fill={index === 0 ? '#b8f2c8' : '#9ee0d8'} fontSize="9">
          {line}
        </text>
      ))}
    </svg>
  )
}

function Stage({ video, beat, typed, step, total }: { video: ReferenceVideo; beat: VideoBeat; typed: string; step: number; total: number }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(46,196,182,0.35),transparent_45%),linear-gradient(160deg,#0f766e_0%,#134e4a_55%,#0a3d3a_100%)]">
      <div className="flex items-center justify-between px-4 pt-3 text-[10px] uppercase tracking-[0.18em] text-white/55">
        <span>{video.kind} lesson</span>
        <span>
          {step + 1} / {total}
        </span>
      </div>

      {video.kind === 'desmos' ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 p-3 sm:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/25 p-3 font-mono text-[12px] leading-5 text-[#e8fff8]">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[#b8f2c8]/80">Type in Desmos</p>
            {(beat.lines.length ? beat.lines : [' ']).map((line, index) => (
              <p key={`${line}-${index}`} className={cn('truncate py-0.5', index === beat.lines.length - 1 && 'text-white')}>
                <span className="mr-2 text-[#7ed99a]">{index + 1}</span>
                {index === beat.lines.length - 1 ? typed || line : line}
              </p>
            ))}
            {!beat.lines.length && <p className="text-white/70">{typed || 'Ready — watch each line appear.'}</p>}
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/15">
            <GraphSketch lines={beat.lines} />
          </div>
        </div>
      ) : video.kind === 'vocab' && beat.parts?.length ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6">
          <p className="text-center text-4xl font-semibold tracking-wide text-white sm:text-5xl">
            {beat.parts.map((part) => part.text).join('')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {beat.parts.map((part) => (
              <div key={part.text} className="min-w-[5rem] rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-center backdrop-blur">
                <p className="font-mono text-lg text-white">{part.text}</p>
                <p className="text-[11px] text-[#b8f2c8]">{part.meaning}</p>
              </div>
            ))}
          </div>
          <p className="max-w-lg text-center text-sm leading-relaxed text-white/85">{typed || beat.headline}</p>
        </div>
      ) : video.kind === 'formula' ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[#b8f2c8]/80">{video.rule}</p>
          <p className="font-mono text-3xl text-white sm:text-4xl">{beat.lines[0] || typed || video.title}</p>
          {beat.lines[1] && <p className="max-w-md text-sm leading-relaxed text-white/80">{beat.lines[1]}</p>}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 px-6 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#b8f2c8]/80">{beat.headline}</p>
          <ol className="space-y-2.5">
            {beat.lines.map((line, index) => (
              <li
                key={`${line}-${index}`}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm leading-relaxed',
                  index === beat.lines.length - 1 ? 'bg-white/15 text-white' : 'text-white/65',
                )}
              >
                <span className="mr-2 font-mono text-[11px] text-[#b8f2c8]">{String(index + 1).padStart(2, '0')}</span>
                {index === beat.lines.length - 1 ? typed || line : line}
              </li>
            ))}
          </ol>
        </div>
      )}
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
    <button type="button" onClick={() => onPlay(video)} className="group w-full text-left">
      <div className="relative overflow-hidden rounded-2xl border border-line">
        <div className="aspect-[4/3] overflow-hidden bg-[#0f766e] transition duration-200 group-hover:opacity-95">
          <PreviewPhoto video={video} />
        </div>
        <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-0.5 font-mono text-[10px] text-paper">
          {formatDuration(video.durationSec)} · {video.beats.length} steps
        </span>
      </div>
      <div className="mt-2.5 space-y-1 px-0.5">
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
    }, 16)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#134e4a]/55 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-[0_30px_80px_rgba(15,118,110,0.25)]">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-fog">{video.kind} · guided lesson</p>
            <h2 className="mt-0.5 text-base font-semibold text-paper sm:text-lg">{video.title}</h2>
            <p className="mt-1 text-xs text-fog">{video.rule}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-fog hover:bg-panel-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="aspect-video shrink-0">
          <Stage video={video} beat={beat} typed={typed} step={index} total={video.beats.length} />
        </div>

        <div className="h-1 bg-panel-2">
          <div className="h-full bg-signal transition-all" style={{ width: `${((index + 1) / video.beats.length) * 100}%` }} />
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-fog">{beat.headline}</p>
            <p className="mt-2 text-sm leading-relaxed text-paper">{beat.say}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {video.beats.map((item, i) => (
              <button
                key={`${item.headline}-${i}`}
                type="button"
                onClick={() => {
                  setIndex(i)
                  setPlaying(false)
                }}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px]',
                  i === index ? 'bg-signal text-white' : 'bg-panel-2 text-fog hover:text-paper',
                )}
              >
                {i + 1}. {item.headline.replace(/^Step /, 'S')}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-full p-2 text-paper hover:bg-panel-2"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              aria-label="Previous step"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-signal text-white"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-paper hover:bg-panel-2"
              onClick={() => setIndex((current) => Math.min(video.beats.length - 1, current + 1))}
              aria-label="Next step"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {video.href && (
            <Link href={video.href} className="block text-center text-xs font-semibold text-signal">
              Open live Desmos walkthrough →
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {videos.map((video) => (
          <VideoThumbnail key={video.id} video={video} onPlay={setActive} />
        ))}
      </div>
      {active && <VideoPlayerModal video={active} onClose={() => setActive(null)} />}
    </>
  )
}
