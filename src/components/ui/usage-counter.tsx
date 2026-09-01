import * as React from 'react'
import { cn } from '@/lib/utils'
import { Progress } from './progress'

interface UsageCounterProps {
  label: string
  used: number
  limit: number
  className?: string
}

export function UsageCounter({ label, used, limit, className }: UsageCounterProps) {
  const isUnlimited = limit >= 999999
  const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100)
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#EAB308' : '#3B82F6'

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex justify-between items-center text-xs">
        <span className="text-fog">{label}</span>
        <span className="text-paper font-medium">
          {used}/{isUnlimited ? '∞' : limit}
        </span>
      </div>
      {!isUnlimited && <Progress value={pct} color={color} />}
    </div>
  )
}
