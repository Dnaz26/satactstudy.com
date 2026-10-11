import { addDays, format, parseISO } from 'date-fns'
import { MIN_TOPIC_QUESTIONS } from '@/lib/constants'

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
  access?: 'free' | 'full'
}

export interface TopicPriority {
  topicId: string
  topicName: string
  mastery: number
  categoryName: string
}

export interface DailyTask {
  taskType: 'practice' | 'review' | 'vocabulary' | 'timed' | 'test' | 'lesson' | 'rapid_fire' | 'game'
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

function questionsForMinutes(minutes: number): number {
  return Math.max(MIN_TOPIC_QUESTIONS, Math.round(minutes / 2))
}

function pickTopic(list: TopicPriority[], index: number, fallback: TopicPriority[]): TopicPriority | null {
  const pool = list.length ? list : fallback
  if (!pool.length) return null
  return pool[index % pool.length]
}

function task(
  taskType: DailyTask['taskType'],
  minutes: number,
  topic: TopicPriority | null,
  title?: string,
): DailyTask {
  const name = title ?? topic?.topicName ?? (taskType === 'test' ? 'Practice test' : taskType === 'timed' ? 'Timed set' : taskType === 'review' ? 'Mistake review' : taskType === 'vocabulary' ? 'Vocabulary' : 'Mixed practice')
  return {
    taskType,
    topicId: topic?.topicId ?? null,
    topicName: name,
    durationMinutes: Math.max(5, minutes),
    questionCount: taskType === 'vocabulary' ? null : questionsForMinutes(Math.max(5, minutes)),
  }
}

function fitToMinutes(tasks: DailyTask[], daily: number): DailyTask[] {
  const target = Math.max(15, daily)
  if (!tasks.length) {
    return [task('practice', target, null)]
  }
  const sum = tasks.reduce((s, t) => s + t.durationMinutes, 0) || 1
  const scaled = tasks.map((t) => {
    const minutes = Math.max(5, Math.round((t.durationMinutes / sum) * target))
    return {
      ...t,
      durationMinutes: minutes,
      questionCount: t.taskType === 'vocabulary' ? null : questionsForMinutes(minutes),
    }
  })
  const newSum = scaled.reduce((s, t) => s + t.durationMinutes, 0)
  const delta = target - newSum
  scaled[0] = {
    ...scaled[0],
    durationMinutes: Math.max(5, scaled[0].durationMinutes + delta),
    questionCount: scaled[0].taskType === 'vocabulary' ? null : questionsForMinutes(Math.max(5, scaled[0].durationMinutes + delta)),
  }
  return scaled
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function weekdayName(date: Date): string {
  return WEEKDAY_NAMES[date.getDay()]
}

function listedDay(date: Date, availableDays: string[]): boolean {
  const name = weekdayName(date).toLowerCase()
  return availableDays.some((day) => day.toLowerCase() === name)
}

function freeWeekDates(weekStart: Date, availableDays: string[]): Date[] {
  const chosen: Date[] = []
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(weekStart, offset)
    if (listedDay(date, availableDays)) chosen.push(date)
  }
  const pool = chosen.length ? chosen : WEEKDAY_NAMES.slice(1, 6).map((name) => {
    const index = WEEKDAY_NAMES.indexOf(name)
    return addDays(weekStart, index === 0 ? 6 : index - 1)
  })
  const days = pool.slice(0, 5)
  if (days.length >= 5) return days
  for (const name of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
    if (days.length >= 5) break
    const index = WEEKDAY_NAMES.indexOf(name)
    const date = addDays(weekStart, index - 1)
    const key = format(date, 'yyyy-MM-dd')
    if (!days.some((item) => format(item, 'yyyy-MM-dd') === key)) days.push(date)
  }
  return days.sort((a, b) => a.getTime() - b.getTime())
}

function generateFreeStudyPlan(input: ScheduleInput, today: Date, totalDays: number): DailyPlan[] {
  const available = input.availableDays.length
    ? input.availableDays
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const allTopics = [...input.weakTopics, ...input.mediumTopics, ...input.strongTopics]
  const plans: DailyPlan[] = []
  let cursor = new Date(today)
  const end = addDays(today, totalDays)
  let weekIndex = 0
  while (cursor < end) {
    const weekday = cursor.getDay()
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday
    const weekStart = addDays(cursor, mondayOffset)
    const dates = freeWeekDates(weekStart, available).filter((date) => date >= today && date < end)
    dates.forEach((date, index) => {
      const weak = pickTopic(input.weakTopics, weekIndex + index, allTopics)
      const next = pickTopic(input.mediumTopics, weekIndex + index, allTopics) ?? weak
      const review = task('review', 8, null, input.hasMistakes ? 'Review misses' : 'Review notes')
      review.questionCount = 2
      let focus: DailyTask
      if (index === 0) {
        focus = task('lesson', 15, weak, weak?.topicName ?? 'Weekly lesson')
        focus.questionCount = null
      } else if (index === 1) {
        focus = task('rapid_fire', 10, weak, 'Rapid Fire')
        focus.questionCount = 5
      } else if (index === 2) {
        focus = task('game', 10, weak, 'Game practice')
        focus.questionCount = 5
      } else {
        focus = task('practice', 16, index === 3 ? weak : next, index === 3 ? weak?.topicName ?? 'Short practice' : next?.topicName ?? 'Short practice')
        focus.questionCount = 8
      }
      const tasks = [focus, review]
      plans.push({
        date: format(date, 'yyyy-MM-dd'),
        tasks,
        totalMinutes: tasks.reduce((sum, item) => sum + item.durationMinutes, 0),
      })
    })
    cursor = addDays(weekStart, 7)
    weekIndex += 1
    if (weekIndex > 12) break
  }
  return plans
}

export function generateStudyPlan(input: ScheduleInput): DailyPlan[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const testDate = input.testDate ? parseISO(input.testDate) : addDays(today, 28)
  const totalDays = Math.max(14, Math.min(60, Math.ceil((testDate.getTime() - today.getTime()) / 86400000)))
  const daily = Math.max(15, input.dailyMinutes || 30)
  const allTopics = [...input.weakTopics, ...input.mediumTopics, ...input.strongTopics]
  if (input.access === 'free') return generateFreeStudyPlan(input, today, totalDays)
  const plans: DailyPlan[] = []

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(today, i)
    const weak = pickTopic(input.weakTopics, i, allTopics)
    const medium = pickTopic(input.mediumTopics, i, allTopics)
    const strong = pickTopic(input.strongTopics, i + 3, allTopics)
    const pattern = i % 7
    let raw: DailyTask[] = []

    if (pattern === 0) {
      raw = [task('practice', daily * 0.7, weak, weak ? `Study ${weak.topicName}` : 'Study mixed'), task('vocabulary', daily * 0.3, null)]
    } else if (pattern === 1) {
      raw = [task('test', daily, null, 'Practice test')]
    } else if (pattern === 2) {
      raw = [
        task('practice', daily * 0.6, medium ?? weak, medium ? `Study ${medium.topicName}` : 'Study a topic'),
        task('review', daily * 0.4, null, input.hasMistakes ? 'Review misses' : 'Review notes'),
      ]
    } else if (pattern === 3) {
      raw = [task('timed', daily * 0.55, weak), task('practice', daily * 0.45, strong ?? medium)]
    } else if (pattern === 4) {
      raw = [task('vocabulary', daily * 0.35, null), task('practice', daily * 0.65, weak ?? medium)]
    } else if (pattern === 5) {
      raw = [task('test', daily * 0.7, null, 'Section practice test'), task('review', daily * 0.3, null)]
    } else {
      raw = [task('practice', daily * 0.5, medium ?? weak), task('timed', daily * 0.5, strong ?? medium, 'Timed drill')]
    }

    const tasks = fitToMinutes(raw, daily)
    plans.push({
      date: format(date, 'yyyy-MM-dd'),
      tasks,
      totalMinutes: tasks.reduce((s, t) => s + t.durationMinutes, 0),
    })
  }

  return plans
}
