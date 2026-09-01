import type { UserPlan } from './entitlements'

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function asPlan(value: string | null | undefined): UserPlan {
  if (value === 'starter' || value === 'pro' || value === 'elite' || value === 'access_code') {
    return value
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
