'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export type CalendarDayCell = {
  date: Date
  key: string
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  done: boolean
  missed: boolean
  hasTasks: boolean
  label: string
  taskCount: number
  weekday: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function PlanCalendar({
  cells,
  monthLabel,
  onSelect,
  onPrev,
  onNext,
}: {
  cells: CalendarDayCell[]
  monthLabel: string
  onSelect: (key: string) => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_18px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-4 sm:px-5">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-full border border-black/10 px-3 py-1.5 text-sm text-fog transition hover:border-black/20 hover:text-paper"
          aria-label="Previous month"
        >
          ← Prev
        </button>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Calendar</p>
          <h2 className="font-display text-2xl text-paper sm:text-3xl">{monthLabel}</h2>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full border border-black/10 px-3 py-1.5 text-sm text-fog transition hover:border-black/20 hover:text-paper"
          aria-label="Next month"
        >
          Next →
        </button>
      </div>

      {/* Days of the week */}
      <div className="grid grid-cols-7 border-b border-black/5 bg-white">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-r border-black/5 py-2.5 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-fog last:border-r-0 sm:text-[11px]"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 bg-black/[0.04]">
        {cells.map((cell, index) => (
          <motion.button
            key={cell.key}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.008, 0.2), duration: 0.2 }}
            onClick={() => onSelect(cell.key)}
            className={cn(
              'relative min-h-[92px] border-b border-r border-black/5 bg-white p-1.5 text-left transition sm:min-h-[112px] sm:p-2.5',
              'hover:-translate-y-0.5 hover:z-10 hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]',
              !cell.inMonth && 'bg-[#fafafa] text-fog/45',
              cell.isSelected && 'z-10 bg-signal text-white shadow-[inset_0_0_0_2px_rgba(255,92,57,0.35)]',
              !cell.isSelected && cell.done && 'bg-[#fff7f4]',
              !cell.isSelected && cell.missed && 'bg-[#ffe8e0]',
              !cell.isSelected && cell.isToday && 'ring-2 ring-inset ring-signal/40',
              (index + 1) % 7 === 0 && 'border-r-0'
            )}
          >
            <div className="flex items-start justify-between gap-1">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                  cell.isToday && !cell.isSelected && 'bg-signal text-white',
                  cell.isSelected && 'bg-white/20 text-white',
                  !cell.isToday && !cell.isSelected && 'text-paper'
                )}
              >
                {format(cell.date, 'd')}
              </span>
              <span
                className={cn(
                  'hidden font-mono text-[9px] uppercase tracking-wider sm:inline',
                  cell.isSelected ? 'text-white/70' : 'text-fog/70'
                )}
              >
                {cell.weekday}
              </span>
            </div>

            {cell.hasTasks ? (
              <div className="mt-1.5 space-y-1">
                <p
                  className={cn(
                    'line-clamp-2 text-[10px] leading-snug sm:text-[11px]',
                    cell.isSelected ? 'text-white/95' : 'text-fog'
                  )}
                >
                  {cell.done ? 'Done' : cell.label || 'Study block'}
                </p>
                {cell.taskCount > 1 && (
                  <p
                    className={cn(
                      'font-mono text-[9px] uppercase tracking-wider',
                      cell.isSelected ? 'text-white/65' : 'text-signal'
                    )}
                  >
                    +{cell.taskCount - 1} more
                  </p>
                )}
              </div>
            ) : (
              <p
                className={cn(
                  'mt-2 text-[10px]',
                  cell.isSelected ? 'text-white/50' : 'text-fog/40'
                )}
              >
                —
              </p>
            )}

            {cell.hasTasks && !cell.done && (
              <span
                className={cn(
                  'absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full',
                  cell.isSelected ? 'bg-white' : 'bg-signal'
                )}
              />
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 px-4 py-3 text-[11px] text-fog">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-signal" /> Today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#fff7f4] ring-1 ring-black/10" /> Done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#ffe8e0] ring-1 ring-black/10" /> Missed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-signal" /> Selected
        </span>
      </div>
    </div>
  )
}
