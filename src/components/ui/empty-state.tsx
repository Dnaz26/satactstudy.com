import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 rounded-2xl neu-sm p-4 text-fog">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-paper mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-fog max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}
