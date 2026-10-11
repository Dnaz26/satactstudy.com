import { levelsFor } from './levels'
import type { StudyLevel } from './types'

const COMMON = new Set([
  'number', 'numbers', 'function', 'functions', 'equation', 'equations',
  'problem', 'problems', 'question', 'questions', 'sentence', 'sentences',
  'passage', 'passages', 'example', 'examples', 'property', 'properties',
  'addition', 'variable', 'variables', 'expression', 'expressions',
  'graph', 'graphs', 'system', 'systems', 'value', 'values', 'point', 'points',
  'answer', 'answers', 'change', 'changes', 'practice', 'linear',
])

function keysForTitle(title: string): string[] {
  const base = title.split(':')[0]?.trim().toLowerCase().replace(/[.?!]+$/g, '') ?? ''
  if (base.length < 5) return []
  const words = base.split(/\s+/).filter(Boolean)
  const keys = [base]
  if (words.length >= 2 && (words[0]?.length ?? 0) >= 4 && (words[1]?.length ?? 0) >= 4) {
    keys.push(`${words[0]} ${words[1]}`)
  }
  if (words.length >= 3 && (words[2]?.length ?? 0) >= 4) {
    keys.push(`${words[0]} ${words[1]} ${words[2]}`)
  }
  const head = words.length === 1 ? '' : (words[0] ?? '')
  const last = words[words.length - 1] ?? ''
  for (const word of [head, last]) {
    if (word.length < 7 || COMMON.has(word)) continue
    keys.push(word)
    if (word.endsWith('s') && word.length >= 8) {
      const stem = word.slice(0, -1)
      if (!COMMON.has(stem)) keys.push(stem)
    }
  }
  if (words.length === 1 && (words[0]?.length ?? 0) >= 5 && !COMMON.has(words[0] ?? '')) {
    keys.push(words[0] ?? '')
  }
  return keys
}

function mentions(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i').test(text)
}

/**
 * Topics, math types, and vocabulary that later lessons teach.
 * A phrase the current lesson already teaches is allowed.
 */
export function untaughtPhrases(level: StudyLevel, ownedText: string): string[] {
  const levels = levelsFor(level.track)
  const at = levels.findIndex((item) => item.index === level.index)
  if (at < 0) return []
  const allowed = new Set<string>()
  for (const item of levels.slice(0, at + 1)) {
    for (const key of keysForTitle(item.title)) allowed.add(key)
  }
  const blocked = new Set<string>()
  for (const item of levels.slice(at + 1)) {
    for (const key of keysForTitle(item.title)) {
      if (allowed.has(key) || mentions(ownedText, key)) continue
      blocked.add(key)
    }
  }
  return [...blocked].sort((a, b) => b.length - a.length)
}

export function textUsesUntaught(text: string, blocked: string[]): boolean {
  return blocked.some((phrase) => mentions(text, phrase))
}

export function withoutUntaughtSentences(text: string, blocked: string[], fallback: string): string {
  const kept = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !textUsesUntaught(sentence, blocked))
  const joined = kept.join(' ').trim()
  return joined || fallback
}
