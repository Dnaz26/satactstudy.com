import * as React from 'react'
import { cn } from '@/lib/utils'
import { getMasteryColor, getMasteryLabel } from '@/lib/utils'

interface MasteryBarProps {
  mastery: number
  showLabel?: boolean
  showPercent?: boolean
  className?: string
  height?: string
}

export function MasteryBar({
  mastery,
  showLabel = false,
  showPercent = true,
  className,
  height = 'h-2',
}: MasteryBarProps) {
  const color = getMasteryColor(mastery)
  const label = getMasteryLabel(mastery)

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs">
          <span style={{ color }} className="font-medium">{label}</span>
          {showPercent && <span className="text-fog">{Math.round(mastery)}%</span>}
        </div>
      )}
      <div className={cn('w-full neu-inset rounded-full overflow-hidden', height)}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, mastery))}%`, backgroundColor: color }}
        />
      </div>
      {!showLabel && showPercent && (
        <span className="text-xs text-fog">{Math.round(mastery)}%</span>
      )}
    </div>
  )
}
