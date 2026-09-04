import type { BookletMark, BookletQuestion } from '@/components/practice/test-booklet'

export const PRACTICE_SNAPSHOT_VERSION = 1 as const

export type PracticeSnapshot = {
  version: typeof PRACTICE_SNAPSHOT_VERSION
  kind: 'main' | 'topic'
  topicId: string
  taskId: string
  testType: string
  difficulty: string
  count: number
  categoryName: string
  sectionName: string
  timed: boolean
  pace: number
  sessionId: string | null
  questions: BookletQuestion[]
  answers: Record<string, string>
  marks: Record<string, BookletMark>
  focusedId: string | null
  elapsed: number
  hintUsed: Record<string, boolean>
  updatedAt: number
}

const PREFIX = 'satact-practice-v1'

export function practiceSnapshotKey(topicId: string): string {
  return topicId ? `${PREFIX}:topic:${topicId}` : `${PREFIX}:main`
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseSnapshot(raw: string | null): PracticeSnapshot | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as PracticeSnapshot
    if (value?.version !== PRACTICE_SNAPSHOT_VERSION) return null
    if (!Array.isArray(value.questions) || value.questions.length === 0) return null
    return {
      ...value,
      answers: value.answers ?? {},
      marks: value.marks ?? {},
      hintUsed: value.hintUsed ?? {},
    }
  } catch {
    return null
  }
}

export function readPracticeSnapshot(topicId: string): PracticeSnapshot | null {
  if (!canUseStorage()) return null
  return parseSnapshot(window.localStorage.getItem(practiceSnapshotKey(topicId)))
}

export function writePracticeSnapshot(snapshot: PracticeSnapshot): void {
  if (!canUseStorage() || snapshot.questions.length === 0) return
  window.localStorage.setItem(practiceSnapshotKey(snapshot.topicId), JSON.stringify({
    ...snapshot,
    version: PRACTICE_SNAPSHOT_VERSION,
    updatedAt: Date.now(),
  }))
}

export function clearPracticeSnapshot(topicId: string): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(practiceSnapshotKey(topicId))
}
