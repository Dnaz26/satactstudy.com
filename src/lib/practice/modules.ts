import type { BookletQuestion } from '@/components/practice/test-booklet'

export type PracticeModule = {
  id: string
  label: string
  sectionHint: string
  seconds: number
  questionIds: string[]
}

/** Fixed 100-question practice exams: 25 reading / 25 english / 50 math. */
export const EXAM_SECTION_TARGETS = {
  reading: 25,
  english: 25,
  math: 50,
  total: 100,
} as const

const READING_SECONDS = 35 * 60
const ENGLISH_SECONDS = 45 * 60
const MATH_SECONDS = 60 * 60

function byIdOrder(questions: BookletQuestion[], ids: string[]): BookletQuestion[] {
  const map = new Map(questions.map((q) => [q.id, q]))
  return ids.map((id) => map.get(id)).filter((q): q is BookletQuestion => Boolean(q))
}

function sectionBucket(questions: BookletQuestion[], kind: 'reading' | 'english' | 'math'): BookletQuestion[] {
  return questions.filter((q) => {
    const section = (q.section_name || '').toLowerCase()
    const category = (q.category_name || '').toLowerCase()
    if (kind === 'math') return section === 'math'
    if (kind === 'reading') {
      if (section === 'reading') return true
      if (section === 'reading and writing') {
        return category === 'craft and structure'
          || category === 'information and ideas'
          || (!category.includes('convention') && !category.includes('expression'))
      }
      return false
    }
    // english
    if (section === 'english') return true
    if (section === 'reading and writing') {
      return category === 'standard english conventions' || category === 'expression of ideas'
    }
    return false
  })
}

/** Build Exam modules: Reading → English → Math. */
export function buildExamModules(
  questions: BookletQuestion[],
  examMeta?: { readingIds?: string[]; englishIds?: string[]; mathIds?: string[] },
): PracticeModule[] {
  if (questions.length === 0) return []

  const reading = examMeta?.readingIds?.length
    ? byIdOrder(questions, examMeta.readingIds)
    : sectionBucket(questions, 'reading')
  const english = examMeta?.englishIds?.length
    ? byIdOrder(questions, examMeta.englishIds)
    : sectionBucket(questions, 'english')
  const math = examMeta?.mathIds?.length
    ? byIdOrder(questions, examMeta.mathIds)
    : sectionBucket(questions, 'math')

  const modules: PracticeModule[] = []
  if (reading.length) {
    modules.push({
      id: 'exam-reading',
      label: 'Reading',
      sectionHint: 'Reading',
      seconds: READING_SECONDS,
      questionIds: reading.map((q) => q.id),
    })
  }
  if (english.length) {
    modules.push({
      id: 'exam-english',
      label: 'English',
      sectionHint: 'English',
      seconds: ENGLISH_SECONDS,
      questionIds: english.map((q) => q.id),
    })
  }
  if (math.length) {
    modules.push({
      id: 'exam-math',
      label: 'Math',
      sectionHint: 'Math',
      seconds: MATH_SECONDS,
      questionIds: math.map((q) => q.id),
    })
  }
  return modules
}

/** @deprecated Prefer buildExamModules for catalog exams. */
export function buildPracticeModules(
  testType: string,
  questions: BookletQuestion[],
): PracticeModule[] {
  void testType
  return buildExamModules(questions)
}

export function questionsForModule(
  questions: BookletQuestion[],
  module: PracticeModule | null,
): BookletQuestion[] {
  if (!module) return questions
  const set = new Set(module.questionIds)
  return questions.filter((q) => set.has(q.id))
}

export function fullTestCount(_testType?: string): number {
  void _testType
  return EXAM_SECTION_TARGETS.total
}
