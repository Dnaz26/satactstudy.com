import assert from 'node:assert/strict'
import test from 'node:test'
import { getLevel, levelsFor } from './levels'
import { buildGuidedLesson, explanationPassed, understandingCheck } from './lesson-flow'
import { buildTeachBeats } from './teach-beats'

test('every guided lesson teaches five stages before its questions', () => {
  const level = getLevel('math', 4)
  assert.ok(level)
  const lesson = buildGuidedLesson(level)

  assert.deepEqual(lesson.stages.map((stage) => stage.level), [
    'easy', 'medium', 'hard', 'very hard', 'upper range',
  ])
  for (const stage of lesson.stages) {
    assert.ok(stage.newSkills.length > 0)
    assert.ok(stage.explanation.length > 20)
    assert.ok(stage.workedExamples.length >= 2)
  }
})

test('linear functions introduce each added operation before upper-range synthesis', () => {
  const level = getLevel('math', 4)
  assert.ok(level)
  const lesson = buildGuidedLesson(level)
  const taught = lesson.stages.flatMap((stage) => [
    ...stage.newSkills,
    stage.explanation,
    ...stage.workedExamples,
  ]).join(' ').toLowerCase()

  for (const concept of ['distributive', 'division', 'fraction', 'function substitution', 'parameter', 'exponent']) {
    assert.match(taught, new RegExp(concept))
  }
})

test('cannots and rules are explained one at a time with different examples', () => {
  const level = levelsFor('math').find((item) => item.teach[0] === 'You cannot divide by 0.')
  assert.ok(level)
  const packed = buildGuidedLesson(level, {
    whatItIs: 'You cannot divide by 0. You cannot take an even root of a negative in the reals.',
    breakdown: 'You cannot divide by 0. You cannot take an even root of a negative in the reals. Set the denominator not equal to 0 and solve.',
  })
  const beats = [
    ...buildTeachBeats(packed, 'definition'),
    ...buildTeachBeats(packed, 'breakdown'),
  ]
  assert.ok(beats.every((beat) => !(/divide by 0/i.test(beat.say) && /even root/i.test(beat.say))))
  assert.ok(beats.some((beat) => /divide by 0/i.test(beat.say) && /1\/\(x - 3\)/.test(beat.say)))
  assert.ok(beats.some((beat) => /8\/\(x \+ 2\)/.test(beat.say)))
  assert.ok(beats.some((beat) => /even root/i.test(beat.say) && /√\(x - 1\)/.test(beat.say)))
  assert.ok(beats.some((beat) => /√\(x \+ 6\)/.test(beat.say)))
  assert.ok(beats.every((beat) => !/circle the division|stand for any numbers/i.test(beat.say)))
  const divideLines = beats
    .filter((beat) => /divide by 0|1\/\(x - 3\)|8\/\(x \+ 2\)/.test(beat.say))
    .flatMap((beat) => beat.board?.lines ?? [])
  assert.ok(new Set(divideLines).size >= 2)
})

test('an explanation above 70 passes and 70 does not', () => {
  assert.equal(explanationPassed(71), true)
  assert.equal(explanationPassed(100), true)
  assert.equal(explanationPassed(70), false)
  assert.equal(explanationPassed(69), false)
})

test('each lesson shows three working and three failing examples', () => {
  const level = getLevel('math', 4)
  assert.ok(level)
  const lesson = buildGuidedLesson(level)
  assert.equal(lesson.examples.yes.length, 3)
  assert.equal(lesson.examples.no.length, 3)
  const misses = buildTeachBeats(lesson, 'noExamples')
  const summary = misses[0]?.say ?? ''
  assert.equal(summary.split(/[.!?]/).filter((part) => part.trim()).length, 1)
  for (const item of lesson.examples.no) {
    assert.match(summary, new RegExp(item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('a lesson does not explain math types taught only in later lessons', () => {
  const level = levelsFor('math').find((item) => item.title === 'Natural numbers')
  assert.ok(level)
  const lesson = buildGuidedLesson(level)
  const spoken = [
    lesson.whatItIs,
    lesson.irlExample,
    lesson.breakdown,
    lesson.translateExample,
    ...lesson.examples.yes.flatMap((item) => [item.label, item.why]),
    ...lesson.examples.no.flatMap((item) => [item.label, item.why]),
    ...lesson.problems.flatMap((problem) => [problem.prompt, problem.explain, ...problem.choices.map((choice) => choice.text)]),
    ...lesson.stages.flatMap((stage) => [stage.explanation, ...stage.newSkills, ...stage.workedExamples]),
  ].join(' ')
  assert.doesNotMatch(spoken, /\bintegers?\b/i)
  assert.doesNotMatch(spoken, /\brationals?\b/i)
  assert.doesNotMatch(spoken, /\bcomplex\b/i)
  assert.doesNotMatch(spoken, /\babsolute value\b/i)
  assert.doesNotMatch(spoken, /\bquadratic/i)
})

test('the understanding check is a four-choice question', () => {
  const level = getLevel('math', 4)
  assert.ok(level)
  const lesson = buildGuidedLesson(level)
  const check = understandingCheck(lesson)
  assert.equal(check.choices.length, 4)
  assert.ok(check.choices.some((choice) => choice.key === check.answer))
  assert.match(check.prompt, /^Is .+\?$/)
})

test('whole numbers asks whether a number is a whole number', () => {
  const level = levelsFor('math').find((item) => item.title === 'Whole numbers')
  assert.ok(level)
  const lesson = buildGuidedLesson(level)
  const check = understandingCheck(lesson)
  assert.equal(check.prompt, 'Is √2 + 0 a whole number?')
  const correct = check.choices.find((choice) => choice.key === check.answer)
  assert.equal(correct?.text, 'No')
  assert.match(check.explain, /not a whole number/i)
  assert.doesNotMatch(`${check.prompt} ${check.explain}`, /add 0|adding 0 makes/i)
  for (const problem of lesson.problems) {
    assert.match(problem.prompt, /^Is .+ a whole number\?$/)
    assert.equal(problem.choices.length, 4)
  }
})
