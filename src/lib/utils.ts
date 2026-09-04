import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—'
  return score.toLocaleString()
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatMastery(value: number): string {
  return `${Math.round(value)}%`
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function formatTimeOfDay(value: string | null | undefined): string {
  const raw = value && /^\d{1,2}:\d{2}/.test(value) ? value : '19:00'
  const [h, m] = raw.split(':').map(Number)
  const date = new Date()
  date.setHours(h || 19, m || 0, 0, 0)
  return format(date, 'h:mm a')
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function daysUntil(date: string | Date): number {
  return differenceInDays(new Date(date), new Date())
}

export function getMasteryColor(mastery: number): string {
  if (mastery >= 70) return '#22A06B'
  if (mastery >= 40) return '#E08A12'
  return '#E24B62'
}

export function getMasteryLabel(mastery: number): string {
  if (mastery >= 85) return 'Mastered'
  if (mastery >= 70) return 'Proficient'
  if (mastery >= 40) return 'Developing'
  if (mastery > 0) return 'Needs Work'
  return 'Not Started'
}

export function getMasteryBgClass(mastery: number): string {
  if (mastery >= 70) return 'neu-sm text-ok'
  if (mastery >= 40) return 'neu-sm text-warn'
  return 'neu-sm text-bad'
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
