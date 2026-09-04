import { z } from 'zod'
import type { UserPlan } from './entitlements'

/**
 * Postgres accepts any 8-4-4-4-12 hex string as a uuid, including seeded ids such as
 * `d1000000-0000-0000-0000-000000000001`. Zod's `uuid()` enforces RFC 9562 version and
 * variant bits, which rejects those valid database ids. Validate the storage format instead.
 */
export const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export const dbId = () => z.string().regex(UUID_PATTERN, 'Invalid id')

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function asPlan(value: string | null | undefined): UserPlan {
  const plan = (value ?? '').trim().toLowerCase()
  if (
    plan === 'lite' ||
    plan === 'starter' ||
    plan === 'core' ||
    plan === 'plus' ||
    plan === 'pro' ||
    plan === 'elite' ||
    plan === 'access_code'
  ) {
    return plan
  }
  return 'free'
}

export function asTestType(value: string | null | undefined): 'SAT' | 'ACT' | 'Both' {
  if (value === 'ACT' || value === 'Both') return value
  return 'SAT'
}

export function asPrimaryTest(value: string | null | undefined): 'SAT' | 'ACT' {
  return value === 'ACT' ? 'ACT' : 'SAT'
}

export function closerTest(options: {
  preference?: string | null
  targetScore?: number | null
  testDate?: string | null
}): 'SAT' | 'ACT' {
  const pref = options.preference?.toUpperCase()
  if (pref === 'SAT' || pref === 'ACT') return pref
  if ((options.targetScore ?? 0) > 36) return 'SAT'
  if ((options.targetScore ?? 0) > 0) return 'ACT'
  return 'SAT'
}

export function asDifficulty(value: string | null | undefined): 'easy' | 'medium' | 'hard' {
  const v = (value ?? 'medium').toLowerCase()
  if (v === 'easy' || v === 'hard') return v
  return 'medium'
}

export function toDbDifficulty(value: string): 'Easy' | 'Medium' | 'Hard' {
  const v = value.toLowerCase()
  if (v === 'easy') return 'Easy'
  if (v === 'hard') return 'Hard'
  return 'Medium'
}

export interface Choice {
  key: string
  text: string
}

const ACT_EVEN: Record<string, string> = { A: 'F', B: 'G', C: 'H', D: 'J', E: 'K' }

export function officialChoiceLabel(
  letter: string,
  testType?: string | null,
  questionNumber = 1,
): string {
  if ((testType ?? '').toUpperCase() !== 'ACT' || questionNumber % 2 === 1) return letter
  return ACT_EVEN[letter] ?? letter
}

export function questionChoices(q: {
  choice_a?: string | null
  choice_b?: string | null
  choice_c?: string | null
  choice_d?: string | null
  choice_e?: string | null
}): Choice[] {
  const raw: Array<[string, string | null | undefined]> = [
    ['A', q.choice_a],
    ['B', q.choice_b],
    ['C', q.choice_c],
    ['D', q.choice_d],
    ['E', q.choice_e],
  ]
  return raw
    .filter(([, text]) => Boolean(text && text.trim()))
    .map(([key, text]) => ({ key, text: text as string }))
}

export const MISTAKE_TYPE_LABELS: Record<string, string> = {
  didnt_know: "I didn't know this",
  careless: 'I knew it but made a mistake',
  misread: 'I misread the question',
  ran_out_of_time: 'I ran out of time',
  guessed: 'I guessed',
}
