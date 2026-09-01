'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'neu-raised text-white hover:bg-signal-hot',
        secondary: 'neu-sm text-paper hover:brightness-[0.98]',
        ghost: 'text-fog hover:text-paper rounded-2xl',
        destructive: 'bg-bad text-white rounded-2xl hover:brightness-110',
        outline: 'neu-inset text-paper',
        success: 'bg-ok text-white rounded-2xl hover:brightness-110',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </span>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
