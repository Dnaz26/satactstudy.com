'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ChecklistItem = {
  id: string
  label: string
  done: boolean
  active?: boolean
}

export function TutoringChecklist({
  title = 'Lesson checklist',
  items,
  className,
}: {
  title?: string
  items: ChecklistItem[]
  className?: string
}) {
  const doneCount = items.filter((item) => item.done).length
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border border-[rgba(201,68,36,0.12)] bg-white p-4 shadow-[0_12px_32px_rgba(40,24,12,0.05)]',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{title}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
          {doneCount}/{items.length}
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-3 py-2.5 transition',
              item.done
                ? 'border-emerald-200 bg-emerald-50'
                : item.active
                  ? 'border-signal/40 bg-[rgba(255,92,57,0.08)]'
                  : 'border-line bg-[#fffaf7]',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                item.done ? 'bg-emerald-500 text-white' : item.active ? 'bg-signal text-white' : 'bg-black/5 text-fog',
              )}
              aria-hidden
            >
              {item.done ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span
              className={cn(
                'text-sm leading-snug',
                item.done ? 'text-emerald-800 line-through decoration-emerald-400/70' : item.active ? 'font-semibold text-paper' : 'text-fog',
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
