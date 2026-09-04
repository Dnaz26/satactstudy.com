import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatTutorSteps, parseTutorOutput, studentSafeError } from './output'
import { normalizePreferences } from './preferences'
import { DEFAULT_TUTOR_PREFERENCES } from './types'
import { dbId } from '@/lib/schema'

test('parses a valid structured tutor response', () => {
  const output = parseTutorOutput(JSON.stringify({
    message: 'What is the question asking you to find?',
    strategy: 'socratic',
    misconception: 'misread',
    confidence: 0.91,
    understanding_check: 'Tell me the goal in one sentence.',
    desmosActions: [{ type: 'addExpression', latex: 'y=2x+1' }],
    next_action: 'wait_for_student',
  }))

  assert.equal(output.strategy, 'socratic')
  assert.equal(output.misconception, 'misread')
  assert.equal(output.desmosActions[0]?.type, 'addExpression')
  assert.match(output.message, /asking/)
})

test('falls back when the model returns invalid JSON', () => {
  const output = parseTutorOutput('not json at all')
  assert.equal(output.strategy, 'direct')
  assert.equal(output.desmosActions.length, 0)
  assert.ok(output.message.length > 0)
})

test('does not treat empty JSON message as student-facing output', () => {
  const output = parseTutorOutput('{"message":"","strategy":"hint"}')
  assert.notEqual(output.message, '')
  assert.equal(output.strategy, 'hint')
})

test('safe error does not expose API details', () => {
  const output = studentSafeError()
  assert.equal(output.confidence, 0)
  assert.doesNotMatch(output.message, /DeepSeek|api key|sk-/i)
})

test('splits numbered tutor replies into steps', () => {
  const steps = formatTutorSteps('1. Mark the given angle.\n2. Use consecutive interior angles.\n3. Subtract from 180.')
  assert.deepEqual(steps, ['Mark the given angle.', 'Use consecutive interior angles.', 'Subtract from 180.'])
})

test('does not turn a greeting into fake steps', () => {
  assert.equal(formatTutorSteps("Hi! I'm Nova. We can work on Systems of Equations."), null)
})

test('keeps a single numbered line as prose', () => {
  assert.equal(formatTutorSteps('1. Try plugging the point into the second equation.'), null)
})

test('treats a few short lines as steps even without numbers', () => {
  const steps = formatTutorSteps('B is wrong because 6 squared is 36, not 9.\nReplace every x with 6.\nThen 36 + 18 = 54.\nThe right answer is C.')
  assert.equal(steps?.length, 4)
  assert.match(steps?.[0] ?? '', /B is wrong/)
})

test('normalizes missing tutor preferences', () => {
  const prefs = normalizePreferences('user-1', null)
  assert.deepEqual(prefs.methods, DEFAULT_TUTOR_PREFERENCES.methods)
  assert.equal(prefs.explanation_level, 'normal')
})

test('rejects unknown teaching methods', () => {
  const prefs = normalizePreferences('user-1', {
    methods: ['telepathy' as never, 'analogy'],
    analogy_topics: ['business'],
  })
  assert.deepEqual(prefs.methods, ['analogy'])
  assert.deepEqual(prefs.analogy_topics, ['business'])
})

test('dbId accepts seeded database uuids that fail strict RFC checks', () => {
  const schema = dbId()
  assert.equal(schema.safeParse('d1000000-0000-0000-0000-000000000001').success, true)
  assert.equal(schema.safeParse('25c8aaf6-9860-44d2-8dc8-8cb3f2428fd6').success, true)
  assert.equal(schema.safeParse('not-a-uuid').success, false)
  assert.equal(schema.safeParse('d1000000-0000-0000-0000-00000000000').success, false)
})
