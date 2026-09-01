'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { COMPANION_MESSAGES, NOVA_NAME } from '@/lib/constants'
import { MODE_STYLES, type AppMode } from '@/lib/mode'

export type CompanionMode = 'idle' | 'studying' | 'success' | 'warning' | 'struggling'

const COMPANION_TO_APP: Record<CompanionMode, AppMode> = {
  idle: 'idle',
  studying: 'in_progress',
  success: 'success',
  warning: 'warning',
  struggling: 'stuck',
}

interface CompanionProps {
  mode?: CompanionMode
  message?: string
  className?: string
  compact?: boolean
}

function useTypewriter(text: string, speed = 22) {
  const [displayed, setDisplayed] = React.useState('')

  React.useEffect(() => {
    setDisplayed('')
    if (!text) return
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return displayed
}

function getRandomMessage(mode: CompanionMode): string {
  const msgs = COMPANION_MESSAGES[mode]
  return msgs[Math.floor(Math.random() * msgs.length)]
}

function Face({ mode }: { mode: AppMode }) {
  const color = MODE_STYLES[mode].signal
  const face = MODE_STYLES[mode].face
  const mouth =
    face === 'grin' ? 'M8 15 Q12 19 16 15' :
    face === 'tense' ? 'M8 16 Q12 13 16 16' :
    face === 'alert' ? 'M8 15 H16' :
    face === 'focus' ? 'M9 15 H15' :
    face === 'calm' ? 'M8 15 Q12 17 16 15' :
    'M9 15 H15'

  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx="9" cy="10" r={face === 'focus' ? 1.6 : 1.2} fill={color} />
      <circle cx="15" cy="10" r={face === 'focus' ? 1.6 : 1.2} fill={color} />
      <path d={mouth} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Companion({ mode = 'idle', message, className, compact = false }: CompanionProps) {
  const [currentMessage, setCurrentMessage] = React.useState(message ?? getRandomMessage(mode))

  React.useEffect(() => {
    setCurrentMessage(message ?? getRandomMessage(mode))
  }, [mode, message])

  const displayed = useTypewriter(currentMessage)
  const appMode = COMPANION_TO_APP[mode]
  const style = MODE_STYLES[appMode]

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Face mode={appMode} />
        <p className="text-sm text-paper">
          {displayed}
          {displayed.length < currentMessage.length && <span className="caret ml-0.5">▍</span>}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn('flex items-start gap-4 neu p-4', className)}
      style={{ ['--mode-rgb' as string]: style.signalRgb }}
    >
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full neu-sm"
        style={{ color: style.signal }}
      >
        <span className="pulse-ring absolute inset-0" />
        <Face mode={appMode} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: style.signal }}>
          {NOVA_NAME} · {style.label}
        </p>
        <p className="text-sm leading-relaxed text-paper">
          {displayed}
          {displayed.length < currentMessage.length && (
            <span className="caret ml-0.5" style={{ color: style.signal }}>▍</span>
          )}
        </p>
      </div>
    </div>
  )
}
