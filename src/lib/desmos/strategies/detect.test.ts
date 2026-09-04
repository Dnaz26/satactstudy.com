import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifyDesmosQuestion } from './detect'

test('systems of equations classify as desmos-first intersection', () => {
  const result = classifyDesmosQuestion({
    questionText: 'What is the solution to the system y = 2x + 5 and y = -x + 11?',
    topicName: 'Systems of Equations',
    sectionName: 'Math',
    testType: 'SAT',
  })
  assert.equal(result.desmos_useful, true)
  assert.equal(result.mode, 'desmos_first')
  assert.equal(result.strategy, 'systems_intersection')
  assert.ok(result.confidence > 0.7)
  assert.match(result.recognition_rule, /INTERSECTION/i)
})

test('quadratic maximum classifies as vertex', () => {
  const result = classifyDesmosQuestion({
    questionText: 'A ball’s height is h(t) = -16t^2 + 48t + 4. What is the maximum height?',
    topicName: 'Quadratics',
    sectionName: 'Math',
    testType: 'SAT',
  })
  assert.equal(result.strategy, 'quadratic_vertex')
  assert.equal(result.mode, 'desmos_first')
})

test('context system is hybrid interpretation', () => {
  const result = classifyDesmosQuestion({
    questionText: 'A gym charges 20 + 15m dollars. A pass costs 80 + 5m. After how many months is the total the same? What does the y-value represent?',
    topicName: 'Systems of Equations',
    sectionName: 'Math',
    testType: 'SAT',
  })
  assert.equal(result.strategy, 'word_problem_intersection_interpret')
  assert.equal(result.mode, 'hybrid')
})

test('one-step linear equation is manual-first', () => {
  const result = classifyDesmosQuestion({
    questionText: 'If 3x + 7 = 22, what is x?',
    topicName: 'Linear Equations',
    sectionName: 'Math',
    testType: 'SAT',
  })
  assert.equal(result.mode, 'manual_first')
  assert.equal(result.desmos_useful, false)
})

test('reading section never recommends Desmos', () => {
  const result = classifyDesmosQuestion({
    questionText: 'Which choice best states the main idea of the passage?',
    topicName: 'Main Idea',
    sectionName: 'Reading and Writing',
    testType: 'SAT',
  })
  assert.equal(result.desmos_useful, false)
  assert.equal(result.mode, 'manual_first')
})

test('regression data classifies as scatter linear regression', () => {
  const result = classifyDesmosQuestion({
    questionText: 'The scatterplot shows hours studied and scores. Which line of best fit best models the data?',
    topicName: 'Statistics and Data',
    sectionName: 'Math',
    testType: 'SAT',
  })
  assert.equal(result.strategy, 'scatter_linear_regression')
  assert.equal(result.desmos_useful, true)
})
