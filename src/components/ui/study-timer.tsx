'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStudyClock } from '@/lib/study/clock'

function postSeconds(seconds: number) {
  if (seconds < 15) return
  void fetch('/api/study/time', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seconds }),
  }).catch(() => undefined)
}

export function StudyTimer({
  running = true,
  label = 'Study time',
  className,
  onSeconds,
}: {
  running?: boolean
  label?: string
  className?: string
  onSeconds?: (seconds: number) => void
}) {
  const [seconds, setSeconds] = React.useState(0)
  const pending = React.useRef(0)
  const onSecondsRef = React.useRef(onSeconds)
  onSecondsRef.current = onSeconds

  React.useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1
        pending.current += 1
        onSecondsRef.current?.(next)
        if (pending.current >= 60) {
          postSeconds(pending.current)
          pending.current = 0
        }
        return next
      })
    }, 1000)
    return () => {
      window.clearInterval(id)
      if (pending.current >= 15) postSeconds(pending.current)
      pending.current = 0
    }
  }, [running])

  return (
    <div className={cn('neu-sm flex items-center gap-2 rounded-2xl px-3 py-2 font-mono text-sm', className)}>
      <Clock className="h-4 w-4 text-signal" />
      <span className="text-[10px] uppercase tracking-[0.14em] text-fog">{label}</span>
      <span className="font-semibold text-paper">{formatStudyClock(seconds)}</span>
    </div>
  )
}
