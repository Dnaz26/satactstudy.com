import type { BookletQuestion } from '@/components/practice/test-booklet'
import { OFFICIAL_SPECIFICATIONS } from './blueprints'

export type PracticeModule = {
  id: string
  label: string
  sectionHint: string
  seconds: number
  questionIds: string[]
}

/** Digital SAT: two 27-question RW and two 22-question Math modules. */
export const EXAM_SECTION_TARGETS = {
  reading: 27,
  english: 27,
  math: 44,
  total: 98,
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
  examMeta?: { readingIds?: string[]; englishIds?: string[]; mathIds?: string[]; formatVersion?: number },
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

  if (examMeta?.formatVersion === 2) {
    const rw = [...reading, ...english]
    return [
      { id: 'sat-rw-1', label: 'Reading & Writing · Module 1', sectionHint: 'Reading and Writing', seconds: 32 * 60, questionIds: rw.slice(0, 27).map(q => q.id) },
      { id: 'sat-rw-2', label: 'Reading & Writing · Module 2', sectionHint: 'Reading and Writing', seconds: 32 * 60, questionIds: rw.slice(27, 54).map(q => q.id) },
      { id: 'sat-math-1', label: 'Math · Module 1', sectionHint: 'Math', seconds: 35 * 60, questionIds: math.slice(0, 22).map(q => q.id) },
      { id: 'sat-math-2', label: 'Math · Module 2', sectionHint: 'Math', seconds: 35 * 60, questionIds: math.slice(22, 44).map(q => q.id) },
    ]
  }
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
  if (testType === 'ACT') {
    const sections=[...OFFICIAL_SPECIFICATIONS.ACT.sections,OFFICIAL_SPECIFICATIONS.ACT.science]
    return sections.map(s=>({id:`act-${s.name.toLowerCase()}`,label:s.name,sectionHint:s.name,seconds:s.seconds,
      questionIds:questions.filter(q=>q.section_name===s.name).map(q=>q.id)})).filter(s=>s.questionIds.length>0)
  }
  // Saved legacy SAT drill sessions retain their existing assignments.
  return buildExamModules(questions)
}

export function questionsForModule(
  questions: BookletQuestion[],
  module: PracticeModule | null,
): BookletQuestion[] {
  if (!module) return questions
  return byIdOrder(questions, module.questionIds)
}

export function fullTestCount(testType?: string, includeScience=false): number {
  if(testType==='ACT') return OFFICIAL_SPECIFICATIONS.ACT.total+(includeScience?OFFICIAL_SPECIFICATIONS.ACT.science.count:0)
  return EXAM_SECTION_TARGETS.total
}
