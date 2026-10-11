import assert from 'node:assert/strict'
import test from 'node:test'
import { lessonsDueToday, practiceExamsDueToday, scheduledPracticeExamDates } from './pacing'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

test('four weeks out places one exam each week and hides it on the other days', () => {
  const testDate = '2026-11-09'
  const createdAt = '2026-10-12'
  const monday = practiceExamsDueToday({ today: '2026-10-12', testDate, studyDays: weekdays, examsCompleted: 0, createdAt })
  const friday = practiceExamsDueToday({ today: '2026-10-16', testDate, studyDays: weekdays, examsCompleted: 0, createdAt })
  const dates = scheduledPracticeExamDates({ today: '2026-10-12', testDate, studyDays: weekdays, examsCompleted: 0, createdAt })
  assert.equal(monday, 0)
  assert.equal(friday, 1)
  assert.equal(new Set(dates).size, 4)
  assert.ok(dates.every((date) => date < testDate))
})

test('a long runway does not put a practice exam on a day before the first slot', () => {
  const due = practiceExamsDueToday({
    today: '2026-10-11',
    testDate: '2027-03-02',
    studyDays: weekdays,
    examsCompleted: 0,
  })
  assert.equal(due, 0)
})

test('lessons per day rise above 1 so every lesson finishes before test day', () => {
  const monday = lessonsDueToday({
    today: '2026-10-12',
    testDate: '2026-11-09',
    studyDays: weekdays,
    lessonsRemaining: 40,
  })
  const sunday = lessonsDueToday({
    today: '2026-10-11',
    testDate: '2026-11-09',
    studyDays: weekdays,
    lessonsRemaining: 40,
  })
  assert.ok(monday > 1)
  assert.equal(sunday, 0)
  const sessions = 20
  assert.equal(monday, Math.ceil(40 / sessions))
})

test('finished exams stay off the list', () => {
  const due = practiceExamsDueToday({
    today: '2026-10-16',
    testDate: '2026-11-09',
    studyDays: weekdays,
    examsCompleted: 4,
  })
  assert.equal(due, 0)
})
