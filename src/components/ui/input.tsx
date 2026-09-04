import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-2xl neu-inset px-3 py-2 text-sm text-paper placeholder:text-fog/60',
            'focus:outline-none focus:ring-2 focus:ring-signal/40',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'ring-2 ring-bad/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-bad">{error}</p>}
        {helperText && !error && <p className="text-xs text-fog">{helperText}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
