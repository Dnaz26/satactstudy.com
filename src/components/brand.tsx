import Link from 'next/link'
import { cn } from '@/lib/utils'

export function BrandMark({ compact = false, href = '/' }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 focus-ring">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl neu-raised text-white">
        <span className="font-display text-sm font-extrabold tracking-tight">SA</span>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-sm text-paper">SAT ACT AI</span>
          <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-fog">
            Study buddy
          </span>
        </span>
      )}
    </Link>
  )
}

export function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-signal">{children}</p>
  )
}

export function DataReadout({
  label,
  value,
  hint,
  tone = 'paper',
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: 'paper' | 'signal' | 'ok' | 'warn' | 'bad'
}) {
  const toneClass = {
    paper: 'text-paper',
    signal: 'text-signal',
    ok: 'text-ok',
    warn: 'text-warn',
    bad: 'text-bad',
  }[tone]

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">{label}</p>
      <p className={cn('mt-1 font-display text-2xl leading-none', toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
    </div>
  )
}
