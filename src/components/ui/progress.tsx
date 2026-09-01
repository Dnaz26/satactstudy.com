'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  color?: string
  showLabel?: boolean
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, color, showLabel, ...props }, ref) => (
  <div className="flex items-center gap-2">
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        'relative h-2.5 w-full overflow-hidden rounded-full neu-inset',
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 transition-all duration-500 ease-out rounded-full"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          backgroundColor: color ?? '#FF6B57',
        }}
      />
    </ProgressPrimitive.Root>
    {showLabel && (
      <span className="text-xs text-fog min-w-[3ch]">{Math.round(value ?? 0)}%</span>
    )}
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
