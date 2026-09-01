import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-2xl neu-inset', className)}
      {...props}
    />
  )
}

export { Skeleton }
