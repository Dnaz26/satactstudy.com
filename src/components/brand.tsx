import Link from 'next/link'
import { cn } from '@/lib/utils'

export const BRAND_NAME = 'Prep SAT ACT'
export const BRAND_SHORT = 'Prep'

export function BrandMark({ compact = false, href = '/' }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 focus-ring">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-signal text-white shadow-[0_10px_22px_rgba(46,196,182,0.28)]">
        <span className="font-display text-base font-extrabold uppercase tracking-tight">P</span>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[15px] tracking-tight text-paper">{BRAND_NAME}</span>
          <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-fog">
            Study OS
          </span>
        </span>
      )}
    </Link>
  )
}

export function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">{children}</p>
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
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{label}</p>
      <p className={cn('mt-1 font-display text-2xl leading-none', toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
    </div>
  )
}
