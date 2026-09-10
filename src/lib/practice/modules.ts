import type { BookletQuestion } from '@/components/practice/test-booklet'

export type PracticeModule = {
  id: string
  label: string
  sectionHint: string
  seconds: number
  questionIds: string[]
}

/** Official-length full practice targets (English/RW + Math). */
export const FULL_TEST_TARGETS = {
  SAT: {
    total: 98,
    sections: [
      { name: 'Reading and Writing', take: 54 },
      { name: 'Math', take: 44 },
    ],
  },
  ACT: {
    total: 131,
    sections: [
      { name: 'English', take: 86 },
      { name: 'Math', take: 45 },
    ],
  },
} as const

export type FullTestExam = keyof typeof FULL_TEST_TARGETS

export function fullTestExam(testType: string): FullTestExam {
  return testType.toUpperCase() === 'ACT' ? 'ACT' : 'SAT'
}

export function fullTestCount(testType: string): number {
  return FULL_TEST_TARGETS[fullTestExam(testType)].total
}

const SAT_RW_SECONDS = 32 * 60
const SAT_MATH_SECONDS = 35 * 60
const ACT_SECONDS: Record<string, number> = {
  English: 45 * 60,
  Math: 60 * 60,
}

function halfSplit<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2)
  return [items.slice(0, mid), items.slice(mid)]
}

function bySection(questions: BookletQuestion[]): Map<string, BookletQuestion[]> {
  const map = new Map<string, BookletQuestion[]>()
  for (const q of questions) {
    const key = (q.section_name || 'Practice').trim() || 'Practice'
    const list = map.get(key) ?? []
    list.push(q)
    map.set(key, list)
  }
  return map
}

function sectionBucket(
  grouped: Map<string, BookletQuestion[]>,
  name: string,
): BookletQuestion[] {
  const exact = grouped.get(name)
  if (exact?.length) return exact

  const lower = name.toLowerCase()
  if (lower === 'reading and writing') {
    return [...grouped.entries()]
      .filter(([k]) => {
        const key = k.toLowerCase()
        return key.includes('reading and writing')
          || (key.includes('reading') && key.includes('writing'))
          || key === 'english'
      })
      .flatMap(([, list]) => list)
  }
  if (lower === 'english') {
    return [...grouped.entries()]
      .filter(([k]) => {
        const key = k.toLowerCase()
        return key === 'english' || key.includes('english')
      })
      .flatMap(([, list]) => list)
  }
  if (lower === 'math') {
    return [...grouped.entries()]
      .filter(([k]) => /math/i.test(k))
      .flatMap(([, list]) => list)
  }
  return [...grouped.entries()]
    .find(([k]) => k.toLowerCase().includes(lower))?.[1]
    ?? []
}

/** Build Bluebook/ACT-style modules with official-ish section clocks. */
export function buildPracticeModules(
  testType: string,
  questions: BookletQuestion[],
): PracticeModule[] {
  if (questions.length === 0) return []

  const exam = fullTestExam(testType)
  const grouped = bySection(questions)

  if (exam === 'ACT') {
    const modules: PracticeModule[] = []
    for (const { name } of FULL_TEST_TARGETS.ACT.sections) {
      const bucket = sectionBucket(grouped, name)
      if (!bucket.length) continue
      modules.push({
        id: `act-${name.toLowerCase()}`,
        label: name,
        sectionHint: name,
        seconds: ACT_SECONDS[name] ?? Math.max(20 * 60, bucket.length * 45),
        questionIds: bucket.map((q) => q.id),
      })
    }
    if (modules.length) return modules
  }

  // SAT digital-style: RW modules (27+27) then Math modules (22+22)
  const rw = sectionBucket(grouped, 'Reading and Writing')
  const math = sectionBucket(grouped, 'Math')

  const modules: PracticeModule[] = []
  if (rw.length) {
    const [a, b] = halfSplit(rw)
    modules.push({
      id: 'sat-rw-1',
      label: 'Reading and Writing · Module 1',
      sectionHint: 'Reading and Writing',
      seconds: SAT_RW_SECONDS,
      questionIds: a.map((q) => q.id),
    })
    if (b.length) {
      modules.push({
        id: 'sat-rw-2',
        label: 'Reading and Writing · Module 2',
        sectionHint: 'Reading and Writing',
        seconds: SAT_RW_SECONDS,
        questionIds: b.map((q) => q.id),
      })
    }
  }
  if (math.length) {
    const [a, b] = halfSplit(math)
    modules.push({
      id: 'sat-math-1',
      label: 'Math · Module 1',
      sectionHint: 'Math',
      seconds: SAT_MATH_SECONDS,
      questionIds: a.map((q) => q.id),
    })
    if (b.length) {
      modules.push({
        id: 'sat-math-2',
        label: 'Math · Module 2',
        sectionHint: 'Math',
        seconds: SAT_MATH_SECONDS,
        questionIds: b.map((q) => q.id),
      })
    }
  }

  if (modules.length) return modules

  // Fallback: two timed halves of the sheet
  const [a, b] = halfSplit(questions)
  const seconds = Math.max(20 * 60, Math.round(questions.length * 45))
  return [
    {
      id: 'module-1',
      label: 'Module 1',
      sectionHint: 'Practice',
      seconds: Math.round(seconds / 2),
      questionIds: a.map((q) => q.id),
    },
    ...(b.length
      ? [{
          id: 'module-2',
          label: 'Module 2',
          sectionHint: 'Practice',
          seconds: Math.round(seconds / 2),
          questionIds: b.map((q) => q.id),
        }]
      : []),
  ]
}

export function questionsForModule(
  questions: BookletQuestion[],
  module: PracticeModule | null,
): BookletQuestion[] {
  if (!module) return questions
  const set = new Set(module.questionIds)
  return questions.filter((q) => set.has(q.id))
}

/** Pick a full SAT/ACT sheet with fixed English/RW + Math quotas. */
export function pickFullTestQuestions<T extends { id: string; section_name?: string | null }>(
  items: T[],
  testType: string,
  maxTake?: number,
): T[] {
  const exam = fullTestExam(testType)
  const targets = FULL_TEST_TARGETS[exam]
  const limit = Math.max(0, maxTake ?? targets.total)

  const buckets = new Map<string, T[]>()
  for (const q of items) {
    const key = (q.section_name || 'Practice').trim() || 'Practice'
    const list = buckets.get(key) ?? []
    list.push(q)
    buckets.set(key, list)
  }
  for (const [key, list] of buckets) {
    buckets.set(key, [...list].sort(() => Math.random() - 0.5))
  }

  function takeForSection(name: string, want: number): T[] {
    if (want <= 0) return []
    const exact = buckets.get(name) ?? []
    const pool =
      exact.length > 0
        ? exact
        : [...buckets.entries()]
          .filter(([k]) => {
            const key = k.toLowerCase()
            const target = name.toLowerCase()
            if (target === 'reading and writing') {
              return key.includes('reading and writing')
                || (key.includes('reading') && key.includes('writing'))
            }
            if (target === 'english') return key === 'english' || key.includes('english')
            if (target === 'math') return /math/i.test(k)
            return key.includes(target)
          })
          .flatMap(([, list]) => list)

    const seen = new Set<string>()
    const out: T[] = []
    for (const q of pool) {
      if (seen.has(q.id)) continue
      seen.add(q.id)
      out.push(q)
      if (out.length >= want) break
    }
    return out
  }

  const picked: T[] = []
  let remaining = limit
  for (const section of targets.sections) {
    if (remaining <= 0) break
    const want = Math.min(section.take, remaining)
    const batch = takeForSection(section.name, want)
    picked.push(...batch)
    remaining -= batch.length
  }
  return picked
}
