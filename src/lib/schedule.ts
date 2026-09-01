import { addDays, format, parseISO } from 'date-fns'

export interface ScheduleInput {
  userId: string
  testDate: string
  testType: 'SAT' | 'ACT' | 'both'
  targetScore: number
  currentScore: number | null
  dailyMinutes: number
  availableDays: string[]
  weakTopics: TopicPriority[]
  mediumTopics: TopicPriority[]
  strongTopics: TopicPriority[]
  hasMistakes: boolean
}

export interface TopicPriority {
  topicId: string
  topicName: string
  mastery: number
  categoryName: string
}

export interface DailyTask {
  taskType: 'practice' | 'review' | 'vocabulary' | 'timed'
  topicId: string | null
  topicName: string | null
  durationMinutes: number
  questionCount: number | null
}

export interface DailyPlan {
  date: string
  tasks: DailyTask[]
  totalMinutes: number
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function questionsForMinutes(minutes: number): number {
  return Math.max(1, Math.round(minutes / 2))
}

function getPhase(daysRemaining: number): string {
  if (daysRemaining > 60) return 'foundation'
  if (daysRemaining > 30) return 'build'
  if (daysRemaining > 14) return 'strengthen'
  if (daysRemaining > 7) return 'intensive'
  if (daysRemaining > 2) return 'peak'
  return 'final'
}

function getDistribution(phase: string, scoreGap: number): Record<string, number> {
  switch (phase) {
    case 'final':
      return { weak: 0.2, review: 0.5, timed: 0.2, medium: 0.05, vocabulary: 0.05 }
    case 'peak':
      return { weak: 0.3, review: 0.3, timed: 0.25, medium: 0.1, vocabulary: 0.05 }
    case 'intensive':
      return { weak: 0.4, review: 0.25, timed: 0.2, medium: 0.1, vocabulary: 0.05 }
    case 'strengthen':
      return { weak: 0.45, review: 0.2, timed: 0.15, medium: 0.1, vocabulary: 0.1 }
    case 'build':
      return scoreGap > 200
        ? { weak: 0.5, review: 0.2, timed: 0.1, medium: 0.1, vocabulary: 0.1 }
        : { weak: 0.4, review: 0.2, timed: 0.15, medium: 0.15, vocabulary: 0.1 }
    default:
      return { weak: 0.45, review: 0.2, timed: 0.15, medium: 0.1, vocabulary: 0.1 }
  }
}

export function generateStudyPlan(input: ScheduleInput): DailyPlan[] {
  const today = new Date()
  const testDate = parseISO(input.testDate)
  const totalDays = Math.max(1, Math.ceil((testDate.getTime() - today.getTime()) / 86400000))

  const scoreGap = input.targetScore - (input.currentScore ?? 0)
  const plans: DailyPlan[] = []

  let weakTopicIndex = 0
  let mediumTopicIndex = 0

  for (let i = 0; i < Math.min(totalDays, 60); i++) {
    const date = addDays(today, i)
    const dayName = DAY_NAMES[date.getDay()]

    if (!input.availableDays.includes(dayName)) continue

    const daysRemaining = totalDays - i
    const phase = getPhase(daysRemaining)
    const dist = getDistribution(phase, scoreGap)
    const daily = input.dailyMinutes

    const tasks: DailyTask[] = []

    const weakMinutes = Math.round(daily * dist.weak)
    if (weakMinutes >= 5 && input.weakTopics.length > 0) {
      const topic = input.weakTopics[weakTopicIndex % input.weakTopics.length]
      weakTopicIndex++
      tasks.push({
        taskType: 'practice',
        topicId: topic.topicId,
        topicName: topic.topicName,
        durationMinutes: weakMinutes,
        questionCount: questionsForMinutes(weakMinutes),
      })
    }

    const reviewMinutes = Math.round(daily * dist.review)
    if (reviewMinutes >= 5 && input.hasMistakes) {
      tasks.push({
        taskType: 'review',
        topicId: null,
        topicName: 'Mistake Review',
        durationMinutes: reviewMinutes,
        questionCount: questionsForMinutes(reviewMinutes),
      })
    }

    const timedMinutes = Math.round(daily * dist.timed)
    if (timedMinutes >= 5) {
      tasks.push({
        taskType: 'timed',
        topicId: null,
        topicName: 'Timed Practice',
        durationMinutes: timedMinutes,
        questionCount: questionsForMinutes(timedMinutes),
      })
    }

    const medMinutes = Math.round(daily * dist.medium)
    if (medMinutes >= 5 && input.mediumTopics.length > 0) {
      const topic = input.mediumTopics[mediumTopicIndex % input.mediumTopics.length]
      mediumTopicIndex++
      tasks.push({
        taskType: 'practice',
        topicId: topic.topicId,
        topicName: topic.topicName,
        durationMinutes: medMinutes,
        questionCount: questionsForMinutes(medMinutes),
      })
    }

    const vocabMinutes = Math.round(daily * (dist.vocabulary ?? 0.1))
    if (vocabMinutes >= 5) {
      tasks.push({
        taskType: 'vocabulary',
        topicId: null,
        topicName: 'Vocabulary',
        durationMinutes: vocabMinutes,
        questionCount: null,
      })
    }

    const totalMinutes = tasks.reduce((s, t) => s + t.durationMinutes, 0)

    plans.push({
      date: format(date, 'yyyy-MM-dd'),
      tasks,
      totalMinutes,
    })
  }

  return plans
}
