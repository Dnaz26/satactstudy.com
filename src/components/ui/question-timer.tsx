'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface QuestionTimerProps {
  mode: 'countup' | 'countdown'
  initialSeconds?: number
  running: boolean
  onTimeUp?: () => void
  onTick?: (seconds: number) => void
  className?: string
  large?: boolean
}

export function QuestionTimer({
  mode,
  initialSeconds = 0,
  running,
  onTimeUp,
  onTick,
  className,
  large = false,
}: QuestionTimerProps) {
  const [seconds, setSeconds] = React.useState(
    mode === 'countdown' ? initialSeconds : 0
  )

  React.useEffect(() => {
    setSeconds(mode === 'countdown' ? initialSeconds : 0)
  }, [mode, initialSeconds])

  React.useEffect(() => {
    if (!running) return

    const interval = setInterval(() => {
      setSeconds((prev) => {
        const next = mode === 'countdown' ? prev - 1 : prev + 1
        onTick?.(next)
        if (mode === 'countdown' && next <= 0) {
          clearInterval(interval)
          onTimeUp?.()
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [running, mode, onTimeUp, onTick])

  const displaySeconds = Math.abs(seconds)
  const mins = Math.floor(displaySeconds / 60)
  const secs = displaySeconds % 60
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const isWarning = mode === 'countdown' && seconds <= 30 && seconds > 0
  const isUrgent = mode === 'countdown' && seconds <= 10 && seconds > 0

  return (
    <div
      className={cn(
        'flex items-center gap-2 font-mono font-bold rounded-xl px-3 py-2',
        'border border-transparent neu-inset transition-colors',
        isUrgent && 'border-red-500/50 bg-red-500/10 text-bad',
        isWarning && !isUrgent && 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
        !isWarning && !isUrgent && 'text-paper',
        large ? 'text-3xl' : 'text-lg',
        className
      )}
    >
      <Clock className={cn(large ? 'w-6 h-6' : 'w-4 h-4')} />
      <span>{timeStr}</span>
    </div>
  )
}
