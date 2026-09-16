'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type NovaMood = 'idle' | 'talk' | 'point' | 'cheer' | 'think'

/**
 * Gamified pencil coach — Nova as an animated study pencil.
 */
export function NovaCharacter({
  mood = 'talk',
  size = 'lg',
  className,
}: {
  mood?: NovaMood
  size?: 'md' | 'lg'
  className?: string
}) {
  const talking = mood === 'talk'
  const pointing = mood === 'point'
  const cheer = mood === 'cheer'
  const think = mood === 'think'
  const w = size === 'lg' ? 168 : 118
  const h = size === 'lg' ? 280 : 196
  const uid = React.useId().replace(/:/g, '')

  const g = {
    wood: `wood-${uid}`,
    paint: `paint-${uid}`,
    metal: `metal-${uid}`,
    tip: `tip-${uid}`,
    eraser: `eraser-${uid}`,
  }

  return (
    <div
      className={cn('relative shrink-0 select-none', className)}
      style={{ width: w, height: h }}
      aria-hidden
    >
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[8%] h-[70%] w-[72%] -translate-x-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,92,57,0.28) 0%, rgba(255,92,57,0.08) 42%, transparent 72%)',
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-signal"
          style={{
            width: 5 + (i % 2) * 3,
            height: 5 + (i % 2) * 3,
            left: `${12 + i * 22}%`,
            top: `${4 + (i % 3) * 8}%`,
            boxShadow: '0 0 12px rgba(255,92,57,0.9)',
          }}
          animate={{ y: [0, -12, 0], opacity: [0.15, 1, 0.15], scale: [0.75, 1.25, 0.75] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}

      <motion.div
        className="absolute inset-0"
        animate={{
          y: cheer ? [0, -14, 0] : talking ? [0, -6, 0] : think ? [0, -2, 0] : [0, -3, 0],
          rotate: pointing
            ? [8, 18, 8]
            : cheer
              ? [-6, 6, -6]
              : talking
                ? [-2, 2.5, -2]
                : think
                  ? [-1, 1, -1]
                  : 0,
        }}
        transition={{ duration: cheer ? 0.55 : pointing ? 0.9 : 1.35, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 160 300" className="h-full w-full drop-shadow-[0_20px_28px_rgba(201,68,36,0.35)]">
          <defs>
            <linearGradient id={g.paint} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff8a66" />
              <stop offset="45%" stopColor="#ff5c39" />
              <stop offset="100%" stopColor="#d63d1f" />
            </linearGradient>
            <linearGradient id={g.wood} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffe0b8" />
              <stop offset="55%" stopColor="#f0c089" />
              <stop offset="100%" stopColor="#d9a066" />
            </linearGradient>
            <linearGradient id={g.metal} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f3f1ee" />
              <stop offset="50%" stopColor="#c9c4bd" />
              <stop offset="100%" stopColor="#9e9890" />
            </linearGradient>
            <linearGradient id={g.tip} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5a4638" />
              <stop offset="100%" stopColor="#1a1210" />
            </linearGradient>
            <linearGradient id={g.eraser} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffb4a4" />
              <stop offset="100%" stopColor="#ef7a68" />
            </linearGradient>
          </defs>

          <ellipse cx="80" cy="286" rx="34" ry="8" fill="#000" opacity="0.16" />

          {/* Eraser cap */}
          <rect x="52" y="18" width="56" height="28" rx="12" fill={`url(#${g.eraser})`} stroke="#d45745" strokeWidth="2" />
          <rect x="58" y="24" width="18" height="8" rx="4" fill="#fff" opacity="0.35" />

          {/* Ferrule */}
          <rect x="50" y="42" width="60" height="22" rx="4" fill={`url(#${g.metal})`} stroke="#8f8982" strokeWidth="1.5" />
          <path d="M52 48 H108 M52 54 H108 M52 60 H108" stroke="#fff" strokeWidth="1.2" opacity="0.45" />

          {/* Painted barrel */}
          <path
            d="M48 62 H112 V188 C112 196 104 202 80 202 C56 202 48 196 48 188 Z"
            fill={`url(#${g.paint})`}
            stroke="#c94424"
            strokeWidth="2.5"
          />
          <path d="M56 70 H72 V180 H56 Z" fill="#fff" opacity="0.14" />
          <circle cx="80" cy="118" r="18" fill="#fff7f3" stroke="#fff" strokeWidth="2.5" />
          <text
            x="80"
            y="125"
            textAnchor="middle"
            fontSize="16"
            fontWeight="900"
            fill="#ff5c39"
            fontFamily="ui-rounded, system-ui, sans-serif"
          >
            N
          </text>

          {/* Face on barrel */}
          <g transform="translate(0 8)">
            <ellipse cx="68" cy="150" rx="5" ry={think ? 2 : 6} fill="#1c1210" />
            <ellipse cx="92" cy="150" rx="5" ry={think ? 2 : 6} fill="#1c1210" />
            <circle cx="66" cy="148" r="1.6" fill="#fff" />
            <circle cx="90" cy="148" r="1.6" fill="#fff" />
            <motion.path
              d={
                talking
                  ? 'M70 166 Q80 176 90 166'
                  : cheer
                    ? 'M68 164 Q80 178 92 164'
                    : think
                      ? 'M72 168 Q80 164 88 168'
                      : 'M70 166 Q80 172 90 166'
              }
              stroke="#1c1210"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              animate={talking ? { scaleY: [1, 1.25, 0.9, 1] } : { scaleY: 1 }}
              style={{ transformOrigin: '80px 166px' }}
              transition={talking ? { duration: 0.35, repeat: Infinity } : { duration: 0.2 }}
            />
            {(talking || cheer) && (
              <>
                <ellipse cx="60" cy="160" rx="7" ry="4" fill="#ff7a58" opacity="0.45" />
                <ellipse cx="100" cy="160" rx="7" ry="4" fill="#ff7a58" opacity="0.45" />
              </>
            )}
          </g>

          {/* Wood tip */}
          <path d="M48 188 L80 268 L112 188 Z" fill={`url(#${g.wood})`} stroke="#c4894f" strokeWidth="2" />
          <path d="M62 188 L80 248 L98 188 Z" fill="#fff" opacity="0.18" />
          <path d="M72 232 L80 268 L88 232 Z" fill={`url(#${g.tip})`} />

          {/* Pointing spark at tip */}
          {pointing && (
            <g>
              <circle cx="80" cy="272" r="7" fill="#ff5c39" />
              <circle cx="80" cy="272" r="14" fill="#ff5c39" opacity="0.28" />
            </g>
          )}
        </svg>
      </motion.div>

      <motion.div
        className="absolute -right-1 top-6 rounded-full border-2 border-white bg-signal px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wide text-white shadow-[0_8px_18px_rgba(255,92,57,0.5)]"
        animate={{ y: [0, -4, 0], rotate: [-4, 4, -4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        Coach
      </motion.div>

      {cheer && (
        <motion.div
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-black text-signal shadow-lg"
          animate={{ y: [0, -20], opacity: [1, 0], scale: [0.9, 1.15] }}
          transition={{ duration: 1.15, repeat: Infinity }}
        >
          +XP
        </motion.div>
      )}

      <motion.div
        className="absolute bottom-0 left-1/2 h-3.5 w-[52%] -translate-x-1/2 rounded-full bg-signal/45 blur-[3px]"
        animate={{ opacity: [0.35, 0.85, 0.35], scaleX: [1, 1.12, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    </div>
  )
}
