import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]',
  {
    variants: {
      variant: {
        default: 'neu-sm text-signal',
        success: 'neu-sm text-ok',
        warning: 'neu-sm text-warn',
        danger: 'neu-sm text-bad',
        info: 'neu-sm text-ice',
        secondary: 'neu-sm text-fog',
        outline: 'neu-inset text-fog',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
