import Link from 'next/link'
import { cn } from '@/lib/utils'

export const BRAND_NAME = 'Prep SAT ACT'
export const BRAND_SHORT = 'Prep'

export function ScorePaper({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 64" className={cn('h-14 w-11 shrink-0', className)} aria-hidden>
      <path d="M4 0 H28 L44 16 V60 H4 Z" fill="#1a73e8" />
      <path d="M28 0 H44 V16 Z" fill="#8ab4f8" />
      <rect x="10" y="26" width="16" height="3.2" rx="1.6" fill="#ffffff" />
      <rect x="10" y="33.5" width="24" height="3.2" rx="1.6" fill="#ffffff" />
      <rect x="10" y="41" width="14" height="3.2" rx="1.6" fill="#ffffff" />
      <rect x="10" y="48.5" width="20" height="3.2" rx="1.6" fill="#ffffff" />
    </svg>
  )
}

export function BrandMark({ compact = false, href = '/', mark }: { compact?: boolean; href?: string; mark?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 focus-ring">
      {mark ?? <ScorePaper />}
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
